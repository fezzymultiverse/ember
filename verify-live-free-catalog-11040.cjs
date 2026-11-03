/* Optional read-only public catalog check. No keys or generation endpoints. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),mem={},requests=[];
const LS={get:(k,d)=>k in mem?structuredClone(mem[k]):d,set:(k,v)=>{mem[k]=structuredClone(v);},del:k=>delete mem[k]};
const window={dispatchEvent(){},addEventListener(){}};
const ctx={window,U:{LS},performance,AbortController,TextDecoder,setTimeout,clearTimeout,Event,CustomEvent:class{},console,
 fetch:async(url,opt)=>{if(url!=='https://openrouter.ai/api/v1/models'||opt.method&&opt.method!=='GET'||opt.headers.Authorization)throw new Error('Only an unauthenticated public catalog GET is permitted');requests.push(url);return fetch(url,{...opt,signal:AbortSignal.timeout(20000)});}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'www/providers.js'),'utf8'),ctx);
(async()=>{const models=await window.Prov.freeModelsOf('openrouter',true);if(!models.length)throw new Error('Catalog returned no verified free text models');
 const result={checkedAt:new Date().toISOString(),status:'PASS',scope:'Public catalog discovery only; authenticated generation not tested',requests,totalCatalogModels:mem.ember_models.openrouter.list.length,freeTextModels:models.length,models};
 fs.mkdirSync(path.join(root,'verification-1.10.40'),{recursive:true});fs.writeFileSync(path.join(root,'verification-1.10.40/live-free-catalog.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
