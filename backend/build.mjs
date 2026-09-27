import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
await build({entryPoints:['lib/service.ts'],outfile:'.backend/service.mjs',bundle:true,platform:'node',format:'esm',target:'node22',plugins:[{name:'local-database',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'local-env',namespace:'arata'}));b.onLoad({filter:/.*/,namespace:'arata'},()=>({contents:'export const env={DB:globalThis.__ARATA_DB};',loader:'js'}));}}]});
console.log('Portable Node backend built.');
