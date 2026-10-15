import { useCallback, useSyncExternalStore } from 'react'

const preferenceEvent = 'myblog-preference-change'
const temporaryPreferences = new Map<string, string>()

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(preferenceEvent, listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(preferenceEvent, listener)
  }
}

/** Share preferences between components/tabs; storage restrictions must not break the page. */
export function useStoredPreference<T extends string>(
  key: string,
  fallback: T,
  choices: readonly T[],
) {
  const read = useCallback((): T => {
    try {
      const saved = (temporaryPreferences.get(key) || localStorage.getItem(key)) as T | null
      return saved && choices.includes(saved) ? saved : fallback
    } catch {
      return fallback
    }
  }, [key, fallback, choices])
  const value = useSyncExternalStore(subscribe, read, () => fallback)
  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next)
        temporaryPreferences.delete(key)
      } catch {
        temporaryPreferences.set(key, next)
      }
      window.dispatchEvent(new Event(preferenceEvent))
    },
    [key],
  )
  return [value, setValue] as const
}
