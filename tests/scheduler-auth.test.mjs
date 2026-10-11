import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {verifySchedulerToken,schedulerAuthorized} from '../lib/scheduler-auth.mjs';

const encode=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');

test('only a signed token from the exact GitHub schedule may trigger unattended refresh',async()=>{
 const pair=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await webcrypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key',alg:'RS256',use:'sig'},loadKeys=async()=>({keys:[jwk]}),now=Date.now(),iat=Math.floor(now/1000),claims={iss:'https://token.actions.githubusercontent.com',aud:'arata-odds-daily',repository:'etopat2/arata_odds',ref:'refs/heads/main',workflow_ref:'etopat2/arata_odds/.github/workflows/daily-refresh.yml@refs/heads/main',event_name:'schedule',iat,exp:iat+300};
 const sign=async payload=>{const body=encode({alg:'RS256',kid:'test-key',typ:'JWT'})+'.'+encode(payload),signature=await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body));return body+'.'+Buffer.from(signature).toString('base64url');};
 const valid=await sign(claims);
 assert.equal(await verifySchedulerToken(valid,{now,loadKeys}),true);
 assert.equal(await verifySchedulerToken(valid,{now:now+360000,loadKeys}),false);
 for(const change of [{repository:'other/repo'},{ref:'refs/heads/feature'},{workflow_ref:'etopat2/arata_odds/.github/workflows/other.yml@refs/heads/main'},{event_name:'pull_request'},{aud:'another-service'},{iss:'https://example.com'}])assert.equal(await verifySchedulerToken(await sign({...claims,...change}),{now,loadKeys}),false);
 const parts=valid.split('.');assert.equal(await verifySchedulerToken(parts[0]+'.'+encode({...claims,repository:'other/repo'})+'.'+parts[2],{now,loadKeys}),false);
 assert.equal(await verifySchedulerToken('not-a-jwt',{now,loadKeys}),false);
 assert.equal(await schedulerAuthorized(new Request('https://arata-odds.etomet2patrick.chatgpt.site/api/internal/daily')) ,false);
});
