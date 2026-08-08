import type { CodeViewFactory } from './types'

export const createBasicCodeView: CodeViewFactory = (parent, value, options, onChange) => {
  const textarea = document.createElement('textarea')
  textarea.className = 'rte-code-textarea'
  textarea.value = value
  textarea.spellcheck = false
  textarea.wrap = options.line_wrapping === false ? 'off' : 'soft'
  textarea.addEventListener('input', () => onChange(textarea.value))
  parent.append(textarea)

  return {
    element: textarea,
    getValue: () => textarea.value,
    setValue: (next) => { textarea.value = next },
    focus: () => textarea.focus(),
    setDiagnostics: () => undefined,
    destroy: () => textarea.remove(),
  }
}
