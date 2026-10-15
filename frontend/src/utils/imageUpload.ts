const maxBytes = 5 * 1024 * 1024
const maxPixels = 20_000_000

/** Detect bytes rather than trusting extensions: some downloaded .jpg files are WebP. */
export async function prepareImageUpload(file: File, onConvert: () => void): Promise<File> {
  if (file.size === 0) throw new Error('图片文件为空')
  if (file.size > maxBytes) throw new Error('图片不能超过 5MB')
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255
  const stem = file.name.replace(/\.[^.]+$/, '') || 'image'
  if (png || jpeg) {
    const type = png ? 'image/png' : 'image/jpeg'
    const correctName = png ? /\.png$/i.test(file.name) : /\.jpe?g$/i.test(file.name)
    return correctName && file.type === type
      ? file
      : new File([file], `${stem}.${png ? 'png' : 'jpg'}`, { type })
  }

  onConvert()
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(
      '浏览器无法读取这张图片，请先用图片工具导出为 PNG 或 JPEG（HEIC、PSD 等格式可能不支持）',
    )
  }
  try {
    if (!bitmap.width || !bitmap.height) throw new Error('图片尺寸无效')
    if (bitmap.width * bitmap.height > maxPixels) throw new Error('图片像素总数不能超过 2000 万')
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器无法转换图片，请换用最新版浏览器')
    context.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error('图片转换失败，请导出为 PNG 后重试')),
        'image/png',
      )
    })
    if (blob.size > maxBytes) throw new Error('转换后的 PNG 超过 5MB，请缩小图片尺寸后重试')
    return new File([blob], `${stem}.png`, { type: 'image/png' })
  } finally {
    bitmap.close()
  }
}
