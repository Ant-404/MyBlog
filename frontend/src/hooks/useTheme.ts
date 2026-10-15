import { useEffect, useSyncExternalStore } from 'react'
import { useStoredPreference } from './useStoredPreference'

const modes = ['light', 'dark', 'system'] as const
const media = () => window.matchMedia('(prefers-color-scheme: dark)')
const subscribe = (listener: () => void) => {
  const query = media()
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

export function useTheme() {
  const [mode, setMode] = useStoredPreference('myblog-theme', 'system', modes)
  const systemDark = useSyncExternalStore(
    subscribe,
    () => media().matches,
    () => false,
  )
  const dark = mode === 'dark' || (mode === 'system' && systemDark)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])
  function toggle() {
    setMode(dark ? 'light' : 'dark')
  }
  return { dark, toggle, mode, setMode }
}
