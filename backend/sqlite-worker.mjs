import {parentPort,workerData} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
const sqlite=new DatabaseSync(workerData.path);
sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=3000;');
sqlite.exec(workerData.schema);
const query=(sql,params=[])=>{const stmt=sqlite.prepare(sql);return /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql)?stmt.all(...params):(stmt.run(...params),[]);};
parentPort.postMessage({ready:true});
parentPort.on('message',({id,type,...payload})=>{try{let result;
 if(type==='query')result=query(payload.sql,payload.params);
 else if(type==='batch'){sqlite.exec('BEGIN');try{result=payload.statements.map(s=>({success:true,results:query(s.sql,s.params)}));sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}}
 else if(type==='close'){sqlite.close();parentPort.postMessage({id,result:true});parentPort.close();return;}
 else throw new Error('Unknown database operation.');
 parentPort.postMessage({id,result});
 }catch(error){parentPort.postMessage({id,error:error.message});}
});
