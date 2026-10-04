import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../db.mjs';
import { createAuth } from '../auth.mjs';
import { createGateway, safeNext } from '../gateway.mjs';

test('redirect destinations stay inside ecosystem routes', () => {
  for (const url of ['https://evil.test','//evil.test','/\\evil.test','/folio/\\evil.test']) assert.equal(safeNext(url), '/');
  assert.equal(safeNext('/folio/r/ABCD23'), '/folio/r/ABCD23');
});

test('real accounts, shared sessions, private history, CSRF, room persistence, logout', async () => {
  const db = await openDatabase({ url: '', dataDir: 'memory://' });
  const origin = 'http://localhost:4490';
  const auth = createAuth(db, origin);
  const { server } = createGateway({ db, auth, origin, targets: {}, bridgeSecret: 'test-secret' });
  await new Promise(resolve => server.listen(4490, '127.0.0.1', resolve));
  const call = (path, { cookie, body, method = 'GET', source = origin } = {}) => fetch(`${origin}${path}`, {
    method, headers: { Origin: source, ...(cookie ? {Cookie:cookie} : {}), ...(body ? {'Content-Type':'application/json'} : {}) },
    body: body ? JSON.stringify(body) : undefined, redirect:'manual'
  });
  try {
    const shell = await fetch(`${origin}/yard/`, {headers:{'Sec-Fetch-Dest':'document',Accept:'text/html'}});
    assert.match(await shell.text(), /ecosystem\/shell.js/);
    const frame = await fetch(`${origin}/yard/`, {headers:{'Sec-Fetch-Dest':'iframe',Accept:'text/html'},redirect:'manual'});
    assert.equal(frame.status,302);
    assert.match(frame.headers.get('location'), /^\/login/);
    assert.equal((await call('/api/ecosystem/history')).status,401);
    for (const path of ['/folio/', '/yard/api/rtc', '/cove/socket.io/?transport=polling', '/lib/']) assert.equal((await call(path)).status,401);
    async function signup(email) {
      const res = await call('/api/auth/sign-up/email', { method:'POST', body:{name:'Test Reader',email,password:'OnlyForLocalTesting!2026'} });
      assert.equal(res.status,200,await res.clone().text());
      const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
      assert.match(cookie,/session_token/); assert.match(res.headers.getSetCookie().join(';'), /httponly/i);
      return cookie;
    }
    const alice = await signup('alice@example.test'), bob = await signup('bob@example.test');
    assert.equal((await call('/api/ecosystem/history', {cookie:alice,method:'POST',body:{app:'lib',query:'The Hobbit',user_id:'somebody-else'}})).status,204);
    assert.equal((await call('/api/ecosystem/history', {cookie:alice,method:'POST',body:{app:'yard',query:'Jazz'}})).status,204);
    assert.equal((await call('/api/ecosystem/history',{cookie:alice})).status,200);
    assert.equal((await (await call('/api/ecosystem/history',{cookie:alice})).json()).length,2);
    assert.deepEqual(await (await call('/api/ecosystem/history',{cookie:bob})).json(),[]);
    assert.equal((await call('/api/ecosystem/history',{cookie:alice,method:'POST',source:'https://evil.test',body:{app:'lib',query:'Injected'}})).status,403);
    assert.equal((await call('/api/ecosystem/history',{cookie:alice,method:'POST',body:{app:'invalid',query:'x'}})).status,400);
    assert.equal((await call('/api/ecosystem/rooms',{cookie:alice,method:'POST',body:{app:'yard',code:'ABC234'}})).status,204);
    assert.equal((await (await call('/api/ecosystem/rooms',{cookie:alice})).json())[0].code,'ABC234');
    assert.deepEqual(await (await call('/api/ecosystem/rooms',{cookie:bob})).json(),[]);
    await call('/api/ecosystem/history',{cookie:alice,method:'POST',body:{app:'lib',query:'The Hobbit'}});
    const me=await (await call('/api/ecosystem/me',{cookie:alice})).json();
    assert.equal((await db.query("SELECT count(*)::int AS n FROM ecosystem_search_events WHERE user_id=$1 AND app='lib'",[me.user.id])).rows[0].n,2);
    assert.equal((await (await call('/api/ecosystem/history',{cookie:alice})).json()).filter(row=>row.app==='lib').length,1);
    await call('/api/ecosystem/history?app=lib',{cookie:alice,method:'DELETE'});
    assert.equal((await db.query("SELECT count(*)::int AS n FROM ecosystem_search_events WHERE user_id=$1 AND app='lib'",[me.user.id])).rows[0].n,0);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM ecosystem_search_events WHERE user_id=$1 AND app='yard'",[me.user.id])).rows[0].n,1);
    assert.equal((await (await call('/api/ecosystem/history',{cookie:alice})).json())[0].app,'yard');
    // Group feeds are private; clients cannot choose somebody else's group or author.
    assert.equal((await call('/api/ecosystem/group/messages',{cookie:bob,method:'POST',body:{body:'Not a member'}})).status,403);
    assert.equal((await call('/api/ecosystem/group',{cookie:alice,method:'POST',body:{name:'Reading friends'}})).status,201);
    const group = (await (await call('/api/ecosystem/group',{cookie:alice})).json()).group;
    assert.equal((await (await call('/api/ecosystem/group',{cookie:bob})).json()).group,null);
    assert.equal((await call('/api/ecosystem/group',{cookie:bob,method:'POST',body:{invite:group.invite}})).status,201);
    assert.equal((await call('/api/ecosystem/group/messages',{cookie:alice,method:'POST',body:{body:'Hello group',user_id:'fake'}})).status,201);
    let feed=await (await call('/api/ecosystem/group',{cookie:bob})).json();
    assert.equal(feed.events[0].body,'Hello group');
    assert.notEqual(feed.events[0].user_id,'fake');
    for(let n=0;n<2;n++) await call('/api/ecosystem/rooms',{cookie:alice,method:'POST',body:{app:'cove',code:'group-call'}});
    feed=await (await call('/api/ecosystem/group',{cookie:bob})).json();
    assert.equal(feed.events.filter(e=>e.code==='group-call').length,1);
    assert.equal((await call('/api/ecosystem/group/messages',{cookie:bob,method:'POST',source:'https://evil.test',body:{body:'Injected'}})).status,403);
    await call('/api/ecosystem/group',{cookie:bob,method:'DELETE'});
    assert.deepEqual((await (await call('/api/ecosystem/group',{cookie:bob})).json()).events,[]);
    const signedOut = await call('/api/auth/sign-out',{cookie:alice,method:'POST',body:{}});
    assert.equal(signedOut.status,200);
    assert.equal((await call('/api/ecosystem/history',{cookie:alice})).status,401);
    assert.equal((await call('/api/ecosystem/history',{cookie:bob})).status,200);
  } finally { await new Promise(resolve => server.close(resolve)); await db.close(); }
});
