/** Run only after prepare_references.py and a local HTTP server are ready.
 * The server root must be the repository. No weights enter the distributable.
 */
import {chromium} from '../browser-tests/node_modules/playwright/index.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.MODEL_VALIDATION_URL||'http://127.0.0.1:8875/';
const output=new URL('../results/model-validation/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=metal']});
try{
 const page=await browser.newPage();
 page.on('console',message=>console.log('browser',message.type(),message.text()));
 page.on('pageerror',error=>console.error('pageerror',error));
 await page.goto(base+'deep-learning/models/source-models.json');
 for(const id of process.argv.slice(2).length?process.argv.slice(2):['resnet152-v1','bert-base-uncased']){
  const result=await page.evaluate(async({id,base})=>{
   const api=await import('/deep-learning/assets/model-runtime.js');
   let previous='';
   const options={localArtifactBase:base+'deep-learning/results/model-validation/cache/',onProgress:value=>{
    if(previous!==value.stage){console.log(value.stage,value.artifact);previous=value.stage;}
   }};
   const start=performance.now();let handle;
   try{
    handle=await api.loadSourceModel(id,options);
    const loaded=performance.now();const result=await api.runSourceModel(handle,{},options);
    const runMilliseconds=performance.now()-loaded;
    if(id==='bert-base-uncased'){
     const response=await fetch(base+'deep-learning/results/model-validation/bert-pytorch-logits.float32.bin');
     if(!response.ok)throw Error('Run prepare_references.py first: full PyTorch tensor is required.');
     const reference=new Float32Array(await response.arrayBuffer()),pad=128,ids=handle.reference.input_ids,types=handle.reference.token_type_ids;
     const mask=[...Array(result.inputIds.length).fill(1),...Array(pad-result.inputIds.length).fill(0)],feeds={};
     for(const[name,values]of Object.entries({input_ids:ids,token_type_ids:types,attention_mask:mask}))feeds[name]=new handle.ort.Tensor('int32',Int32Array.from(values),[1,pad]);
     let outputs;try{
      outputs=await handle.session.run(feeds);const actual=await outputs.logits.getData();
      if(actual.length!==reference.length)throw Error('Full tensor shape mismatch');
      let maxAbsoluteError=0,failed=0;const tolerance=handle.model.validation.tolerance;
      for(let i=0;i<actual.length;i++){const error=Math.abs(actual[i]-reference[i]);maxAbsoluteError=Math.max(maxAbsoluteError,error);if(!Number.isFinite(actual[i])||error>tolerance.absolute+tolerance.relative*Math.abs(reference[i]))failed++;}
      result.fullTensorComparison={matched:failed===0,compared:actual.length,failed,maxAbsoluteError,reference:'PyTorch2.13.0 / Transformers4.57.3 pinned original safetensors',tolerance};
     }finally{for(const tensor of Object.values(outputs||{}))tensor.dispose?.();for(const tensor of Object.values(feeds))tensor.dispose?.();}
    }
    return {...result,loadMilliseconds:loaded-start,runMilliseconds,userAgent:navigator.userAgent};
   }finally{if(handle)await api.releaseSourceModel(handle);}
  },{id,base});
  await writeFile(new URL(id+'-webgpu.json',output),JSON.stringify(result,null,2)+'\n');
  const checks=result.comparison?[result.comparison]:result.masks.map(mask=>mask.comparison);
  if(result.fullTensorComparison)checks.push(result.fullTensorComparison);
  if(result.adapter.fallback!==false||!checks.every(check=>check?.matched))throw Error('Reference comparison failed: '+JSON.stringify(result));
  console.log('VERIFIED',id,JSON.stringify(result));
 }
}finally{await browser.close();}
