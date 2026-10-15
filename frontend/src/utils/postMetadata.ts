import { marked } from 'marked'
import DOMPurify from 'dompurify'

export function readingStats(content: string) {
  const document = new DOMParser().parseFromString(
    DOMPurify.sanitize(marked.parse(content, { async: false })),
    'text/html',
  )
  const words = (document.body.textContent?.match(/[\p{L}\p{N}]/gu) || []).length
  return { words, minutes: Math.max(1, Math.min(240, Math.ceil(words / 400))) }
}
