'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function worker(){const handlers={};const context={URL,Request,Response,location:{origin:'https://coffee1010.vercel.app'},self:{registration:{scope:'https://coffee1010.vercel.app/'},addEventListener(type,fn){handlers[type]=fn;}},caches:{},fetch(){throw new Error('Unexpected network call');}};vm.runInNewContext(fs.readFileSync(require.resolve('../service-worker.js'),'utf8'),context);return handlers;}
test('offline worker never intercepts private admin pages, owner API, or draft previews',()=>{
  const handlers=worker();for(const route of ['/admin/','/admin/owner.js','/api/owner?action=draft','/api/owner?action=session','/?preview=1']){
    let handled=false;handlers.fetch({request:new Request('https://coffee1010.vercel.app'+route),respondWith(){handled=true;}});assert.equal(handled,false,route);
  }
  let ready=false;handlers.message({data:{type:'OWNER_CACHE_POLICY'},ports:[{postMessage(value){ready=value.privateOwnerAPI;}}]});assert.equal(ready,true);
});
test('draft photo preview cannot enter the public offline cache',()=>{
  let handled=false;worker().fetch({request:new Request('https://coffee1010.vercel.app/api/photo?id=123',{referrer:'https://coffee1010.vercel.app/?preview=1'}),respondWith(){handled=true;}});assert.equal(handled,false);
});
test('deployment build exposes only customer and dashboard static assets',()=>{
  const root=require('node:path').join(__dirname,'../public');assert.ok(fs.existsSync(root+'/admin/index.html'));assert.ok(fs.existsSync(root+'/data/menu.json'));
  for(const name of ['.env.local','.owner-data','lib','api','scripts','node_modules'])assert.equal(fs.existsSync(root+'/'+name),false,name);
});
