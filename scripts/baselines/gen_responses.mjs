// Generatore di riferimento delle risposte (L2a). Uso: node gen_responses.mjs <repoRoot> <out.json>
const ROOT=process.argv[2]; const R=(await import('url')).pathToFileURL(ROOT+'/src/').href; import fs from 'fs';
const log=console.log; console.log=()=>{}; console.warn=()=>{}; console.error=()=>{};
const { initOdessa } = await import(R+'initOdessa.js'); await initOdessa();
const { loadMessaggiSistema } = await import(R+'logic/systemMessages.js'); loadMessaggiSistema();
const { createEngine } = await import(R+'logic/engine.js');
const { ensureVocabulary, parseCommand } = await import(R+'logic/parser.js'); await ensureVocabulary();
const { mapParseErrorToUserMessage } = await import(R+'logic/messages.js');
const V=global.odessaData.VociLessico, T=global.odessaData.TerminiLessico;
const typeOf=id=>T.find(t=>t.ID_Termine===id).ID_TipoLessico;
const STEPS=[0,6,37,49,94,119,146];
const entries=[];
for (const lang of [1,2]) {
  const vs=[...new Set(V.filter(v=>v.ID_Lingua===lang).map(v=>v.Voce.toLowerCase()))];
  const verbs=[...new Set(V.filter(v=>v.ID_Lingua===lang && [1,2,3].includes(typeOf(v.ID_Termine))).map(v=>v.Voce.toLowerCase()))];
  const nouns=[...new Set(V.filter(v=>v.ID_Lingua===lang && typeOf(v.ID_Termine)===4).map(v=>v.Voce.toLowerCase()))];
  const cmds=new Set(vs); for (const a of verbs) for (const n of nouns) cmds.add(a+' '+n);
  const inputs=[...cmds].sort();
  const steps=JSON.parse(fs.readFileSync(ROOT+'/tests/fixtures/walkthrough/'+(lang===1?'full_it':'full_en')+'.json')).steps;
  for (const K of STEPS) {
    const E=createEngine(); E.initializeOriginalData(); E.resetGameState(lang);
    for (const s of steps.filter(x=>x.step<=K)) { const p=await parseCommand(null,s.command,E.getGameState()); E.executeCommand(p); }
    const snap=JSON.stringify(E.getGameStateSnapshot());
    for (const input of inputs) {
      const X=createEngine(); X.initializeOriginalData(); X.setGameState(JSON.parse(snap));
      const p=await parseCommand(null,input,X.getGameState());
      const message = p.IsValid!==true ? mapParseErrorToUserMessage(p,lang) : String(X.executeCommand(p)?.message ?? '');
      entries.push({lang, step:K, input, message});
    }
  }
}
fs.writeFileSync(process.argv[3], '[\n'+entries.map(e=>JSON.stringify(e)).join(',\n')+'\n]\n');
log('entries',entries.length);
