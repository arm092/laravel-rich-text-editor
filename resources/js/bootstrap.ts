import { createEditor, destroyEditor, scanEditors } from './editor'
import { ensureStyles } from './styles'
import type { CodeViewFactory, EditorOptions } from './types'

declare global {
  interface Window {
    RichTextEditor?: ReturnType<typeof bootstrap>
    Alpine?: { data(name: string, callback: () => Record<string, unknown>): void }
    Livewire?: { hook(name: string, callback: (payload: any) => void): void }
  }
}

export function bootstrap(factory: CodeViewFactory) {
  ensureStyles()
  const api = {
    create: (element: HTMLElement | string, options: EditorOptions = {}) => {
      const target = typeof element === 'string' ? document.querySelector<HTMLElement>(element) : element
      if (!target) throw new Error('RichTextEditor.create() could not find the target element.')
      return createEditor(target, factory, options)
    },
    destroy: (element: HTMLElement | string) => {
      const target = typeof element === 'string' ? document.querySelector<HTMLElement>(element) : element
      if (target) destroyEditor(target)
    },
    scan: (root: ParentNode = document) => scanEditors(root, factory),
  }

  const registerAlpine = () => window.Alpine?.data('richTextEditor', () => ({
    init() { api.create((this as any).$el) },
    destroy() { api.destroy((this as any).$el) },
  }))
  document.addEventListener('alpine:init', registerAlpine, { once: true })
  if (window.Alpine) registerAlpine()

  const start = () => api.scan(document)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
  document.addEventListener('livewire:navigated', start)

  let livewireHookRegistered = false
  const registerLivewire = () => {
    if (livewireHookRegistered || !window.Livewire?.hook) return
    livewireHookRegistered = true
    window.Livewire.hook('morph.updated', (payload: any) => {
      const scope: ParentNode = payload?.el instanceof Element ? payload.el : document
      api.scan(scope)
      const editors = scope instanceof HTMLElement && scope.matches('[data-rich-text-editor]')
        ? [scope]
        : [...scope.querySelectorAll<HTMLElement>('[data-rich-text-editor]')]
      queueMicrotask(() => editors.forEach((element) => element.dispatchEvent(new CustomEvent('rte:sync'))))
    })
  }
  document.addEventListener('livewire:init', registerLivewire, { once: true })
  registerLivewire()

  window.RichTextEditor = api
  return api
}
