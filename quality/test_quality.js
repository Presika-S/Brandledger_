#!/usr/bin/env node
/* Quality gate for the BrandLedger claim engine.
   Run:  node quality/test_quality.js
   Exits 1 (fails CI) when any metric drops below quality/dataset.json -> thresholds.
   It runs the REAL engine code out of index.html (blocks marked QA-ENGINE-START/END), not a copy. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),data=JSON.parse(fs.readFileSync(path.join(__dirname,'dataset.json'),'utf8'));
const blocks=[...html.matchAll(/\/\*QA-ENGINE-START\*\/([\s\S]*?)\/\*QA-ENGINE-END\*\//g)].map(m=>m[1]);
if(blocks.length<3){console.error('FAIL: engine blocks not found in index.html');process.exit(1)}
const emb=html.match(/\/\*QA-DATA-START\*\/const QA_DATA=([\s\S]*?);\/\*QA-DATA-END\*\//);
const ctx=vm.createContext({console,Date,Math,JSON,RegExp,localStorage:{},performance:{now:()=>Date.now()}});
vm.runInContext('let S;',ctx);vm.runInContext(blocks.join('\n'),ctx);
const out=vm.runInContext('(()=>{const d='+JSON.stringify(data)+';const r=QA.run(d);return {r,b:QA.bench(400,50)}})()',ctx);
const {r,b}=out;let fail=0;const ok=(c,m)=>{console.log((c?'  PASS ':'  FAIL ')+m);if(!c)fail++};
console.log(`\nBrandLedger quality gate: ${r.drafts} drafts, ${r.n} labelled sentences\n`);
ok(!!emb&&JSON.stringify(JSON.parse(emb[1]))==JSON.stringify(data),'dataset embedded in index.html matches quality/dataset.json');
console.log('\n  class                     support  precision  recall   F1');
for(const c of Object.keys(r.per)){const p=r.per[c];console.log('  '+c.padEnd(24)+String(p.sup).padStart(7)+p.p.toFixed(2).padStart(11)+p.r.toFixed(2).padStart(9)+p.f1.toFixed(2).padStart(7))}
console.log(`\n  accuracy ${(r.acc*100).toFixed(1)}%   macro F1 ${r.macro.toFixed(2)}   fix accuracy ${r.fix.ok}/${r.fix.n}\n`);
r.gate.fails.forEach(f=>ok(false,f));ok(r.gate.pass,'all quality thresholds met');
ok(b.auto.recall===1&&b.auto.precision===1,`reverse check finds every stale item in a ${b.n}-item registry (${b.auto.found}/${b.truth})`);
ok(b.auto.recall>=b.manual.recall,`reverse check recall ${(b.auto.recall*100).toFixed(0)}% >= exact-text search ${(b.manual.recall*100).toFixed(0)}%`);
console.log(`\n  reverse check ${b.auto.ms.toFixed(3)} ms, exact-text search ${b.manual.ms.toFixed(3)} ms (machine time, ${b.n} items)\n`);
process.exit(fail?1:0);
