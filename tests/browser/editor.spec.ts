import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { resolve } from 'node:path'

const basic = resolve('dist/rich-text-editor.js')
const enhanced = resolve('dist/rich-text-editor-with-code.js')
const styles = resolve('dist/rich-text-editor.css')

async function mount(page: Page, script: string) {
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Editor test</title></head><body>
    <main style="max-width:900px;margin:40px auto"><form><div data-rich-text-editor data-rte-options='{"toolbar":["heading","textAlign","|","bold","italic","link","image","colors","clearFormatting","table","|","codeView"],"headings":[2,3,4],"textAlignments":["left","center","right","justify"],"colors":{"enabled":true,"palette":["red","blue"]},"codeView":{"enabled":true,"format_button":true,"fullscreen":true},"links":{"schemes":["http","https","mailto","tel"],"allow_relative":true},"images":{"schemes":["http","https"],"alignments":["left","center","right"]},"tables":{"enabled":true,"horizontal_alignments":["left","center","right"],"vertical_alignments":["top","middle","bottom"],"scopes":["row","col","rowgroup","colgroup"],"max_span":100,"palette":["primary","success","error","info","graphite","ink","paper","white"]},"theme":{"primary":"#FD971F","success":"#A6E22E","error":"#F92672","info":"#66D9EF","graphite":"#272822","ink":"#060606","paper":"#F8F8F2","white":"#FFFFFF"}}'>
      <label for="content">Content</label><textarea id="content" name="content" data-rte-input><h2>Hello</h2><p>Editor content</p><img src="https://example.com/image.jpg" alt="Example"></textarea><div data-rte-mount></div>
    </div></form></main></body></html>`)
  await page.addStyleTag({ path: styles })
  await page.addScriptTag({ path: script })
  await expect(page.locator('.rte-shell')).toBeVisible()
}

test('basic bundle uses the textarea code view', async ({ page }) => {
  await mount(page, basic)
  await page.getByRole('button', { name: 'HTML code view' }).click()
  await expect(page.locator('.rte-code-textarea')).toBeVisible()
  await expect(page.locator('.cm-editor')).toHaveCount(0)
})

test('first submit synchronizes safe pasted HTML from visual and code views', async ({ page }) => {
  await mount(page, basic)
  const html = '<h2>Գաղտնիության քաղաքականություն</h2><p>Կապ՝ <a href="mailto:support@apricode.am">support@apricode.am</a></p>'
  await page.evaluate((content) => {
    const root = document.querySelector<HTMLElement>('[data-rich-text-editor]')!
    ;(window as any).RichTextEditor.create(root).setHTML(content)
  }, html)
  await expect(page.locator('[data-rte-input]')).toHaveValue(html)

  await page.getByRole('button', { name: 'HTML code view' }).click()
  const source = page.locator('.rte-code-textarea')
  await source.fill(html)
  await page.evaluate(() => {
    const form = document.querySelector('form')!
    ;(window as any).__submittedHtml = null
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      ;(window as any).__submittedHtml = new FormData(form).get('content')
    }, { once: true })
    form.requestSubmit()
  })

  await expect.poll(() => page.evaluate(() => (window as any).__submittedHtml)).toBe(html)
  await expect(page.locator('[data-rte-input]')).toHaveValue(html)
})

test('enhanced bundle provides a Monokai code editor and safe apply flow', async ({ page }) => {
  await mount(page, enhanced)
  await page.getByRole('button', { name: 'HTML code view' }).click()
  await expect(page.locator('.cm-editor')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Format HTML' })).toBeVisible()
  const source = page.locator('.cm-content')
  await source.click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.type('<p onclick="bad()">Safe</p>')
  await page.getByRole('button', { name: 'HTML code view' }).click()
  await expect(page.getByText('The HTML contains unsupported or unsafe markup.')).toBeVisible()
  await page.getByRole('button', { name: 'Apply sanitized HTML' }).click()
  await expect(page.locator('.rte-prose')).toContainText('Safe')
})

test('default editor has no serious accessibility violations', async ({ page }) => {
  await mount(page, enhanced)
  const results = await new AxeBuilder({ page }).exclude('.cm-editor').analyze()
  expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([])
})

test('text style control follows the block at the current selection', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright does not place a caret consistently in this scenario outside Chromium.')
  await mount(page, enhanced)
  const style = page.getByLabel('Text style')

  await page.locator('.rte-prose h2').click()
  await expect(style).toHaveValue('h2')

  await page.locator('.rte-prose p').first().click()
  await expect(style).toHaveValue('paragraph')
})

test('text alignment applies to every selected paragraph and heading', async ({ page }) => {
  await mount(page, enhanced)
  await page.getByText('Hello', { exact: true }).click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+ControlOrMeta+End')
  await page.getByLabel('Text alignment').selectOption('justify')

  await expect(page.locator('[data-rte-input]')).toHaveValue(/<h2 data-rte-text-align="justify">Hello<\/h2><p data-rte-text-align="justify">Editor content<\/p>/)
})

test('list markers remain visible when the host resets list styles', async ({ page }) => {
  await mount(page, enhanced)
  await page.addStyleTag({ content: 'ul, ol { list-style: none; }' })
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-rich-text-editor]')!
    ;(window as any).RichTextEditor.create(root).setHTML('<ul><li><p>Bullet</p></li></ul><ol><li><p>Number</p></li></ol>')
    const rendered = document.createElement('div')
    rendered.className = 'rte-content'
    rendered.innerHTML = '<ul><li>Rendered bullet</li></ul><ol><li>Rendered number</li></ol>'
    document.body.append(rendered)
  })

  await expect(page.locator('.rte-prose ul')).toHaveCSS('list-style-type', 'disc')
  await expect(page.locator('.rte-prose ol')).toHaveCSS('list-style-type', 'decimal')
  await expect(page.locator('.rte-content ul')).toHaveCSS('list-style-type', 'disc')
  await expect(page.locator('.rte-content ol')).toHaveCSS('list-style-type', 'decimal')
})

test('color picker applies allowlisted Tailwind 500 classes to selected text', async ({ page }) => {
  await mount(page, basic)
  await page.getByText('Hello', { exact: true }).click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.locator('[data-rte-command="colors"]').click()
  await page.getByRole('button', { name: 'Text color: red 500', exact: true }).click()
  await expect(page.locator('[data-rte-input]')).toHaveValue(/<span class="text-red-500">Hello<\/span>/)
  await page.getByText('Hello', { exact: true }).click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.locator('[data-rte-command="colors"]').click()
  await page.getByRole('button', { name: 'Background color: blue 500', exact: true }).click()

  await expect(page.locator('[data-rte-input]')).toHaveValue(/<span class="text-red-500"><span class="bg-blue-500">Hello<\/span><\/span>/)
})

test('image resize handle persists a responsive width with keyboard controls', async ({ page }) => {
  await mount(page, enhanced)
  const handle = page.getByRole('slider', { name: 'Resize image' })
  await handle.focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')

  await expect(handle).toHaveAttribute('aria-valuenow', '25')
  await expect(page.locator('[data-rte-input]')).toHaveValue(/style="width: 25%;"/)
  const box = await handle.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 100, box!.y + box!.height / 2)
  await page.mouse.up()
  await expect(handle).not.toHaveAttribute('aria-valuenow', '25')
  await page.getByRole('button', { name: 'HTML code view' }).click()
  await expect(page.locator('.cm-content')).toContainText(/width: \d+%/)
})

test('image dialog requires alternative text without a decorative option', async ({ page }) => {
  await mount(page, basic)
  await expect(page.getByRole('button', { name: 'Add image' }).locator('svg[data-rte-icon="image"]')).toHaveCount(1)
  const imageButton = await page.getByRole('button', { name: 'Add image' }).boundingBox()
  const imageIcon = await page.getByRole('button', { name: 'Add image' }).locator('svg[data-rte-icon="image"]').boundingBox()
  expect(Math.abs((imageButton!.x + imageButton!.width / 2) - (imageIcon!.x + imageIcon!.width / 2))).toBeLessThanOrEqual(1)
  expect(Math.abs((imageButton!.y + imageButton!.height / 2) - (imageIcon!.y + imageIcon!.height / 2))).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'Table', exact: true }).locator('svg[data-rte-icon="image"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Clear formatting' }).locator('svg[data-rte-icon="clear-formatting"]')).toHaveCount(1)
  const clearButton = await page.getByRole('button', { name: 'Clear formatting' }).boundingBox()
  const clearIcon = await page.getByRole('button', { name: 'Clear formatting' }).locator('svg[data-rte-icon="clear-formatting"]').boundingBox()
  expect(Math.abs((clearButton!.x + clearButton!.width / 2) - (clearIcon!.x + clearIcon!.width / 2))).toBeLessThanOrEqual(1)
  expect(Math.abs((clearButton!.y + clearButton!.height / 2) - (clearIcon!.y + clearIcon!.height / 2))).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'Add image' }).locator('svg[data-rte-icon="clear-formatting"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Add image' }).click()

  await expect(page.getByLabel('Alternative text')).toHaveAttribute('required', '')
  await expect(page.getByLabel('Decorative image')).toHaveCount(0)
  await expect(page.getByLabel('Image URL')).toBeVisible()
  await expect(page.getByLabel('Image file')).toHaveCount(0)
})

test('image dialog uploads a selected file on Apply and inserts the returned URL', async ({ page }) => {
  await mount(page, basic)
  await page.route('**/images/upload', async (route) => {
    const request = route.request()
    expect(request.method()).toBe('POST')
    expect(request.headers()['x-csrf-token']).toBe('test-token')
    expect(request.postDataBuffer()?.toString()).toContain('example.png')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: '/storage/example.png' }) })
  })
  await page.locator('[data-rich-text-editor]').evaluate((element) => {
    const meta = document.createElement('meta')
    meta.name = 'csrf-token'
    meta.content = 'test-token'
    document.head.append(meta)
    ;(window as any).RichTextEditor.destroy(element)
    const options = JSON.parse(element.getAttribute('data-rte-options') ?? '{}')
    options.images.upload_url = 'https://example.test/images/upload'
    element.setAttribute('data-rte-options', JSON.stringify(options))
    ;(window as any).RichTextEditor.scan(element.parentElement)
  })
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByLabel('Image file').setInputFiles({ name: 'example.png', mimeType: 'image/png', buffer: Buffer.from('png') })
  await page.getByLabel('Alternative text').fill('Uploaded example')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('.ProseMirror img[alt="Uploaded example"]')).toHaveAttribute('src', 'https://example.test/storage/example.png')
})

test('image upload shows Laravel validation errors and allows retry', async ({ page }) => {
  await mount(page, basic)
  let attempts = 0
  await page.route('**/images/upload', async (route) => {
    attempts++
    if (attempts === 1) {
      await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ errors: { image: ['The image must be a file of type: jpeg, png, webp.'] } }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: '/storage/retry.png' }) })
  })
  await page.locator('[data-rich-text-editor]').evaluate((element) => {
    ;(window as any).RichTextEditor.destroy(element)
    const options = JSON.parse(element.getAttribute('data-rte-options') ?? '{}')
    options.images.upload_url = 'https://example.test/images/upload'
    element.setAttribute('data-rte-options', JSON.stringify(options))
    ;(window as any).RichTextEditor.scan(element.parentElement)
  })
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByLabel('Image file').setInputFiles({ name: 'example.png', mimeType: 'image/png', buffer: Buffer.from('png') })
  await page.getByLabel('Alternative text').fill('Retry example')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('alert')).toHaveText('The image must be a file of type: jpeg, png, webp.')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('.ProseMirror img[alt="Retry example"]')).toHaveAttribute('src', 'https://example.test/storage/retry.png')
})

test('table dropdown inserts and edits a canonical table', async ({ page }) => {
  await mount(page, enhanced)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Insert 3 × 3 table' }).click()
  await expect(page.locator('.rte-prose th')).toHaveCount(3)
  await expect(page.locator('.rte-prose td')).toHaveCount(6)
  await expect(page.locator('.rte-prose th').first()).toHaveAttribute('scope', 'col')

  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByLabel('Table alignment').selectOption('center')
  await page.getByLabel('Text horizontal alignment').selectOption('center')
  await page.getByLabel('Text vertical alignment').selectOption('middle')
  await page.getByRole('button', { name: 'Cell text color: red 500' }).click()
  await page.getByRole('button', { name: 'Cell background color: blue 500' }).click()
  await expect(page.locator('[data-rte-input]')).toHaveValue(/data-rte-table-align="center"/)
  await expect(page.locator('[data-rte-input]')).toHaveValue(/data-rte-horizontal-align="center"/)
  await expect(page.locator('[data-rte-input]')).toHaveValue(/data-rte-text-color="red"/)
  await expect(page.locator('[data-rte-input]')).toHaveValue(/data-rte-background-color="blue"/)

  await page.getByRole('button', { name: 'Add row after' }).click()
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Add column after' }).click()
  await expect(page.locator('.rte-prose tr')).toHaveCount(4)
  await expect(page.locator('.rte-prose tr').first().locator('th,td')).toHaveCount(4)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Toggle header row' }).click()
  await expect(page.locator('.rte-prose tr').first().locator('th')).toHaveCount(0)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Toggle header row' }).click()

  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.rte-table-menu')).toBeHidden()
  await page.getByRole('button', { name: 'HTML code view' }).click()
  await expect(page.locator('.cm-content')).toContainText('<table')
  await page.getByRole('button', { name: 'HTML code view' }).click()
  await expect(page.getByText('The HTML contains unsupported or unsafe markup.')).toHaveCount(0)
})

test('table tools stay inside the editor when the toolbar wraps', async ({ page }) => {
  await mount(page, enhanced)
  await page.locator('main').evaluate((element) => {
    element.style.width = '520px'
    element.style.marginLeft = '220px'
    element.style.marginRight = '0'
  })

  await page.getByRole('button', { name: 'Table', exact: true }).click()

  const editorLeft = await page.locator('.rte-shell').evaluate((element) => element.getBoundingClientRect().left)
  const menuLeft = await page.locator('.rte-table-menu').evaluate((element) => element.getBoundingClientRect().left)
  expect(menuLeft).toBeGreaterThanOrEqual(editorLeft)
})

test('table width supports exact values, keyboard resizing, drag, and full width', async ({ page }) => {
  await mount(page, enhanced)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Insert 3 × 3 table' }).click()

  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByLabel('Table width').selectOption('75')
  await expect(page.locator('[data-rte-input]')).toHaveValue(/<table data-rte-width="75">/)
  await page.getByRole('button', { name: 'Table', exact: true }).click()

  const handle = page.getByRole('slider', { name: 'Resize table' })
  await handle.focus()
  await expect(handle).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(handle).toHaveAttribute('aria-valuenow', '70')
  await expect(page.locator('[data-rte-input]')).toHaveValue(/data-rte-width="70"/)

  const box = await handle.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 - 100, box!.y + box!.height / 2)
  await page.mouse.up()
  await expect(handle).not.toHaveAttribute('aria-valuenow', '70')

  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByLabel('Table width').selectOption('')
  await expect(page.locator('[data-rte-input]')).not.toHaveValue(/data-rte-width/)
  await expect(handle).toHaveAttribute('aria-valuenow', '100')
})

test('table menu inserts a 4 × 4 table without a duplicate full-width action', async ({ page }) => {
  await mount(page, enhanced)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Full width' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Insert 4 × 4 table' }).click()

  await expect(page.locator('.rte-prose th')).toHaveCount(4)
  await expect(page.locator('.rte-prose td')).toHaveCount(12)
})

test('table supports cell selection, merge, split, delete, and keyboard navigation', async ({ page }) => {
  await mount(page, enhanced)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Insert 3 × 3 table' }).click()
  const cells = page.locator('.rte-prose th, .rte-prose td')
  await cells.nth(3).click()
  await cells.nth(4).click({ modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Merge cells' }).click()
  await expect(page.locator('[data-rte-input]')).toHaveValue(/colspan="2"/)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Split cell' }).click()
  await expect(page.locator('[data-rte-input]')).not.toHaveValue(/colspan="2"/)

  await cells.nth(3).click()
  const before = await page.evaluate(() => (document.getSelection()?.anchorNode?.parentElement?.closest('th,td') as HTMLTableCellElement | null)?.cellIndex)
  await page.keyboard.press('Tab')
  const after = await page.evaluate(() => (document.getSelection()?.anchorNode?.parentElement?.closest('th,td') as HTMLTableCellElement | null)?.cellIndex)
  expect(after).not.toBe(before)
  await page.keyboard.press('Shift+Tab')

  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Delete table' }).click()
  await expect(page.locator('.rte-prose table')).toHaveCount(0)
})

test('responsive table stays inside a mobile viewport and scrolls horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 })
  await mount(page, basic)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Insert 3 × 3 table' }).click()

  const dimensions = await page.locator('.rte-prose table').evaluate((table) => ({ client: table.clientWidth, scroll: table.scrollWidth }))
  expect(dimensions.scroll).toBeGreaterThanOrEqual(dimensions.client)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

test('multiple editors initialize once and a Livewire morph synchronizes only its scope', async ({ page }) => {
  await page.setContent(`<!doctype html><html><body>
    <div id="first" data-rich-text-editor><textarea data-rte-input><p>First</p></textarea><div data-rte-mount></div></div>
    <div id="second" data-rich-text-editor data-rte-livewire><textarea data-rte-input><p>Second</p></textarea><div data-rte-mount></div></div>
  </body></html>`)
  await page.evaluate(() => {
    const hooks: Record<string, (payload: unknown) => void> = {}
    ;(window as any).__livewireHooks = hooks
    ;(window as any).Livewire = { hook: (name: string, callback: (payload: unknown) => void) => { hooks[name] = callback } }
  })
  await page.addStyleTag({ path: styles })
  await page.addScriptTag({ path: enhanced })
  await expect(page.locator('.rte-shell')).toHaveCount(2)

  await page.evaluate(() => {
    const first = document.querySelector<HTMLTextAreaElement>('#first [data-rte-input]')!
    const second = document.querySelector<HTMLTextAreaElement>('#second [data-rte-input]')!
    first.value = '<p>Must not synchronize</p>'
    second.value = '<p>Morphed</p>'
    ;(window as any).__livewireHooks['morph.updated']({ el: document.body })
  })
  await expect(page.locator('#second .rte-prose')).toContainText('Morphed')
  await expect(page.locator('#first .rte-prose')).toContainText('First')
  await expect(page.locator('[data-rte-script]')).toHaveCount(0)
})
