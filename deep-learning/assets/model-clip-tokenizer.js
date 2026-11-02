import{Tokenizer}from'./vendor/model-tokenizers/tokenizers.mjs?v=258e46332101335c';
export function createClipTokenizer(tokenizerJson,configuration){
 const tokenizer=new Tokenizer(tokenizerJson,configuration);
 if(tokenizer.token_to_id('<|startoftext|>')!==49406||tokenizer.token_to_id('<|endoftext|>')!==49407)throw Error('واژگان با CLIP ViT-B/32 سازگار نیست.');
 function encode(text){
  if(typeof text!=='string'||!text.trim()||text.length>10000)throw Error('هر متن CLIP باید غیرخالی و کوتاه‌تر از ۱۰٬۰۰۰ نویسه باشد.');
  const result=tokenizer.encode(text);if(result.ids.length>77)throw Error('هر متن حداکثر ۷۷ توکن می‌پذیرد؛ متن را کوتاه‌تر کن.');
  const position=result.ids.indexOf(49407);if(position<0)throw Error('توکن پایان CLIP پیدا نشد.');
  return{ids:[...result.ids,...Array(77-result.ids.length).fill(49407)],attentionMask:[...result.attention_mask,...Array(77-result.ids.length).fill(0)],endPosition:position,tokens:result.tokens,length:result.ids.length};
 }
 function encodeCandidates(prompts){
  if(!Array.isArray(prompts)||prompts.length!==4)throw Error('این آزمایش چهار متن مقایسه می‌کند؛ هر متن را در یک خط بنویس.');
  const encoded=prompts.map(encode),endMask=new Float32Array(4*77);encoded.forEach((row,index)=>endMask[index*77+row.endPosition]=1);
  return{inputIds:Int32Array.from(encoded.flatMap(row=>row.ids)),attentionMask:Int32Array.from(encoded.flatMap(row=>row.attentionMask)),endMask,encoded};
 }
 return{encode,encodeCandidates};
}
