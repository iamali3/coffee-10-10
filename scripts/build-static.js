'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
async function main(){
  const root=path.resolve(__dirname,'..'),out=path.join(root,'public');await fs.mkdir(out,{recursive:true});
  // Explicit allowlist: credentials, draft state, and server source are never public assets.
  const files=['index.html','menu-content.js','owner-menu.css','smoke-webgl.js','service-worker.js','manifest.webmanifest','icon.svg'];
  for(const file of files)await fs.copyFile(path.join(root,file),path.join(out,file));
  for(const folder of ['assets','admin'])await fs.cp(path.join(root,folder),path.join(out,folder),{recursive:true});
  await fs.mkdir(path.join(out,'data'),{recursive:true});await fs.copyFile(path.join(root,'data/menu.json'),path.join(out,'data/menu.json'));
  console.log('Static website built in public/. Private server files excluded.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
