import{test}from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{readFile}from'node:fs/promises';
import{preprocessResnetImageData}from'../../assets/model-image.js';
const cases=JSON.parse(await readFile(new URL('../references/image-preprocess-cases.json',import.meta.url),'utf8'));
for(const fixture of cases)test(`RGB resize/crop matches independent Pillow fixture ${fixture.width}×${fixture.height}`,()=>{
 const{width,height}=fixture,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){for(let c=0;c<3;c++)data[(y*width+x)*4+c]=((x*13+y*7+c*31)^(x*y%251))%256;data[(y*width+x)*4+3]=255;}
 const{preview,tensor}=preprocessResnetImageData({width,height,data});
 assert.equal(createHash('sha256').update(preview.data).digest('hex'),fixture.preview_sha256);
 assert.equal(tensor.length,3*224*224);assert.ok(tensor.every(Number.isFinite));
 for(let channel=0;channel<3;channel++)for(const pixel of[0,224*112+112,224*224-1]){
  const expected=(preview.data[pixel*4+channel]/255-[.485,.456,.406][channel])/[.229,.224,.225][channel];
  assert.ok(Math.abs(tensor[channel*224*224+pixel]-expected)<3e-7);
 }
});
test('invalid image data is rejected before allocating resize buffers',()=>{
 assert.throws(()=>preprocessResnetImageData({width:1,height:100000,data:new Uint8Array(400000)}));
 assert.throws(()=>preprocessResnetImageData({width:1,height:1,data:[0,0,0,255]}));
});
