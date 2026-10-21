'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { seed, fail } = require('./content');
const { readMutableBlob } = require('./blob-read');
const STATE_PATH = 'coffee-owner/state.json';
const local = () => process.env.OWNER_LOCAL_STORE === '1' && !process.env.VERCEL;
const ready = () => local() || !!process.env.BLOB_READ_WRITE_TOKEN;
const dir = () => process.env.OWNER_DATA_DIR || path.join(__dirname, '../.owner-data');
let localQueue = Promise.resolve();
async function serial(fn) { const previous = localQueue; let done; localQueue = new Promise(resolve => { done = resolve; }); await previous; try { return await fn(); } finally { done(); } }
function initial() { const content = seed(); return { revision: 0, draft: content, published: content, savedAt: null, publishedAt: null, previous: null }; }
async function read() {
  if (!ready()) return { state: initial(), etag: null };
  if (local()) {
    try { const raw = await fs.readFile(path.join(dir(), 'state.json'), 'utf8'); return { state: JSON.parse(raw), etag: crypto.createHash('sha256').update(raw).digest('hex') }; }
    catch (e) { if (e.code === 'ENOENT') return { state: initial(), etag: null }; throw e; }
  }
  const sdk = await import('@vercel/blob');
  const result = await readMutableBlob(sdk, STATE_PATH);
  if (!result) return { state: initial(), etag: null };
  return { state: JSON.parse(await new Response(result.stream).text()), etag: result.blob.etag };
}
async function change(revision, mutate) {
  if (!ready()) fail('Connect private content storage before saving.', 503);
  const operation = async () => {
    const { state, etag } = await read();
    if (state.revision !== revision) fail('This draft changed in another tab. Reload before editing again.', 409);
    const next = await mutate(structuredClone(state)); next.revision = state.revision + 1;
    const raw = JSON.stringify(next);
    if (local()) {
      await fs.mkdir(dir(), { recursive: true, mode: 0o700 });
      const temp = path.join(dir(), `${crypto.randomUUID()}.tmp`); await fs.writeFile(temp, raw, { mode: 0o600 }); await fs.rename(temp, path.join(dir(), 'state.json'));
    } else {
      const { put } = await import('@vercel/blob');
      try { await put(STATE_PATH, raw, { access: 'private', addRandomSuffix: false, allowOverwrite: !!etag, ...(etag ? { ifMatch: etag } : {}), contentType: 'application/json', cacheControlMaxAge: 60 }); }
      catch (e) { if (/precondition|already exists/i.test(e.message)) fail('The draft changed in another tab. Reload before saving.', 409); throw e; }
    }
    return next;
  };
  return local() ? serial(operation) : operation();
}
function photoType(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP') return 'image/webp';
  fail('Use a JPEG, PNG, or WebP photo.');
}
async function upload(buffer) {
  if (!ready()) fail('Connect private content storage before uploading.', 503);
  const type = photoType(buffer), id = crypto.randomUUID();
  if (local()) { await fs.mkdir(path.join(dir(), 'photos'), { recursive: true, mode: 0o700 }); await fs.writeFile(path.join(dir(), 'photos', id), buffer, { mode: 0o600 }); }
  else { const { put } = await import('@vercel/blob'); await put(`coffee-owner/photos/${id}`, buffer, { access: 'private', contentType: type, addRandomSuffix: false }); }
  return `api/photo?id=${id}`;
}
async function photo(id) {
  if (local()) { try { const buffer = await fs.readFile(path.join(dir(), 'photos', id)); return { buffer, type: photoType(buffer) }; } catch (e) { if (e.code === 'ENOENT') fail('Photo not found.',404); throw e; } }
  const { get } = await import('@vercel/blob'); const result = await get(`coffee-owner/photos/${id}`, { access: 'private' });
  if (!result) fail('Photo not found.',404);
  return { buffer: Buffer.from(await new Response(result.stream).arrayBuffer()), type: result.blob.contentType };
}
async function loginAttempt(ip) {
  if (!ready()) fail('Connect private content storage before signing in.',503);
  const key=crypto.createHmac('sha256',process.env.OWNER_SESSION_SECRET).update(ip).digest('hex');
  const update=value=>{const now=Date.now();const rate=value&&value.until>now?value:{count:0,until:now+60000};if(rate.count>=5)fail('Too many sign-in attempts. Wait a minute and try again.',429);rate.count++;return rate;};
  if(local())return serial(async()=>{const file=path.join(dir(),`login-${key}.json`);let value;try{value=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}await fs.mkdir(dir(),{recursive:true,mode:0o700});await fs.writeFile(file,JSON.stringify(update(value)),{mode:0o600});});
  const sdk=await import('@vercel/blob');const {put}=sdk;
  for(let i=0;i<3;i++){
    const name=`coffee-owner/rate/${key}.json`,result=await readMutableBlob(sdk,name);
    const value=result?JSON.parse(await new Response(result.stream).text()):null,rate=update(value);
    try{await put(name,JSON.stringify(rate),{access:'private',addRandomSuffix:false,allowOverwrite:!!result,contentType:'application/json',...(result?{ifMatch:result.blob.etag}:{})});return;}
    catch(e){if(!/precondition|already exists/i.test(e.message))throw e;}
  }
  fail('Too many simultaneous sign-in attempts. Wait a minute and try again.',429);
}
async function diagnostics() {
  const {state,etag}=await read();
  const changes=state.draft.items.filter(item=>JSON.stringify(item)!==JSON.stringify(state.published.items.find(p=>p.id===item.id))).map(item=>({id:item.id,en:item.en,price:item.price,previousPrice:state.published.items.find(p=>p.id===item.id)?.price}));
  let metadata=null;
  if(!local()&&ready()){const {head}=await import('@vercel/blob');metadata=await head(STATE_PATH);}
  return {revision:state.revision,publishedAt:state.publishedAt,readEtag:etag,metadataEtag:metadata?.etag,changes,categoriesChanged:JSON.stringify(state.draft.categories)!==JSON.stringify(state.published.categories),settingsChanged:JSON.stringify(state.draft.settings)!==JSON.stringify(state.published.settings),removedItems:state.published.items.filter(p=>!state.draft.items.some(d=>d.id===p.id)).map(p=>p.id)};
}
module.exports = { ready, read, change, upload, photo, photoType, initial, loginAttempt, diagnostics };
