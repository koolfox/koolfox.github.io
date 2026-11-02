import{sourceModelCatalog,loadSourceModel,runSourceModel,releaseSourceModel,preprocessSourceModelImageData}from'./model-runtime.js?v=fe40e5cb0bf0ab28';
import{createBertTokenizer}from'./model-tokenizer.js';
const find=selector=>document.querySelector(selector),number=new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1});
const form=find('[data-model-form]'),run=find('[data-run]'),cancel=find('[data-cancel]'),release=find('[data-release]');
const errorPanel=find('[data-error]'),note=find('[data-input-note]'),results=find('[data-results]'),agreement=find('[data-agreement]');
let model,handle,controller,tokenizer,uploaded,busy=false,preparing=false,leaving=false,lastProgress=0;
function element(tag,text,attributes={}){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;for(const[key,value]of Object.entries(attributes))node.setAttribute(key,value);return node;}
function error(message){errorPanel.textContent=message;errorPanel.hidden=false;}
function clearResults(){results.replaceChildren();agreement.hidden=true;find('[data-device]').textContent='';find('[data-empty]').hidden=false;find('[data-empty]').textContent='برای نتیجهٔ این ورودی، اجرا کن.';find('[data-tokens-panel]').hidden=true;}
function validInput(){
 if(!model)return false;
 if(model.kind==='image-classification')return form.elements.mode?.value==='reference'||Boolean(uploaded);
 try{const encoded=tokenizer?.encode(form.elements.text.value,form.elements.textPair.value);if(!encoded)return false;note.textContent=`${number.format(encoded.tokens.length)} از ۱۲۸ توکن؛ جای [MASK] پیش‌بینی می‌شود.`;return true;}
 catch(cause){note.textContent=cause.message;return false;}
}
function controls(){if(!navigator.gpu)error('این مرورگر WebGPU را ارائه نمی‌کند. از مرورگری با WebGPU فعال استفاده کن.');const valid=validInput();run.disabled=busy||preparing||!valid||!navigator.gpu;find('[data-inputs]').disabled=busy;cancel.hidden=!busy;release.hidden=!handle||busy;run.textContent=handle?'اجرا':'بارگیری و اجرا';}
function progress(value){
 const now=performance.now();if(value.stage==='download'&&now-lastProgress<120&&value.loaded!==value.total)return;lastProgress=now;
 const region=find('[data-progress-region]'),bar=find('[data-progress]'),text=find('[data-progress-text]');region.hidden=false;
 const labels={device:'آماده‌سازی WebGPU',verify:'بررسی صحت فایل',compile:'آماده‌سازی مدل',inference:'محاسبهٔ پیش‌بینی'};
 if(value.stage==='download'&&value.total){bar.max=value.total;bar.value=value.loaded;text.textContent=`بارگیری: ${number.format(value.loaded/1e6)} از ${number.format(value.total/1e6)} مگابایت`;}
 else{bar.removeAttribute('value');text.textContent=labels[value.stage]||'آماده‌سازی';}
}
function predictionList(items){
 const list=element('ol',undefined,{class:'model-predictions'});
 for(const item of items){const row=element('li'),line=element('div',undefined,{class:'model-prediction-label'});const label=element('bdi',item.token??item.label,{dir:'ltr'});const probability=item.probability??item.value;line.append(label,element('strong',`${number.format(probability*100)}٪`));const bar=element('div',undefined,{class:'model-bar','aria-hidden':'true'}),fill=element('span');fill.style.setProperty('--probability',String(Math.max(0,Math.min(1,probability))));bar.append(fill);row.append(line,bar);list.append(row);}
 return list;
}
function show(result){
 find('[data-empty]').hidden=true;results.replaceChildren();
 if(result.masks){for(const mask of result.masks){if(result.masks.length>1)results.append(element('h3',`واژهٔ پوشانده‌شده در جایگاه ${number.format(mask.position)}`));results.append(predictionList(mask.top));}find('[data-tokens]').textContent=result.tokens.join(' ');find('[data-tokens-panel]').hidden=false;}
 else results.append(predictionList(result.top));
 const comparisons=result.comparison?[result.comparison]:result.masks?.map(mask=>mask.comparison).filter(Boolean)||[];
 if(result.isReference&&comparisons.length){agreement.hidden=false;const matched=comparisons.every(value=>value.matched);agreement.textContent=matched?`خروجی با مرجع عددی سازگار است؛ ${number.format(comparisons.reduce((sum,value)=>sum+value.compared,0))} مقدار مقایسه شد.`:'خروجی با مرجع عددی سازگار نیست؛ نتیجه نیاز به بررسی دارد.';agreement.dataset.matched=String(matched);}
 else agreement.hidden=true;
 find('[data-device]').textContent=`WebGPU · ${[result.adapter.vendor,result.adapter.architecture].filter(Boolean).join(' / ')}`;
}
async function loadVocabulary(){
 const artifact=model.artifacts.vocabulary,response=await fetch(new URL(artifact.url,new URL('../models/source-models.json',import.meta.url)));
 if(!response.ok)throw Error('واژگان بارگیری نشد؛ صفحه را دوباره باز کن.');const bytes=await response.arrayBuffer();const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
 if(digest!==artifact.sha256)throw Error('فایل واژگان با مدل سازگار نیست.');tokenizer=createBertTokenizer(new TextDecoder().decode(bytes));
}
async function chooseImage(file){
 uploaded=null;find('[data-preview]').hidden=true;clearResults();errorPanel.hidden=true;preparing=true;controls();let bitmap;
 try{
  if(!file)return;if(!file.type.startsWith('image/')||file.size>20000000)throw Error('یک فایل تصویر با حجم کمتر از ۲۰ مگابایت انتخاب کن.');
  bitmap=await createImageBitmap(file,{imageOrientation:'none',colorSpaceConversion:'none'});
  if(bitmap.width*bitmap.height>20000000||Math.max(bitmap.width/bitmap.height,bitmap.height/bitmap.width)>16)throw Error('تصویر باید حداکثر ۲۰ مگاپیکسل و با نسبت ابعاد کمتر از ۱۶ باشد.');
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(bitmap,0,0);
  const prepared=preprocessSourceModelImageData(model,context.getImageData(0,0,bitmap.width,bitmap.height));uploaded=prepared.tensor;
  const preview=find('[data-crop]');preview.getContext('2d').putImageData(new ImageData(prepared.preview.data,224,224),0,0);find('[data-preview]').hidden=false;
 }catch(cause){error(cause.message||'تصویر خوانده نشد؛ فایل دیگری انتخاب کن.');}
 finally{bitmap?.close();preparing=false;controls();}
}
function referenceNote(){return model.default_input?.kind==='image'?'خروجی این تصویر با اجرای پایتون مقایسه می‌شود.':'تنسور عددی آزمون؛ این ورودی عکس نیست.';}
function inputControls(){
 const container=find('[data-input-controls]');
 if(model.kind==='masked-language-model'){
  for(const[name,label,rows]of[['text','جملهٔ دارای [MASK]',3],['textPair','جملهٔ دوم',2]]){const wrapper=element('label',label),input=element('textarea',undefined,{name,rows,dir:'ltr',spellcheck:'false','aria-label':label});input.value=model.default_input[name];wrapper.append(input);container.append(wrapper);}
 }else{
  const modes=element('div',undefined,{class:'model-modes'});
  for(const[value,text]of[['reference',model.default_input?.kind==='image'?'تصویر نمونه':'آزمون عددی مرجع'],['image','تصویر من']]){const label=element('label'),radio=element('input',undefined,{type:'radio',name:'mode',value});radio.checked=value==='reference';label.append(radio,document.createTextNode(text));modes.append(label);}
  if(model.default_input?.preview_url){const figure=element('figure',undefined,{class:'model-preview','data-reference-preview':''}),image=element('img',undefined,{class:'model-crop',src:new URL(model.default_input.preview_url,new URL('../models/source-models.json',import.meta.url)).href,alt:model.default_input.caption_fa||'تصویر نمونه',width:'224',height:'224'});figure.append(image,element('figcaption',model.default_input.caption_fa||'تصویر نمونهٔ مدل'));container.append(figure);}
  const upload=element('div',undefined,{'data-upload':''});upload.hidden=true;const label=element('label','تصویر ورودی'),file=element('input',undefined,{type:'file',accept:'image/*','data-file':'','aria-label':'تصویر ورودی'});label.append(file);upload.append(label);
  const figure=element('figure',undefined,{class:'model-preview','data-preview':''});figure.hidden=true;figure.append(element('canvas',undefined,{class:'model-crop',width:'224',height:'224','data-crop':'',role:'img','aria-label':'تصویر ۲۲۴ در ۲۲۴ ورودی مدل'}),element('figcaption',model.preprocessing?.resize_mode==='stretch'?'تصویر ورودی مدل · RGB · ۲۲۴ × ۲۲۴':'برش ورودی مدل · RGB · ۲۲۴ × ۲۲۴'));upload.append(figure);container.append(modes,upload);
  file.addEventListener('change',()=>chooseImage(file.files[0]));
 }
 form.addEventListener('input',event=>{
  if(event.target.matches('[type=file]'))return;clearResults();errorPanel.hidden=true;
  if(model.kind==='image-classification'){const image=form.elements.mode.value==='image';find('[data-upload]').hidden=!image;if(find('[data-reference-preview]'))find('[data-reference-preview]').hidden=image;note.textContent=image?'تصویر در همین مرورگر پردازش می‌شود.':referenceNote();}
  controls();
 });
 if(model.kind==='image-classification')note.textContent=referenceNote();
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!validInput())return;busy=true;controller=new AbortController();errorPanel.hidden=true;clearResults();controls();
 try{
  const options={signal:controller.signal,onProgress:progress};if(!handle)handle=await loadSourceModel(model.id,options);
  if(leaving){await releaseSourceModel(handle);handle=null;return;}
  const input=model.kind==='masked-language-model'?{text:form.elements.text.value,textPair:form.elements.textPair.value}:form.elements.mode.value==='image'?{tensor:uploaded}:{};
  const result=await runSourceModel(handle,input,options);if(!leaving)show(result);
 }catch(cause){if(!leaving)error(cause.name==='AbortError'?'عملیات لغو شد؛ برای ادامه دوباره اجرا کن.':cause.message||'اجرای مدل انجام نشد؛ دوباره تلاش کن.');}
 finally{busy=false;find('[data-progress-region]').hidden=true;controls();}
});
cancel.addEventListener('click',()=>{controller?.abort();find('[data-progress-text]').textContent='در حال لغو…';});
release.addEventListener('click',async()=>{if(handle){await releaseSourceModel(handle);handle=null;}controls();});
window.addEventListener('pageshow',()=>{leaving=false;controls();});
window.addEventListener('pagehide',()=>{leaving=true;controller?.abort();if(handle){void releaseSourceModel(handle).catch(()=>{});handle=null;}});
try{
 model=(await sourceModelCatalog()).find(value=>value.id===document.body.dataset.modelId);if(!model)throw Error('این مدل در فهرست موجود نیست.');
 find('[data-architecture]').textContent=model.architecture?.summary_fa||(model.kind==='masked-language-model'?'۱۲ لایهٔ Transformer · پیش‌بینی واژهٔ پوشانده‌شده':'۱۵۲ لایه · طبقه‌بندی تصویر');
 find('[data-download-size]').textContent=`بارگیری مدل: ${number.format(model.artifacts.model.bytes/1e6)} مگابایت.`;
 inputControls();if(model.kind==='masked-language-model')await loadVocabulary();controls();
 if(!navigator.gpu)error('این مرورگر WebGPU را ارائه نمی‌کند. از مرورگری با WebGPU فعال استفاده کن.');
 document.body.dataset.ready='true';
}catch(cause){error(cause.message||'مدل آماده نشد؛ صفحه را دوباره باز کن.');}
