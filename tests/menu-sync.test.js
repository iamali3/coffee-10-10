'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('an already-open mobile menu updates all published fields without a reload or repeated rendering',async()=>{
  const events={},timers=[],requests=[];let renders=0;
  let published={items:[{id:'test',cat:'hookah',price:5000,en:'Old',ar:'قديم',image:'old.jpg'}],categories:[{id:'hookah',group:'hookah',ar:'الأراكيل',en:'Hookah'}],settings:{content:{ar:{heroTitle:'قديم'},en:{heroTitle:'Old'}},whatsapp:'9647700000000',socialLinks:{}}};
  const context={URL,URLSearchParams,AbortSignal,Date,location:{href:'https://coffee1010.vercel.app/',search:'',protocol:'https:'},window:{addEventListener(name,fn){events[name]=fn;}},navigator:{},localStorage:{getItem(){return null;},setItem(){}},document:{visibilityState:'visible',querySelectorAll(){return[];},querySelector(){return{};},addEventListener(name,fn){events[name]=fn;}},menu:[],cats:{},text:{ar:{},en:{}},active:'group:hookah',lang:'en',mainKey(){return'hookah';},renderTabs(){},setLanguage(){renders++;},setInterval(fn,ms){timers.push({fn,ms});},fetch:async url=>{requests.push(url);return{ok:true,json:async()=>({content:structuredClone(published)})};}};
  Object.assign(context,{AbortController,setTimeout,clearTimeout});
  context.AbortSignal={}; // Older Safari has no AbortSignal.timeout().
  vm.runInNewContext(fs.readFileSync(require.resolve('../menu-content.js'),'utf8'),context);await flush();
  assert.equal(context.menu[0].price,5000);assert.equal(timers[0].ms,15000);
  published=structuredClone(published);Object.assign(published.items[0],{price:6000,en:'New',ar:'جديد',image:'new.jpg',soldOut:true});published.settings.content.en.heroTitle='Updated';
  await timers[0].fn();await flush();assert.equal(context.menu[0].price,6000);assert.equal(context.menu[0].image,'new.jpg');assert.equal(context.menu[0].soldOut,true);assert.equal(context.text.en.heroTitle,'Updated');
  const rendered=renders;await timers[0].fn();await flush();assert.equal(renders,rendered,'unchanged polls must not restart animations');
  assert.ok(requests.every(url=>url.startsWith('api/menu?sync=')));
  for(const event of ['pageshow','focus','online','visibilitychange']){assert.equal(typeof events[event],'function');await events[event]();await flush();}
  context.document.visibilityState='hidden';const count=requests.length;await timers[0].fn();assert.equal(requests.length,count,'background tabs do not poll');
});
