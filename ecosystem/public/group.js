const el = id => document.getElementById(id);
let snapshot = null, busy = false, last = '', seen = '', dismissedRoom = '', timer;
const status = text => el('group-status').textContent = text;
async function api(path='', options={}) {
  const response = await fetch('/api/ecosystem/group'+path, {
    ...options, headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) { const data=await response.json(); throw new Error(data.error || 'Please try again.'); }
  return response.status===204 ? null : response.json();
}
function render(data) {
  snapshot=data;
  el('group-setup').hidden=!!data.group;
  el('group-content').hidden=!data.group;
  el('group-title').textContent=data.group?.name || 'Your group';
  const signature=JSON.stringify(data);
  if (signature===last) return;
  last=signature;
  const list=el('group-events'), bottom=list.scrollHeight-list.scrollTop-list.clientHeight<60;
  list.replaceChildren();
  for (const event of data.events) {
    const row=document.createElement('article');
    row.className=event.user_id===data.userId ? 'mine' : '';
    const author=document.createElement('strong'); author.textContent=event.name;
    const text=document.createElement('p');
    row.append(author,text);
    if (event.app) {
      text.textContent=`Opened a ${event.app === 'cove' ? 'Cove call' : event.app === 'folio' ? 'Folio reading room' : 'Yard listening room'}`;
      const join=document.createElement('button');join.textContent='Open room';
      join.onclick=()=>window.evivlioNavigate(`/${event.app}/r/${encodeURIComponent(event.code)}`);
      row.append(join);
    } else text.textContent=event.body;
    list.append(row);
  }
  const newest=data.events.at(-1)?.id || '';
  if (!el('group-panel').hidden) {seen=newest;if(bottom)list.scrollTop=list.scrollHeight;}
  const unread=data.events.filter(e=>e.user_id!==data.userId && BigInt(e.id)>BigInt(seen || 0)).length;
  el('group-unread').textContent=unread ? `(${unread})` : '';
  const room=data.events.filter(e=>e.app && e.user_id!==data.userId && BigInt(e.id)>BigInt(seen || 0)).at(-1);
  const notice=el('group-notice');
  notice.hidden=!room || room.id===dismissedRoom || !el('group-panel').hidden;
  if(room){notice.textContent=`${room.name} opened ${room.app === 'cove' ? 'a call' : 'a '+room.app+' room'} · Join`;notice.onclick=()=>{dismissedRoom=room.id;notice.hidden=true;window.evivlioNavigate(`/${room.app}/r/${encodeURIComponent(room.code)}`);};}
  el('group-toggle').title=room ? `${room.name} opened a ${room.app} room — open group chat to join` : 'Messages and rooms for your group';
}
async function refresh() {
  clearTimeout(timer);
  if(busy)return;
  busy=true;
  try {
    const data=await api();el('group-toggle').hidden=false;render(data);
  } catch(error) {
    if(error.message==='Please sign in to continue.') {el('group-toggle').hidden=true;el('group-panel').hidden=true;snapshot=null;last='';seen='';el('group-notice').hidden=true;}
    else if(!el('group-panel').hidden) status('Connection interrupted. Retrying…');
  } finally {busy=false;timer=setTimeout(refresh,document.hidden ? 30000 : 8000);}
}
function toggle(open) {
  el('group-panel').hidden=!open;el('group-toggle').setAttribute('aria-expanded',String(open));
  if(open) {el('group-notice').hidden=true;seen=snapshot?.events.at(-1)?.id || '';el('group-unread').textContent='';refresh();el('group-events').scrollTop=el('group-events').scrollHeight;}
}
el('group-toggle').onclick=()=>toggle(el('group-panel').hidden);
el('group-close').onclick=()=>toggle(false);
async function mutate(path,options) {
  status('');
  try {await api(path,options);await refresh();return true;}catch(error){status(error.message);return false;}
}
for (const [id,field] of [['group-create','name'],['group-join','invite']]) {
  el(id).onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;await mutate('',{method:'POST',body:JSON.stringify({[field]:new FormData(el(id)).get(field)})});button.disabled=false;};
}
el('group-message').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;if(await mutate('/messages',{method:'POST',body:JSON.stringify({body:new FormData(form).get('body')})}))form.reset();button.disabled=false;};
el('group-copy').onclick=async()=>{try{await navigator.clipboard.writeText(snapshot.group.invite);status('Group code copied. Share it only with people you want in this group.');}catch{status(`Group code: ${snapshot.group.invite}`);}};
el('group-leave').onclick=()=>{if(confirm('Leave this group? You will need its code to join again.'))mutate('',{method:'DELETE'});};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
refresh();
