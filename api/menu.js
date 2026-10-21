'use strict';
const store=require('../lib/store');
const {publicContent}=require('../lib/content');
const {json,error}=require('../lib/http');
module.exports=async(req,res)=>{try{if(req.method!=='GET')return json(res,405,{error:'Method not allowed.'});const {state}=await store.read();res.setHeader('Vercel-CDN-Cache-Control','no-store');res.setHeader('CDN-Cache-Control','no-store');json(res,200,{content:publicContent(state.published),publishedAt:state.publishedAt,revision:state.revision});}catch(e){error(res,e);}};
