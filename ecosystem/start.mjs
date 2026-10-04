import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import express from 'express';
import { resolve } from 'node:path';
import { openDatabase } from './db.mjs';
import { createAuth } from './auth.mjs';
import { createGateway } from './gateway.mjs';

const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || 4400);
const origin = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
const bridgeSecret = randomBytes(32).toString('hex');
const db = await openDatabase();
const auth = createAuth(db, origin);
const names = { front: 'john-and-patricias-romantic-comfort-website-main', lib: 'lib-main', folio: 'folio-room-main', yard: 'yard-main', cove: 'cove-main' };
const ports = { front: 4410, lib: 4411, folio: 4412, yard: 4413, cove: 4414 };
const targets = Object.fromEntries(Object.entries(ports).map(([name, port]) => [name, `http://127.0.0.1:${port}`]));
const { server, internal } = createGateway({ db, auth, origin, targets, bridgeSecret, dev });
const internalServer = internal.listen(4409, '127.0.0.1');
const children = [];
const staticServers = [];
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  server.close(); internalServer.close(); staticServers.forEach(s => s.close());
  await db.close(); process.exit(code);
}
process.on('uncaughtException', err => { console.error(err); void stop(1); });
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
for (const [name, cwd] of Object.entries(names)) {
  if (!dev && ['front', 'lib'].includes(name)) {
    const staticApp = express();
    staticApp.use(name === 'lib' ? '/lib' : '/', express.static(resolve(cwd, 'dist'), { setHeaders(res, path) {
      if (path.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (/\.(glb|ktx2|webp|jpg|woff2|mp3|wasm)$/.test(path)) res.setHeader('Cache-Control', 'public, max-age=86400');
      else res.setHeader('Cache-Control', 'no-cache');
    } }));
    staticApp.get('*', (_req, res) => res.sendFile(resolve(cwd, 'dist/index.html')));
    staticServers.push(staticApp.listen(ports[name], '127.0.0.1'));
    continue;
  }
  const args = name === 'cove' ? ['server.js'] : dev ? ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(ports[name])] : ['.output/server/index.mjs'];
  const child = spawn(dev && name !== 'cove' ? 'npm' : process.execPath, args, { cwd, stdio: 'inherit', detached: true, env: { ...process.env, PORT: String(ports[name]), HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1', NITRO_PORT: String(ports[name]), ECOSYSTEM: '1', ECOSYSTEM_BRIDGE_URL: 'http://127.0.0.1:4409', ECOSYSTEM_BRIDGE_SECRET: bridgeSecret } });
  children.push(child);
  child.on('exit', code => { if (!stopping) { console.error(`${name} stopped (${code}); shutting down the ecosystem.`); void stop(1); } });
}
server.listen(port, '0.0.0.0', () => console.log(`E-VIVLIO: ${origin}`));
