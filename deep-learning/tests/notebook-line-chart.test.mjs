import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
class Node {
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={};this.dataset={};this.listeners={};this.classList={add:name=>{this.className=name;}};this.textContent='';}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(key,value){this.attributes[key]=String(value);}
  addEventListener(name,fn){this.listeners[name]=fn;}
}
globalThis.document={createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag)};
const source=await readFile(new URL('../assets/notebook-results.js',import.meta.url),'utf8');
const {renderNotebookResult}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const find=(node,pred)=>pred(node)?node:node.children.map(child=>find(child,pred)).find(Boolean);
const all=(node,pred)=>[...(pred(node)?[node]:[]),...node.children.flatMap(child=>all(child,pred))];
const root=new Node('div');
renderNotebookResult(root,{loss:[3,-2,0.123456789123456]});
const svg=find(root,x=>x.tag==='svg');assert(svg);
const dots=all(svg,x=>x.tag==='circle');assert.equal(dots.length,3);
assert.equal(dots[1].attributes['aria-label'],'loss[1] = -2');
assert(Number(dots[0].attributes.cy)<Number(dots[2].attributes.cy));
assert(Number(dots[2].attributes.cy)<Number(dots[1].attributes.cy));
dots[2].listeners.focus();assert.equal(find(root,x=>x.className==='nb-result-readout').textContent,'loss[2] = 0.123456789123456');
dots[1].listeners.keydown({key:'Enter',preventDefault(){}});assert.equal(find(root,x=>x.className==='nb-result-readout').textContent,'loss[1] = -2');
renderNotebookResult(root,{matrix:[[1,2],[3,4]]});assert(!find(root,x=>x.tag==='svg'));
renderNotebookResult(root,{single:[42]});assert.equal(all(root,x=>x.tag==='circle').length,1);
renderNotebookResult(root,{same:[7,7]});assert.equal(new Set(all(root,x=>x.tag==='circle').map(x=>x.attributes.cy)).size,1);
renderNotebookResult(root,{large:[-Number.MAX_VALUE,Number.MAX_VALUE]});assert(all(root,x=>x.tag==='circle').every(x=>Number.isFinite(Number(x.attributes.cy))));
renderNotebookResult(root,{many:Array.from({length:40},(_,i)=>i)});assert.equal(all(root,x=>x.tag==='circle').length,32);assert(find(root,x=>x.textContent.includes('۳۲ مقدار نخست')));
console.log('notebook line chart tests passed');
