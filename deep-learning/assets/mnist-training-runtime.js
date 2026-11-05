const datasetBase=new URL('../data/processed/mnist-browser/',import.meta.url);
let libraries,backendInfo;
const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
const checkAbort=signal=>{if(signal?.aborted)throw new DOMException('لغو شد.','AbortError');};
export async function loadMnistSubset({signal,onProgress}={}){
 const response=await fetch(new URL('manifest.json',datasetBase),{signal});if(!response.ok)throw Error('فهرست دادهٔ MNIST بارگیری نشد.');const manifest=await response.json();
 const loaded={};for(const[name,artifact]of Object.entries(manifest.artifacts)){
  checkAbort(signal);const result=await fetch(new URL(name,datasetBase),{signal});if(!result.ok)throw Error('دادهٔ MNIST بارگیری نشد.');const bytes=new Uint8Array(await result.arrayBuffer());
  if(bytes.byteLength!==artifact.bytes||await sha(bytes)!==artifact.sha256)throw Error('هش دادهٔ MNIST سازگار نیست.');loaded[name]=bytes;onProgress?.({stage:'data',bytes:bytes.length});
 }
 const count=manifest.train_count+manifest.validation_count;
 if(manifest.official_test_used!==false||manifest.train_count!==2000||manifest.validation_count!==500||loaded['pixels.bin'].length!==count*784||loaded['labels.bin'].length!==count||loaded['labels.bin'].some(value=>value>9))throw Error('ساختار دادهٔ MNIST معتبر نیست.');
 return{manifest,pixels:loaded['pixels.bin'],labels:loaded['labels.bin']};
}
function script(name,integrity){return new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=new URL('./vendor/mnist-runtime/'+name,import.meta.url);node.integrity=integrity;node.onload=resolve;node.onerror=()=>reject(Error('کتابخانهٔ آموزش بارگیری نشد؛ دوباره تلاش کن.'));document.head.append(node);});}
async function tfLibrary(){
 if(!libraries)libraries=(async()=>{await script('tf.min.js','sha256-MA364nPSC0BG9GoG1zVojwNnWoB1Yem8tfZk6y89KDE=');await script('tf-backend-webgpu.min.js','sha256-wCrm715//23JzsixS0XjboiUYU8+8AaXPpj3VotZDz8=');return window.tf;})().catch(error=>{libraries=null;throw error;});
 return libraries;
}
async function prepareBackend(tf,requested){
 if(backendInfo?.backend===requested&&tf.getBackend()===requested)return backendInfo;
 if(requested==='webgpu'){
  if(!navigator.gpu)throw Error('WebGPU در این مرورگر موجود نیست؛ مرورگر دیگری یا CPU را انتخاب کن.');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter||adapter.info?.isFallbackAdapter)throw Error('آداپتور سخت‌افزاری WebGPU در دسترس نیست؛ CPU را می‌توانی جداگانه انتخاب کنی.');
  const device=await adapter.requestDevice();
  tf.env().set('WEBGPU_CPU_FORWARD',false);
  tf.removeBackend('webgpu');tf.registerBackend('webgpu',()=>new tf.WebGPUBackend(device),3);
  if(!await tf.setBackend('webgpu'))throw Error('راه‌اندازی WebGPU انجام نشد.');
  backendInfo={backend:'webgpu',vendor:adapter.info?.vendor||'',architecture:adapter.info?.architecture||'',fallback:false};
 }else if(requested==='cpu'){
  await tf.setBackend('cpu');backendInfo={backend:'cpu',vendor:'',architecture:'',fallback:false,explicit:true};
 }else throw Error('Backend نامعتبر است.');
 await tf.ready();if(tf.getBackend()!==requested)throw Error('Backend با انتخاب شما سازگار نیست.');return backendInfo;
}
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let value=Math.imul(seed^seed>>>15,1|seed);value=value+Math.imul(value^value>>>7,61|value)^value;return((value^value>>>14)>>>0)/4294967296;};}
function shuffle(values,rng){for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;}
export async function createMnistTrainer(data,settings={},options={}){
 const config={activation:'relu',learningRate:.001,batchSize:32,backend:'webgpu',...settings};
 if(!['relu','tanh','sigmoid'].includes(config.activation)||![16,32,64].includes(config.batchSize)||!Number.isFinite(config.learningRate)||config.learningRate<.0001||config.learningRate>.05)throw Error('پارامترهای آموزش معتبر نیستند.');
 checkAbort(options.signal);const tf=await tfLibrary();checkAbort(options.signal);const backend=await prepareBackend(tf,config.backend);checkAbort(options.signal);
 const trainCount=data.manifest.train_count,validationCount=data.manifest.validation_count;
 const tensors=tf.tidy(()=>{
  const allX=tf.tensor4d(data.pixels,[trainCount+validationCount,28,28,1],'float32').div(255),allY=tf.oneHot(tf.tensor1d(data.labels,'int32'),10);
  return{trainX:allX.slice([0,0,0,0],[trainCount,28,28,1]),validationX:allX.slice([trainCount,0,0,0],[validationCount,28,28,1]),trainY:allY.slice([0,0],[trainCount,10])};
 });
 const model=tf.sequential();
 model.add(tf.layers.conv2d({name:'conv1',inputShape:[28,28,1],filters:8,kernelSize:3,padding:'same',activation:config.activation,kernelInitializer:tf.initializers.glorotUniform({seed:7})}));
 model.add(tf.layers.maxPooling2d({poolSize:2,strides:2}));
 model.add(tf.layers.conv2d({name:'conv2',filters:16,kernelSize:3,padding:'same',activation:config.activation,kernelInitializer:tf.initializers.glorotUniform({seed:8})}));
 model.add(tf.layers.maxPooling2d({poolSize:2,strides:2}));model.add(tf.layers.flatten());
 model.add(tf.layers.dense({name:'classifier',units:10,activation:'softmax',kernelInitializer:tf.initializers.glorotUniform({seed:9})}));
 const optimizer=tf.train.adam(config.learningRate,.9,.999,1e-7);model.compile({optimizer,loss:'categoricalCrossentropy',metrics:['accuracy']});
 let disposed=false,stepping=false,offset=0,epochLoss=0,epochCorrect=0;const rng=random(7),order=shuffle(Array.from({length:trainCount},(_,index)=>index),rng);
 const state={step:0,epoch:0,history:[],epochs:[],backend,config,parameters:model.countParams()};
 const gallery=[];for(let digit=0;digit<10;digit++){let found=0;for(let i=0;i<validationCount&&found<2;i++)if(data.labels[trainCount+i]===digit){gallery.push(i);found++;}}
 async function evaluate(){
  const output=model.predict(tensors.validationX);try{const probabilities=await output.data();let loss=0,correct=0;const classes=Array.from({length:10},()=>({count:0,correct:0}));
   for(let i=0;i<validationCount;i++){const label=data.labels[trainCount+i],row=probabilities.subarray(i*10,(i+1)*10);loss-=Math.log(Math.max(1e-7,row[label]));classes[label].count++;if(row.indexOf(Math.max(...row))===label){correct++;classes[label].correct++;}}
   return{loss:loss/validationCount,accuracy:correct/validationCount,count:validationCount,correct,classes};
  }finally{output.dispose();}
 }
 async function view(selected=gallery[0]){
  if(disposed)throw Error('مدل آزاد شده است.');if(!Number.isInteger(selected)||selected<0||selected>=validationCount)throw Error('نمونهٔ انتخاب‌شده معتبر نیست.');
  const outputs=tf.tidy(()=>{const sample=tensors.validationX.slice([selected,0,0,0],[1,28,28,1]);return{predictions:model.predict(tf.gather(tensors.validationX,gallery)),selectedPrediction:model.predict(sample),features:model.layers[0].apply(sample),weights:model.layers[0].getWeights()[0].clone()};});
  try{return{gallery,predictions:Array.from(await outputs.predictions.data()),selectedPrediction:Array.from(await outputs.selectedPrediction.data()),features:Array.from(await outputs.features.data()),featureShape:outputs.features.shape,weights:Array.from(await outputs.weights.data()),weightShape:outputs.weights.shape,selected};}
  finally{Object.values(outputs).forEach(tensor=>tensor.dispose());}
 }
 async function step(){
  if(disposed||stepping)throw Error('یک دستهٔ دیگر در حال اجراست یا مدل آزاد شده است.');stepping=true;
  const indices=order.slice(offset,offset+config.batchSize),batch=tf.tidy(()=>{const index=tf.tensor1d(indices,'int32');return{x:tf.gather(tensors.trainX,index),y:tf.gather(tensors.trainY,index)};});
  try{
   const output=await model.trainOnBatch(batch.x,batch.y),[loss,accuracy]=Array.isArray(output)?output:[output,NaN];if(!Number.isFinite(loss)||!Number.isFinite(accuracy))throw Error('زیان نامتناهی شد؛ نرخ یادگیری را کمتر کن و از نو شروع کن.');
   offset+=indices.length;state.step++;epochLoss+=loss*indices.length;epochCorrect+=accuracy*indices.length;
   state.batchIndices=[...indices];
   state.history.push({step:state.step,epoch:state.epoch+offset/trainCount,loss,accuracy,samples:indices.length});
   if(offset===trainCount){state.epoch++;const validation=await evaluate();state.epochs.push({epoch:state.epoch,step:state.step,trainLoss:epochLoss/trainCount,trainAccuracy:epochCorrect/trainCount,validationLoss:validation.loss,validationAccuracy:validation.accuracy});offset=0;epochLoss=0;epochCorrect=0;shuffle(order,rng);}
   return state;
  }finally{batch.x.dispose();batch.y.dispose();stepping=false;}
 }
 async function snapshot(){const values=tf.tidy(()=>model.getWeights().map(value=>value.clone()));try{return{config,backend,state:structuredClone(state),weights:await Promise.all(values.map(async tensor=>({shape:tensor.shape,values:Array.from(await tensor.data())}))),gallery};}finally{values.forEach(value=>value.dispose());}}
 function dispose(){if(disposed)return;if(stepping)throw Error('پیش از آزادسازی، پایان دستهٔ جاری را منتظر بمان.');disposed=true;model.dispose();optimizer.dispose();Object.values(tensors).forEach(tensor=>tensor.dispose());}
 return{state,view,step,evaluate,snapshot,dispose,gallery};
}
