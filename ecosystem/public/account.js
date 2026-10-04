const $ = id => document.getElementById(id);
let signup = false;
const rawNext = new URLSearchParams(location.search).get('next');
const next = rawNext && /^\/(folio|lib|yard|cove)(\/[^\\]*)?$/.test(rawNext) ? rawNext : '/account';
async function api(path, method = 'GET', body) {
  const res = await fetch(path, { method, credentials: 'same-origin', headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.error || 'Unable to complete that request. Please try again.');
  return data;
}
$('toggle-mode').onclick = () => {
  signup = !signup;
  $('name-field').hidden = !signup;
  $('auth-form').elements.name.required = signup;
  $('auth-form').elements.password.autocomplete = signup ? 'new-password' : 'current-password';
  $('form-title').textContent = signup ? 'A key of your own.' : 'Take a seat.';
  $('submit').textContent = signup ? 'Create account' : 'Sign in';
  $('toggle-mode').textContent = signup ? 'Already at home? Sign in' : 'New here? Create an account';
  $('auth-error').textContent = '';
};
$('auth-form').onsubmit = async e => {
  e.preventDefault(); $('submit').disabled = true; $('auth-error').textContent = '';
  try {
    const values = Object.fromEntries(new FormData(e.target));
    await api(`/api/auth/${signup ? 'sign-up' : 'sign-in'}/email`, 'POST', values);
    window.evivlioNavigate(next);
  } catch(err) { $('auth-error').textContent = err.message; } finally { $('submit').disabled = false; }
};
$('sign-out').onclick = async () => {
  try { await api('/api/auth/sign-out', 'POST', {}); if (parent !== window) parent.postMessage({type:'ecosystem-signout'}, location.origin); else location.assign('/'); }
  catch(err) { $('account-error').textContent = err.message; }
};
function empty(list, message) { const li = document.createElement('li'); li.className='empty'; li.textContent=message; list.append(li); }
async function refresh() {
  const [searches, rooms] = await Promise.all([api('/api/ecosystem/history'), api('/api/ecosystem/rooms')]);
  $('searches').replaceChildren(); $('rooms').replaceChildren();
  for (const row of searches) {
    const li = document.createElement('li'), a = document.createElement('a'), tag = document.createElement('span');
    a.textContent = row.query; a.href = `/${row.app}/?q=${encodeURIComponent(row.query)}`; tag.textContent = row.app;
    li.append(a, tag); $('searches').append(li);
  }
  for (const row of rooms) {
    const li = document.createElement('li'), a = document.createElement('a'), tag = document.createElement('span');
    a.textContent = row.code; a.href = `/${row.app}/r/${encodeURIComponent(row.code)}`; tag.textContent = row.app;
    li.append(a, tag); $('rooms').append(li);
  }
  if (!searches.length) empty($('searches'), 'Your next discovery starts in Lib or Yard. Searches you make there will appear here.');
  if (!rooms.length) empty($('rooms'), 'Join a room in Folio, Yard, or Cove to keep its link here.');
}
$('clear-history').onclick = async () => {
  $('clear-history').disabled = true;
  try { await api('/api/ecosystem/history','DELETE'); await refresh(); }
  catch(err) { $('account-error').textContent = err.message; }
  finally { $('clear-history').disabled = false; }
};
try {
  const identity = await api('/api/auth/get-session');
  $('session-status').textContent = '';
  if (identity?.user) {
    $('auth-view').hidden = true;
    if (location.pathname === '/login' && rawNext) window.evivlioNavigate(next);
    else { $('account-view').hidden = false; $('greeting').textContent = `Welcome, ${identity.user.name}.`; try { await refresh(); } catch (error) { $('account-error').textContent = error.message; } }
  } else $('auth-view').hidden = false;
} catch(err) { $('session-status').textContent = ''; $('auth-view').hidden = false; $('auth-error').textContent = 'Your account could not be checked. Please try signing in.'; }
