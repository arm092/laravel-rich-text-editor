import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })
await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Laravel Rich Text Editor</title></head>
<body style="margin:0;background:#F8F8F2;color:#272822;font-family:Inter,system-ui,sans-serif">
<main style="max-width:1160px;margin:0 auto;padding:54px 32px 70px">
  <p style="margin:0 0 8px;color:#FD971F;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:12px">Laravel Rich Text Editor</p>
  <h1 style="margin:0 0 10px;color:#060606;font-size:38px;letter-spacing:-.035em">Write visually. Refine the HTML.</h1>
  <p style="margin:0 0 32px;color:#66675f">A secure, profile-driven editor for Blade, Alpine.js, and Livewire.</p>
  <section style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
    <div><p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase">Visual editor</p><div id="visual" data-rich-text-editor data-rte-options='{"toolbar":["undo","redo","|","heading","|","bold","italic","underline","strike","link","image","|","codeView"],"headings":[2,3,4],"codeView":{"enabled":true},"links":{"schemes":["http","https"],"allow_relative":true},"images":{"schemes":["http","https"],"alignments":["left","center","right"]}}'><textarea data-rte-input><h2>Elegant content editing</h2><p>Build expressive documents with <strong>safe semantic HTML</strong>, modern controls, and predictable Laravel persistence.</p><blockquote>One editor. Blade, Livewire, and standalone JavaScript.</blockquote><ul><li>Profile-driven formatting</li><li>Server-side sanitization</li></ul></textarea><div data-rte-mount></div></div></div>
    <div><p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase">Enhanced code view</p><div id="code" data-rich-text-editor data-rte-options='{"toolbar":["heading","bold","italic","|","codeView"],"headings":[2,3,4],"codeView":{"enabled":true,"format_button":true,"fullscreen":true},"links":{"schemes":["http","https"],"allow_relative":true},"images":{"schemes":["http","https"],"alignments":["left","center","right"]}}'><textarea data-rte-input><h2>Clean HTML</h2><p class="ignored">Inspect tags, attributes, and values with a custom Monokai palette.</p><a href="https://laravel.com">Laravel</a></textarea><div data-rte-mount></div></div></div>
  </section>
</main></body></html>`)
await page.addStyleTag({ path: resolve('dist/rich-text-editor.css') })
await page.addScriptTag({ path: resolve('dist/rich-text-editor-with-code.js') })
await page.locator('#code').getByRole('button', { name: 'HTML code view' }).click()
await page.locator('#code').getByRole('button', { name: 'Format HTML' }).click()
await mkdir(resolve('docs/images'), { recursive: true })
await page.screenshot({ path: resolve('docs/images/editor-preview.png'), fullPage: true })
await browser.close()
