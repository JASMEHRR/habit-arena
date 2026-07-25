import { useEffect, useRef, useState } from 'react'

// The CSS guard in base.css stops every declarative animation, but confetti and
// the count-up tween are driven from JS and have to ask.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// Counts up to `value`. Respects reduced motion by simply showing the number,
// which the old AnimatedNumber component did not.
export function useCountUp(value, duration = 460) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      fromRef.current = value
      return
    }
    const from = fromRef.current
    if (from === value) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduced])

  return display
}

// Theme: follow the OS unless the user has chosen. The scene genuinely needs
// both — this is a phone used at 11pm in bed and at 7am in daylight.
//
// `data-theme` on <html> is always a resolved value, never "system". The
// stylesheet used to carry a prefers-color-scheme media query *and* two
// attribute blocks, and the interplay between them left `body`'s colour resolved
// against the wrong --ink: the score and stat numbers came out cream on cream in
// the paper scheme. One attribute, written here and pre-set by the inline script
// in index.html, is the whole mechanism now.
export const THEME_KEY = 'habit-arena.theme'

function systemScheme() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function useTheme() {
  // The user's preference: 'system' | 'light' | 'dark'.
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    const apply = () =>
      document.documentElement.setAttribute(
        'data-theme',
        theme === 'system' ? systemScheme() : theme
      )
    apply()
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* private mode: the theme just won't persist */
    }
    // While on 'system', track the OS flipping (sunset, or a scheduled switch).
    if (theme !== 'system' || typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  return [theme, setTheme]
}
