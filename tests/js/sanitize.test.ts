import { describe, expect, it } from 'vitest'
import { normalizeEmpty, sanitizeHtml } from '../../resources/js/sanitize'

const options = {
  headings: [2, 3, 4],
  links: { schemes: ['http', 'https', 'mailto', 'tel'], allow_relative: true },
  images: { schemes: ['http', 'https'], alignments: ['left', 'center', 'right'] },
}

describe('HTML sanitization', () => {
  it('keeps profile-supported semantic HTML', () => {
    const html = '<h2>Title</h2><p>Hello <strong>world</strong>.</p>'
    const result = sanitizeHtml(html, options)

    expect(result.html).toBe(html)
    expect(result.changed).toBe(false)
  })

  it('removes scripts, event handlers, and unsafe URLs', () => {
    const result = sanitizeHtml('<script>alert(1)</script><p onclick="bad()">Safe</p><a href="javascript:bad()">Link</a>', options)

    expect(result.html).toBe('alert(1)<p>Safe</p><a>Link</a>')
    expect(result.changed).toBe(true)
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })

  it('validates image URLs, alt text, and alignment', () => {
    const result = sanitizeHtml('<img src="data:image/png;base64,a" data-rte-align="wide">', options)

    expect(result.html).toBe('')
    expect(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true)
  })

  it('normalizes visually empty editor output', () => {
    expect(normalizeEmpty('<p><br></p>')).toBe('')
    expect(normalizeEmpty('<hr>')).toBe('<hr>')
  })
})
