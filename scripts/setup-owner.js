'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {createInterface}=require('node:readline/promises');
const {Writable}=require('node:stream');
const {hashPassword}=require('../lib/auth');
async function main(){
  const generated=process.argv.includes('--generate');let username='owner',password;
  if(generated)password=crypto.randomBytes(18).toString('base64url');
  else{
    const rl=createInterface({input:process.stdin,output:process.stdout});username=(await rl.question('Owner username [owner]: ')).trim()||'owner';rl.close();
    const quiet=new Writable({write(chunk,encoding,callback){callback();}});const hidden=createInterface({input:process.stdin,output:quiet,terminal:true});
    process.stdout.write('Owner password (at least 12 characters; input is hidden): ');password=await hidden.question('');hidden.close();process.stdout.write('\n');
  }
  if(password.length<12||password.length>256)throw new Error('Use a password of 12–256 characters.');
  if(!/^[a-zA-Z0-9._-]{1,64}$/.test(username))throw new Error('Use letters, numbers, dots, or hyphens in the username.');
  const root=path.join(__dirname,'..');const values=`OWNER_USERNAME=${username}\nOWNER_PASSWORD_HASH=${await hashPassword(password)}\nOWNER_SESSION_SECRET=${crypto.randomBytes(48).toString('hex')}\n`;
  await fs.mkdir(path.join(root,'.owner-data'),{recursive:true,mode:0o700});
  const production=path.join(root,'.owner-data','vercel.env');await fs.writeFile(production,values,{mode:0o600});
  // Keep local development isolated from production storage.
  await fs.writeFile(path.join(root,'.env.local'),values+'OWNER_LOCAL_STORE=1\n',{mode:0o600});
  if(generated)await fs.writeFile(path.join(root,'.owner-data','owner-access.txt'),`Coffee 10:10 owner access\nUsername: ${username}\nPassword: ${password}\nLocal dashboard: http://127.0.0.1:4180/admin/\n\nKeep this file private. These credentials are not committed or sent to the browser.\n`,{mode:0o600});
  console.log('Owner credentials saved privately. Local: .env.local. Vercel environment values: .owner-data/vercel.env.'+(generated?' Login details: .owner-data/owner-access.txt.':''));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
