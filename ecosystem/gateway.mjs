import compression from 'compression';
import { installGroups, announceRoom } from './groups.mjs';
import express from 'express';
import http from 'node:http';
import httpProxy from 'http-proxy';
import { timingSafeEqual } from 'node:crypto';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { resolve } from 'node:path';

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export function safeNext(value) {
  return typeof value === 'string' && /^\/(?:folio|lib|yard|cove)(?:\/[^\\]*)?$/.test(value) && !/[\r\n]/.test(value) ? value : '/';
}
export function createGateway({ db, auth, origin, targets, bridgeSecret, dev = false }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(compression({ threshold: 1024 }));
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
  app.get('/healthz', asyncRoute(async (_req, res) => { await db.query('SELECT 1'); res.json({ ok: true }); }));
  app.use('/api/auth', (req, _res, next) => { req.headers['x-evivlio-client-ip'] = req.ip; next(); });
  app.all('/api/auth/*', toNodeHandler(auth));
  const session = req => auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  const protect = asyncRoute(async (req, res, next) => {
    const identity = await session(req);
    if (!identity) {
      if (req.method === 'GET' && req.headers.accept?.includes('text/html')) return res.redirect(`/login?next=${encodeURIComponent(safeNext(req.originalUrl))}`);
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }
    req.user = identity.user;
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  const sameOrigin = (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== origin) return res.status(403).json({ error: 'Invalid origin.' });
    next();
  };
  // Top-level navigation creates the persistent workspace; its same-origin
  // frames still pass through the normal authentication and app handlers.
  app.get('*', (req, res, next) => {
    const page = req.path === '/' || /^\/(folio|lib|yard|cove)(?:\/|$)/.test(req.path) || ['/login', '/account'].includes(req.path);
    if (page && req.headers['sec-fetch-dest'] === 'document' && req.headers.accept?.includes('text/html')) {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.sendFile(resolve('ecosystem/public/shell.html'));
    }
    next();
  });
  app.get(['/login', '/account'], (_req, res) => res.sendFile(resolve('ecosystem/public/account.html')));
  app.use('/ecosystem', express.static(resolve('ecosystem/public')));
  app.use('/api/ecosystem', protect, sameOrigin, express.json({ limit: '8kb' }));
  installGroups(app, db, asyncRoute);
  app.get('/api/ecosystem/me', (req, res) => res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email } }));
  app.get('/api/ecosystem/history', asyncRoute(async (req, res) => {
    const { rows } = await db.query('SELECT id::text, app, query, searched_at FROM ecosystem_searches WHERE user_id = $1 ORDER BY searched_at DESC LIMIT 100', [req.user.id]);
    res.json(rows);
  }));
  app.post('/api/ecosystem/history', asyncRoute(async (req, res) => {
    const { app: source, query } = req.body;
    if (!['lib', 'yard'].includes(source) || typeof query !== 'string' || !query.trim() || query.trim().length > 300) return res.status(400).json({ error: 'Invalid search.' });
    await db.query(`WITH event AS (
      INSERT INTO ecosystem_search_events(user_id,app,query) VALUES ($1,$2,$3) RETURNING user_id,app,query
    ) INSERT INTO ecosystem_searches(user_id,app,query) SELECT user_id,app,query FROM event
      ON CONFLICT(user_id,app,query) DO UPDATE SET searched_at=now()`, [req.user.id, source, query.trim()]);
    res.status(204).end();
  }));
  app.delete('/api/ecosystem/history', asyncRoute(async (req, res) => {
    const source = ['lib','yard'].includes(req.query.app) ? req.query.app : null;
    await db.query(`WITH removed AS (
      DELETE FROM ecosystem_search_events WHERE user_id=$1 AND ($2::text IS NULL OR app=$2)
    ) DELETE FROM ecosystem_searches WHERE user_id=$1 AND ($2::text IS NULL OR app=$2)`, [req.user.id, source]);
    res.status(204).end();
  }));
  app.get('/api/ecosystem/rooms', asyncRoute(async (req, res) => {
    res.json((await db.query('SELECT app, code, visited_at FROM ecosystem_room_visits WHERE user_id = $1 ORDER BY visited_at DESC LIMIT 40', [req.user.id])).rows);
  }));
  app.post('/api/ecosystem/rooms', asyncRoute(async (req, res) => {
    const { app: source, code } = req.body;
    if (!['folio','yard','cove'].includes(source) || typeof code !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(code)) return res.status(400).json({error:'Invalid room.'});
    if (source === 'folio' && !(await db.query('SELECT code FROM folio_rooms WHERE code = $1',[code])).rows.length) return res.status(404).json({error:'Room not found.'});
    await db.query('INSERT INTO ecosystem_rooms(app,code,created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [source,code,req.user.id]);
    await db.query('INSERT INTO ecosystem_room_visits(user_id,app,code) VALUES ($1,$2,$3) ON CONFLICT(user_id,app,code) DO UPDATE SET visited_at = now()', [req.user.id,source,code]);
    await announceRoom(db, req.user.id, source, code);
    res.status(204).end();
  }));
  const proxy = httpProxy.createProxyServer({ ws: true });
  proxy.on('error', (_err, _req, res) => {
    if (!res) return;
    if (res.writeHead && !res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('This room is warming up. Please try again shortly.');
  });
  // Only bundled public assets bypass session/database work. Pages, uploaded
  // documents, APIs, and sockets still pass through protect below.
  if (!dev) {
    for (const [prefix, directory] of [
      ['/folio/assets', 'folio-room-main/.output/public/assets'],
      ['/yard/assets', 'yard-main/.output/public/assets'],
      ['/lib/assets', 'lib-main/dist/assets'],
    ]) app.use(prefix, express.static(resolve(directory), { maxAge: '1y', immutable: true, index: false }));
  }
  // All app traffic enters through this gate; workers bind to loopback only.
  for (const name of ['folio', 'lib', 'yard', 'cove']) {
    const assets = !dev && ['folio','yard'].includes(name)
      ? express.static(resolve(`${name === 'folio' ? 'folio-room' : 'yard'}-main/.output/public`))
      : (_req, _res, next) => next();
    app.use(`/${name}`, protect, sameOrigin, assets, asyncRoute(async (req, res) => {
      const match = req.path.match(/^\/r\/([a-zA-Z0-9_-]{1,64})\/?$/);
      if (match && req.method === 'GET' && req.headers.accept?.includes('text/html')) {
        await db.query('INSERT INTO ecosystem_rooms(app,code,created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [name, match[1], req.user.id]);
        await announceRoom(db, req.user.id, name, match[1]);
        await db.query('INSERT INTO ecosystem_room_visits(user_id,app,code) VALUES ($1,$2,$3) ON CONFLICT(user_id,app,code) DO UPDATE SET visited_at = now()', [req.user.id, name, match[1]]);
      }
      // Express removes mount paths; TanStack and Vite expect their full base path.
      req.url = req.originalUrl;
      proxy.web(req, res, { target: targets[name] });
    }));
  }
  app.use((req, res) => proxy.web(req, res, { target: targets.front }));
  app.use((err, _req, res, _next) => {
    console.error('[gateway]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  const server = http.createServer(app);
  server.on('upgrade', async (req, socket, head) => {
    socket.on('error', () => socket.destroy());
    try {
      const name = ['folio', 'lib', 'yard', 'cove'].find(n => req.url.startsWith(`/${n}/`));
      if (req.headers.origin !== origin || (name && !await session(req))) return socket.destroy();
      proxy.ws(req, socket, head, { target: targets[name || 'front'] });
    } catch { socket.destroy(); }
  });
  // Separate loopback listener: never reachable through the public gateway.
  const internal = express();
  internal.use((req, res, next) => {
    const token = req.headers.authorization || '';
    const expected = `Bearer ${bridgeSecret}`;
    if (token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return res.sendStatus(403);
    next();
  });
  internal.use(express.json({ limit: '2mb' }));
  internal.post('/sql', asyncRoute(async (req, res) => {
    const params = req.body.params.map(p => p && p.__bytes ? Buffer.from(p.__bytes, 'base64') : p);
    const result = await db.query(req.body.text, params);
    res.json(result.rows.map(row => Object.fromEntries(Object.entries(row).map(([k,v]) => [k, v instanceof Uint8Array ? { __bytes: Buffer.from(v).toString('base64') } : v]))));
  }));
  internal.get('/session', asyncRoute(async (req, res) => {
    const headers = new Headers();
    if (req.headers.cookie) headers.set('cookie', req.headers.cookie);
    const identity = await auth.api.getSession({ headers });
    if (!identity) return res.sendStatus(401);
    res.json({ userId: identity.user.id });
  }));
  internal.use((err, _req, res, _next) => { console.error('[internal]', err.message); res.status(500).json({ error: 'Database operation failed.' }); });
  return { server, internal };
}
