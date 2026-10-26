import {EditorView,basicSetup} from 'codemirror';
import {keymap} from '@codemirror/view';
import {python} from '@codemirror/lang-python';
import {setDiagnostics} from '@codemirror/lint';

window.StructuralCodeEditor={
 create(host,initial,{onChange,onRun}={}){
  const view=new EditorView({parent:host,doc:initial,extensions:[
   keymap.of([{key:'Mod-Enter',run:()=>{onRun?.();return true;}}]),
   basicSetup,python(),
   EditorView.contentAttributes.of({'aria-label':'کد Python قابل ویرایش',spellcheck:'false',autocapitalize:'off',dir:'ltr'}),
   EditorView.theme({'&':{fontSize:'14px',height:'430px',direction:'ltr'},'.cm-scroller':{fontFamily:'ui-monospace,SFMono-Regular,monospace',overflow:'auto'},'.cm-content':{padding:'12px 0',minHeight:'100%'},'.cm-line':{padding:'0 12px'},'.cm-gutters':{backgroundColor:'#f0f3f8',color:'#536179',border:'none'},'&.cm-focused':{outline:'2px solid #245dc4'},'.cm-activeLine':{backgroundColor:'#edf2fa'}}),
   EditorView.updateListener.of(update=>{if(update.docChanged)onChange?.(update.state.doc.toString());}),
  ]});
  return {getValue:()=>view.state.doc.toString(),setValue:value=>view.dispatch({changes:{from:0,to:view.state.doc.length,insert:value}}),focus:()=>view.focus(),
   error(line,message){
    const diagnostics=[];
    if(line&&line<=view.state.doc.lines){const position=view.state.doc.line(line);diagnostics.push({from:position.from,to:position.to,severity:'error',message});}
    view.dispatch(setDiagnostics(view.state,diagnostics));
   },destroy:()=>view.destroy()};
 }
};
