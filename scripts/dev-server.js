'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const handlers={'/api/menu':require('../api/menu'),'/api/owner':require('../api/owner'),'/api/photo':require('../api/photo')};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(handlers[pathname])return handlers[pathname](req,res);
    if(pathname==='/admin'){res.writeHead(302,{Location:'/admin/'});return res.end();}
    if(pathname.split('/').some(segment=>segment.startsWith('.'))||/^\/(lib|scripts|tests|node_modules)\//.test(pathname)){res.writeHead(404);return res.end('Not found');}
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}
    const content=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(content);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:500);res.end('Not found');}
}).listen(Number(process.env.PORT)||4180,'127.0.0.1',()=>console.log(`Coffee 10:10: http://127.0.0.1:${Number(process.env.PORT)||4180}/admin/`));
