import {clientPayloadJson} from '../lib/transport.mjs';
import {applySecurityHeaders} from '../lib/security-headers.mjs';
import {databaseAdapter} from './database-adapter.mjs';
import {createServer} from 'node:http';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
const compress=promisify(gzip);
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let query,transaction,close;
if(process.env.DATABASE_URL){
 const {default:pg}=await import('pg');const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==='require'?{rejectUnauthorized:true}:undefined});
 await pool.query(readFileSync(path.join(root,'backend/postgres.sql'),'utf8'));
 await pool.query("ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS max_sessions INTEGER; ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS last_seen BIGINT NOT NULL DEFAULT 0; ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS device_label TEXT NOT NULL DEFAULT 'Earlier session'; ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS ip_hash TEXT NOT NULL DEFAULT '';");
 const convert=sql=>{let n=0;return sql.replace("json_group_array(json(q.value))","COALESCE(jsonb_agg(q.value), '[]'::jsonb)::text").replace("json_each(f.payload,'$.quotes') q","jsonb_array_elements(COALESCE(f.payload::jsonb->'quotes','[]'::jsonb)) q(value)").replace(/json_remove\(([^,()]+),'\$\.([^']+)'\)/g,(_,column,key)=>`(${column}::jsonb - '${key}')::text`).replace(/json_extract\(([^,()]+),'\$\.([^']+)'\)/g,(_,column,key)=>`(${column}::jsonb ->> '${key}')`).replace(/date\(created,'\+3 hours'\)/g,"TO_CHAR(created::timestamptz AT TIME ZONE 'Africa/Kampala','YYYY-MM-DD')").replace(/\?/g,()=>'$'+(++n));};
 query=async(sql,params=[])=>{const r=await pool.query(convert(sql),params);return r.rows;};
 transaction=async statements=>{const c=await pool.connect();try{await c.query('BEGIN');const results=[];for(const s of statements){const r=await c.query(convert(s.sql),s.params);results.push({success:true,results:r.rows});}await c.query('COMMIT');return results;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
 close=()=>pool.end();
 console.log('PostgreSQL persistence enabled.');
}else{
 const {openSqlite}=await import('./sqlite-client.mjs');mkdirSync(path.join(root,'.local-data'),{recursive:true});const connection=await openSqlite(path.join(root,'.local-data/arata.sqlite'),readFileSync(path.join(root,'backend/postgres.sql'),'utf8'));
 query=connection.query;transaction=connection.transaction;close=connection.close;console.log('Local SQLite persistence enabled in a separate worker. Set DATABASE_URL for PostgreSQL.');
}
globalThis.__ARATA_DB=databaseAdapter({query,transaction});
const {handle,subscribeLive,actor,dailyCycle,refresh}=await import('../.backend/service.mjs');
const server=createServer(async(req,res)=>{try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>(req.url?.startsWith('/api/admin/backup/import')?5000000:16384)){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}const body=Buffer.concat(chunks);const url='http://127.0.0.1:3001'+req.url;const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
 // Requests arrive through the local frontend proxy; retain its browser origin for CSRF validation.
 const browserOrigin=headers.get('origin');if(browserOrigin&&browserOrigin!==process.env.ARATA_FRONTEND_ORIGIN&&browserOrigin!=='http://localhost:5173'){res.writeHead(403);res.end('Origin rejected');return;}if(browserOrigin)headers.set('origin','http://127.0.0.1:3001');
 if(req.method==='GET'&&new URL(url).pathname==='/api/live/stream'){const user=await actor(new Request(url,{headers}));if(!user||user.mustChangePassword){res.writeHead(401,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Sign in to continue.'}));return;}const range=new URL(url).searchParams.get('range')||'today';res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();res.write('retry: 2000\n: connected\n\n');let closed=false;const stop=subscribeLive(range,data=>{if(!closed){if(res.writableLength>1024*1024){res.end();return;}res.write('data: '+clientPayloadJson(data)+'\n\n');}});const heartbeat=setInterval(()=>{if(!closed)res.write(': heartbeat\n\n');},10000);res.on('close',()=>{closed=true;clearInterval(heartbeat);stop();});return;}
 const result=await handle(new Request(url,{method:req.method,headers,...(body.length?{body}: {})}));const responseHeaders=Object.fromEntries(applySecurityHeaders(new Headers(result.headers),url,true));let responseBody=Buffer.from(await result.arrayBuffer());if(responseBody.length>2048&&/\bgzip\b/.test(String(req.headers['accept-encoding']||''))){responseBody=await compress(responseBody,{level:1});responseHeaders['content-encoding']='gzip';responseHeaders.vary='Accept-Encoding';delete responseHeaders['content-length'];}res.writeHead(result.status,responseHeaders);res.end(responseBody);}catch(e){console.error(e);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local backend failed.'}));}});
server.listen(3001,'127.0.0.1',()=>console.log('Arata API: http://127.0.0.1:3001'));
let dailyBusy=false;async function updateDaily(){if(dailyBusy)return;dailyBusy=true;try{await refresh('today');await dailyCycle();}catch(error){console.error('Daily guidance refresh:',error);}finally{dailyBusy=false;}}
const dailyTimer=setInterval(()=>void updateDaily(),30*60000);void updateDaily();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(dailyTimer);server.close(async()=>{await close();process.exit(0);});});
