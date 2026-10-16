import { marked } from 'marked'
import DOMPurify from 'dompurify'

export function renderComment(content: string): string {
  const container = document.createElement('div')
  container.innerHTML = DOMPurify.sanitize(marked.parse(content, { async: false, breaks: true }), {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'del',
      's',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
  })
  container.querySelectorAll('a,img').forEach((element) => {
    const attribute = element.tagName === 'IMG' ? 'src' : 'href'
    try {
      const value = element.getAttribute(attribute)
      if (!value) throw new Error()
      const url = new URL(value, window.location.origin)
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
        throw new Error()
      element.setAttribute(attribute, url.href)
      if (element instanceof HTMLImageElement) {
        element.loading = 'lazy'
        element.referrerPolicy = 'no-referrer'
      } else {
        element.setAttribute('target', '_blank')
        element.setAttribute('rel', 'nofollow ugc noopener noreferrer')
      }
    } catch {
      element.replaceWith(
        document.createTextNode(element.textContent || element.getAttribute('alt') || ''),
      )
    }
  })
  return container.innerHTML
}
