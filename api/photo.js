'use strict';
const store=require('../lib/store');
const auth=require('../lib/auth');
const {fail}=require('../lib/content');
const {error}=require('../lib/http');
module.exports=async(req,res)=>{try{
  if(req.method!=='GET')fail('Method not allowed.',405);
  const id=new URL(req.url,'http://localhost').searchParams.get('id');if(!/^[a-f0-9-]{36}$/.test(id||''))fail('Photo not found.',404);
  const {state}=await store.read();const visible=state.published.items.some(p=>!p.hidden&&p.image===`api/photo?id=${id}`);
  if(!visible&&!auth.session(req))fail('Photo not found.',404);
  const result=await store.photo(id);res.setHeader('Content-Type',result.type);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',visible?'public, max-age=3600':'private, no-store');res.end(result.buffer);
}catch(e){error(res,e);}};
