import { describe, expect, it, vi } from 'vitest'
import { createBasicCodeView } from '../../resources/js/basic-code-view'
import { createEditor } from '../../resources/js/editor'

function fixture() {
  const form = document.createElement('form')
  const root = document.createElement('div')
  root.dataset.richTextEditor = ''
  root.dataset.rteOptions = JSON.stringify({
    toolbar: ['bold', 'codeView'], headings: [2, 3, 4], codeView: { enabled: true },
    links: { schemes: ['http', 'https', 'mailto'], allow_relative: true }, images: { schemes: ['http', 'https'], alignments: ['center'] },
  })
  root.innerHTML = '<textarea data-rte-input><p>Hello</p></textarea><div data-rte-mount></div>'
  form.append(root)
  document.body.append(form)
  return root
}

describe('editor controller', () => {
  it('provides a stable public API and prevents duplicate initialization', () => {
    const root = fixture()
    const first = createEditor(root, createBasicCodeView)
    const second = createEditor(root, createBasicCodeView)

    expect(first).toBe(second)
    expect(first.getHTML()).toContain('Hello')
    expect(typeof first.focus).toBe('function')
    expect(typeof first.setReadOnly).toBe('function')
  })

  it('sanitizes setHTML and synchronizes the native input', () => {
    const root = fixture()
    const onChange = vi.fn()
    root.addEventListener('rte:change', onChange)
    const editor = createEditor(root, createBasicCodeView)

    editor.setHTML('<p onclick="bad()">Safe</p>')

    expect(editor.getHTML()).toBe('<p>Safe</p>')
    expect(root.querySelector<HTMLTextAreaElement>('[data-rte-input]')!.value).toBe('<p>Safe</p>')
    expect(onChange).toHaveBeenCalled()
  })

  it('synchronizes dirty code view before an earlier consumer submit listener reads the input', () => {
    const root = fixture()
    const form = root.closest('form')!
    const submittedValues: string[] = []
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      submittedValues.push(root.querySelector<HTMLTextAreaElement>('[data-rte-input]')!.value)
    })
    createEditor(root, createBasicCodeView)

    root.querySelector<HTMLButtonElement>('[data-rte-command="codeView"]')!.click()
    const source = root.querySelector<HTMLTextAreaElement>('.rte-code-textarea')!
    source.value = '<p>Հայերեն <a href="mailto:support@apricode.am">support@apricode.am</a></p>'
    source.dispatchEvent(new Event('input', { bubbles: true }))
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))

    expect(submittedValues).toEqual(['<p>Հայերեն <a href="mailto:support@apricode.am">support@apricode.am</a></p>'])
  })
})
