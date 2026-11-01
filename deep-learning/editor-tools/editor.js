import {Compartment, EditorState} from '@codemirror/state';
import {EditorView, drawSelection, keymap, lineNumbers} from '@codemirror/view';
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands';
import {HighlightStyle, bracketMatching, indentOnInput, syntaxHighlighting, syntaxTree} from '@codemirror/language';
import {autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap} from '@codemirror/autocomplete';
import {python, globalCompletion, localCompletionSource} from '@codemirror/lang-python';
import {tags} from '@lezer/highlight';

const highlights = HighlightStyle.define([
  {tag: tags.keyword, color: '#194fc3', fontWeight: '600'},
  {tag: [tags.string, tags.special(tags.string)], color: '#185e43'},
  {tag: [tags.number, tags.bool, tags.null], color: '#941d26'},
  {tag: tags.comment, color: '#526075', fontStyle: 'italic'},
  {tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: '#194fc3'},
  {tag: [tags.operator, tags.punctuation], color: '#526075'},
]);

// Completion reads names from the notebook, never executes code or contacts a server.
function notebookNames(getSource) {
  return context => {
    const token = syntaxTree(context.state).resolveInner(context.pos, -1);
    if (/Comment|String/.test(token.name)) return null;
    const word = context.matchBefore(/[A-Za-z_]\w*/);
    if (!word && !context.explicit) return null;
    const names = new Map();
    for (const match of getSource().matchAll(/\b(?:def|class)\s+([A-Za-z_]\w*)|\b([A-Za-z_]\w*)\s*=(?!=)/g)) {
      const label = match[1] || match[2];
      names.set(label, {label, type: match[1] ? 'function' : 'variable', detail: 'این دفترچه'});
    }
    return {from: word?.from ?? context.pos, options: [...names.values()], validFor: /^\w*$/};
  };
}

function pythonAnalysis(options) {
  return async context => {
    const token = syntaxTree(context.state).resolveInner(context.pos, -1);
    if (/Comment|String/.test(token.name)) return null;
    const word = context.matchBefore(/[\p{L}\p{N}_]*/u);
    if (!context.explicit && !word?.text && context.state.sliceDoc(context.pos - 1, context.pos) !== '.') return null;
    const line = context.state.doc.lineAt(context.pos);
    try {
      const result = await options.complete(context.state.doc.toString(), line.number,
        [...context.state.sliceDoc(line.from, context.pos)].length);
      if (context.aborted) return null;
      return {from: word?.from ?? context.pos, options: result, validFor: /^[\p{L}\p{N}_]*$/u};
    } catch { return null; } // Immediate built-in/local suggestions still work offline on failure.
  };
}

export function createPythonEditor(parent, options) {
  const editable = new Compartment();
  const view = new EditorView({parent, state: EditorState.create({
    doc: options.source,
    extensions: [
      python(), lineNumbers(), history(), drawSelection(), indentOnInput(), bracketMatching(), closeBrackets(),
      syntaxHighlighting(highlights),
      autocompletion({activateOnTyping: true, override: [localCompletionSource, globalCompletion, notebookNames(options.getSource), pythonAnalysis(options)],
        icons: false, maxRenderedOptions: 12}),
      keymap.of([
        {key: 'Mod-Enter', run: () => { options.onRun(false); return true; }},
        {key: 'Shift-Enter', run: () => { options.onRun(true); return true; }},
        ...closeBracketsKeymap, ...completionKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab,
      ]),
      editable.of(EditorState.readOnly.of(false)),
      EditorState.tabSize.of(4),
      EditorView.contentAttributes.of({'aria-label': options.label, 'data-notebook-code': '',
        'aria-multiline': 'true', autocapitalize: 'off', spellcheck: 'false'}),
      EditorView.domEventHandlers({focus: () => { options.onFocus(); }}),
      EditorView.updateListener.of(update => { if (update.docChanged) options.onChange(update.state.doc.toString()); }),
      EditorView.theme({
        '&': {backgroundColor: '#fff', color: '#172134', fontSize: '12px', direction: 'ltr'},
        '.cm-content': {fontFamily: 'ui-monospace, Arad, monospace', padding: '8px 0', minHeight: '72px', caretColor: '#2563eb'},
        '.cm-line': {padding: '0 10px', lineHeight: '22px'},
        '.cm-scroller': {fontFamily: 'ui-monospace, Arad, monospace', overflowX: 'auto', scrollbarWidth: 'thin'},
        '.cm-gutters': {backgroundColor: '#f7f9fc', color: '#526075', border: 'none'},
        '.cm-lineNumbers .cm-gutterElement': {padding: '0 6px 0 8px'},
        '&.cm-focused': {outline: 'none'},
        '.cm-cursor': {borderLeftColor: '#2563eb'},
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {backgroundColor: '#dbe8ff'},
        '.cm-tooltip': {border: '1px solid #b8c5d9', backgroundColor: '#fff', color: '#172134', borderRadius: '6px'},
        '.cm-tooltip-autocomplete': {fontFamily: 'ui-monospace, Arad, monospace', fontSize: '12px'},
        '.cm-tooltip-autocomplete > ul > li': {padding: '4px 9px'},
        '.cm-tooltip-autocomplete > ul > li[aria-selected]': {backgroundColor: '#194fc3', color: '#fff'},
        '.cm-completionDetail': {fontFamily: 'Arad, sans-serif', marginLeft: '12px'},
      }),
    ],
  })});
  let readOnly = false;
  return {
    focus() { view.focus(); },
    setReadOnly(value) {
      if (readOnly === value) return;
      readOnly = value;
      view.dispatch({effects: editable.reconfigure(EditorState.readOnly.of(value))});
      view.contentDOM.setAttribute('aria-readonly', String(value));
    },
    destroy() { view.destroy(); },
  };
}
