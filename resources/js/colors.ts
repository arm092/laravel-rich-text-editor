export type TailwindColor = { name: string; value: string }

const FALLBACK_500: Record<string, string> = {
  white: '#ffffff',
  slate: '#62748e', gray: '#6a7282', zinc: '#71717b',
  neutral: '#737373', stone: '#79716b', mauve: '#79697b',
  olive: '#7c7c67', mist: '#67787c', taupe: '#7c6d67',
  red: '#fb2c36', orange: '#fe6e00', amber: '#f99c00',
  yellow: '#edb200', lime: '#80cd00', green: '#00c758',
  emerald: '#00bb7f', teal: '#00baa7', cyan: '#00b7d7',
  sky: '#00a5ef', blue: '#3080ff', indigo: '#625fff',
  violet: '#8d54ff', purple: '#ac4bff', fuchsia: '#e12afb',
  pink: '#f6339a', rose: '#ff2357',
}

export function resolveTailwind500Colors(palette: string[]): TailwindColor[] {
  const styles = getComputedStyle(document.documentElement)
  const hasDeclaredThemeColor = Array.from({ length: styles.length }, (_, index) => styles.item(index))
    .some((name) => /^--color-[a-z0-9-]+-500$/.test(name))
  const declared = palette.flatMap((name) => {
    if (name === 'white') return [{ name, value: '#ffffff' }]
    const value = styles.getPropertyValue(`--color-${name}-500`).trim()
    return value ? [{ name, value }] : []
  })

  return hasDeclaredThemeColor
    ? declared
    : palette.flatMap((name) => FALLBACK_500[name] ? [{ name, value: FALLBACK_500[name] }] : [])
}
