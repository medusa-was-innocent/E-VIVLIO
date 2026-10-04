const embedded = window.parent !== window;
window.evivlioNavigate ||= path => embedded
  ? parent.postMessage({type:'ecosystem-navigate',path},location.origin)
  : location.assign(path);
document.addEventListener('click', event => {
  const a = event.composedPath().find(node => node instanceof HTMLAnchorElement);
  if (!a || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || a.download || (a.target && a.target !== '_self')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  const current = location.pathname.split('/')[1], destination = url.pathname.split('/')[1];
  if (!['', 'folio', 'lib', 'yard', 'cove', 'account', 'login'].includes(destination)) return;
  if (!embedded || destination !== current || (current === 'cove' && document.querySelector('#stage.is-visible'))) {
    event.preventDefault(); event.stopImmediatePropagation();
    window.evivlioNavigate(url.pathname + url.search + url.hash);
  }
},true);
if (embedded) {
  const report = () => parent.postMessage({type:'ecosystem-route',path:location.pathname+location.search+location.hash,title:document.title},location.origin);
  for (const name of ['pushState','replaceState']) {
    const original = history[name].bind(history);
    history[name] = (...args) => { original(...args); report(); };
  }
  window.addEventListener('popstate',report); report();
}
const root = document.createElement('div');
root.dataset.app = location.pathname.split('/')[1];
const shadow = root.attachShadow({mode:'open'});
shadow.innerHTML = `<style>:host{position:fixed;bottom:18px;left:18px;z-index:9999;font:13px Georgia,serif}:host([data-app="yard"]){bottom:92px}@media(max-width:767px){:host([data-app="yard"]){bottom:156px}}details{background:#fffdf6;color:#303d30;border:1px solid #d8dac9;border-radius:12px;box-shadow:0 4px 20px #0002}summary{cursor:pointer;list-style:none;padding:14px 18px;min-height:18px}summary::-webkit-details-marker{display:none}nav{padding:0 8px 8px;display:grid}a{padding:12px 10px;color:inherit;text-decoration:none;border-radius:6px}a:hover,a:focus-visible{background:#e9eddf}small{color:#747765}details[open] summary{border-bottom:1px solid #d8dac9;margin-bottom:6px}</style><details><summary aria-label="Open E-VIVLIO navigation">E-VIVLIO <small> / your places ↑</small></summary><nav aria-label="Your places"><a href="/">The cottage</a><a href="/folio/">Folio Room · read together</a><a href="/lib/">Lib · find a book</a><a href="/yard/">Yard · listen together</a><a href="/cove/">Cove · catch up</a><a href="/account">Your account & history</a></nav></details>`;
if (!embedded) document.body.append(root);
document.addEventListener('ecosystem-place', event => {root.dataset.app=event.detail;shadow.querySelector('details').open=false;});
document.addEventListener('keydown', e => { if(e.key === 'Escape') shadow.querySelector('details').open=false; });
// TanStack navigation does not request a new HTML page. Remember room visits
// when its route changes as well as when a room URL is opened directly.
let lastPath = '';
setInterval(() => {
  if (location.pathname === lastPath) return;
  lastPath = location.pathname;
  const match = lastPath.match(/^\/(folio|yard|cove)\/r\/([a-zA-Z0-9_-]{1,64})\/?$/);
  if (match) fetch('/api/ecosystem/rooms', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app:match[1],code:match[2]})}).catch(() => {});
}, 2000);
