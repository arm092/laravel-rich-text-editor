import { Editor, Extension, type Extensions, type NodeViewRendererProps } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table/table'
import { TableCell } from '@tiptap/extension-table/cell'
import { TableHeader } from '@tiptap/extension-table/header'
import { TableRow } from '@tiptap/extension-table/row'
import { TextStyle } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { normalizeEmpty, sanitizeHtml } from './sanitize'
import type { CodeViewAdapter, CodeViewFactory, EditorOptions, PublicEditor } from './types'

const instances = new WeakMap<HTMLElement, RichTextEditorController>()

type ImageResizeOptions = { enabled?: boolean; min?: number; max?: number; step?: number }

function createAlignedImage(resize: ImageResizeOptions = {}) {
  const enabled = resize.enabled !== false
  const min = resize.min ?? 20
  const max = resize.max ?? 100
  const step = resize.step ?? 5
  const snap = (value: number) => Math.min(max, Math.max(min, min + Math.round((value - min) / step) * step))

  return Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        align: {
          default: 'center',
          parseHTML: (element) => element.getAttribute('data-rte-align') || 'center',
          renderHTML: (attributes) => ({ 'data-rte-align': attributes.align }),
        },
        width: {
          default: null,
          parseHTML: (element) => element.getAttribute('style')?.match(/^\s*width\s*:\s*(\d+)%\s*;?\s*$/i)?.[1] ?? null,
          renderHTML: (attributes) => attributes.width ? { style: `width: ${attributes.width}%;` } : {},
        },
      }
    },
    addNodeView() {
      return (props: NodeViewRendererProps) => {
        let currentNode = props.node
        const wrapper = document.createElement('span')
        wrapper.className = 'rte-resizable-image'
        wrapper.contentEditable = 'false'
        const image = document.createElement('img')
        const handle = document.createElement('span')
        handle.className = 'rte-image-resize-handle'
        handle.tabIndex = 0
        handle.setAttribute('role', 'slider')
        handle.setAttribute('aria-label', 'Resize image')
        handle.setAttribute('aria-valuemin', String(min))
        handle.setAttribute('aria-valuemax', String(max))
        handle.setAttribute('aria-orientation', 'horizontal')
        wrapper.append(image)
        if (enabled) wrapper.append(handle)

        const updateDom = () => {
          const { src, alt, title, align, width } = currentNode.attrs
          image.src = src
          image.alt = alt ?? ''
          if (title) image.title = title
          else image.removeAttribute('title')
          wrapper.dataset.rteAlign = align
          wrapper.style.width = width ? `${width}%` : ''
          handle.setAttribute('aria-valuenow', String(width ?? 100))
          handle.setAttribute('aria-valuetext', `${width ?? 100}% width`)
        }
        const setWidth = (width: number) => {
          const position = props.getPos()
          if (typeof position !== 'number' || !props.editor.isEditable) return
          const next = snap(width)
          props.view.dispatch(props.view.state.tr.setNodeMarkup(position, undefined, { ...currentNode.attrs, width: next }))
        }

        handle.addEventListener('pointerdown', (event) => {
          if (!props.editor.isEditable) return
          event.preventDefault()
          const parentWidth = wrapper.parentElement?.getBoundingClientRect().width ?? 0
          if (parentWidth <= 0) return
          const startX = event.clientX
          const startWidth = Number(currentNode.attrs.width) || wrapper.getBoundingClientRect().width / parentWidth * 100
          handle.setPointerCapture(event.pointerId)
          const move = (moveEvent: PointerEvent) => setWidth(startWidth + (moveEvent.clientX - startX) / parentWidth * 100)
          const finish = () => {
            handle.removeEventListener('pointermove', move)
            handle.removeEventListener('pointerup', finish)
            handle.removeEventListener('pointercancel', finish)
          }
          handle.addEventListener('pointermove', move)
          handle.addEventListener('pointerup', finish)
          handle.addEventListener('pointercancel', finish)
        })
        handle.addEventListener('keydown', (event) => {
          const width = Number(currentNode.attrs.width) || 100
          const next = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? width - step
            : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? width + step
              : event.key === 'Home' ? min : event.key === 'End' ? max : null
          if (next === null) return
          event.preventDefault()
          setWidth(next)
        })
        updateDom()

        return {
          dom: wrapper,
          update: (node) => {
            if (node.type !== currentNode.type) return false
            currentNode = node
            updateDom()
            return true
          },
          stopEvent: (event) => event.target === handle,
        }
      }
    },
  })
}

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
  table: { label: 'Table', icon: '▦' },
}

function tableCellAttributes(includeScope = false) {
  return {
    colspan: {
      default: 1,
      parseHTML: (element: HTMLElement) => Number(element.getAttribute('colspan')) || 1,
      renderHTML: (attributes: Record<string, unknown>) => Number(attributes.colspan) > 1 ? { colspan: attributes.colspan } : {},
    },
    rowspan: {
      default: 1,
      parseHTML: (element: HTMLElement) => Number(element.getAttribute('rowspan')) || 1,
      renderHTML: (attributes: Record<string, unknown>) => Number(attributes.rowspan) > 1 ? { rowspan: attributes.rowspan } : {},
    },
    colwidth: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
    horizontalAlign: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('data-rte-horizontal-align'),
      renderHTML: (attributes: Record<string, unknown>) => attributes.horizontalAlign ? { 'data-rte-horizontal-align': attributes.horizontalAlign } : {},
    },
    verticalAlign: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('data-rte-vertical-align'),
      renderHTML: (attributes: Record<string, unknown>) => attributes.verticalAlign ? { 'data-rte-vertical-align': attributes.verticalAlign } : {},
    },
    textColor: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('data-rte-text-color'),
      renderHTML: (attributes: Record<string, unknown>) => attributes.textColor ? { 'data-rte-text-color': attributes.textColor } : {},
    },
    backgroundColor: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('data-rte-background-color'),
      renderHTML: (attributes: Record<string, unknown>) => attributes.backgroundColor ? { 'data-rte-background-color': attributes.backgroundColor } : {},
    },
    ...(includeScope ? {
      scope: {
        default: 'col',
        parseHTML: (element: HTMLElement) => element.getAttribute('scope') || 'col',
        renderHTML: (attributes: Record<string, unknown>) => attributes.scope ? { scope: attributes.scope } : {},
      },
    } : {}),
  }
}

const RestrictedTable = Table.extend({
  renderHTML() { return ['table', ['tbody', 0]] },
})

const RestrictedTableCell = TableCell.extend({
  addAttributes() { return { ...this.parent?.(), ...tableCellAttributes() } },
})

const RestrictedTableHeader = TableHeader.extend({
  addAttributes() { return { ...this.parent?.(), ...tableCellAttributes(true) } },
})

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
  private readonly onRootKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.closeTableMenu()
  }

  constructor(private readonly root: HTMLElement, private readonly codeViewFactory: CodeViewFactory, options: EditorOptions = {}) {
    this.options = { ...this.readOptions(), ...options, codeView: { ...this.readOptions().codeView, ...options.codeView } }
    this.applyTheme()
    this.root.classList.toggle('rich-text-editor--readonly', Boolean(this.options.readonly || this.options.disabled))
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
      onTransaction: () => this.refreshTableMenu(),
      onCreate: ({ editor }) => {
        this.syncInput(normalizeEmpty(editor.getHTML()), false)
        this.emit('rte:ready', { editor: this })
      },
    })

    this.form = this.input.closest('form')
    this.form?.addEventListener('submit', this.onSubmit, true)
    this.input.addEventListener('change', this.onExternalSync)
    this.root.addEventListener('rte:sync', this.onExternalSync)
    this.root.addEventListener('keydown', this.onRootKeydown, true)
    if (this.root.hasAttribute('data-rte-livewire')) document.addEventListener('livewire:navigated', this.onExternalSync)
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
    this.form?.removeEventListener('submit', this.onSubmit, true)
    this.input.removeEventListener('change', this.onExternalSync)
    this.root.removeEventListener('rte:sync', this.onExternalSync)
    this.root.removeEventListener('keydown', this.onRootKeydown, true)
    if (this.root.hasAttribute('data-rte-livewire')) document.removeEventListener('livewire:navigated', this.onExternalSync)
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
    const extensions: Extensions = [
      StarterKit.configure({
        heading: { levels: (this.options.headings ?? [2, 3, 4]) as any },
        link: { openOnClick: false, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      createAlignedImage(this.options.images?.resize).configure({ inline: false, allowBase64: false }),
      TextStyle,
      RestrictedTextSize,
    ]
    if (this.options.tables?.enabled) {
      extensions.push(RestrictedTable.configure({ resizable: false }), TableRow, RestrictedTableHeader, RestrictedTableCell)
    }

    return extensions
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
        select.dataset.rteControl = 'heading'
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
      if (tool === 'table') {
        if (this.options.tables?.enabled) this.toolbar.append(this.createTableControl())
        continue
      }
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

  private createTableControl(): HTMLElement {
    const control = this.createElement('div', 'rte-table-control')
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'rte-button'
    toggle.dataset.rteCommand = 'table'
    toggle.setAttribute('aria-label', 'Table')
    toggle.setAttribute('aria-expanded', 'false')
    toggle.innerHTML = BUTTONS.table.icon
    const menu = this.createElement('div', 'rte-table-menu')
    menu.hidden = true
    menu.setAttribute('aria-label', 'Table tools')

    const actions: Array<[string, string]> = [
      ['insert', 'Insert 3 × 3 table'],
      ['row-before', 'Add row before'], ['row-after', 'Add row after'], ['row-delete', 'Delete row'],
      ['column-before', 'Add column before'], ['column-after', 'Add column after'], ['column-delete', 'Delete column'],
      ['header-row', 'Toggle header row'], ['merge', 'Merge cells'], ['split', 'Split cell'], ['delete', 'Delete table'],
    ]
    for (const [action, label] of actions) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `rte-table-action${action === 'delete' ? ' rte-table-action--danger' : ''}`
      button.dataset.rteTableAction = action
      button.textContent = label
      button.addEventListener('click', () => this.runTableAction(action))
      menu.append(button)
    }

    menu.append(
      this.createTableSelect('Horizontal alignment', 'horizontalAlign', ['', ...(this.options.tables?.horizontal_alignments ?? [])]),
      this.createTableSelect('Vertical alignment', 'verticalAlign', ['', ...(this.options.tables?.vertical_alignments ?? [])]),
      this.createTableSelect('Text color', 'textColor', ['', ...(this.options.tables?.palette ?? [])]),
      this.createTableSelect('Background color', 'backgroundColor', ['', ...(this.options.tables?.palette ?? [])]),
    )
    toggle.addEventListener('click', () => {
      menu.hidden = !menu.hidden
      toggle.setAttribute('aria-expanded', String(!menu.hidden))
      if (!menu.hidden) {
        this.refreshTableMenu()
        menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
      }
    })
    toggle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return
      event.preventDefault()
      menu.hidden = false
      toggle.setAttribute('aria-expanded', 'true')
      this.refreshTableMenu()
      menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    })
    control.append(toggle, menu)
    return control
  }

  private createTableSelect(label: string, attribute: string, values: string[]): HTMLElement {
    const field = document.createElement('label')
    field.className = 'rte-table-field'
    field.append(document.createTextNode(label))
    const select = document.createElement('select')
    select.dataset.rteCellAttribute = attribute
    select.setAttribute('aria-label', label)
    select.append(...values.map((value) => new Option(value ? value[0].toUpperCase() + value.slice(1) : 'Reset', value)))
    select.addEventListener('change', () => {
      this.editor.commands.setCellAttribute(attribute, select.value || null)
      this.refreshTableMenu()
    })
    field.append(select)
    return field
  }

  private runTableAction(action: string): void {
    if (action === 'insert') {
      this.editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      this.closeTableMenu()
    }
    else if (action === 'row-before') this.editor.commands.addRowBefore()
    else if (action === 'row-after') this.editor.commands.addRowAfter()
    else if (action === 'row-delete') this.editor.commands.deleteRow()
    else if (action === 'column-before') this.editor.commands.addColumnBefore()
    else if (action === 'column-after') this.editor.commands.addColumnAfter()
    else if (action === 'column-delete') this.editor.commands.deleteColumn()
    else if (action === 'header-row') this.editor.commands.toggleHeaderRow()
    else if (action === 'merge') this.editor.commands.mergeCells()
    else if (action === 'split') this.editor.commands.splitCell()
    else if (action === 'delete') this.editor.commands.deleteTable()
    this.refreshTableMenu()
    this.closeTableMenu()
  }

  private refreshTableMenu(): void {
    if (!(this as any).editor) return
    const menu = this.toolbar.querySelector<HTMLElement>('.rte-table-menu')
    if (!menu) return
    const inTable = this.editor.isActive('table')
    menu.querySelectorAll<HTMLButtonElement>('[data-rte-table-action]').forEach((button) => {
      const action = button.dataset.rteTableAction
      if (action === 'insert') button.disabled = inTable
      else if (!inTable) button.disabled = true
      else if (action === 'merge') button.disabled = !this.editor.can().mergeCells()
      else if (action === 'split') button.disabled = !this.editor.can().splitCell()
      else button.disabled = false
    })
    const attributes = this.editor.getAttributes(this.editor.isActive('tableHeader') ? 'tableHeader' : 'tableCell')
    menu.querySelectorAll<HTMLSelectElement>('[data-rte-cell-attribute]').forEach((select) => {
      select.disabled = !inTable
      select.value = String(attributes[select.dataset.rteCellAttribute!] ?? '')
    })
  }

  private closeTableMenu(): void {
    const menu = this.toolbar?.querySelector<HTMLElement>('.rte-table-menu')
    const toggle = this.toolbar?.querySelector<HTMLButtonElement>('[data-rte-command="table"]')
    if (menu) menu.hidden = true
    toggle?.setAttribute('aria-expanded', 'false')
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
      table: this.editor.isActive('table'),
    }
    this.toolbar.querySelectorAll<HTMLButtonElement>('[data-rte-command]').forEach((button) => {
      const isActive = active[button.dataset.rteCommand!] ?? false
      button.classList.toggle('is-active', isActive); button.setAttribute('aria-pressed', String(isActive))
    })
    const heading = this.toolbar.querySelector<HTMLSelectElement>('[data-rte-control="heading"]')
    if (heading) {
      const level = (this.options.headings ?? [2, 3, 4]).find((candidate) => this.editor.isActive('heading', { level: candidate }))
      heading.value = level ? `h${level}` : 'paragraph'
    }
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
