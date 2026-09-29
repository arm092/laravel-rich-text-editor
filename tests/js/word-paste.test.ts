import { describe, expect, it } from 'vitest'
import { normalizeWordListHtml } from '../../resources/js/word-paste'

describe('Microsoft Word list paste normalization', () => {
  it('converts consecutive Word list paragraphs into semantic lists', () => {
    const html = '<p class="MsoListParagraph" style="text-align:justify;mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">•<span>&nbsp; </span></span><strong>Առաջին</strong></p>'
      + '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">•<span>&nbsp; </span></span>Երկրորդ</p>'

    const normalized = normalizeWordListHtml(html)
    const document = new DOMParser().parseFromString(normalized, 'text/html')

    expect(document.querySelectorAll('ul > li')).toHaveLength(2)
    expect(document.querySelector('ul strong')?.textContent).toBe('Առաջին')
    expect(document.querySelector<HTMLElement>('ul p')?.style.textAlign).toBe('justify')
    expect(document.body.textContent).not.toContain('•')
  })

  it('keeps ordinary bullet-like paragraphs unchanged without Word metadata', () => {
    const html = '<p>• This is intentional prose.</p>'

    expect(normalizeWordListHtml(html)).toBe(html)
  })
})
