import { test, expect } from '@playwright/test'
import { login, adminMutation } from './helpers/admin'

test('image formats convert before upload, retain transparency and reject unreadable files', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/media')
  const webp = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 2
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ff0000'
    context.fillRect(0, 0, 1, 1)
    return canvas.toDataURL('image/webp').split(',')[1]
  })
  const ids: number[] = []
  try {
    for (const name of ['converted.webp', 'disguised.jpg']) {
      const response = page.waitForResponse(
        (res) => res.url().endsWith('/admin/media') && res.request().method() === 'POST',
      )
      await page.getByLabel('上传图片').setInputFiles({
        name,
        mimeType: name.endsWith('.jpg') ? 'image/jpeg' : 'image/webp',
        buffer: Buffer.from(webp, 'base64'),
      })
      const uploaded = await response
      expect(uploaded.status()).toBe(201)
      const media = (await uploaded.json()).data
      ids.push(media.id)
      expect(media.contentType).toBe('image/png')
      expect(media.originalName).toBe(name.replace(/\.[^.]+$/, '.png'))
      await expect(page.locator('.media-library .form-success')).toContainText(media.originalName)
      const transparent = await page.evaluate(async (url) => {
        const bitmap = await createImageBitmap(await (await fetch(url)).blob())
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 2
        const context = canvas.getContext('2d')!
        context.drawImage(bitmap, 0, 0)
        bitmap.close()
        return context.getImageData(1, 1, 1, 1).data[3]
      }, media.url)
      expect(transparent).toBe(0)
    }
    const response = page.waitForResponse(
      (res) => res.url().endsWith('/admin/media') && res.request().method() === 'POST',
    )
    await page.getByLabel('上传图片').setInputFiles({
      name: 'converted.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
    })
    const uploaded = await response
    expect(uploaded.status()).toBe(201)
    const media = (await uploaded.json()).data
    ids.push(media.id)
    expect(media.originalName).toBe('converted.png')
    await expect(page.locator('.media-library .form-success')).toContainText('converted.png')
    let unexpectedUploads = 0
    page.on('request', (req) => {
      if (req.url().endsWith('/admin/media') && req.method() === 'POST') unexpectedUploads++
    })
    await page.getByLabel('上传图片').setInputFiles({
      name: 'broken.heic',
      mimeType: 'image/heic',
      buffer: Buffer.from('invalid image'),
    })
    await expect(page.getByRole('alert')).toContainText('浏览器无法读取')
    await expect(page.locator('.media-library .form-success')).toHaveCount(0)
    await page.getByLabel('上传图片').setInputFiles({
      name: 'large.webp',
      mimeType: 'image/webp',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    })
    await expect(page.getByRole('alert')).toContainText('图片不能超过 5MB')
    expect(unexpectedUploads).toBe(0)
  } finally {
    for (const id of ids)
      expect((await adminMutation(page, `/admin/media/${id}`, 'DELETE')).status()).toBe(200)
  }
})
