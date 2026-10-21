'use strict';
const store=require('../lib/store');
const {publicContent}=require('../lib/content');
const {json,error}=require('../lib/http');
module.exports=async(req,res)=>{try{if(req.method!=='GET')return json(res,405,{error:'Method not allowed.'});const {state}=await store.read();json(res,200,{content:publicContent(state.published),publishedAt:state.publishedAt});}catch(e){error(res,e);}};
