import{test}from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{readFile}from'node:fs/promises';
import{preprocessVitImageData}from'../../assets/model-image.js';
const cases=JSON.parse(await readFile(new URL('../references/vit-image-preprocess-cases.json',import.meta.url),'utf8'));
for(const fixture of cases)test(`ViT full resize matches independent Pillow ${fixture.width}×${fixture.height}`,()=>{
 const{width,height}=fixture,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){for(let c=0;c<3;c++)data[(y*width+x)*4+c]=((x*13+y*7+c*31)^(x*y%251))%256;data[(y*width+x)*4+3]=255;}
 const{preview,tensor,resizedShape}=preprocessVitImageData({width,height,data});assert.deepEqual(resizedShape,[224,224]);assert.equal(createHash('sha256').update(preview.data).digest('hex'),fixture.preview_sha256);
 for(let channel=0;channel<3;channel++)for(const pixel of[0,224*112+112,224*224-1])assert.ok(Math.abs(tensor[channel*224*224+pixel]-(preview.data[pixel*4+channel]/255-.5)/.5)<2e-7);
});
