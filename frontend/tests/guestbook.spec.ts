import { test, expect } from '@playwright/test'
import { login, adminMutation, createPost, deletePost } from './helpers/admin'

test('anonymous guestbook keeps input when the running service rejects guest access', async ({
  page,
}) => {
  await page.route('**/api/v1/guestbook', async (route) => {
    if (route.request().method() === 'POST')
      await route.fulfill({
        status: 401,
        json: { code: 'UNAUTHORIZED', message: '请先登录对应账号', data: null },
      })
    else await route.continue()
  })
  await page.goto('/guestbook')
  await page.getByRole('button', { name: '写留言', exact: true }).click()
  await page.getByLabel('写张便签').fill('提交失败仍保留这段留言')
  await page.getByRole('button', { name: '贴上便签', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('填写的内容已保留')
  await expect(page.getByLabel('写张便签')).toHaveValue('提交失败仍保留这段留言')
})

test('guestbook publishes visitor notes immediately and admin manages all notes', async ({
  page,
  browser,
}) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const admin = await context.newPage()
  await login(admin)
  const content = `匿名留言墙-${Date.now()}`
  let id: number | undefined
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/guestbook')
    await expect(page.getByLabel('写张便签')).toBeHidden()
    await page.screenshot({
      path: '../docs/screenshots/guestbook-collapsed-mobile.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: '写留言', exact: true }).click()
    await expect(page.getByLabel('写张便签')).toBeFocused()
    await expect(page.locator('.comment-identity')).toContainText('匿名用户')
    await expect(page.locator('.comment-honeypot')).toBeHidden()
    await page.getByLabel('写张便签').fill(content)
    await page.getByRole('button', { name: '收起留言编辑', exact: true }).click()
    await expect(page.getByLabel('写张便签')).toBeHidden()
    await page.getByRole('button', { name: '写留言', exact: true }).click()
    await expect(page.getByLabel('写张便签')).toHaveValue(content)
    await page.getByLabel('便签颜色').selectOption('sky')
    await page.getByRole('button', { name: '预览便签', exact: true }).click()
    const preview = page.getByRole('region', { name: '便签预览' })
    await expect(preview).toContainText(content)
    await expect(preview).toContainText('匿名用户')
    await expect(preview.locator('.guestbook-note')).toHaveClass(/note-sky/)
    await page.getByLabel('写张便签').fill(`${content}\n<script>previewIsPlainText</script>`)
    await expect(preview).toContainText('<script>previewIsPlainText</script>')
    await expect(preview.locator('script')).toHaveCount(0)
    await page.getByLabel('写张便签').fill(content)
    await page.screenshot({
      path: '../docs/screenshots/guestbook-anonymous-form.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: '贴上便签', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('便签已发布')
    await expect(page.getByLabel('写张便签')).toHaveValue('')
    await expect(page.getByLabel('写张便签')).toBeHidden()
    await expect(page.getByRole('button', { name: '写留言', exact: true })).toBeFocused()
    await expect(preview).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.guestbook-wall')).toContainText(content)
    await admin.goto('/admin/guestbook')
    const row = admin.locator('.community-list-item').filter({ hasText: content })
    await expect(row).toContainText('匿名用户')
    const entries = (await (await admin.request.get('/api/v1/admin/guestbook')).json()).data.items
    id = entries.find((entry: { content: string }) => entry.content === content).id
    await expect(row.getByRole('button', { name: '通过', exact: true })).toHaveCount(0)
    await page.reload()
    const note = page.locator('.guestbook-note').filter({ hasText: content })
    await expect(note).toContainText('匿名用户')
    await expect(note.locator('small')).toHaveCount(0)
    await expect(note.getByRole('button', { name: '删除我的便签' })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  } finally {
    if (id) {
      const entries = (await (await admin.request.get('/api/v1/admin/guestbook')).json()).data.items
      const entry = entries.find((item: { id: number }) => item.id === id)
      if (entry)
        await adminMutation(admin, `/admin/guestbook/${id}?version=${entry.version}`, 'DELETE')
    }
    await context.close()
  }
})
