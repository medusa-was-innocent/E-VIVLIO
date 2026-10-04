import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {createGateway} from '../gateway.mjs';
test('built public bundles are compressed and cached without accessing the session database',async t=>{
 const name=(await readdir('lib-main/dist/assets').catch(()=>[])).find(n=>n.endsWith('.js'));
 if(!name)return t.skip('Run npm run build to verify production bundles.');
 let sessions=0;
 const {server}=createGateway({db:{},auth:{api:{getSession:async()=>{sessions++;return null;}}},origin:'http://localhost',targets:{},bridgeSecret:'test'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  const response=await fetch(`${url}/lib/assets/${name}`,{headers:{'Accept-Encoding':'gzip'}});
  assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/immutable/);
  assert.equal(response.headers.get('content-encoding'),'gzip');await response.arrayBuffer();
  assert.equal(sessions,0);
  for(const path of ['/lib/','/folio/r/ABCDEF','/yard/api/rtc','/cove/socket.io/?transport=polling'])assert.equal((await fetch(url+path)).status,401);
  assert.equal(sessions,4);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
