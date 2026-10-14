import { useEffect, useState } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('myblog-theme')
    return saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])
  function toggle() {
    setDark((value) => {
      localStorage.setItem('myblog-theme', value ? 'light' : 'dark')
      return !value
    })
  }
  return { dark, toggle }
}
