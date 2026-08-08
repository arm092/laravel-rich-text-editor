import css from '../css/editor.css?inline'

export function ensureStyles(): void {
  if (document.querySelector('[data-rte-styles]')) return

  const style = document.createElement('style')
  style.dataset.rteStyles = 'injected'
  style.textContent = css
  document.head.append(style)
}
