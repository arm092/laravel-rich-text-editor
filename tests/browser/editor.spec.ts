import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { resolve } from 'node:path'

const basic = resolve('dist/rich-text-editor.js')
const enhanced = resolve('dist/rich-text-editor-with-code.js')
const styles = resolve('dist/rich-text-editor.css')

async function mount(page: Page, script: string) {
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Editor test</title></head><body>
    <main style="max-width:900px;margin:40px auto"><form><div data-rich-text-editor data-rte-options='{"toolbar":["heading","|","bold","italic","link","image","|","codeView"],"headings":[2,3,4],"codeView":{"enabled":true,"format_button":true,"fullscreen":true},"links":{"schemes":["http","https"],"allow_relative":true},"images":{"schemes":["http","https"],"alignments":["left","center","right"]}}'>
      <label for="content">Content</label><textarea id="content" name="content" data-rte-input><h2>Hello</h2><p>Editor content</p></textarea><div data-rte-mount></div>
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
