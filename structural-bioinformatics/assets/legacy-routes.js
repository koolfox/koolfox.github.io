import { legacyAddress } from './section-routes.js';
const params=new URLSearchParams(location.search);
if([...params.keys()].some(key=>['document','tool','tab','topic','session','unit'].includes(key)) || location.hash) {
  try {
    const [sections,course]=await Promise.all([fetch('data/metadata/site-sections.json').then(r=>r.json()),fetch('data/metadata/learning-course.json').then(r=>r.json())]);
    const destination=legacyAddress(new URL(location.href),sections.sections,course);
    if(destination)location.replace(destination);
  } catch { /* Static section links remain usable when compatibility metadata is unavailable. */ }
}
