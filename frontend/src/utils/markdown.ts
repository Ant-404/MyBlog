import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import java from 'highlight.js/lib/languages/java'
import sql from 'highlight.js/lib/languages/sql'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
for (const [name, grammar] of Object.entries({
  javascript,
  typescript,
  java,
  sql,
  css,
  xml,
  bash,
  json,
}))
  hljs.registerLanguage(name, grammar)

/** Keep the editor preview and public article rendering consistent. */
export function renderMarkdown(content: string): string {
  const container = document.createElement('div')
  container.innerHTML = DOMPurify.sanitize(marked.parse(content, { async: false }) as string)
  container.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading, index) => {
    heading.id = `article-heading-${index + 1}`
  })
  container.querySelectorAll('pre code').forEach((code) => {
    const language = [...code.classList].find((name) => name.startsWith('language-'))?.slice(9)
    if (language && hljs.getLanguage(language)) {
      code.innerHTML = hljs.highlight(code.textContent || '', { language }).value
      code.classList.add('hljs')
    }
  })
  return container.innerHTML
}
