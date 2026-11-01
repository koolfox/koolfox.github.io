import {mountNotebook} from './notebook.js';

const config = JSON.parse(document.querySelector('#practice-config').textContent);
const requestedPage=Number(new URLSearchParams(location.search).get('source-page'));
const returnPage=Number.isInteger(requestedPage)&&requestedPage>0&&requestedPage<=10000?requestedPage:config.source_page;
function goToSource(page) {
  if (parent !== window) parent.postMessage({type: 'danna-source-page', page}, location.origin);
  else location.href = config.reader + '#page=' + page;
}
const book = mountNotebook(document.querySelector('#practice-notebook'), {
  ...config, goToSource,
  getFiles() { return {'starter.py': config.starter, 'source-reference.json': JSON.stringify({source_url: config.source_url, source_sha256: config.source_sha256, starter_sha256: config.starter_sha256}, null, 2)}; },
});
book.setReady(true); window.studentNotebook = book;
function section() { if (location.hash === '#questions') book.showQuiz(); else book.showCode(); }
section(); window.addEventListener('hashchange', section);
document.querySelector('[data-return-slide]').addEventListener('click', event => { if (parent !== window) { event.preventDefault(); goToSource(returnPage); } });
for (const lab of config.related_labs) {
  const link = document.createElement('a'); link.textContent = 'آزمایش زندهٔ مرتبط';
  link.href = lab.url;if(requestedPage>0){const url=new URL(link.href);url.searchParams.set('page',returnPage);link.href=url.href;}
  link.title = lab.goal_fa; link.target = '_top'; document.querySelector('[data-related-labs]').append(link);
}
