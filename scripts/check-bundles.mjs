import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const files = [
  ['dist/rich-text-editor.js', 160 * 1024],
  ['dist/rich-text-editor-with-code.js', 400 * 1024],
]

for (const [file, budget] of files) {
  const source = await readFile(file)
  const size = gzipSync(source).byteLength
  if (size > budget) throw new Error(`${file} is ${size} bytes gzipped, exceeding its ${budget}-byte budget.`)
}

const basic = (await readFile('dist/rich-text-editor.js')).toString()
for (const marker of ['CodeMirror', 'selectNextOccurrence', 'foldGutter']) {
  if (basic.includes(marker)) throw new Error(`The basic bundle contains enhanced code-view marker: ${marker}`)
}

console.log('Bundle boundaries and gzip budgets are valid.')
