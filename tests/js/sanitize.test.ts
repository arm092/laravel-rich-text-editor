import { describe, expect, it } from 'vitest'
import { normalizeEmpty, sanitizeHtml } from '../../resources/js/sanitize'

const options = {
  headings: [2, 3, 4],
  links: { schemes: ['http', 'https', 'mailto', 'tel'], allow_relative: true },
  images: { schemes: ['http', 'https'], alignments: ['left', 'center', 'right'] },
  tables: {
    enabled: true,
    horizontal_alignments: ['left', 'center', 'right'],
    vertical_alignments: ['top', 'middle', 'bottom'],
    scopes: ['row', 'col', 'rowgroup', 'colgroup'],
    max_span: 100,
    palette: ['primary', 'success', 'error', 'info', 'graphite', 'ink', 'paper', 'white'],
  },
  theme: { primary: '#FD971F', success: '#A6E22E', error: '#F92672', info: '#66D9EF', graphite: '#272822', ink: '#060606', paper: '#F8F8F2', white: '#FFFFFF' },
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
    expect(normalizeEmpty('<table><tbody><tr><td><p></p></td></tr></tbody></table>')).toContain('<table>')
  })

  it('keeps canonical table HTML stable', () => {
    const html = '<table><tbody><tr><th scope="col" data-rte-horizontal-align="center" data-rte-text-color="error"><p>Header</p></th></tr><tr><td colspan="2"><p>Value</p></td></tr></tbody></table>'
    const result = sanitizeHtml(html, options)

    expect(result.html).toBe(html)
    expect(result.changed).toBe(false)
  })

  it('canonicalizes legacy table alignment and palette colors', () => {
    const result = sanitizeHtml('<table border="1"><tr><td align="RIGHT" valign="TOP" bgcolor="#f8f8f2" style="color:#F92672;width:10px" nowrap><p>Cell</p></td></tr></table>', options)

    expect(result.html).toBe('<table><tbody><tr><td data-rte-horizontal-align="right" data-rte-vertical-align="top" data-rte-text-color="error" data-rte-background-color="paper"><p>Cell</p></td></tr></tbody></table>')
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })

  it('removes unsafe table values and reports unknown colors', () => {
    const result = sanitizeHtml('<table><tbody><tr><td colspan="101" rowspan="0" data-rte-text-color="magenta"><p>Cell</p></td></tr></tbody></table>', options)

    expect(result.html).toBe('<table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>')
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('magenta'))).toBe(true)
  })

  it('removes tables when the active profile disables them', () => {
    const result = sanitizeHtml('<table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>', { ...options, tables: { enabled: false } })

    expect(result.html).toBe('')
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('not allowed'))).toBe(true)
  })
})
