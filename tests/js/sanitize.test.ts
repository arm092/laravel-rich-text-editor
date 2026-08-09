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

  it('canonicalizes allowed responsive image widths and removes arbitrary styles', () => {
    const allowed = sanitizeHtml('<img src="https://example.com/a.jpg" alt="A" style="width:60%">', options)
    const blocked = sanitizeHtml('<img src="https://example.com/a.jpg" alt="A" style="width:61%;color:red">', options)

    expect(allowed.html).toBe('<img src="https://example.com/a.jpg" alt="A" style="width: 60%;">')
    expect(blocked.html).toBe('<img src="https://example.com/a.jpg" alt="A">')
    expect(blocked.diagnostics.some((diagnostic) => diagnostic.message.includes('width'))).toBe(true)
  })

  it('removes responsive image widths when resizing is disabled', () => {
    const result = sanitizeHtml('<img src="https://example.com/a.jpg" alt="A" style="width: 60%;">', {
      ...options,
      images: { ...options.images, resize: { enabled: false } },
    })

    expect(result.html).toBe('<img src="https://example.com/a.jpg" alt="A">')
  })

  it('normalizes visually empty editor output', () => {
    expect(normalizeEmpty('<p><br></p>')).toBe('')
    expect(normalizeEmpty('<hr>')).toBe('<hr>')
  })
})
