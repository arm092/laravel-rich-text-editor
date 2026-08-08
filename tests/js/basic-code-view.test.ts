import { describe, expect, it, vi } from 'vitest'
import { createBasicCodeView } from '../../resources/js/basic-code-view'

describe('basic code view', () => {
  it('edits source HTML and reports changes', () => {
    const parent = document.createElement('div')
    const onChange = vi.fn()
    const adapter = createBasicCodeView(parent, '<p>Hello</p>', { line_wrapping: false }, onChange)
    const textarea = parent.querySelector('textarea')!

    expect(adapter.getValue()).toBe('<p>Hello</p>')
    expect(textarea.wrap).toBe('off')

    textarea.value = '<p>Changed</p>'
    textarea.dispatchEvent(new Event('input'))
    expect(onChange).toHaveBeenCalledWith('<p>Changed</p>')

    adapter.destroy()
    expect(parent.children).toHaveLength(0)
  })
})
