'use strict';
function json(res, status, body) { res.statusCode = status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.end(JSON.stringify(body)); }
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks=[]; let length=0;
  for await (const chunk of req) { length+=chunk.length; if(length>3500000) { const e=new Error('Photo or request is too large.'); e.status=413; throw e; } chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}
function error(res,e) { if(!e.status) console.error('Owner API error:', e.name, e.message); json(res,e.status || 503,{error:e.status ? e.message : 'The content service is unavailable. Your changes have not been published.'}); }
module.exports={json,body,error};
