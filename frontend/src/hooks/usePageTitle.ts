import { useEffect } from 'react'
import { useSite } from '../contexts/SiteContext'
export function usePageTitle(title: string) {
  const site = useSite()
  useEffect(() => {
    document.title = `${title} · ${site.name}`
  }, [title, site.name])
}
