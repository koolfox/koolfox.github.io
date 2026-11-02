import {chromium} from '../../browser-tests/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const base=process.env.MODEL_VALIDATION_URL||'http://127.0.0.1:8875';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined}));
 let weightRequests=0;
 page.on('request',request=>{if(request.url().endsWith('.onnx'))weightRequests++;});
 await page.goto(base+'/deep-learning/models/source-models.json');
 const result=await page.evaluate(async()=>{
  const api=await import('/deep-learning/assets/model-runtime.js');
  try{await api.loadSourceModel('resnet152-v1');return{unexpected:true};}
  catch(error){return{message:error.message};}
 });
 assert.match(result.message,/WebGPU/);assert.equal(weightRequests,0);
 const cancellation=await page.evaluate(async()=>{
  const api=await import('/deep-learning/assets/model-runtime.js'),controller=new AbortController();controller.abort();
  try{await api.loadSourceModel('resnet152-v1',{signal:controller.signal});return'unexpected';}
  catch(error){return error.name;}
 });
 assert.equal(cancellation,'AbortError');assert.equal(weightRequests,0);
 console.log('PASS: missing WebGPU and pre-aborted actions never fetch weights or execute CPU fallback.');
}finally{await browser.close();}
