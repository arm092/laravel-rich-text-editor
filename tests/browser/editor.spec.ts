import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { resolve } from 'node:path'

const basic = resolve('dist/rich-text-editor.js')
const enhanced = resolve('dist/rich-text-editor-with-code.js')
const styles = resolve('dist/rich-text-editor.css')

async function mount(page: Page, script: string) {
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Editor test</title></head><body>
    <main style="max-width:900px;margin:40px auto"><form><div data-rich-text-editor data-rte-options='{"toolbar":["heading","|","bold","italic","link","image","table","|","codeView"],"headings":[2,3,4],"codeView":{"enabled":true,"format_button":true,"fullscreen":true},"links":{"schemes":["http","https"],"allow_relative":true},"images":{"schemes":["http","https"],"alignments":["left","center","right"]},"tables":{"enabled":true,"horizontal_alignments":["left","center","right"],"vertical_alignments":["top","middle","bottom"],"scopes":["row","col","rowgroup","colgroup"],"max_span":100,"palette":["primary","success","error","info","graphite","ink","paper","white"]},"theme":{"primary":"#FD971F","success":"#A6E22E","error":"#F92672","info":"#66D9EF","graphite":"#272822","ink":"#060606","paper":"#F8F8F2","white":"#FFFFFF"}}'>
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

test('table dropdown inserts and edits a canonical table', async ({ page }) => {
  await mount(page, enhanced)
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByRole('button', { name: 'Insert 3 × 3 table' }).click()
  await expect(page.locator('.rte-prose th')).toHaveCount(3)
  await expect(page.locator('.rte-prose td')).toHaveCount(6)
  await expect(page.locator('.rte-prose th').first()).toHaveAttribute('scope', 'col')

  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await page.getByLabel('Horizontal alignment').selectOption('center')
  await page.getByLabel('Vertical alignment').selectOption('middle')
  await page.getByLabel('Text color').selectOption('error')
  await page.getByLabel('Background color').selectOption('paper')
  await expect(page.locator('[data-rte-input]')).toHaveValue(/data-rte-horizontal-align="center"/)
  await expect(page.locator('[data-rte-input]')).toHaveValue(/data-rte-background-color="paper"/)

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
  await expect(page.locator('.cm-content')).toContainText('<table>')
  await page.getByRole('button', { name: 'HTML code view' }).click()
  await expect(page.getByText('The HTML contains unsupported or unsafe markup.')).toHaveCount(0)
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
    <div id="second" data-rich-text-editor><textarea data-rte-input><p>Second</p></textarea><div data-rte-mount></div></div>
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
    const second = document.querySelector<HTMLTextAreaElement>('#second [data-rte-input]')!
    second.value = '<p>Morphed</p>'
    ;(window as any).__livewireHooks['morph.updated']({ el: document.querySelector('#second') })
  })
  await expect(page.locator('#second .rte-prose')).toContainText('Morphed')
  await expect(page.locator('#first .rte-prose')).toContainText('First')
  await expect(page.locator('[data-rte-script]')).toHaveCount(0)
})
