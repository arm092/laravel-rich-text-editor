import { afterEach } from 'vitest'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserverStub, writable: true })
Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, writable: true })

if (!document.createRange) {
  document.createRange = () => ({
    setStart: () => undefined,
    setEnd: () => undefined,
    getBoundingClientRect: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }),
    getClientRects: () => [],
  }) as unknown as Range
}

afterEach(() => {
  document.body.innerHTML = ''
  document.head.querySelectorAll('[data-rte-styles="injected"]').forEach((element) => element.remove())
})
