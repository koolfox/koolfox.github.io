// CLIP's released Pillow-bicubic resize, center crop and RGB normalization.
const precision=2**22;
function cubic(value){const x=Math.abs(value);if(x<1)return(1.5*x-2.5)*x*x+1;if(x<2)return((-.5*x+2.5)*x-4)*x+2;return 0;}
function coefficients(inputSize,outputSize){
 const scale=inputSize/outputSize,filterScale=Math.max(1,scale),support=2*filterScale;
 return Array.from({length:outputSize},(_,index)=>{
  const center=(index+.5)*scale,first=Math.max(0,Math.trunc(center-support+.5)),last=Math.min(inputSize,Math.trunc(center+support+.5));
  const weights=Array.from({length:last-first},(_,offset)=>cubic((offset+first-center+.5)/filterScale)),sum=weights.reduce((a,b)=>a+b,0);
  return{first,weights:weights.map(value=>Math.trunc(value/sum*precision+(value<0?-.5:.5)))};
 });
}
export function preprocessClipImageData(image){
 const{width,height,data}=image||{};
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>20000000||Math.max(width/height,height/width)>16||!(data instanceof Uint8Array||data instanceof Uint8ClampedArray)||data.length!==width*height*4)throw Error('تصویر باید RGBA، حداکثر ۲۰ مگاپیکسل و با نسبت ابعاد کمتر از ۱۶ باشد.');
 const resizedWidth=width>height?Math.floor(width*224/height):224,resizedHeight=width>height?224:Math.floor(height*224/width);
 const horizontal=coefficients(width,resizedWidth),vertical=coefficients(height,resizedHeight),intermediate=new Uint8Array(resizedWidth*height*3);
 for(let y=0;y<height;y++)for(let x=0;x<resizedWidth;x++)for(let channel=0;channel<3;channel++){
  const{first,weights}=horizontal[x];let sum=precision/2;for(let offset=0;offset<weights.length;offset++)sum+=data[(y*width+first+offset)*4+channel]*weights[offset];intermediate[(y*resizedWidth+x)*3+channel]=Math.max(0,Math.min(255,Math.floor(sum/precision)));
 }
 const left=Math.floor((resizedWidth-224)/2),top=Math.floor((resizedHeight-224)/2),preview=new Uint8ClampedArray(224*224*4),tensor=new Float32Array(3*224*224),mean=[.48145466,.4578275,.40821073],std=[.26862954,.26130258,.27577711];
 for(let y=0;y<224;y++)for(let x=0;x<224;x++){
  const{first,weights}=vertical[y+top],pixel=y*224+x;
  for(let channel=0;channel<3;channel++){
   let sum=precision/2;for(let offset=0;offset<weights.length;offset++)sum+=intermediate[((first+offset)*resizedWidth+x+left)*3+channel]*weights[offset];const value=Math.max(0,Math.min(255,Math.floor(sum/precision)));preview[pixel*4+channel]=value;tensor[channel*224*224+pixel]=(value/255-mean[channel])/std[channel];
  }preview[pixel*4+3]=255;
 }
 return{tensor,preview:{width:224,height:224,data:preview},resizedShape:[resizedHeight,resizedWidth]};
}
