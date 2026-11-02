// ImageNet preprocessing for the released MXNet Gluon ResNet-v1 checkpoint.
// Input is decoded RGBA pixels. Resize uses Pillow's separable bilinear filter
// with antialiasing when shrinking, then a center crop and RGB normalization.
const precision=2**22;
function roundEven(value){const floor=Math.floor(value),fraction=value-floor;return fraction===0.5?floor+(floor%2):Math.round(value);}
function coefficients(inputSize,outputSize){
 const scale=inputSize/outputSize,filterScale=Math.max(scale,1),support=filterScale;
 return Array.from({length:outputSize},(_,index)=>{
  const center=(index+0.5)*scale;
  const first=Math.max(0,Math.trunc(center-support+0.5));
  const last=Math.min(inputSize,Math.trunc(center+support+0.5));
  const weights=Array.from({length:last-first},(_,offset)=>Math.max(0,1-Math.abs((offset+first-center+0.5)/filterScale)));
  const sum=weights.reduce((a,b)=>a+b,0);
  return{first,weights:weights.map(value=>Math.floor(value/sum*precision+0.5))};
 });
}
export function preprocessResnetImageData(image){
 const {width,height,data}=image||{};
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>20000000||Math.max(width/height,height/width)>16||!(data instanceof Uint8ClampedArray||data instanceof Uint8Array)||data.length!==width*height*4)throw Error('تصویر باید RGBA، حداکثر ۲۰ مگاپیکسل و با نسبت ابعاد کمتر از ۱۶ باشد.');
 const ratio=256/Math.min(width,height),resizedWidth=width>height?roundEven(width*ratio):256,resizedHeight=width>height?256:roundEven(height*ratio);
 const horizontal=coefficients(width,resizedWidth),vertical=coefficients(height,resizedHeight);
 const intermediate=new Uint8Array(resizedWidth*height*3);
 for(let y=0;y<height;y++)for(let x=0;x<resizedWidth;x++)for(let channel=0;channel<3;channel++){
  const {first,weights}=horizontal[x];let sum=precision/2;
  for(let offset=0;offset<weights.length;offset++)sum+=data[(y*width+first+offset)*4+channel]*weights[offset];
  intermediate[(y*resizedWidth+x)*3+channel]=Math.min(255,Math.max(0,Math.floor(sum/precision)));
 }
 const left=Math.floor(resizedWidth/2)-112,top=Math.floor(resizedHeight/2)-112;
 const tensor=new Float32Array(3*224*224),preview=new Uint8ClampedArray(224*224*4),mean=[0.485,0.456,0.406],std=[0.229,0.224,0.225];
 for(let y=0;y<224;y++)for(let x=0;x<224;x++){
  const {first,weights}=vertical[y+top],pixel=y*224+x;
  for(let channel=0;channel<3;channel++){
   let sum=precision/2;
   for(let offset=0;offset<weights.length;offset++)sum+=intermediate[((first+offset)*resizedWidth+x+left)*3+channel]*weights[offset];
   const value=Math.min(255,Math.max(0,Math.floor(sum/precision)));
   preview[pixel*4+channel]=value;tensor[channel*224*224+pixel]=(value/255-mean[channel])/std[channel];
  }
  preview[pixel*4+3]=255;
 }
 return{tensor,preview:{width:224,height:224,data:preview},resizedShape:[resizedHeight,resizedWidth]};
}
