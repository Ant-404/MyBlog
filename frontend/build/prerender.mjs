import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const api = (process.env.PRERENDER_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '')
const output = resolve(process.env.PRERENDER_OUTPUT_DIR || 'dist')
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  )
async function get(path) {
  const response = await fetch(api + path, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`预渲染读取失败 ${path}: ${response.status}`)
  const body = await response.json()
  if (!body.data) throw new Error(`接口缺少数据: ${path}`)
  return body.data
}
const template = await readFile(join(output, 'index.html'), 'utf8')
const site = await get('/site/settings')
const origin = new URL(process.env.PUBLIC_SITE_URL || site.publicUrl)
if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('站点地址必须为 HTTP/HTTPS')
function html(path, title, description, cover, article = false) {
  const url = new URL(path, origin).href
  const image = new URL(cover || '/images/log.jpg', origin).href
  const fullTitle = `${title} · ${site.name}`
  return template
    .replace(/<title>.*?<\/title>/s, `<title>${escape(fullTitle)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${escape(description)}">`,
    )
    .replace(
      '</head>',
      `<link rel="canonical" href="${escape(url)}"><meta property="og:title" content="${escape(fullTitle)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="${article ? 'article' : 'website'}"><meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(fullTitle)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(image)}"></head>`,
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root"><main><h1>${escape(title)}</h1><p>${escape(description)}</p></main></div>`,
    )
}
// Generate all files in memory first, so API failure never leaves a partially generated site.
const pages = [{ path: '/', content: html('/', site.name, site.description, '') }]
for (let page = 1; ; page++) {
  const result = await get(`/posts?page=${page}&size=50`)
  for (const post of result.items) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) throw new Error('不支持的文章地址')
    pages.push({
      path: `/posts/${post.slug}`,
      content: html(`/posts/${post.slug}`, post.title, post.excerpt, post.cover, true),
    })
  }
  if (page * result.size >= result.total) break
  if (page >= 10000 || !result.items.length) throw new Error('文章分页数据异常')
}
for (const page of pages) {
  const folder = join(output, page.path)
  await mkdir(folder, { recursive: true })
  await writeFile(join(folder, 'index.html'), page.content)
}
console.log(
  `已预渲染首页和 ${pages.length - 1} 篇公开文章的 SEO/分享信息。文章正文继续由 API 加载。`,
)
