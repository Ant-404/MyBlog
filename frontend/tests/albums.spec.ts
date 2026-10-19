import { test, expect } from '@playwright/test'
import { login, adminMutation } from './helpers/admin'

test('create album, upload and order photos, publish, preview, hide and delete', async ({
  page,
}, testInfo) => {
  await login(page)
  await page.getByRole('link', { name: '相册管理', exact: true }).click()
  const name = `周末相册-${Date.now()}`
  let albumId: number | undefined
  let removed = false
  const mediaIds: number[] = []
  try {
    await page.getByLabel('相册名称', { exact: true }).fill(name)
    await page.getByLabel('相册介绍', { exact: true }).fill('走走停停，记录日常里的小风景。')
    await page.getByRole('button', { name: '创建相册', exact: true }).click()
    await expect(page.getByRole('button', { name: '保存相册', exact: true })).toBeVisible()
    const albums = (await (await page.request.get('/api/v1/admin/albums')).json()).data
    albumId = albums.find((a: { title: string }) => a.title === name).id
    expect((await page.request.get(`/api/v1/albums/${albumId}`)).status()).toBe(404)
    await page.getByRole('button', { name: '上传 / 添加照片', exact: true }).click()
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600
      const ctx = canvas.getContext('2d')!
      const gradient = ctx.createLinearGradient(0, 0, 800, 600)
      gradient.addColorStop(0, '#567d92')
      gradient.addColorStop(1, '#d9c6aa')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 800, 600)
      ctx.fillStyle = '#e6dfc4'
      ctx.beginPath()
      ctx.arc(600, 150, 65, 0, Math.PI * 2)
      ctx.fill()
      return canvas.toDataURL('image/png').split(',')[1]
    })
    for (let i = 1; i <= 2; i++) {
      const response = page.waitForResponse(
        (res) => res.url().endsWith('/admin/media') && res.request().method() === 'POST',
      )
      const fileName = `album-${Date.now()}-${i}.png`
      await page.getByLabel('上传图片', { exact: true }).setInputFiles({
        name: fileName,
        mimeType: 'image/png',
        buffer: Buffer.from(png, 'base64'),
      })
      const uploaded = await response
      expect(uploaded.status()).toBe(201)
      const media = (await uploaded.json()).data
      mediaIds.push(media.id)
      await page
        .locator('.media-item')
        .filter({ hasText: fileName })
        .getByRole('button', { name: '选择图片' })
        .click()
      await page
        .getByLabel(`照片 ${i} 说明`, { exact: true })
        .fill(i === 1 ? '山间的微光' : '午后的风')
    }
    await page.getByRole('button', { name: '收起图片库', exact: true }).click()
    await page.getByRole('button', { name: '上移照片 2', exact: true }).click()
    await expect(page.getByLabel('照片 1 说明', { exact: true })).toHaveValue('午后的风')
    await page.getByRole('button', { name: '设为封面', exact: true }).first().click()
    await page.getByLabel('公开显示', { exact: true }).check()
    await page.getByRole('button', { name: '保存相册', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: '操作成功' })).toContainText('操作成功')
    expect((await adminMutation(page, `/admin/media/${mediaIds[0]}`, 'DELETE')).status()).toBe(409)
    await page.screenshot({ path: testInfo.outputPath('album-admin.png'), fullPage: true })
    await page.goto('/albums')
    await expect(page.locator('.album-card').filter({ hasText: name })).toBeVisible()
    await page
      .locator('.album-card')
      .filter({ hasText: name })
      .locator('.album-cover > img')
      .evaluate((image: HTMLImageElement) => image.decode())
    await page.screenshot({ path: testInfo.outputPath('album-list.png'), fullPage: true })
    await page.getByRole('link', { name: new RegExp(name) }).click()
    await expect(page.locator('.album-photo-grid figure')).toHaveCount(2)
    await expect(page.locator('figcaption').first()).toHaveText('午后的风')
    await page.locator('.album-photo-button').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('1 / 2 · 午后的风')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('dialog')).toContainText('2 / 2 · 山间的微光')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.locator('.album-photo-button').first()).toBeFocused()
    await page.screenshot({ path: testInfo.outputPath('album-desktop.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: testInfo.outputPath('album-mobile.png'), fullPage: true })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: '打开或关闭导航' }).click()
    await page.getByRole('button', { name: '生活', exact: true }).click()
    await expect(
      page
        .getByRole('navigation', { name: '主导航' })
        .getByRole('link', { name: '相册', exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.getByRole('button', { name: '打开或关闭导航' }).click()
    await page.goto('/admin/albums')
    await page.getByRole('button', { name: `编辑${name}`, exact: true }).click()
    await expect(page.getByLabel('相册名称', { exact: true })).toHaveValue(name)
    await page.getByLabel('公开显示', { exact: true }).uncheck()
    await page.getByRole('button', { name: '保存相册', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: '操作成功' })).toContainText('操作成功')
    expect((await page.request.get(`/api/v1/albums/${albumId}`)).status()).toBe(404)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: `删除${name}`, exact: true }).click()
    await expect(page.getByRole('button', { name: `编辑${name}`, exact: true })).toHaveCount(0)
    removed = true
  } finally {
    if (albumId && !removed) {
      const current = (await (await page.request.get(`/api/v1/admin/albums/${albumId}`)).json())
        .data
      if (current)
        await adminMutation(page, `/admin/albums/${albumId}?version=${current.version}`, 'DELETE')
    }
    for (const id of mediaIds)
      expect((await adminMutation(page, `/admin/media/${id}`, 'DELETE')).status()).toBe(200)
  }
})
