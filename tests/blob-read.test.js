'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readMutableBlob}=require('../lib/blob-read');
const response=etag=>({blob:{etag},stream:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{"revision":1}'));controller.close();}})});
test('compressed Blob GET ETag is verified against strong metadata before conditional writes',async()=>{
  let reads=0,heads=0;
  const result=await readMutableBlob({get:async(path,options)=>{reads++;assert.equal(options.useCache,false);return response('W/"version-1"');},head:async()=>{heads++;return{etag:'"version-1"'};}},'state.json');
  assert.equal(result.blob.etag,'"version-1"');assert.equal(reads,1);assert.equal(heads,1);
  assert.equal(await new Response(result.stream).text(),'{"revision":1}');
});
test('concurrent change between body and metadata never pairs stale content with a newer ETag',async()=>{
  let reads=0;
  const result=await readMutableBlob({get:async()=>response(++reads===1?'W/"old"':'W/"new"'),head:async()=>({etag:'"new"'})},'state.json');
  assert.equal(reads,2);assert.equal(result.blob.etag,'"new"');
});
test('missing ETags fail closed rather than overwriting without concurrency protection',async()=>{
  await assert.rejects(readMutableBlob({get:async()=>response('')},'state.json'),{status:409});
});
test('strong ETags and absent blobs preserve the normal read path',async()=>{
  const result=await readMutableBlob({get:async()=>response('"strong"')},'state.json');assert.equal(result.blob.etag,'"strong"');
  assert.equal(await readMutableBlob({get:async()=>null},'state.json'),null);
});
