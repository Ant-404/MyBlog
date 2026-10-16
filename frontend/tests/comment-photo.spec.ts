import { expect, test } from '@playwright/test'

test('visitors upload a local photo, get a resized preview and retain drafts after errors', async ({
  page,
}) => {
  await page.goto('/posts/hello-world')
  const photo = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 2400
    canvas.height = 1800
    const context = canvas.getContext('2d')!
    context.fillStyle = '#89bca7'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#fff'
    context.font = '100px sans-serif'
    context.fillText('A little memory', 100, 200)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  let fail = true
  let uploaded = false
  await page.route('**/api/v1/comments/images', async (route) => {
    expect(route.request().headers()['x-csrf-token']).toBeTruthy()
    expect(route.request().headers()['content-type']).toContain('multipart/form-data')
    if (fail) return route.fulfill({ status: 503, json: { message: '上传失败，请重试' } })
    uploaded = true
    const payload = route.request().postDataBuffer()!
    expect(payload.length).toBeLessThan(200000)
    const start = payload.indexOf(Buffer.from([255, 216, 255]))
    const end = payload.lastIndexOf(Buffer.from([255, 217])) + 2
    expect(start).toBeGreaterThan(0)
    const dimensions = await page.evaluate(
      async (data) => {
        const image = await createImageBitmap(
          new Blob([new Uint8Array(data)], { type: 'image/jpeg' }),
        )
        const size = [image.width, image.height]
        image.close()
        return size
      },
      Array.from(payload.subarray(start, end)),
    )
    expect(dimensions).toEqual([1600, 1200])
    return route.fulfill({ status: 201, json: { data: { url: '/api/v1/media/test-photo.jpg' } } })
  })
  await page.route('**/api/v1/media/test-photo.jpg', (route) =>
    route.fulfill({ contentType: 'image/png', body: Buffer.from(photo, 'base64') }),
  )
  await page.getByLabel('评论内容').fill('分享一张照片')
  await page.getByRole('button', { name: '插入图片', exact: true }).click()
  const input = page.locator('.comment-photo-upload input')
  const file = { name: 'memory.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') }
  await input.setInputFiles(file)
  await expect(page.getByRole('alert')).toContainText('上传失败')
  await expect(page.getByLabel('评论内容')).toHaveValue('分享一张照片')
  fail = false
  await input.setInputFiles(file)
  await expect.poll(() => uploaded).toBe(true)
  await expect(page.getByLabel('评论内容')).toHaveValue(
    /!\[照片\]\(\/api\/v1\/media\/test-photo.jpg\)/,
  )
  await expect(page.getByRole('region', { name: '评论预览' }).locator('img')).toBeVisible()
  await page
    .locator('.comment-widget')
    .screenshot({ path: 'test-results/comment-local-photo.png', animations: 'disabled' })
})
