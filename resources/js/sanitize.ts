import type { EditorOptions, SourceDiagnostic } from './types'

const BASE_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr', 'a', 'img', 'span',
])

const ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'data-rte-align']),
  span: new Set(['data-rte-size']),
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
      if (!isAllowedUrl(sourceUrl, options.images?.schemes ?? ['http', 'https'], false)) {
        diagnostics.push({ message: 'The image URL must use HTTP or HTTPS.', severity: 'error' })
        element.remove()
        continue
      }
      if (!element.hasAttribute('alt')) diagnostics.push({ message: 'Images require alt text. Use an empty alt for decorative images.', severity: 'error' })
      const alignment = element.getAttribute('data-rte-align')
      if (alignment && !(options.images?.alignments ?? ['left', 'center', 'right']).includes(alignment)) {
        diagnostics.push({ message: `The image alignment "${alignment}" is not allowed.`, severity: 'warning' })
        element.removeAttribute('data-rte-align')
      }
    }

    if (tag === 'span' && element.hasAttribute('data-rte-size')) {
      const size = element.getAttribute('data-rte-size')!
      if (!Object.prototype.hasOwnProperty.call(options.fontSizes ?? {}, size)) {
        diagnostics.push({ message: `The text size "${size}" is not allowed.`, severity: 'warning' })
        element.removeAttribute('data-rte-size')
      }
    }
  }

  const html = normalizeEmpty(root.innerHTML)
  return { html, changed: normalizeComparison(source) !== normalizeComparison(html), diagnostics }
}

export function normalizeEmpty(html: string): string {
  const text = html.replace(/<br\s*\/?>(?=<\/p>)/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim()
  return text === '' && !/<(img|hr)\b/i.test(html) ? '' : html.trim()
}

function normalizeComparison(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}
