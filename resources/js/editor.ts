import { Editor, Extension } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { normalizeEmpty, sanitizeHtml } from './sanitize'
import type { CodeViewAdapter, CodeViewFactory, EditorOptions, PublicEditor } from './types'

const instances = new WeakMap<HTMLElement, RichTextEditorController>()

const AlignedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-rte-align') || 'center',
        renderHTML: (attributes) => ({ 'data-rte-align': attributes.align }),
      },
    }
  },
})

const RestrictedTextSize = Extension.create({
  name: 'restrictedTextSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        rteSize: {
          default: null,
          parseHTML: (element) => element.getAttribute('data-rte-size'),
          renderHTML: (attributes) => attributes.rteSize ? { 'data-rte-size': attributes.rteSize } : {},
        },
      },
    }]
  },
})

const BUTTONS: Record<string, { label: string; icon: string }> = {
  undo: { label: 'Undo', icon: '↶' }, redo: { label: 'Redo', icon: '↷' },
  bold: { label: 'Bold', icon: '<b>B</b>' }, italic: { label: 'Italic', icon: '<i>I</i>' },
  underline: { label: 'Underline', icon: '<u>U</u>' }, strike: { label: 'Strikethrough', icon: '<s>S</s>' },
  code: { label: 'Inline code', icon: '&lt;/&gt;' }, bulletList: { label: 'Bullet list', icon: '•≡' },
  orderedList: { label: 'Numbered list', icon: '1≡' }, blockquote: { label: 'Blockquote', icon: '❝' },
  codeBlock: { label: 'Code block', icon: '{ }' }, horizontalRule: { label: 'Horizontal rule', icon: '―' },
  link: { label: 'Add link', icon: '🔗' }, image: { label: 'Add image', icon: '▧' },
  clearFormatting: { label: 'Clear formatting', icon: 'Tx' }, codeView: { label: 'HTML code view', icon: '&lt;⁄&gt;' },
}

export class RichTextEditorController implements PublicEditor {
  private readonly input: HTMLTextAreaElement
  private readonly mount: HTMLElement
  private readonly options: EditorOptions
  private readonly shell: HTMLElement
  private readonly toolbar: HTMLElement
  private readonly visualHost: HTMLElement
  private readonly sourceHost: HTMLElement
  private readonly notice: HTMLElement
  private readonly editor: Editor
  private codeView: CodeViewAdapter | null = null
  private inCodeView = false
  private sourceDirty = false
  private readonly form: HTMLFormElement | null
  private readonly onSubmit = (event: SubmitEvent) => this.handleSubmit(event)
  private readonly onExternalSync = () => this.syncFromInput()

  constructor(private readonly root: HTMLElement, private readonly codeViewFactory: CodeViewFactory, options: EditorOptions = {}) {
    this.options = { ...this.readOptions(), ...options, codeView: { ...this.readOptions().codeView, ...options.codeView } }
    this.applyTheme()
    this.input = this.resolveInput()
    this.mount = root.querySelector<HTMLElement>('[data-rte-mount]') ?? root
    this.mount.innerHTML = ''
    this.shell = this.createElement('div', 'rte-shell')
    this.toolbar = this.createElement('div', 'rte-toolbar')
    this.toolbar.setAttribute('role', 'toolbar')
    this.toolbar.setAttribute('aria-label', 'Rich text formatting')
    this.visualHost = this.createElement('div', 'rte-visual')
    this.sourceHost = this.createElement('div', 'rte-source')
    this.sourceHost.hidden = true
    this.notice = this.createElement('div', 'rte-source-notice')
    this.notice.hidden = true
    this.shell.append(this.toolbar, this.visualHost, this.sourceHost, this.notice)
    this.mount.append(this.shell)
    this.renderToolbar()

    this.editor = new Editor({
      element: this.visualHost,
      content: this.input.value || '',
      editable: !(this.options.readonly || this.options.disabled),
      extensions: this.extensions(),
      editorProps: {
        attributes: {
          class: 'rte-prose',
          'data-placeholder': this.options.placeholder ?? '',
          style: `min-height:${this.options.minHeight ?? '16rem'}`,
          'aria-label': 'Rich text content',
        },
      },
      onUpdate: ({ editor }) => this.syncInput(normalizeEmpty(editor.getHTML())),
      onSelectionUpdate: () => this.refreshToolbar(),
      onCreate: ({ editor }) => {
        this.syncInput(normalizeEmpty(editor.getHTML()), false)
        this.emit('rte:ready', { editor: this })
      },
    })

    this.form = this.input.closest('form')
    this.form?.addEventListener('submit', this.onSubmit)
    this.input.addEventListener('change', this.onExternalSync)
    this.root.addEventListener('rte:sync', this.onExternalSync)
    document.addEventListener('livewire:navigated', this.onExternalSync)
  }

  getHTML(): string { return normalizeEmpty(this.editor.getHTML()) }

  setHTML(html: string): void {
    const result = sanitizeHtml(html, this.options)
    this.editor.commands.setContent(result.html, { emitUpdate: false })
    this.syncInput(result.html)
    if (this.inCodeView) this.codeView?.setValue(result.html)
  }

  focus(): void {
    if (this.inCodeView) this.codeView?.focus()
    else this.editor.commands.focus()
  }

  setReadOnly(readonly: boolean): void {
    this.editor.setEditable(!readonly)
    this.root.classList.toggle('rich-text-editor--readonly', readonly)
  }

  destroy(): void {
    this.form?.removeEventListener('submit', this.onSubmit)
    this.input.removeEventListener('change', this.onExternalSync)
    this.root.removeEventListener('rte:sync', this.onExternalSync)
    document.removeEventListener('livewire:navigated', this.onExternalSync)
    this.codeView?.destroy()
    this.editor.destroy()
    this.mount.innerHTML = ''
    instances.delete(this.root)
    this.emit('rte:destroy', {})
  }

  private readOptions(): EditorOptions {
    try { return JSON.parse(this.root.dataset.rteOptions ?? '{}') as EditorOptions } catch { return {} }
  }

  private resolveInput(): HTMLTextAreaElement {
    const existing = this.root.querySelector<HTMLTextAreaElement>('[data-rte-input]')
    if (existing) {
      existing.classList.add('rte-native-input')
      return existing
    }
    const input = document.createElement('textarea')
    input.dataset.rteInput = ''
    input.className = 'rte-native-input'
    this.root.prepend(input)
    return input
  }

  private extensions() {
    return [
      StarterKit.configure({
        heading: { levels: (this.options.headings ?? [2, 3, 4]) as any },
        link: { openOnClick: false, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      AlignedImage.configure({ inline: false, allowBase64: false }),
      TextStyle,
      RestrictedTextSize,
    ]
  }

  private renderToolbar(): void {
    const tools = this.options.toolbar ?? []
    for (const tool of tools) {
      if (tool === '|') {
        this.toolbar.append(this.createElement('span', 'rte-divider'))
        continue
      }
      if (tool === 'heading') {
        const select = document.createElement('select')
        select.className = 'rte-select'
        select.title = 'Text style'
        select.setAttribute('aria-label', 'Text style')
        select.append(new Option('Paragraph', 'paragraph'), ...(this.options.headings ?? [2, 3, 4]).map((level) => new Option(`Heading ${level}`, `h${level}`)))
        select.addEventListener('change', () => {
          if (select.value === 'paragraph') this.editor.chain().focus().setParagraph().run()
          else this.editor.chain().focus().setHeading({ level: Number(select.value.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
        })
        this.toolbar.append(select)
        continue
      }
      if (tool === 'codeView' && this.options.codeView?.enabled === false) continue
      const definition = BUTTONS[tool]
      if (!definition) continue
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'rte-button'
      button.dataset.rteCommand = tool
      button.title = definition.label
      button.setAttribute('aria-label', definition.label)
      button.innerHTML = definition.icon
      button.addEventListener('click', () => this.execute(tool, button))
      this.toolbar.append(button)
    }

    const sizes = this.options.fontSizes ?? {}
    if (Object.keys(sizes).length > 0) {
      const select = document.createElement('select')
      select.className = 'rte-select'
      select.setAttribute('aria-label', 'Text size')
      select.append(new Option('Size', ''), ...Object.entries(sizes).map(([value, label]) => new Option(label, value)))
      select.addEventListener('change', () => {
        this.editor.chain().focus().setMark('textStyle', select.value ? { rteSize: select.value } : {}).run()
      })
      this.toolbar.append(select)
    }
  }

  private execute(command: string, button: HTMLButtonElement): void {
    const chain = this.editor.chain().focus()
    const commands: Record<string, () => void> = {
      undo: () => chain.undo().run(), redo: () => chain.redo().run(), bold: () => chain.toggleBold().run(),
      italic: () => chain.toggleItalic().run(), underline: () => chain.toggleUnderline().run(), strike: () => chain.toggleStrike().run(),
      code: () => chain.toggleCode().run(), bulletList: () => chain.toggleBulletList().run(), orderedList: () => chain.toggleOrderedList().run(),
      blockquote: () => chain.toggleBlockquote().run(), codeBlock: () => chain.toggleCodeBlock().run(), horizontalRule: () => chain.setHorizontalRule().run(),
      clearFormatting: () => chain.unsetAllMarks().clearNodes().run(), link: () => this.openLinkDialog(), image: () => this.openImageDialog(),
      codeView: () => this.toggleCodeView(button),
    }
    commands[command]?.()
    this.refreshToolbar()
  }

  private toggleCodeView(button: HTMLButtonElement): void {
    if (this.inCodeView) {
      this.applySource(button)
      return
    }
    if (!this.codeView) {
      this.codeView = this.codeViewFactory(this.sourceHost, this.getHTML(), this.options.codeView ?? {}, () => { this.sourceDirty = true })
      this.renderCodeActions()
    } else {
      this.codeView.setValue(this.getHTML())
    }
    this.inCodeView = true
    this.sourceDirty = false
    this.visualHost.hidden = true
    this.sourceHost.hidden = false
    this.toolbar.classList.add('rte-toolbar--code')
    button.classList.add('is-active')
    button.setAttribute('aria-pressed', 'true')
    this.codeView.focus()
    this.emit('rte:mode-change', { mode: 'code' })
  }

  private applySource(button?: HTMLButtonElement): boolean {
    if (!this.codeView) return true
    const source = this.codeView.getValue()
    const result = sanitizeHtml(source, this.options)
    this.codeView.setDiagnostics(result.diagnostics)
    if (result.changed) {
      this.showSanitizeNotice(result.html, button)
      this.emit('rte:validation-error', { diagnostics: result.diagnostics })
      return false
    }
    this.commitSource(result.html, button)
    return true
  }

  private showSanitizeNotice(sanitized: string, button?: HTMLButtonElement): void {
    this.notice.innerHTML = ''
    const message = this.createElement('p', 'rte-source-notice__message')
    message.textContent = 'The HTML contains unsupported or unsafe markup. Review the diagnostics before applying the sanitized version.'
    const apply = document.createElement('button')
    apply.type = 'button'; apply.className = 'rte-notice-apply'; apply.textContent = 'Apply sanitized HTML'
    apply.addEventListener('click', () => this.commitSource(sanitized, button))
    const cancel = document.createElement('button')
    cancel.type = 'button'; cancel.className = 'rte-notice-cancel'; cancel.textContent = 'Cancel'
    cancel.addEventListener('click', () => { this.notice.hidden = true; this.codeView?.focus() })
    this.notice.append(message, apply, cancel)
    this.notice.hidden = false
  }

  private commitSource(html: string, button?: HTMLButtonElement): void {
    this.editor.commands.setContent(html, { emitUpdate: false })
    this.syncInput(html)
    this.sourceDirty = false
    this.inCodeView = false
    this.notice.hidden = true
    this.sourceHost.hidden = true
    this.visualHost.hidden = false
    this.toolbar.classList.remove('rte-toolbar--code')
    button?.classList.remove('is-active')
    button?.setAttribute('aria-pressed', 'false')
    this.editor.commands.focus()
    this.emit('rte:mode-change', { mode: 'visual' })
  }

  private renderCodeActions(): void {
    if (!this.codeView?.format || this.options.codeView?.format_button === false) return
    const actions = this.createElement('div', 'rte-code-actions')
    const format = document.createElement('button')
    format.type = 'button'; format.className = 'rte-code-action'; format.textContent = 'Format HTML'
    format.addEventListener('click', () => this.codeView?.format?.())
    actions.append(format)
    if (this.options.codeView?.fullscreen !== false) {
      const fullscreen = document.createElement('button')
      fullscreen.type = 'button'; fullscreen.className = 'rte-code-action'; fullscreen.textContent = 'Fullscreen'
      fullscreen.addEventListener('click', () => {
        const active = this.shell.classList.toggle('rte-shell--fullscreen')
        fullscreen.textContent = active ? 'Exit fullscreen' : 'Fullscreen'
      })
      actions.append(fullscreen)
    }
    this.sourceHost.prepend(actions)
  }

  private openLinkDialog(): void {
    const previous = this.editor.getAttributes('link').href as string | undefined
    this.openDialog('Add link', [
      { name: 'href', label: 'URL', value: previous ?? '', required: true },
      { name: 'title', label: 'Title', value: '' },
      { name: 'newTab', label: 'Open in a new tab', type: 'checkbox', value: '' },
    ], (values) => {
      if (!values.href) { this.editor.chain().focus().unsetLink().run(); return }
      this.editor.chain().focus().extendMarkRange('link').setLink({ href: values.href, title: values.title || undefined, target: values.newTab ? '_blank' : undefined, rel: values.newTab ? 'noopener noreferrer' : undefined }).run()
    })
  }

  private openImageDialog(): void {
    this.openDialog('Add image', [
      { name: 'src', label: 'Image URL', value: '', required: true },
      { name: 'alt', label: 'Alternative text', value: '', required: true },
      { name: 'title', label: 'Title', value: '' },
      { name: 'decorative', label: 'Decorative image', type: 'checkbox', value: '' },
      { name: 'align', label: 'Alignment', type: 'select', value: 'center', options: this.options.images?.alignments ?? ['left', 'center', 'right'] },
    ], (values) => this.editor.chain().focus().setImage({ src: values.src, alt: values.decorative ? '' : values.alt, title: values.title || undefined, align: values.align } as any).run())
  }

  private openDialog(title: string, fields: Array<{ name: string; label: string; value: string; required?: boolean; type?: string; options?: string[] }>, submit: (values: Record<string, string>) => void): void {
    const backdrop = this.createElement('div', 'rte-dialog-backdrop')
    const dialog = this.createElement('form', 'rte-dialog') as HTMLFormElement
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true')
    const heading = this.createElement('h2', 'rte-dialog-title'); heading.textContent = title; dialog.append(heading)
    for (const field of fields) {
      const label = document.createElement('label'); label.className = 'rte-dialog-field'; label.append(document.createTextNode(field.label))
      let input: HTMLInputElement | HTMLSelectElement
      if (field.type === 'select') {
        input = document.createElement('select'); input.append(...(field.options ?? []).map((option) => new Option(option[0].toUpperCase() + option.slice(1), option)))
      } else {
        input = document.createElement('input'); input.type = field.type ?? 'text'; if (field.type === 'checkbox') label.classList.add('rte-dialog-field--check')
      }
      input.name = field.name; input.required = Boolean(field.required); if (field.type !== 'checkbox') input.value = field.value
      label.append(input); dialog.append(label)
    }
    const actions = this.createElement('div', 'rte-dialog-actions')
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.className = 'rte-dialog-cancel'
    cancel.addEventListener('click', () => backdrop.remove())
    const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Apply'; save.className = 'rte-dialog-apply'
    actions.append(cancel, save); dialog.append(actions); backdrop.append(dialog); this.shell.append(backdrop)
    dialog.addEventListener('submit', (event) => {
      event.preventDefault(); const data = new FormData(dialog); const values: Record<string, string> = {}
      for (const field of fields) values[field.name] = field.type === 'checkbox' ? (data.has(field.name) ? '1' : '') : String(data.get(field.name) ?? '')
      submit(values); backdrop.remove()
    })
    ;(dialog.querySelector('input,select') as HTMLElement | null)?.focus()
  }

  private refreshToolbar(): void {
    const active: Record<string, boolean> = {
      bold: this.editor.isActive('bold'), italic: this.editor.isActive('italic'), underline: this.editor.isActive('underline'),
      strike: this.editor.isActive('strike'), code: this.editor.isActive('code'), bulletList: this.editor.isActive('bulletList'),
      orderedList: this.editor.isActive('orderedList'), blockquote: this.editor.isActive('blockquote'), codeBlock: this.editor.isActive('codeBlock'),
      link: this.editor.isActive('link'), codeView: this.inCodeView,
    }
    this.toolbar.querySelectorAll<HTMLButtonElement>('[data-rte-command]').forEach((button) => {
      const isActive = active[button.dataset.rteCommand!] ?? false
      button.classList.toggle('is-active', isActive); button.setAttribute('aria-pressed', String(isActive))
    })
  }

  private syncInput(html: string, emit = true): void {
    if (this.input.value === html) return
    this.input.value = html
    if (emit) {
      this.input.dispatchEvent(new Event('input', { bubbles: true }))
      this.emit('rte:change', { html })
    }
  }

  private syncFromInput(): void {
    if (!this.inCodeView && this.input.value !== this.getHTML()) this.setHTML(this.input.value)
  }

  private handleSubmit(event: SubmitEvent): void {
    const codeButton = this.toolbar.querySelector<HTMLButtonElement>('[data-rte-command="codeView"]') ?? undefined
    if (this.inCodeView && this.sourceDirty && !this.applySource(codeButton)) {
      event.preventDefault(); event.stopImmediatePropagation(); this.codeView?.focus()
    }
  }

  private applyTheme(): void {
    for (const [name, value] of Object.entries(this.options.theme ?? {})) this.root.style.setProperty(`--rte-${name}`, value)
  }

  private createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag); element.className = className; return element
  }

  private emit(name: string, detail: Record<string, unknown>): void {
    this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }))
  }
}

export function createEditor(root: HTMLElement, factory: CodeViewFactory, options: EditorOptions = {}): PublicEditor {
  const existing = instances.get(root)
  if (existing) return existing
  const editor = new RichTextEditorController(root, factory, options)
  instances.set(root, editor)
  return editor
}

export function destroyEditor(root: HTMLElement): void { instances.get(root)?.destroy() }

export function scanEditors(root: ParentNode, factory: CodeViewFactory): void {
  const elements = root instanceof HTMLElement && root.matches('[data-rich-text-editor]')
    ? [root]
    : [...root.querySelectorAll<HTMLElement>('[data-rich-text-editor]')]
  elements.forEach((element) => createEditor(element, factory))
}
