'use strict';
const auth=require('../lib/auth');
const store=require('../lib/store');
const {validateContent,fail}=require('../lib/content');
const {json,body,error}=require('../lib/http');
function summary(state){return {content:state.draft,revision:state.revision,savedAt:state.savedAt,publishedAt:state.publishedAt,hasUnpublishedChanges:JSON.stringify(state.draft)!==JSON.stringify(state.published),canRollback:!!state.previous};}
module.exports=async(req,res)=>{
  try {
    const action=new URL(req.url,'http://localhost').searchParams.get('action')||'session';
    if(action==='session'&&req.method==='GET'){const session=auth.session(req);return json(res,200,{configured:auth.configured(),storageReady:store.ready(),authenticated:!!session,csrf:session?.nonce||null,username:session?(process.env.OWNER_USERNAME||'owner'):null});}
    if(!auth.configured())fail('Owner login has not been configured on this server.',503);
    if(action==='login'&&req.method==='POST'){
      auth.checkOrigin(req);
      const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
      await store.loginAttempt(ip);
      const input=await body(req);const correct=await auth.verifyPassword(input.password);
      if(input.username!==(process.env.OWNER_USERNAME||'owner')||!correct)fail('The username or password is incorrect.',401);
      const token=auth.token();res.setHeader('Set-Cookie',auth.cookie(req,token));return json(res,200,{ok:true});
    }
    if(req.method==='GET'){
      auth.requireSession(req);const {state}=await store.read();
      if(action==='draft'||action==='preview')return json(res,200,summary(state));
      fail('Not found.',404);
    }
    if(req.method!=='POST')fail('Method not allowed.',405);
    auth.requireMutation(req);const input=await body(req);
    if(action==='logout'){res.setHeader('Set-Cookie',auth.cookie(req,'',true));return json(res,200,{ok:true});}
    if(action==='upload'){
      if(typeof input.data!=='string'||input.data.length>3000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.data))fail('Choose a photo under 2 MB.');
      const buffer=Buffer.from(input.data,'base64');if(buffer.length<32||buffer.length>2000000)fail('Choose a photo under 2 MB.');
      return json(res,200,{image:await store.upload(buffer)});
    }
    if(!Number.isSafeInteger(input.revision))fail('Reload this page before saving.');
    const result=await store.change(input.revision,state=>{
      const now=new Date().toISOString();
      if(action==='save'){state.draft=validateContent(input.content);state.savedAt=now;}
      else if(action==='publish'){state.draft=validateContent(state.draft);state.previous=state.published;state.published=structuredClone(state.draft);state.publishedAt=now;}
      else if(action==='discard'){state.draft=structuredClone(state.published);state.savedAt=now;}
      else if(action==='rollback'){if(!state.previous)fail('No previous publication to restore.');const previous=state.published;state.published=state.previous;state.previous=previous;state.draft=structuredClone(state.published);state.savedAt=now;state.publishedAt=now;}
      else fail('Not found.',404);
      return state;
    });
    return json(res,200,summary(result));
  } catch(e){error(res,e);}
};
