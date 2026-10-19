import sharp from 'sharp'
import { readdir, mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'

const root = resolve('public/images')
const folder = join(root, 'optimized')
await mkdir(folder, { recursive: true })
const manifest = {}
let originals = 0,
  mobile = 0
for (const file of await readdir(root)) {
  if (!/^home\d*\.(jpe?g|png|webp|avif)$/i.test(file)) continue
  const input = await readFile(join(root, file))
  const hash = createHash('sha256').update(input).digest('hex').slice(0, 12)
  const { width = 1920 } = await sharp(input).metadata()
  const widths = [...new Set([640, 1280, 1920].map((w) => Math.min(w, width)))].sort(
    (a, b) => a - b,
  )
  const formats = {}
  for (const format of ['avif', 'webp']) {
    const sources = []
    for (const size of widths) {
      const name = `${hash}-${size}.${format}`
      const path = join(folder, name)
      const exists = await stat(path).then(
        () => true,
        () => false,
      )
      if (!exists)
        await sharp(input)
          .rotate()
          .resize({ width: size, withoutEnlargement: true })
          .toFormat(format, { quality: format === 'avif' ? 50 : 78 })
          .toFile(path)
      sources.push(`/images/optimized/${name} ${size}w`)
      if (format === 'webp' && size === widths[0]) mobile += (await stat(path)).size
    }
    formats[format] = sources.join(', ')
  }
  originals += input.length
  manifest[`/images/${encodeURIComponent(file)}`] = formats
}
await writeFile(join(folder, 'manifest.json'), JSON.stringify(manifest))
console.log(
  `横幅图片已优化：原图 ${(originals / 1024).toFixed(0)} KB，手机 WebP 合计 ${(mobile / 1024).toFixed(0)} KB。`,
)
