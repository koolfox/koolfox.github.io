import {createBertTokenizer} from './model-tokenizer.js';
export {preprocessResnetImageData,preprocessVitImageData,preprocessSourceModelImageData} from './model-image.js?v=a7712c46f0cf8d6c';

const manifestURL = new URL('../models/source-models.json', import.meta.url);
let contextPromise = null;
const hex = bytes => [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2,'0')).join('');
function canceled(signal) { if (signal?.aborted) throw new DOMException('اجرای مدل لغو شد.','AbortError'); }

export async function sourceModelCatalog() {
  const response = await fetch(manifestURL,{cache:'no-cache'});
  if (!response.ok) throw Error('فهرست مدل‌ها بارگیری نشد.');
  const manifest = await response.json();
  if (manifest.schema_version !== 1 || !Array.isArray(manifest.models)) throw Error('فهرست مدل‌ها معتبر نیست.');
  return manifest.models;
}

async function verifiedBytes(artifact,{signal,onProgress,localArtifactBase}={}) {
  canceled(signal);
  const url = localArtifactBase ? new URL(artifact.local_file,localArtifactBase).href
    : new URL(artifact.url,manifestURL).href;
  const resolved=new URL(url);if(resolved.origin===manifestURL.origin)resolved.searchParams.set('sha256',artifact.sha256);
  const response = await fetch(resolved,{signal});
  if (!response.ok) throw Error(`بارگیری ${artifact.name} انجام نشد (${response.status}).`);
  const length = artifact.bytes;
  let bytes;
  if (response.body && Number.isSafeInteger(length) && length > 0) {
    bytes = new Uint8Array(length);let offset=0;
    const reader=response.body.getReader();
    try {
      while(true) {
        const {done,value}=await reader.read();if(done)break;
        if(offset+value.length>length)throw Error('اندازهٔ فایل مدل با نسخهٔ ثبت‌شده سازگار نیست.');
        bytes.set(value,offset);offset+=value.length;
        onProgress?.({stage:'download',artifact:artifact.name,loaded:offset,total:length});
      }
      if(offset!==length)throw Error('فایل مدل ناقص دریافت شد.');
    }finally{reader.releaseLock();}
  }else bytes=new Uint8Array(await response.arrayBuffer());
  canceled(signal);onProgress?.({stage:'verify',artifact:artifact.name,loaded:bytes.length,total:length});
  const digest=hex(await crypto.subtle.digest('SHA-256',bytes));
  if(digest!==artifact.sha256)throw Error('هش فایل با مدل ثبت‌شده سازگار نیست؛ فایل اجرا نشد.');
  return bytes;
}

async function gpuContext() {
  if(!contextPromise)contextPromise=(async()=>{
    if(!navigator.gpu)throw Error('این مرورگر WebGPU را ارائه نمی‌کند.');
    const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    if(!adapter)throw Error('آداپتور WebGPU در دسترس نیست.');
    if(adapter.info?.isFallbackAdapter)throw Error('این آزمایش مدل کامل به آداپتور سخت‌افزاری WebGPU نیاز دارد.');
    const requiredLimits={};
    for(const name of ['maxBufferSize','maxStorageBufferBindingSize'])requiredLimits[name]=adapter.limits[name];
    const device=await adapter.requestDevice({requiredLimits});
    const ort=await import('./vendor/model-runtime/ort.webgpu.min.mjs');
    ort.env.wasm.wasmPaths=new URL('./vendor/model-runtime/',import.meta.url).href;
    ort.env.wasm.numThreads=1;
    return {ort,device,adapter:{vendor:adapter.info?.vendor||'',architecture:adapter.info?.architecture||'',
      device:adapter.info?.device||'',description:adapter.info?.description||'',fallback:adapter.info?.isFallbackAdapter??null},
      limits:{maxBufferSize:adapter.limits.maxBufferSize,maxStorageBufferBindingSize:adapter.limits.maxStorageBufferBindingSize}};
  })().catch(error=>{contextPromise=null;throw error;});
  return contextPromise;
}

export async function loadSourceModel(id,options={}) {
  const model=(await sourceModelCatalog()).find(model=>model.id===id);
  if(!model)throw Error('مدل انتخاب‌شده ثبت نشده است.');
  if(model.validation.state!=='verified')throw Error('اجرای این مدل هنوز تأیید نشده است.');
  canceled(options.signal);options.onProgress?.({stage:'device',artifact:model.id});
  const context=await gpuContext();
  const bytes=await verifiedBytes(model.artifacts.model,options);
  if(model.graph_patch){
    for(const patch of model.graph_patch.patches){
      if(!Number.isSafeInteger(patch.offset)||patch.offset<0||patch.offset>=bytes.length||bytes[patch.offset]!==patch.from)throw Error('نسخهٔ گراف با تبدیل ثبت‌شده سازگار نیست.');
      bytes[patch.offset]=patch.to;
    }
    options.onProgress?.({stage:'verify',artifact:model.id+' graph',loaded:bytes.length,total:bytes.length});
    if(hex(await crypto.subtle.digest('SHA-256',bytes))!==model.graph_patch.derived_sha256)throw Error('هش گراف تبدیل‌شده معتبر نیست.');
  }
  let graphBytes=bytes,externalData;
  if(model.external_data){
    graphBytes=await verifiedBytes(model.artifacts.graph,options);
    externalData=[{path:model.external_data.path,data:bytes}];
  }
  canceled(options.signal);options.onProgress?.({stage:'compile',artifact:model.id});
  const session=await context.ort.InferenceSession.create(graphBytes,{
    externalData,
    executionProviders:[{name:'webgpu',device:context.device}],graphOptimizationLevel:'all',
    freeDimensionOverrides:model.dimension_overrides||{},
    extra:{session:{disable_cpu_ep_fallback:'1'}},
  });
  try {
    canceled(options.signal);
    let tokenizer=null;
    if(model.kind==='masked-language-model')tokenizer=createBertTokenizer(new TextDecoder().decode(await verifiedBytes(model.artifacts.vocabulary,options)));
    if(model.kind==='contrastive-image-text'){
      const{createClipTokenizer}=await import('./model-clip-tokenizer.js?v=aff9feaf664e80a7');
      const tokenizerJson=JSON.parse(new TextDecoder().decode(await verifiedBytes(model.artifacts.tokenizer,options)));
      const config=JSON.parse(new TextDecoder().decode(await verifiedBytes(model.artifacts.tokenizer_config,options)));
      tokenizer=createClipTokenizer(tokenizerJson,config);
    }
    const reference=JSON.parse(new TextDecoder().decode(await verifiedBytes(model.artifacts.reference,options)));
    return {...context,id,model,session,tokenizer,reference,released:false};
  }catch(error){await session.release();throw error;}
}

function top(values,count=5) {
  return Array.from(values,(value,index)=>({index,value})).sort((a,b)=>b.value-a.value).slice(0,count);
}
function softmax(values) {
  const maximum=Math.max(...values),exponentials=Array.from(values,value=>Math.exp(value-maximum));
  const sum=exponentials.reduce((a,b)=>a+b,0);return exponentials.map(value=>value/sum);
}
function compare(actual,expected,tolerance) {
  if(actual.length!==expected.length)throw Error('شکل خروجی با مرجع سازگار نیست.');
  let maxAbsoluteError=0,failed=0;
  actual.forEach((value,index)=>{const error=Math.abs(value-expected[index]);maxAbsoluteError=Math.max(maxAbsoluteError,error);
    if(!Number.isFinite(value)||error>tolerance.absolute+tolerance.relative*Math.abs(expected[index]))failed++;});
  return {matched:failed===0,compared:actual.length,failed,maxAbsoluteError,tolerance};
}

export async function runSourceModel(handle,input={},options={}) {
  if(handle.released)throw Error('مدل آزاد شده است؛ دوباره آن را بارگیری کن.');
  canceled(options.signal);
  const {model,session,ort,reference}=handle;let feeds,encoded=null,isReference=false,prompts=null;
  if(model.kind==='masked-language-model') {
    const text=input.text??model.default_input.text,textPair=input.textPair??model.default_input.textPair;
    encoded=handle.tokenizer.encode(text,textPair);
    const pad=model.input_shape[1],length=encoded.inputIds.length;
    const ids=[...encoded.inputIds,...Array(pad-length).fill(0)];
    const types=[...encoded.typeIds,...Array(pad-length).fill(0)],mask=[...encoded.attentionMask,...Array(pad-length).fill(0)];
    const dtype=model.input_dtype||'int64';
    const tensor=values=>new ort.Tensor(dtype,dtype==='int32'?Int32Array.from(values):BigInt64Array.from(values,BigInt),[1,pad]);
    feeds={input_ids:tensor(ids),token_type_ids:tensor(types),attention_mask:tensor(mask)};
    isReference=text===model.default_input.text&&textPair===model.default_input.textPair;
  }else {
    let tensor=input.tensor;
    if(tensor===undefined) {
      const bytes=await verifiedBytes(model.artifacts.input,options);
      tensor=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);isReference=true;
    }
    if(!(tensor instanceof Float32Array)||tensor.length!==model.input_shape.reduce((a,b)=>a*b,1)||tensor.some(value=>!Number.isFinite(value)))throw Error('تنسور تصویر با شکل ورودی مدل سازگار نیست.');
    feeds={[model.input_name]:new ort.Tensor('float32',tensor,model.input_shape)};
    if(model.kind==='contrastive-image-text'){
      prompts=input.prompts??model.default_input.prompts;encoded=handle.tokenizer.encodeCandidates(prompts);
      feeds.input_ids=new ort.Tensor('int32',encoded.inputIds,[4,77]);
      feeds.attention_mask=new ort.Tensor('int32',encoded.attentionMask,[4,77]);
      feeds.end_mask=new ort.Tensor('float32',encoded.endMask,[4,77]);
      isReference=isReference&&prompts.every((text,index)=>text===model.default_input.prompts[index]);
    }
  }
  options.onProgress?.({stage:'inference',artifact:model.id});
  let outputs;
  try {
    outputs=await session.run(feeds);canceled(options.signal);
    const output=outputs[model.output_name];if(!output)throw Error('خروجی ثبت‌شده در گراف مدل وجود ندارد.');
    const data=await output.getData();
    if(model.kind==='masked-language-model') {
      const masks=encoded.maskPositions.map(position=>{
        const logits=data.slice(position*30522,(position+1)*30522),probabilities=softmax(logits);
        return {position,top:top(logits).map(item=>({...item,token:handle.tokenizer.token(item.index),probability:probabilities[item.index]})),
          ...(isReference?{comparison:compare(logits,reference.mask_logits,model.validation.tolerance)}:{})};
      });
      return {model:idOf(handle),adapter:handle.adapter,backend:'webgpu',tokens:encoded.tokens,inputIds:encoded.inputIds,
        outputShape:output.dims,masks,isReference,fullModel:true};
    }
    if(model.kind==='contrastive-image-text'){
      const cosine=await outputs.cosine_similarity.getData(),image=await outputs.image_embeddings.getData(),text=await outputs.text_embeddings.getData(),probabilities=softmax(data);
      const candidates=prompts.map((label,index)=>({index,label,value:probabilities[index],probability:probabilities[index],cosine:cosine[index],logit:data[index]}));
      const tensorComparisons=isReference?{logits:compare(data,reference.logits,model.validation.tolerance),cosine:compare(cosine,reference.cosine,model.validation.tolerance),image:compare(image,reference.image_embeddings,model.validation.tolerance),text:compare(text,reference.text_embeddings,model.validation.tolerance)}:null;
      const checks=Object.values(tensorComparisons||{}),comparison=isReference?{matched:checks.every(value=>value.matched),compared:checks.reduce((sum,value)=>sum+value.compared,0),failed:checks.reduce((sum,value)=>sum+value.failed,0),maxAbsoluteError:Math.max(...checks.map(value=>value.maxAbsoluteError)),tolerance:model.validation.tolerance}:null;
      return{model:idOf(handle),adapter:handle.adapter,backend:'webgpu',fullModel:true,isReference,outputShape:output.dims,candidates,top:[...candidates].sort((a,b)=>b.value-a.value),textTokens:encoded.encoded.map(row=>row.tokens),inputIds:encoded.encoded.map(row=>row.ids),...(isReference?{comparison,tensorComparisons}:{}),embeddingShapes:{image:outputs.image_embeddings.dims,text:outputs.text_embeddings.dims}};
    }
    const probabilities=model.output_is_probabilities?Array.from(data):softmax(data);
    return {model:idOf(handle),adapter:handle.adapter,backend:'webgpu',inputShape:model.input_shape,outputShape:output.dims,
      top:top(probabilities).map(item=>({...item,label:reference.labels?.[item.index]||String(item.index)})),
      ...(isReference?{comparison:compare(data,reference.output,model.validation.tolerance)}:{}),isReference,fullModel:true};
  }finally{for(const tensor of Object.values(outputs||{}))tensor.dispose?.();for(const tensor of Object.values(feeds))tensor.dispose?.();}
}
const idOf=handle=>handle.id;
export async function releaseSourceModel(handle) {if(!handle||handle.released)return;handle.released=true;await handle.session.release();}
