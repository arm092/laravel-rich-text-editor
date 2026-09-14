import { describe, expect, it, vi } from 'vitest'
import { createBasicCodeView } from '../../resources/js/basic-code-view'
import { createEditor } from '../../resources/js/editor'
import { resolveTailwind500Colors } from '../../resources/js/colors'

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
  it('uses declared Tailwind 500 theme colors and falls back to the full configured palette', () => {
    document.documentElement.style.setProperty('--color-brand-500', '#123456')

    expect(resolveTailwind500Colors(['red', 'brand'])).toEqual([{ name: 'brand', value: '#123456' }])
    document.documentElement.style.removeProperty('--color-brand-500')
    expect(resolveTailwind500Colors(['red', 'blue']).map(({ name }) => name)).toEqual(['red', 'blue'])
    document.documentElement.style.setProperty('--color-private-500', '#654321')
    expect(resolveTailwind500Colors(['red', 'blue'])).toEqual([])
    document.documentElement.style.removeProperty('--color-private-500')
  })

  it('renders the color picker from the active profile', () => {
    const root = fixture()
    root.dataset.rteOptions = JSON.stringify({
      ...JSON.parse(root.dataset.rteOptions!),
      toolbar: ['colors'],
      colors: { enabled: true, palette: ['red', 'blue'] },
    })

    createEditor(root, createBasicCodeView)

    expect(root.querySelector('[data-rte-command="colors"]')).not.toBeNull()
    expect(root.querySelectorAll('[data-rte-color]').length).toBe(4)
  })

  it('labels popup toolbar controls with native tooltips', () => {
    const root = fixture()
    root.dataset.rteOptions = JSON.stringify({
      ...JSON.parse(root.dataset.rteOptions!),
      toolbar: ['colors', 'table'],
      colors: { enabled: true, palette: ['red'] },
      tables: { enabled: true },
    })

    createEditor(root, createBasicCodeView)

    expect(root.querySelector<HTMLButtonElement>('[data-rte-command="colors"]')?.title).toBe('Text and background color')
    expect(root.querySelector<HTMLButtonElement>('[data-rte-command="table"]')?.title).toBe('Table')
  })

  it('uses distinct icons for inline code and HTML code view', () => {
    const root = fixture()
    root.dataset.rteOptions = JSON.stringify({
      ...JSON.parse(root.dataset.rteOptions!),
      toolbar: ['code', 'codeView'],
    })

    createEditor(root, createBasicCodeView)

    const inlineCode = root.querySelector<HTMLButtonElement>('[data-rte-command="code"]')
    const codeView = root.querySelector<HTMLButtonElement>('[data-rte-command="codeView"]')
    expect(inlineCode?.textContent).not.toBe(codeView?.textContent)
  })
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
