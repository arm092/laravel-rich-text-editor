import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { html } from '@codemirror/lang-html'
import { bracketMatching, foldGutter, foldKeymap, HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { forceLinting, linter, lintGutter, type Diagnostic } from '@codemirror/lint'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { EditorState } from '@codemirror/state'
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { html_beautify } from 'js-beautify'
import type { CodeViewFactory, SourceDiagnostic } from './types'

const monokaiHighlight = HighlightStyle.define([
  { tag: [tags.tagName, tags.angleBracket], color: '#F92672' },
  { tag: tags.attributeName, color: '#A6E22E' },
  { tag: [tags.string, tags.attributeValue], color: '#FD971F' },
  { tag: tags.character, color: '#66D9EF' },
  { tag: tags.comment, color: 'rgba(248, 248, 242, .48)', fontStyle: 'italic' },
  { tag: tags.invalid, color: '#F92672', textDecoration: 'underline wavy' },
])

const monokaiTheme = EditorView.theme({
  '&': { color: '#F8F8F2', backgroundColor: '#272822', height: '100%' },
  '.cm-content': { caretColor: '#FFFFFF', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#FFFFFF' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(102, 217, 239, .25)' },
  '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, .04)' },
  '.cm-gutters': { backgroundColor: '#060606', color: 'rgba(248, 248, 242, .55)', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(102, 217, 239, .14)', color: '#F8F8F2' },
  '.cm-foldPlaceholder': { backgroundColor: '#272822', color: '#66D9EF', border: '1px solid rgba(102, 217, 239, .4)' },
  '.cm-tooltip': { backgroundColor: '#060606', color: '#F8F8F2', border: '1px solid rgba(248, 248, 242, .18)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#272822', color: '#FFFFFF' },
  '.cm-panels': { backgroundColor: '#060606', color: '#F8F8F2' },
  '.cm-searchMatch': { backgroundColor: 'rgba(253, 151, 31, .28)', outline: '1px solid #FD971F' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(166, 226, 46, .3)' },
})

export const createEnhancedCodeView: CodeViewFactory = (parent, value, options, onChange) => {
  let sourceDiagnostics: SourceDiagnostic[] = []
  const diagnostics = linter((view): Diagnostic[] => sourceDiagnostics.map((diagnostic) => ({
    from: Math.min(diagnostic.from ?? 0, view.state.doc.length),
    to: Math.min(diagnostic.to ?? diagnostic.from ?? 0, view.state.doc.length),
    severity: diagnostic.severity,
    message: diagnostic.message,
  })))

  const extensions = [
    html(), history(), bracketMatching(), closeBrackets(), drawSelection(), highlightActiveLine(), highlightSelectionMatches(),
    indentUnit.of(' '.repeat(options.tab_size ?? 2)),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap, indentWithTab]),
    syntaxHighlighting(monokaiHighlight), monokaiTheme,
    EditorView.updateListener.of((update) => { if (update.docChanged) onChange(update.state.doc.toString()) }),
  ]
  if (options.line_numbers !== false) extensions.push(lineNumbers(), highlightActiveLineGutter())
  if (options.line_wrapping !== false) extensions.push(EditorView.lineWrapping)
  if (options.folding !== false) extensions.push(foldGutter())
  if (options.autocomplete !== false) extensions.push(autocompletion())
  if (options.diagnostics !== false) extensions.push(diagnostics, lintGutter())

  const view = new EditorView({ state: EditorState.create({ doc: value, extensions }), parent })

  return {
    element: view.dom,
    getValue: () => view.state.doc.toString(),
    setValue: (next) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } }),
    focus: () => view.focus(),
    setDiagnostics: (next) => { sourceDiagnostics = next; forceLinting(view) },
    format: () => {
      const formatted = html_beautify(view.state.doc.toString(), { indent_size: options.tab_size ?? 2, wrap_line_length: 100 })
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: formatted } })
    },
    destroy: () => view.destroy(),
  }
}
