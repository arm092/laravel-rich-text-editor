import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const enhanced = mode === 'with-code'
  const outputName = enhanced ? 'rich-text-editor-with-code' : 'rich-text-editor'

  return {
    plugins: [tailwindcss()],
    build: {
      emptyOutDir: !enhanced,
      target: 'es2020',
      minify: 'oxc',
      lib: {
        entry: resolve(import.meta.dirname, enhanced ? 'resources/js/with-code.ts' : 'resources/js/main.ts'),
        name: 'RichTextEditorBundle',
        formats: ['iife'],
        fileName: () => `${outputName}.js`,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['tests/js/setup.ts'],
      include: ['tests/js/**/*.test.ts'],
    },
  }
})
