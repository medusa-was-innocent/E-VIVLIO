const frames = new Map();
let renderedActive = '';
let active = '', callActive = false, yardState = null;
const keyOf = path => /^\/(folio|lib|yard|cove)(?:\/|$)/.exec(path)?.[1] || (/^\/(account|login)(?:\?|$)/.test(path) ? 'account' : 'cottage');
const safe = value => { try { const url = new URL(value, location.origin); return url.origin === location.origin && (url.pathname === '/' || /^\/(folio|lib|yard|cove)(\/|$)/.test(url.pathname) || ['/login','/account'].includes(url.pathname)) ? url.pathname + url.search + url.hash : null; } catch { return null; } };
function layout() {
  for (const [key, frame] of frames) {
    const mini = key === 'cove' && callActive && active !== 'cove';
    frame.className = mini ? 'call-mini' : key === active ? '' : 'parked';
    frame.inert = key !== active && !mini;
    frame.contentWindow?.postMessage({type:'ecosystem-view',active:key === active,compact:mini},location.origin);
  }
  document.getElementById('call-tools').hidden = !(callActive && active !== 'cove');
  document.getElementById('music').hidden = !(yardState?.title && active !== 'yard');
  document.getElementById('track').textContent = yardState ? `${yardState.title} · ${yardState.artist}` : '';
  const toggle = document.getElementById('toggle-music');
  toggle.textContent = yardState?.playing ? 'Pause' : 'Play';
  toggle.title = yardState?.controlled ? 'Request playback change in your listening room' : '';
  if (renderedActive !== active) { renderedActive = active; document.dispatchEvent(new CustomEvent('ecosystem-place', {detail:active})); }
}
function navigate(value, {replace=false, exact=false} = {}) {
  const path = safe(value); if (!path) return;
  const key = keyOf(path);
  let frame = frames.get(key);
  // Selecting an app returns to its living session, including its current room.
  const home = path === '/' || path === `/${key}/`;
  if (!frame) {
    frame = document.createElement('iframe'); frame.title = key === 'cottage' ? 'Patricia & Patrick’s cottage' : key;
    frame.allow = 'camera; microphone; autoplay; display-capture; fullscreen';
    frames.set(key,frame);
    frame.addEventListener('load', () => {
      try {
        const actual = frame.contentWindow.location.pathname + frame.contentWindow.location.search + frame.contentWindow.location.hash;
        frame.dataset.path = actual;
        if (key === active) history.replaceState(null,'',actual);
      } catch {}
      layout();
    });
    frame.src = path; frame.dataset.path = path; document.getElementById('places').append(frame);
  } else if ((!home || exact || keyOf(frame.dataset.path) !== key) && frame.dataset.path !== path) {
    // Never destroy a live call through a link to another Cove room.
    if (key !== 'cove' || !callActive) { frame.src = path; frame.dataset.path = path; }
  }
  active = key;
  document.title = frame.dataset.title || 'E-VIVLIO';
  const target = frame.dataset.path || path;
  if (location.pathname + location.search + location.hash !== target) history[replace ? 'replaceState' : 'pushState'](null,'',target);
  layout();
}
window.evivlioNavigate = navigate;
window.addEventListener('message', e => {
  if (e.origin !== location.origin) return;
  const entry = [...frames].find(([,frame]) => frame.contentWindow === e.source); if (!entry) return;
  const [key,frame] = entry, data = e.data;
  if (data?.type === 'ecosystem-navigate') navigate(data.path);
  if (data?.type === 'ecosystem-route') {
    const path = safe(data.path); if (!path) return;
    frame.dataset.path = path;
    frame.dataset.title = data.title || 'E-VIVLIO';
    if (active === key) { history.replaceState(null,'',path); document.title = data.title || 'E-VIVLIO'; }
  }
  if (data?.type === 'ecosystem-call' && key === 'cove') { callActive = !!data.active; layout(); }
  if (data?.type === 'ecosystem-player' && key === 'yard') { yardState = data; layout(); }
  if (data?.type === 'ecosystem-signout') { location.assign('/'); }
});
window.addEventListener('popstate', () => navigate(location.href,{replace:true,exact:true}));
document.getElementById('expand-call').onclick = () => navigate('/cove/');
document.getElementById('open-yard').onclick = () => navigate('/yard/');
document.getElementById('toggle-music').onclick = () => frames.get('yard')?.contentWindow.postMessage({type:'ecosystem-player-toggle'},location.origin);
navigate(location.href,{replace:true});
