import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../public/shell.js',import.meta.url),'utf8');
function workspace() {
  const events = {}, nodes = new Map(), frames = [];
  const location = new URL('http://localhost:4400/');
  location.assign = path => { location.href = new URL(path,location).href; };
  const history = {pushState(_s,_t,path){location.assign(path);},replaceState(_s,_t,path){location.assign(path);}};
  const document = {
    title:'', dispatchEvent(){},
    getElementById(id) { if (!nodes.has(id)) nodes.set(id,{append(frame){frames.push(frame);}}); return nodes.get(id); },
    createElement() {
      return {dataset:{},contentWindow:{postMessage(){}},addEventListener(){},loads:0,set src(path){this._src=path;this.loads++;},get src(){return this._src;}};
    },
  };
  const window = {addEventListener(type,fn){events[type]=fn;}};
  vm.runInNewContext(source,{window,document,location,history,URL,CustomEvent:class{},console});
  const send = (frame,data,origin=location.origin) => events.message({source:frame.contentWindow,origin,data});
  return {window,frames,nodes,events,send,location};
}

test('app switching preserves cottage and Yard documents and restores the current room', () => {
  const w=workspace(), cottage=w.frames[0];
  w.window.evivlioNavigate('/yard/r/ABC234'); const yard=w.frames[1];
  w.window.evivlioNavigate('/lib/');
  w.window.evivlioNavigate('/yard/');
  assert.equal(yard.loads,1);
  assert.equal(w.location.pathname,'/yard/r/ABC234');
  w.window.evivlioNavigate('/');
  assert.equal(cottage.loads,1);
  assert.equal(cottage.className,'');
  assert.equal(yard.className,'parked');
});

test('a live Cove frame becomes a mini call and cannot be replaced by another room link', () => {
  const w=workspace(); w.window.evivlioNavigate('/cove/r/first'); const cove=w.frames[1];
  w.send(cove,{type:'ecosystem-call',active:true});
  w.window.evivlioNavigate('/folio/');
  assert.equal(cove.className,'call-mini'); assert.equal(cove.inert,false);
  assert.equal(w.nodes.get('call-tools').hidden,false);
  w.window.evivlioNavigate('/cove/r/second');
  assert.equal(cove.loads,1); assert.equal(w.location.pathname,'/cove/r/first');
  w.send(cove,{type:'ecosystem-call',active:false});
  w.window.evivlioNavigate('/lib/'); assert.equal(cove.className,'parked');
});

test('music controls follow the retained Yard player, and messages are origin/source checked', () => {
  const w=workspace(); w.window.evivlioNavigate('/yard/'); const yard=w.frames[1];
  w.send(yard,{type:'ecosystem-player',title:'Test song',artist:'Artist',playing:true});
  w.window.evivlioNavigate('/lib/');
  assert.equal(w.nodes.get('music').hidden,false);
  assert.equal(w.nodes.get('toggle-music').textContent,'Pause');
  let command; yard.contentWindow.postMessage=data=>{command=data;};
  w.nodes.get('toggle-music').onclick(); assert.equal(command.type,'ecosystem-player-toggle');
  w.send(yard,{type:'ecosystem-navigate',path:'/cove/'},'https://evil.test');
  assert.equal(w.location.pathname,'/lib/');
  w.window.evivlioNavigate('https://evil.test'); assert.equal(w.location.pathname,'/lib/');
});

test('sign-in can resume an app whose frame was redirected to login', () => {
  const w=workspace(); w.window.evivlioNavigate('/yard/'); const yard=w.frames[1];
  w.send(yard,{type:'ecosystem-route',path:'/login?next=%2Fyard%2F',title:'Sign in'});
  w.window.evivlioNavigate('/yard/');
  assert.equal(yard.src,'/yard/'); assert.equal(yard.loads,2);
});
