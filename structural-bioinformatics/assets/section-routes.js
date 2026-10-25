export function documentSection(filename, sections) {
  return sections.find(section => !['library','exercises'].includes(section.id) && section.documents.some(doc => doc.file === filename)) || sections.find(section => section.id === 'library');
}
export function documentAddress(filename, sections, chapter = 'all') {
  const owner = documentSection(filename, sections);
  return `${owner.page}?${new URLSearchParams({document:filename,chapter})}#reading`;
}
export function legacyAddress(url, sections, course) {
  const params = url.searchParams, hash = url.hash.slice(1);
  if(params.has('document')) return documentAddress(params.get('document'), sections, params.get('chapter') || 'all');
  const tool = params.get('tool') || params.get('tab') || hash;
  const tools = {lab:'structures.html',structures:'structures.html',sequences:'structures.html#sequences',epitope:'exercises.html#epitope-lab',papers:'papers.html',literature:'papers.html',datasets:'datasets.html',rna:'datasets.html#rnaseq-groups',methods:'datasets.html',docking:'docking.html',reading:'library.html',binding:'structures.html#binding-explainer',comparison:'structures.html#molecular-roles',evidence:'research.html',method:'research.html'};
  if(tools[tool])return tools[tool];
  let topic=Number(params.get('topic') || params.get('session'));
  if(!topic && params.has('unit')) {
    const unit=Number(params.get('unit'));
    const blocks=[...new Set(course.sessions.map(t=>t.block))];
    topic=course.sessions.find(t=>t.block===blocks[unit-1])?.session || 1;
  }
  if(topic || params.has('topic') || params.has('session') || params.has('unit') || hash==='basics') {
    const page=params.get('part')==='presentation'?'presentations.html':['research','practice'].includes(params.get('part'))?'exercises.html':'course.html';
    return `${page}?topic=${Number.isInteger(topic)&&topic>=1&&topic<=30?topic:1}`;
  }
  return null;
}
