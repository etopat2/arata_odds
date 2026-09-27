import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {runWithBackground,retainBackground,takeResearchRequest,assertResearchBudget} from '../lib/background.mjs';
test('the complete hosted migration chain applies once with prediction heads and history indexes',async()=>{
 const db=new DatabaseSync(':memory:');try{for(const file of ['0000_illegal_morph.sql','0001_ticket_quote_legs.sql','0002_strong_fixer.sql'])db.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='prediction_heads'").get());assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='predictions_outcome_created_idx'").get());assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='ticket_quote_legs'").get());}finally{db.close();}
});
test('hosted requests retain asynchronous work and isolate bounded research budgets',async()=>{
 const jobs=[],context={waitUntil:p=>jobs.push(p)};let completed=false;
 await runWithBackground(context,async()=>{retainBackground(new Promise(r=>setTimeout(()=>{completed=true;r();},5)));for(let i=0;i<24;i++)takeResearchRequest();assert.throws(takeResearchRequest,/Research paused/);assert.throws(assertResearchBudget,/Research paused/);});
 await Promise.all(jobs);assert.equal(completed,true);assert.equal(jobs.length,1);
 await runWithBackground(context,async()=>{takeResearchRequest();assertResearchBudget();});
 for(let i=0;i<100;i++)takeResearchRequest();
});
