import { useEffect } from 'react'
import { useSite } from '../contexts/SiteContext'
import { useLocation } from 'react-router-dom'

export function usePageTitle(
  title: string,
  options?: { description?: string; image?: string; article?: boolean },
) {
  const site = useSite()
  const { pathname, search } = useLocation()
  useEffect(() => {
    document.title = `${title} · ${site.name}`
    const description = options?.description || site.description
    function meta(name: string, content: string, property = false) {
      const attribute = property ? 'property' : 'name'
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, name)
        document.head.append(element)
      }
      element.content = content
    }
    const url = new URL(pathname, site.publicUrl).href
    const privatePage = pathname.startsWith('/admin')
    meta('description', description)
    meta('robots', privatePage || !!search ? 'noindex,follow' : 'index,follow')
    meta('og:title', document.title, true)
    meta('og:description', description, true)
    meta('og:type', options?.article ? 'article' : 'website', true)
    meta('og:url', url, true)
    meta('og:site_name', site.name, true)
    meta('twitter:card', 'summary_large_image')
    meta('twitter:title', document.title)
    meta('twitter:description', description)
    const image = new URL(options?.image || '/images/log.jpg', site.publicUrl).href
    meta('og:image', image, true)
    meta('twitter:image', image)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = url
  }, [
    title,
    site.name,
    site.description,
    site.publicUrl,
    pathname,
    search,
    options?.description,
    options?.image,
    options?.article,
  ])
}
