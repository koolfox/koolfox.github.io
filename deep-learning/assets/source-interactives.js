// Additional tools are attached only to their source pages; models load on request.
const courseRoot=new URL('../',import.meta.url);
const config=JSON.parse(document.querySelector('#source-reader-config').textContent);
const films=[
 {id:'backpropagation',session:'s03',pages:Array.from({length:16},(_,i)=>69+i),title:'پخش پس‌انتشار'},
 {id:'convolution',session:'s05',pages:Array.from({length:11},(_,i)=>27+i),title:'پخش کانولوشن'},
 {id:'convolution-code',session:'s05',pages:Array.from({length:11},(_,i)=>27+i),title:'فیلم کد کانولوشن'},
 {id:'attention',session:'s13',pages:Array.from({length:9},(_,i)=>21+i),title:'پخش محاسبه توجه'},
];
// Model source pages are read from the same pinned catalog as the execution UI.
const training=[{id:'mnist-training',session:'s05',pages:[70],title:'آموزش CNN با MNIST',route:'playgrounds/cnn-mnist/train/'}];
let catalog=[];
const host=document.createElement('span');host.className='source-page-tools';
document.querySelector('.reader-toolbar').append(host);
function update(page){
 host.replaceChildren();
 for(const entry of [...films.map(item=>({...item,kind:'animations'})),...catalog.map(item=>({...item,kind:'models'})),...training]){
  if(config.term!=='spring-2026'||entry.session!==config.session||!entry.pages.includes(page))continue;
  const button=document.createElement('button');button.type='button';button.textContent=entry.title;
  button.dataset.sourceInteractive=entry.id;
  button.addEventListener('click',()=>window.sourceSlideReader.openTool(new URL(entry.route||`${entry.kind}/${entry.id}/`,courseRoot).href));
  host.append(button);
 }
}
window.addEventListener('danna:source-page',event=>update(event.detail.page));
update(window.sourceSlideReader?.page||1);
fetch(new URL('models/source-models.json',courseRoot)).then(response=>{
 if(!response.ok)throw Error('Model catalog unavailable');return response.json();
}).then(data=>{
 catalog=data.models.map(model=>({id:model.id,session:model.source.session,pages:model.source.pages,title:model.kind==='image-classification'?'اجرای ResNet152':'اجرای BERT'}));
 update(window.sourceSlideReader?.page||1);
}).catch(()=>{});
