import {coreGoals,DEFAULT_WEIGHTS,WEIGHT_BOUNDS,validFeatures,scoreProbabilities,probabilityFor,clamp} from './goal-core.mjs';
import {outcomePredicate} from './market-outcomes.mjs';
import {teamKey} from './domain.mjs';
export const LEARNING_SCHEMA='arata-feedback-v1';
export const LEARNING_RULES=Object.freeze({minimumMatches:200,minimumCoreTrain:80,minimumCalibration:40,minimumTest:30,minimumNewTest:30,minimumClass:8,rollbackMatches:50,maxMatches:2000,expiryDays:90});
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0,iso=t=>new Date(t).toISOString(),safe=p=>clamp(p,.005,.995),logit=p=>Math.log(safe(p)/(1-safe(p))),sigmoid=x=>1/(1+Math.exp(-clamp(x,-20,20))),yieldStep=()=>new Promise(r=>setTimeout(r,0));
const brier=(p,y)=>(p-y)**2,loss=(p,y)=>-(y*Math.log(safe(p))+(1-y)*Math.log(1-safe(p)));
const sourceTrusted=f=>/LiveScore|OpenLigaDB|BetPawa|Flashscore|Elbotola/i.test(f.resultSource||f.liveSource||f.source||'')&&!/Owner-entered/i.test(f.resultSource||'')&&!/EXTRA|PENALT|AFTER_EXTRA|AET/i.test(f.livePeriod||'');
export function buildLearningMatches(predictions,fixtures,now=Date.now()){
 const fs=new Map(fixtures.map(f=>[f.id,f])),latest=new Map(),rejected={unverified:0,lateOrStale:0,invalid:0};
 const identityOf=f=>[f.leagueId||f.league,teamKey(f.home),teamKey(f.away),f.kickoff.slice(0,10)].join('|'),scores=new Map(),conflicting=new Set();
 for(const f of fixtures){if(f.status!=='finished'||!f.score||!sourceTrusted(f))continue;const identity=identityOf(f),score=JSON.stringify([f.score.home,f.score.away]);if(scores.has(identity)&&scores.get(identity)!==score)conflicting.add(identity);scores.set(identity,score);}
 for(const p of predictions){if(p.predictor!=='arata')continue;const f=fs.get(p.fixtureId),captured=Date.parse(p.created),kickoff=Date.parse(p.kickoff),modelTime=Date.parse(p.modelCaptured||p.created),available=Date.parse(f?.finalConfirmedAt||f?.endedAt||f?.liveCaptured||f?.sourceUpdated);
  if(!f||f.status!=='finished'||!f.score||!sourceTrusted(f)||conflicting.has(identityOf(f))||!Number.isFinite(available)||available>=now||available<=kickoff){rejected.unverified++;continue;}
  if(!Number.isFinite(captured)||captured>=kickoff||p.inPlay||p.modelStale||!Number.isFinite(modelTime)||modelTime>=kickoff||modelTime>captured+60000||captured-modelTime>1800000||kickoff>=now||now-kickoff>730*86400000||Math.abs(kickoff-Date.parse(f.kickoff))>900000){rejected.lateOrStale++;continue;}
  const predicate=outcomePredicate(p),y=predicate?.(f.score)?1:0;if(!predicate||!(p.probability>0&&p.probability<1)||!['won','lost'].includes(p.outcome)||(p.outcome==='won'?1:0)!==y||!Object.values(f.score).every(n=>Number.isInteger(n)&&n>=0&&n<=30)){rejected.invalid++;continue;}
  const identity=identityOf(f),key=[identity,p.market||'1X2',p.selection,p.line??'',p.period||'FT'].join('|');
  if(!latest.has(key)||Date.parse(latest.get(key).p.created)<captured)latest.set(key,{p,f,y,identity,availableAt:iso(available)});
 }
 const grouped=new Map();for(const row of latest.values()){let m=grouped.get(row.identity);if(!m){m={id:row.identity,fixtureId:row.f.id,home:row.f.home,away:row.f.away,league:row.f.leagueId||row.f.league,kickoff:row.f.kickoff,availableAt:row.availableAt,score:row.f.score,rows:[]};grouped.set(row.identity,m);}m.availableAt=m.availableAt>row.availableAt?m.availableAt:row.availableAt;m.rows.push({...row.p,y:row.y});}
 const matches=[...grouped.values()].sort((a,b)=>a.kickoff.localeCompare(b.kickoff)||a.id.localeCompare(b.id)).slice(-LEARNING_RULES.maxMatches);
 for(const m of matches){
  // A fixture contributes its latest eligible forecasting frame. Do not replay
  // an older market with a newer market's form, lineup or goal inputs.
  const lastModelTime=Math.max(...m.rows.map(r=>Date.parse(r.modelCaptured||r.created)));m.rows=m.rows.filter(r=>Date.parse(r.modelCaptured||r.created)===lastModelTime);
  const latestFeature=m.rows.filter(r=>validFeatures(r.learningInput?.features)).sort((a,b)=>b.created.localeCompare(a.created))[0];m.features=latestFeature?.learningInput.features;m.featureCaptured=latestFeature?.created;m.learningVersion=latestFeature?.learningInput?.revision;
  if(m.features&&m.rows.some(r=>!validFeatures(r.learningInput?.features)||JSON.stringify(r.learningInput.features)!==JSON.stringify(m.features))){m.features=undefined;m.rows=m.rows.map(r=>({...r,learningInput:undefined}));}
 }
 return {matches,rejected,coreMatches:matches.filter(m=>m.features).length};
}
export function chronologicalSplit(matches,lastEvaluatedThrough){
 const ordered=[...matches].sort((a,b)=>a.kickoff.localeCompare(b.kickoff)||a.id.localeCompare(b.id));
 if(ordered.length<LEARNING_RULES.minimumMatches)return {reason:`Collecting verified outcomes: ${ordered.length}/${LEARNING_RULES.minimumMatches} distinct matches.`,train:[],calibration:[],test:[]};
 const testStart=lastEvaluatedThrough?ordered.find(m=>m.kickoff>lastEvaluatedThrough)?.kickoff:ordered[Math.floor(ordered.length*.75)].kickoff;
 if(!testStart)return {reason:'Waiting for new matches after the last validation window.',train:[],calibration:[],test:[]};
 const before=ordered.filter(m=>m.kickoff<testStart),calStart=before[Math.floor(before.length*2/3)]?.kickoff;
 const train=before.filter(m=>m.kickoff<calStart&&m.availableAt<calStart),calibration=before.filter(m=>m.kickoff>=calStart&&m.availableAt<testStart),test=ordered.filter(m=>m.kickoff>=testStart);
 const reason=test.length<LEARNING_RULES.minimumNewTest?`Waiting for ${LEARNING_RULES.minimumNewTest} new validation matches; ${test.length} available.`:train.length<LEARNING_RULES.minimumCoreTrain||calibration.length<LEARNING_RULES.minimumCalibration?'Waiting for enough results confirmed before the later calibration/validation blocks.':null;
 return {train,calibration,test,reason,boundaries:{trainThrough:train.at(-1)?.kickoff,calibrationFrom:calStart,calibrationThrough:calibration.at(-1)?.kickoff,testFrom:testStart,testThrough:test.at(-1)?.kickoff}};
}
// Conservative paired intervals are calculated per match, never per quoted market.
export function validationGate(before,after,{minimum=30,margin=.002,z=2.8}={}){
 const diffs=before.map((v,i)=>v-after[i]),n=diffs.length,gain=mean(diffs),se=n>1?Math.sqrt(mean(diffs.map(d=>(d-gain)**2))*n/(n-1)/n):Infinity;
 return {passed:n>=minimum&&gain>margin&&gain-z*se>0,n,before:mean(before),after:mean(after),gain,lower:gain-z*se,upper:gain+z*se,z};
}
function goalLoss(m,w){const g=coreGoals(m.features,w);return (g.home-m.score.home*Math.log(g.home)+g.away-m.score.away*Math.log(g.away))/2;}
export async function fitCore(matches,start=DEFAULT_WEIGHTS){
 let weights={...DEFAULT_WEIGHTS,...start};const objective=w=>mean(matches.map(m=>goalLoss(m,w)))+.02*Object.keys(weights).reduce((s,k)=>s+(w[k]-DEFAULT_WEIGHTS[k])**2,0);
 let best=objective(weights);for(const step of [.15,.07,.03,.01])for(let round=0;round<3;round++){let changed=false;for(const key of Object.keys(weights)){const [low,high]=WEIGHT_BOUNDS[key];for(const sign of [-1,1]){const candidate={...weights,[key]:clamp(weights[key]+sign*step,low,high)},score=objective(candidate);if(score<best-1e-9){weights=candidate;best=score;changed=true;}}}await yieldStep();if(!changed)break;}
 return weights;
}
export function activeWeights(active,league){return active?.cores?.[league]?.weights||active?.cores?.['*']?.weights||DEFAULT_WEIGHTS;}
function canonical(m){
 const type=m.market||'1X2';if(type==='1X2'||type==='DOUBLE_CHANCE')return null;
 if(type==='HANDICAP'&&Math.abs(m.line)===.5)return null; // exact win/double-chance identities
 if(['HOME_TOTALS','AWAY_TOTALS'].includes(type)&&m.line===.5)return {family:type==='HOME_TOTALS'?'AWAY_CLEAN_SHEET':'HOME_CLEAN_SHEET',line:null,selection:'yes',flip:m.selection==='over'};
 if(type==='RESULT_BTTS'&&['home_no','away_no'].includes(m.selection))return {family:m.selection==='home_no'?'HOME_WIN_TO_NIL':'AWAY_WIN_TO_NIL',line:null,selection:'yes',flip:false};
 if(type==='RESULT_BTTS'&&m.selection==='draw_no')return {family:'TOTALS',line:.5,selection:'over',flip:true};
 if(['TOTALS','HOME_TOTALS','AWAY_TOTALS'].includes(type))return {family:type,line:m.line,selection:'over',flip:m.selection==='under'};
 if(type==='HANDICAP')return {family:type,line:m.selection==='away'?-m.line:m.line,selection:'home',flip:m.selection==='away'};
 if(type.endsWith('ODD_EVEN'))return {family:type,line:null,selection:'odd',flip:m.selection==='even'};
 if(type==='BTTS'||type.includes('CLEAN_SHEET')||type.includes('WIN_TO_NIL'))return {family:type,line:null,selection:'yes',flip:m.selection==='no'};
 // Joint selections remain exact groups rather than being mistaken for complements.
 return {family:type+':'+m.selection,line:m.line??null,selection:m.selection,flip:false,market:type};
}
const basis=p=>[1,logit(p),...Array.from({length:4},(_,i)=>Math.max(0,1-Math.abs(p-(i+1)*.2)/.2))];
function curve(p,beta){const x=basis(p);return safe(sigmoid(x.reduce((n,v,i)=>n+v*beta[i],0)));}
function applyCurve(p,model){return model?.support&&(p<model.support[0]||p>model.support[1])?p:curve(p,model.beta);}
function fitCurve(rows){let beta=[0,1,0,0,0,0];for(let iteration=0;iteration<220;iteration++){const gradient=Array(6).fill(0),total=rows.reduce((n,r)=>n+r.weight,0);for(const r of rows){const x=basis(r.p),error=(curve(r.p,beta)-r.y)*r.weight;for(let i=0;i<6;i++)gradient[i]+=error*x[i]/total;}beta=beta.map((b,i)=>b-.08*(gradient[i]+.02*(b-(i===1?1:0))));beta[0]=clamp(beta[0],-1.5,1.5);beta[1]=clamp(beta[1],.2,2);for(let i=2;i<6;i++)beta[i]=clamp(beta[i],-.6,.6);}
 const support=[Math.max(.005,Math.min(...rows.map(r=>r.p))-.05),Math.min(.995,Math.max(...rows.map(r=>r.p))+.05)];
 // Piecewise probability-range effects must still preserve probability ordering.
 let previous=0;for(let i=1;i<100;i++){const next=curve(i/100,beta);if(next<previous)return {kind:'sigmoid',beta:[beta[0],beta[1],0,0,0,0],support};previous=next;}
 return {kind:'sigmoid-range',beta,support};
}
function multi(probs,model){if(!model)return probs;const confidence=Math.max(...Object.values(probs));if(model.confidenceSupport&&(confidence<model.confidenceSupport[0]||confidence>model.confidenceSupport[1]))return probs;const values=['home','draw','away'].map((k,i)=>Math.exp(model.power*Math.log(safe(probs[k]))+(model.bias[i]||0))),sum=values.reduce((a,b)=>a+b,0);return Object.fromEntries(['home','draw','away'].map((k,i)=>[k,values[i]/sum]));}
function fitMulti(rows){let power=1,bias=[0,0,0];for(let iteration=0;iteration<220;iteration++){let gp=0;const gb=[0,0,0];for(const r of rows){const p=multi(r.probs,{power,bias});for(const [i,k]of ['home','draw','away'].entries()){const error=(p[k]-(i===r.y?1:0))/rows.length;gp+=error*Math.log(safe(r.probs[k]));gb[i]+=error;}}power=clamp(power-.08*(gp+.02*(power-1)),.25,2);bias=bias.map((b,i)=>clamp(b-.08*(gb[i]+.04*b),-.6,.6));const center=mean(bias);bias=bias.map(b=>b-center);}const levels=rows.map(r=>Math.max(...Object.values(r.probs)));return {kind:'multiclass',power,bias,confidenceSupport:[Math.max(.333,Math.min(...levels)-.05),Math.min(.995,Math.max(...levels)+.05)]};}
function profile(active,league,family){return active?.calibrators?.[league+'|'+family]||active?.calibrators?.['*|'+family];}
export function calibratedMarkets(markets,league,active){
 const probs=Object.fromEntries(markets.filter(m=>m.market==='1X2').map(m=>[m.selection,m.probability])),coherent=['home','draw','away'].every(k=>probs[k]>0)&&Math.abs(Object.values(probs).reduce((n,p)=>n+p,0)-1)<1e-6;
 const calibrated=coherent?multi(probs,profile(active,league,'1X2')):probs;
 const correct=m=>{const c=canonical(m),model=c&&profile(active,league,c.family);if(!model)return m.probability;const p=applyCurve(c.flip?1-m.probability:m.probability,model);return c.flip?1-p:p;};
 const joint=(m,winner,otherSelection)=>{const part=correct(m),other=correct({...m,selection:otherSelection,probability:Math.max(0,probs[winner]-m.probability)});return calibrated[winner]*part/Math.max(1e-12,part+other);};
 return markets.map(m=>{let probability=m.probability;
  if(coherent&&m.market==='1X2')probability=calibrated[m.selection];
  else if(coherent&&m.market==='DOUBLE_CHANCE')probability=1-calibrated[m.selection==='1X'?'away':m.selection==='X2'?'home':'draw'];
  else if(coherent&&m.market==='HANDICAP'&&Math.abs(m.line)===.5)probability=m.line===-.5?calibrated[m.selection]:1-calibrated[m.selection==='home'?'away':'home'];
  else if(coherent&&m.market==='RESULT_TOTALS'){const [winner,direction]=m.selection.split('_');probability=joint(m,winner,winner+'_'+(direction==='over'?'under':'over'));}
  else if(coherent&&m.market==='RESULT_BTTS'){const [winner,answer]=m.selection.split('_');if(winner==='draw'){const zero=answer==='no'?m.probability:probs.draw-m.probability,calZero=Math.min(calibrated.draw,correct({market:'TOTALS',selection:'under',line:.5,probability:zero}));probability=answer==='no'?calZero:calibrated.draw-calZero;}else probability=joint(m,winner,winner+'_'+(answer==='yes'?'no':'yes'));}
  else if(coherent&&['HOME_WIN_TO_NIL','AWAY_WIN_TO_NIL'].includes(m.market)){const winner=m.market==='HOME_WIN_TO_NIL'?'home':'away',noGoals=m.selection==='yes'?m.probability:1-m.probability,part=joint({market:'RESULT_BTTS',selection:winner+'_no',probability:noGoals},winner,winner+'_yes');probability=m.selection==='yes'?part:1-part;}
  else if(coherent&&m.market==='TOTALS'&&m.line===.5){const zero=m.selection==='under'?m.probability:1-m.probability,part=Math.min(calibrated.draw,correct({market:'TOTALS',selection:'under',line:.5,probability:zero}));probability=m.selection==='under'?part:1-part;}
  else probability=correct(m);
  return {...m,rawProbability:m.probability,probability};});
}
function marketsFor(m,active){
 if(m.features){const g=coreGoals(m.features,activeWeights(active,m.league)),cells=scoreProbabilities(g.home,g.away);return m.rows.map(r=>({...r,probability:probabilityFor(cells,r)}));}
 // Old records have no reconstructible core features. Their raw saved estimates
 // can train calibration, but are excluded when a new core profile would apply.
 return m.rows.map(r=>({...r,probability:r.learningInput?.rawProbability??r.probability}));
}
function calibrationRows(matches,active){const groups=new Map();function add(key,row){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 for(const m of matches){if(!m.features&&(active?.cores?.['*']||active?.cores?.[m.league]))continue;const markets=marketsFor(m,active),triple=markets.filter(r=>r.market==='1X2'),probs=Object.fromEntries(triple.map(r=>[r.selection,r.probability]));if(['home','draw','away'].every(k=>probs[k]>0)&&Math.abs(Object.values(probs).reduce((n,p)=>n+p,0)-1)<1e-6){const y=m.score.home>m.score.away?0:m.score.home===m.score.away?1:2,row={id:m.id,probs,y};add('*|1X2',row);add(m.league+'|1X2',row);}
  const seen=new Set(),rows=[];for(const r of markets){const c=canonical(r);if(!c)continue;const key=c.family+'|'+(c.line??'');if(seen.has(key))continue;seen.add(key);rows.push({id:m.id,p:c.flip?1-r.probability:r.probability,y:c.flip?1-r.y:r.y,family:c.family});}const counts=new Map();for(const r of rows)counts.set(r.family,(counts.get(r.family)||0)+1);for(const r of rows){r.weight=1/counts.get(r.family);add('*|'+r.family,r);add(m.league+'|'+r.family,r);}
 }
 return groups;
}
function uniqueCount(rows){return new Set(rows.map(r=>r.id)).size;}
function classCount(rows){return new Set(rows.map(r=>r.y)).size;}
function binaryMetrics(rows,model){const buckets=new Map();for(const r of rows){const p=model?applyCurve(r.p,model):r.p,score={brier:brier(p,r.y),loss:loss(p,r.y),weight:r.weight};if(!buckets.has(r.id))buckets.set(r.id,[]);buckets.get(r.id).push(score);}return [...buckets.values()].map(rs=>({brier:rs.reduce((n,r)=>n+r.brier*r.weight,0),loss:rs.reduce((n,r)=>n+r.loss*r.weight,0)}));}
function multiMetrics(rows,model){return rows.map(r=>{const p=multi(r.probs,model),ps=['home','draw','away'].map(k=>p[k]);return {brier:mean(ps.map((v,i)=>brier(v,i===r.y?1:0))),loss:-Math.log(safe(ps[r.y]))};});}
export function reliability(matches){const bins=Array.from({length:10},(_,i)=>({range:`${i*10}–${(i+1)*10}%`,n:0,probability:0,observed:0,raw:0}));for(const m of matches){const rows=m.rows.filter(r=>r.market==='1X2');const sample=rows.length?rows.find(r=>r.selection==='home')||rows[0]:m.rows[0];if(!sample)continue;const b=bins[Math.min(9,Math.floor(sample.probability*10))];b.n++;b.probability+=sample.probability;b.raw+=sample.learningInput?.rawProbability??sample.probability;b.observed+=sample.y;}return bins.map(b=>({...b,probability:b.n?b.probability/b.n:null,raw:b.n?b.raw/b.n:null,observed:b.n?b.observed/b.n:null}));}
function matchErrors(m,active){const predicted=calibratedMarkets(marketsFor(m,active),m.league,active);return {brier:mean(predicted.map(r=>brier(r.probability,r.y))),loss:mean(predicted.map(r=>loss(r.probability,r.y)))};}
const recordedErrors=m=>({brier:mean(m.rows.map(r=>brier(r.probability,r.y))),loss:mean(m.rows.map(r=>loss(r.probability,r.y)))});
export function usableActive(active,now=Date.now()){return active&&active.schema===LEARNING_SCHEMA&&Date.parse(active.activatedAt)<now&&now-Date.parse(active.activatedAt)<LEARNING_RULES.expiryDays*86400000?active:null;}
export async function trainFeedback(dataset,registry={},now=Date.now()){
 const current=usableActive(registry.active,now),split=chronologicalSplit(dataset.matches,registry.lastEvaluatedThrough),base={schema:LEARNING_SCHEMA,checkedAt:iso(now),eligibleMatches:dataset.matches.length,coreMatches:dataset.coreMatches,rejected:dataset.rejected,reliability:reliability(dataset.matches),rules:LEARNING_RULES};
 if(split.reason)return {...registry,...base,status:current?'active':'collecting',message:split.reason,active:current};
 const candidate={schema:LEARNING_SCHEMA,revision:'feedback-'+now,activatedAt:iso(now),cores:{...(current?.cores||{})},calibrators:{...(current?.calibrators||{})}},checks=[],coreTrials=[];const scopes=['*',...new Set(split.train.map(m=>m.league))];
 for(const scope of scopes){const filter=m=>!!m.features&&(scope==='*'||m.league===scope),train=split.train.filter(filter),test=split.test.filter(filter);if(train.length<LEARNING_RULES.minimumCoreTrain||test.length<LEARNING_RULES.minimumTest){checks.push({kind:'core',scope,status:'insufficient',train:train.length,test:test.length});continue;}
  const selectionFrom=train[Math.floor(train.length*.8)].kickoff,fit=train.filter(m=>m.kickoff<selectionFrom&&m.availableAt<selectionFrom),selection=train.filter(m=>m.kickoff>=selectionFrom);
  if(fit.length<LEARNING_RULES.minimumCoreTrain||selection.length<15){checks.push({kind:'core',scope,status:'insufficient',train:fit.length,test:test.length});continue;}
  const incumbent=activeWeights(current,scope),weights=await fitCore(fit,incumbent),selectionGain=mean(selection.map(m=>goalLoss(m,activeWeights(current,m.league))-goalLoss(m,weights)));
  if(selectionGain<=.005){checks.push({kind:'core',scope,status:'not-selected',train:fit.length,test:test.length,weights,selectionGain});continue;}
  // Freeze all core candidates before fitting calibration. No holdout result
  // chooses the input distribution used to fit the later calibration block.
  candidate.cores[scope]={weights,trainedThrough:fit.at(-1).kickoff,selectionThrough:selection.at(-1).kickoff};coreTrials.push({scope,weights,train:fit,test});
 }
 const fitting=calibrationRows(split.calibration,candidate),testing=calibrationRows(split.test,candidate);const correctedScopes=[];
 for(const [key,rows]of fitting){const tests=testing.get(key)||[],n=uniqueCount(rows),testN=uniqueCount(tests),family=key.slice(key.indexOf('|')+1),multiClass=family==='1X2';if(n<LEARNING_RULES.minimumCalibration||testN<LEARNING_RULES.minimumTest||classCount(rows)<(multiClass?3:2)||classCount(tests)<(multiClass?3:2)){checks.push({kind:'calibration',scope:key,status:'insufficient',train:n,test:testN});continue;}
  if(!multiClass&&[0,1].some(y=>uniqueCount(rows.filter(r=>r.y===y))<LEARNING_RULES.minimumClass)){checks.push({kind:'calibration',scope:key,status:'insufficient-variation',train:n,test:testN});continue;}
  const model=multiClass?fitMulti(rows):fitCurve(rows),existing=candidate.calibrators[key]||candidate.calibrators['*|'+family],metrics=multiClass?multiMetrics:binaryMetrics,before=metrics(tests,existing),after=metrics(tests,model),gate=validationGate(before.map(r=>r.brier),after.map(r=>r.brier),{z:3.3}),lossGate=validationGate(before.map(r=>r.loss),after.map(r=>r.loss),{margin:.001,z:3.3});
  const passed=gate.passed&&lossGate.passed;checks.push({kind:'calibration',scope:key,status:passed?'passed':'rejected',train:n,test:testN,validation:gate,logLoss:lossGate,model});if(passed){candidate.calibrators[key]={...model,validation:gate,logLoss:lossGate,trainedThrough:split.boundaries.calibrationThrough};correctedScopes.push(key);}await yieldStep();
 }
 // Every newly fitted core scope must pass on its affected later matches. A
 // failing core rejects the entire candidate; it is never swapped underneath a
 // calibrator that was fitted to another set of goal rates.
 for(const trial of coreTrials){const affected=trial.test,before=affected.map(m=>goalLoss(m,activeWeights(current,m.league))),after=affected.map(m=>goalLoss(m,trial.weights)),gate=validationGate(before,after,{margin:.01,z:3.3});checks.push({kind:'core',scope:trial.scope,status:gate.passed?'passed':'rejected',train:trial.train.length,test:affected.length,weights:trial.weights,validation:gate});candidate.cores[trial.scope].validation=gate;await yieldStep();}
 const test=split.test.filter(m=>m.features||!(candidate.cores['*']||candidate.cores[m.league])),baseline=test.map(recordedErrors),challenger=test.map(m=>matchErrors(m,candidate)),gate=validationGate(baseline.map(r=>r.brier),challenger.map(r=>r.brier),{z:3.3}),lossGate=validationGate(baseline.map(r=>r.loss),challenger.map(r=>r.loss),{margin:.001,z:3.3}),changed=checks.some(c=>c.status==='passed'),activate=changed&&!checks.some(c=>c.kind==='core'&&c.status==='rejected')&&gate.passed&&lossGate.passed;
 // A component passed on this holdout, but retain all incumbent components unless
 // the whole proposed workflow also beats the actual issued forecasts.
 const active=activate?candidate:current,run={id:candidate.revision,at:iso(now),status:activate?'activated':'rejected',split:split.boundaries,train:split.train.length,calibration:split.calibration.length,test:test.length,validation:gate,logLoss:lossGate,checks,correctedScopes,recordIds:test.map(m=>m.id),note:'Frozen pre-match inputs. Earlier fitting/calibration blocks; later unseen matches. No refit on validation outcomes. Conservative paired intervals are descriptive, not proof of future profits.'};
 return {...registry,...base,active,status:active?'active':'collecting',message:activate?'Validated learning update activated for future forecasts.':'Candidate did not pass later-match validation; current forecasting rules retained.',lastEvaluatedThrough:split.boundaries.testThrough,runs:[...(registry.runs||[]),run].slice(-50)};
}
export function checkDrift(dataset,registry,now=Date.now()){
 const active=usableActive(registry.active,now);if(!active)return registry;const matches=dataset.matches.filter(m=>m.learningVersion===active.revision&&m.rows.every(r=>r.learningInput?.revision===active.revision)&&m.kickoff>active.activatedAt);
 if(matches.length<LEARNING_RULES.rollbackMatches)return registry;
 const issued=matches.map(recordedErrors),raw=matches.map(m=>({brier:mean(m.rows.map(r=>brier(r.learningInput?.baselineProbability??r.learningInput?.rawProbability??r.probability,r.y))),loss:mean(m.rows.map(r=>loss(r.learningInput?.baselineProbability??r.learningInput?.rawProbability??r.probability,r.y)))}));
 const deterioration=validationGate(issued.map(r=>r.brier),raw.map(r=>r.brier),{minimum:50,z:3.3});
 if(!deterioration.passed||mean(raw.map(r=>r.loss))>=mean(issued.map(r=>r.loss)))return {...registry,drift:{matches:matches.length,status:'monitoring',validation:deterioration}};
 return {...registry,active:null,status:'collecting',message:'Learning update rolled back after worse prospective probability errors.',lastEvaluatedThrough:matches.at(-1).kickoff,drift:{matches:matches.length,status:'rolled-back',validation:deterioration,revision:active.revision},runs:[...(registry.runs||[]),{id:'rollback-'+now,at:iso(now),status:'rolled-back',revision:active.revision,validation:deterioration}].slice(-50)};
}
