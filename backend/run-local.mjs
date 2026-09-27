import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import './build.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const children=new Set();let stopping=false;
function start(args){
 const recent=[];
 function launch(){if(stopping)return;const child=spawn(process.execPath,args,{stdio:'inherit',cwd:root,env:process.env,windowsHide:true});children.add(child);child.on('error',error=>{console.error('Could not start Arata:',error.message);stop(1);});child.on('exit',code=>{children.delete(child);if(stopping)return;const now=Date.now();recent.push(now);while(recent[0]<now-60000)recent.shift();if(recent.length>3){console.error('Arata stopped after repeated startup failures. Check .local-data/runtime.log.');stop(code||1);return;}console.error('Arata service exited; restarting.');setTimeout(launch,1500);});}
 launch();
}
if(!process.argv.includes('--frontend-only'))start(['backend/server.mjs']);
if(!process.argv.includes('--backend-only'))start(['node_modules/vite/bin/vite.js','--config','vite.local.config.mjs']);
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(code),500);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
