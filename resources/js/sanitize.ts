import type { EditorOptions, SourceDiagnostic } from './types'

const BASE_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr', 'a', 'img', 'span',
])
const TABLE_TAGS = ['table', 'tbody', 'tr', 'th', 'td']
const DEFAULT_TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify']

const ATTRIBUTES: Record<string, Set<string>> = {
  p: new Set(['data-rte-text-align']),
  h1: new Set(['data-rte-text-align']), h2: new Set(['data-rte-text-align']), h3: new Set(['data-rte-text-align']),
  h4: new Set(['data-rte-text-align']), h5: new Set(['data-rte-text-align']), h6: new Set(['data-rte-text-align']),
  table: new Set(['data-rte-width', 'data-rte-table-align']),
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'data-rte-align', 'style']),
  span: new Set(['data-rte-size', 'class']),
  td: new Set(['colspan', 'rowspan', 'data-rte-horizontal-align', 'data-rte-vertical-align', 'data-rte-text-color', 'data-rte-background-color']),
  th: new Set(['colspan', 'rowspan', 'scope', 'data-rte-horizontal-align', 'data-rte-vertical-align', 'data-rte-text-color', 'data-rte-background-color']),
}

export type SanitizeResult = {
  html: string
  changed: boolean
  diagnostics: SourceDiagnostic[]
}

function isAllowedUrl(value: string, schemes: string[], allowRelative: boolean): boolean {
  const trimmed = value.trim()
  if (allowRelative && (/^[/.#?]/.test(trimmed) || !/^[a-z][a-z\d+.-]*:/i.test(trimmed))) return true
  const match = trimmed.match(/^([a-z][a-z\d+.-]*):/i)
  return Boolean(match && schemes.includes(match[1].toLowerCase()))
}

export function sanitizeHtml(source: string, options: EditorOptions): SanitizeResult {
  const parser = new DOMParser()
  const document = parser.parseFromString(`<div data-rte-root>${source}</div>`, 'text/html')
  const root = document.querySelector<HTMLElement>('[data-rte-root]')!
  const diagnostics: SourceDiagnostic[] = []
  const headings = new Set((options.headings ?? [2, 3, 4]).map((level) => `h${level}`))
  const allowedTags = new Set([...BASE_TAGS, ...headings])
  if (options.tables?.enabled) TABLE_TAGS.forEach((tag) => allowedTags.add(tag))
  if (options.tables?.enabled) normalizeTableInput(root, options, diagnostics)
  else for (const table of [...root.querySelectorAll('table')]) {
    diagnostics.push({ message: 'Tables are not allowed by this profile.', severity: 'warning' })
    table.remove()
  }
  normalizeBlockTextAlignInput(root, options)

  for (const element of [...root.querySelectorAll<HTMLElement>('*')]) {
    const tag = element.tagName.toLowerCase()
    if (!allowedTags.has(tag)) {
      diagnostics.push({ message: `The <${tag}> element is not allowed by this profile.`, severity: 'warning' })
      element.replaceWith(...element.childNodes)
      continue
    }

    for (const attribute of [...element.attributes]) {
      if (!ATTRIBUTES[tag]?.has(attribute.name)) {
        diagnostics.push({ message: `The ${attribute.name} attribute is not allowed on <${tag}>.`, severity: 'warning' })
        element.removeAttribute(attribute.name)
      }
    }

    if (tag === 'a' && element.hasAttribute('href')) {
      const schemes = options.links?.schemes ?? ['http', 'https', 'mailto', 'tel']
      if (!isAllowedUrl(element.getAttribute('href')!, schemes, options.links?.allow_relative ?? true)) {
        diagnostics.push({ message: 'The link uses an unsafe or unsupported URL scheme.', severity: 'error' })
        element.removeAttribute('href')
      }
      if (element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer')
    }

    if (tag === 'img') {
      const sourceUrl = element.getAttribute('src') ?? ''
      if (!isAllowedUrl(sourceUrl, options.images?.schemes ?? ['http', 'https'], options.images?.allow_relative ?? false)) {
        diagnostics.push({ message: 'The image URL is relative or uses an unsupported scheme.', severity: 'error' })
        element.remove()
        continue
      }
      if (!element.hasAttribute('alt')) diagnostics.push({ message: 'Images require alt text. Use an empty alt for decorative images.', severity: 'error' })
      const alignment = element.getAttribute('data-rte-align')
      if (alignment && !(options.images?.alignments ?? ['left', 'center', 'right']).includes(alignment)) {
        diagnostics.push({ message: `The image alignment "${alignment}" is not allowed.`, severity: 'warning' })
        element.removeAttribute('data-rte-align')
      }
      const resize = options.images?.resize
      const width = parseImageWidth(element.getAttribute('style'))
      if (element.hasAttribute('style') && (resize?.enabled === false || width === null || !isAllowedImageWidth(width, resize ?? {}))) {
        diagnostics.push({ message: 'The image width is not allowed by this profile.', severity: 'warning' })
        element.removeAttribute('style')
      } else if (width !== null) {
        element.setAttribute('style', `width: ${width}%;`)
      }
    }

    if (tag === 'span' && element.hasAttribute('data-rte-size')) {
      const size = element.getAttribute('data-rte-size')!
      if (!Object.prototype.hasOwnProperty.call(options.fontSizes ?? {}, size)) {
        diagnostics.push({ message: `The text size "${size}" is not allowed.`, severity: 'warning' })
        element.removeAttribute('data-rte-size')
      }
    }

    if (tag === 'span') normalizeColorClasses(element, options, diagnostics)
    if (tag === 'p' || headings.has(tag)) {
      setCanonicalEnum(element, 'data-rte-text-align', element.dataset.rteTextAlign ?? '', options.textAlignments ?? DEFAULT_TEXT_ALIGNMENTS)
    }

    if (tag === 'table') {
      validateTableWidth(element, diagnostics)
      setCanonicalEnum(element, 'data-rte-table-align', element.dataset.rteTableAlign ?? '', ['left', 'center', 'right'])
    }
    if (tag === 'td' || tag === 'th') validateTableCell(element, tag, options, diagnostics)
  }

  const html = normalizeEmpty(root.innerHTML)
  return { html, changed: normalizeComparison(source) !== normalizeComparison(html), diagnostics }
}

function normalizeBlockTextAlignInput(root: HTMLElement, options: EditorOptions): void {
  const headings = new Set((options.headings ?? [2, 3, 4]).map((level) => `h${level}`))
  for (const block of [...root.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6')]) {
    if (block.tagName.toLowerCase() !== 'p' && !headings.has(block.tagName.toLowerCase())) continue
    const styles = styleDeclarations(block.getAttribute('style') ?? '')
    setCanonicalEnum(block, 'data-rte-text-align', block.dataset.rteTextAlign || styles['text-align'] || '', options.textAlignments ?? DEFAULT_TEXT_ALIGNMENTS)
  }
}

function validateTableWidth(table: HTMLElement, diagnostics: SourceDiagnostic[]): void {
  if (!table.hasAttribute('data-rte-width')) return
  const value = Number(table.dataset.rteWidth)
  if (value === 100) {
    table.removeAttribute('data-rte-width')
    return
  }
  if (!Number.isInteger(value) || value < 20 || value > 95 || value % 5 !== 0) {
    diagnostics.push({ message: 'The table width must be a supported percentage from 20% through 100%.', severity: 'warning' })
    table.removeAttribute('data-rte-width')
    return
  }
  table.dataset.rteWidth = String(value)
}

function normalizeColorClasses(element: HTMLElement, options: EditorOptions, diagnostics: SourceDiagnostic[]): void {
  const allowed = new Set(options.colors?.enabled === false ? [] : options.colors?.palette ?? [])
  const classes = element.className.trim().split(/\s+/).filter(Boolean)
  const text = classes.find((name) => name === 'text-white' ? allowed.has('white') : name.startsWith('text-') && allowed.has(name.slice(5, -4)) && name.endsWith('-500'))
  const background = classes.find((name) => name === 'bg-white' ? allowed.has('white') : name.startsWith('bg-') && allowed.has(name.slice(3, -4)) && name.endsWith('-500'))
  const canonical = [text, background].filter(Boolean).join(' ')
  if (classes.some((name) => ![text, background].includes(name))) {
    diagnostics.push({ message: 'The text contains an unsupported color or CSS class.', severity: 'warning' })
  }
  if (canonical) element.className = canonical
  else element.removeAttribute('class')
}

function normalizeTableInput(root: HTMLElement, options: EditorOptions, diagnostics: SourceDiagnostic[]): void {
  for (const cell of [...root.querySelectorAll<HTMLElement>('td,th')]) {
    const styles = styleDeclarations(cell.getAttribute('style') ?? '')
    setCanonicalEnum(cell, 'data-rte-horizontal-align', cell.dataset.rteHorizontalAlign || cell.getAttribute('align') || styles['text-align'] || '', options.tables?.horizontal_alignments ?? [])
    setCanonicalEnum(cell, 'data-rte-vertical-align', cell.dataset.rteVerticalAlign || cell.getAttribute('valign') || styles['vertical-align'] || '', options.tables?.vertical_alignments ?? [])
    setCanonicalColor(cell, 'data-rte-text-color', cell.dataset.rteTextColor || styles.color || '', options, diagnostics)
    setCanonicalColor(cell, 'data-rte-background-color', cell.dataset.rteBackgroundColor || cell.getAttribute('bgcolor') || styles['background-color'] || styles.background || '', options, diagnostics)
  }
}

function validateTableCell(cell: HTMLElement, tag: string, options: EditorOptions, diagnostics: SourceDiagnostic[]): void {
  const maxSpan = Math.max(1, options.tables?.max_span ?? 100)
  for (const attribute of ['colspan', 'rowspan']) {
    if (!cell.hasAttribute(attribute)) continue
    const value = Number(cell.getAttribute(attribute))
    if (!Number.isInteger(value) || value <= 1 || value > maxSpan) {
      diagnostics.push({ message: `The ${attribute} value is not allowed.`, severity: 'warning' })
      cell.removeAttribute(attribute)
    } else cell.setAttribute(attribute, String(value))
  }
  setCanonicalEnum(cell, 'data-rte-horizontal-align', cell.dataset.rteHorizontalAlign ?? '', options.tables?.horizontal_alignments ?? [])
  setCanonicalEnum(cell, 'data-rte-vertical-align', cell.dataset.rteVerticalAlign ?? '', options.tables?.vertical_alignments ?? [])
  setCanonicalColor(cell, 'data-rte-text-color', cell.dataset.rteTextColor ?? '', options, diagnostics)
  setCanonicalColor(cell, 'data-rte-background-color', cell.dataset.rteBackgroundColor ?? '', options, diagnostics)
  if (tag === 'th') setCanonicalEnum(cell, 'scope', cell.getAttribute('scope') ?? '', options.tables?.scopes ?? [])
  else cell.removeAttribute('scope')
}

function setCanonicalEnum(element: HTMLElement, attribute: string, value: string, allowed: string[]): void {
  const canonical = value.trim().toLowerCase()
  if (canonical && allowed.includes(canonical)) element.setAttribute(attribute, canonical)
  else element.removeAttribute(attribute)
}

function setCanonicalColor(element: HTMLElement, attribute: string, value: string, options: EditorOptions, diagnostics: SourceDiagnostic[]): void {
  if (!value.trim()) {
    element.removeAttribute(attribute)
    return
  }
  const token = colorToken(value, options)
  if (token) element.setAttribute(attribute, token)
  else {
    element.removeAttribute(attribute)
    diagnostics.push({ message: `The table color "${value.trim()}" is not in the active palette.`, severity: 'warning' })
  }
}

function colorToken(value: string, options: EditorOptions): string | null {
  const candidate = value.trim().toLowerCase()
  const allowed = [...new Set([...(options.tables?.palette ?? []), ...(options.colors?.palette ?? [])])]
  if (allowed.includes(candidate)) return candidate
  const hex = normalizeHex(candidate)
  if (!hex) return null
  return allowed.find((token) => normalizeHex(options.theme?.[token] ?? '') === hex) ?? null
}

function normalizeHex(value: string): string | null {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)
  if (!match) return null
  const hex = match[1].toLowerCase()
  return `#${hex.length === 3 ? [...hex].map((character) => character + character).join('') : hex}`
}

function styleDeclarations(style: string): Record<string, string> {
  return Object.fromEntries(style.split(';').flatMap((declaration) => {
    const separator = declaration.indexOf(':')
    return separator < 0 ? [] : [[declaration.slice(0, separator).trim().toLowerCase(), declaration.slice(separator + 1).trim()]]
  }))
}

function parseImageWidth(style: string | null): number | null {
  if (style === null) return null
  const match = style.match(/^\s*width\s*:\s*(\d+)%\s*;?\s*$/i)
  return match ? Number(match[1]) : null
}

function isAllowedImageWidth(width: number, resize: NonNullable<NonNullable<EditorOptions['images']>['resize']>): boolean {
  const min = resize.min ?? 20
  const max = resize.max ?? 100
  const step = resize.step ?? 5
  return Number.isFinite(width) && width >= min && width <= max && step > 0 && Math.abs((width - min) / step - Math.round((width - min) / step)) < 0.000001
}

export function normalizeEmpty(html: string): string {
  const text = html.replace(/<br\s*\/?>(?=<\/p>)/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim()
  return text === '' && !/<(img|hr|table)\b/i.test(html) ? '' : html.trim()
}

function normalizeComparison(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}
