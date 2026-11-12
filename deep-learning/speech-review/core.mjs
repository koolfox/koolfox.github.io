export function parseManifest(text) {
  const records=[];
  for(const [index,line] of text.split(/\r?\n/).entries()) {
    if(!line.trim())continue;
    let value;try{value=JSON.parse(line)}catch{throw new Error(`JSON نامعتبر در خط ${index+1}`)}
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`رکورد نامعتبر در خط ${index+1}`);
    records.push(value);
  }
  if(!records.length)throw new Error('فایل رکوردی ندارد');
  return records;
}
export function serializeManifest(records){return records.map(record=>JSON.stringify(record)).join('\n')+'\n'}
export function relativeAudioPath(path){return !!path && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(x=>x==='..'||x===''||x==='.') && !/^[a-z]+:/i.test(path)}
export function issues(record){
  const missing=[];
  for(const key of ['spoken_text_fa','speaker_id','rights','audio_path','audio_sha256'])if(typeof record[key]!=='string'||!record[key].trim())missing.push(key);
  if(record.audio_path && !relativeAudioPath(record.audio_path))missing.push('audio_path');
  if(record.audio_sha256 && !/^[a-f0-9]{64}$/.test(record.audio_sha256))missing.push('audio_sha256');
  if(!['train','validation','test'].includes(record.split))missing.push('split');
  if(record.rights==='review_required')missing.push('rights');
  if(record.review_status!=='approved')missing.push('review_status');
  if(record.pronunciation_reviewed!==true)missing.push('pronunciation_reviewed');
  return [...new Set(missing)];
}
