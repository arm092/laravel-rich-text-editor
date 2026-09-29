const WORD_HTML_PATTERN = /(?:mso-list|MsoListParagraph|urn:schemas-microsoft-com:office|Microsoft Word)/i
const ORDERED_MARKER_PATTERN = /^\s*(?:\d+|[a-z]|[ivxlcdm]+)[.)]\s*/i
const BULLET_MARKER_PATTERN = /^\s*[•·○◦▪■‣⁃–—-]\s*/

type WordListItem = {
  key: string
  ordered: boolean
  marker: HTMLElement | null
}

function listItem(element: HTMLElement): WordListItem | null {
  const style = element.getAttribute('style') ?? ''
  const className = element.getAttribute('class') ?? ''
  if (!/mso-list/i.test(style) && !/\bMsoListParagraph/i.test(className)) return null

  const list = style.match(/mso-list:\s*([^\s;]+)(?:\s+level(\d+))?(?:\s+([^\s;]+))?/i)
  const marker = [...element.querySelectorAll<HTMLElement>('span')]
    .find((span) => /mso-list\s*:\s*Ignore/i.test(span.getAttribute('style') ?? '')) ?? null
  const markerText = (marker?.textContent ?? element.textContent ?? '').replace(/\u00a0/g, ' ').trimStart()
  const ordered = ORDERED_MARKER_PATTERN.test(markerText)
  const listId = list?.[1] ?? 'word-list'
  const level = list?.[2] ?? '1'
  const instance = list?.[3] ?? ''

  return { key: `${listId}:${level}:${instance}:${ordered ? 'ol' : 'ul'}`, ordered, marker }
}

function removeMarker(paragraph: HTMLElement, marker: HTMLElement | null): void {
  if (marker) {
    marker.remove()
    return
  }

  const walker = paragraph.ownerDocument.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
  const text = walker.nextNode() as Text | null
  if (!text) return
  text.data = text.data.replace(ORDERED_MARKER_PATTERN, '').replace(BULLET_MARKER_PATTERN, '')
}

function normalizeContainer(container: HTMLElement): void {
  let activeList: HTMLUListElement | HTMLOListElement | null = null
  let activeKey = ''

  for (const child of [...container.children] as HTMLElement[]) {
    if (child.tagName !== 'P') {
      activeList = null
      activeKey = ''
      normalizeContainer(child)
      continue
    }

    const item = listItem(child)
    if (!item) {
      activeList = null
      activeKey = ''
      continue
    }

    removeMarker(child, item.marker)
    if (!activeList || activeKey !== item.key) {
      activeList = document.createElement(item.ordered ? 'ol' : 'ul')
      activeKey = item.key
      child.before(activeList)
    }

    const listItemElement = document.createElement('li')
    listItemElement.append(child)
    activeList.append(listItemElement)
  }
}

export function normalizeWordListHtml(html: string): string {
  if (!WORD_HTML_PATTERN.test(html)) return html

  const document = new DOMParser().parseFromString(html, 'text/html')
  normalizeContainer(document.body)

  return document.body.innerHTML
}
