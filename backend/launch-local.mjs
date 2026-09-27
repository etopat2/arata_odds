import {spawn} from 'node:child_process';
import {mkdirSync,openSync,closeSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
async function health(url){try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});const d=await r.json();return r.ok&&d.app==='arata-odds'&&d.status==='ready';}catch{return false;}}
const frontUrl='http://127.0.0.1:5173/__arata/health',apiUrl='http://127.0.0.1:3001/api/health';
const [front,api]=await Promise.all([health(frontUrl),health(apiUrl)]);
if(!front||!api){
 mkdirSync('.local-data',{recursive:true});const log=openSync('.local-data/runtime.log','a');
 const args=['backend/run-local.mjs',...(front?['--backend-only']:api?['--frontend-only']:[])];
 const child=spawn(process.execPath,args,{cwd:root,env:process.env,detached:true,windowsHide:true,stdio:['ignore',log,log]});
 child.on('error',error=>console.error(error.message));child.unref();closeSync(log);
 for(let n=0;n<40;n++){const ready=await Promise.all([health(frontUrl),health(apiUrl)]);if(ready.every(Boolean))break;await new Promise(r=>setTimeout(r,500));}
}
if((await Promise.all([health(frontUrl),health(apiUrl)])).every(Boolean))console.log('Arata Odds is running: http://localhost:5173/');
else {console.error('Arata could not start. See .local-data/runtime.log. Make sure Node.js 22.13+ is installed and run npm ci in this folder.');process.exitCode=1;}
