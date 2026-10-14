import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.getByLabel('管理员账号').fill('test-admin')
  await page.getByLabel('密码', { exact: true }).fill('Test-Only-Password-2026')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

test('create draft, edit, publish, pin, unpublish and delete through real APIs', async ({
  page,
}) => {
  await login(page)
  await page
    .getByRole('navigation', { name: '后台导航' })
    .getByRole('link', { name: '文章管理' })
    .click()
  await expect(page.locator('.admin-post-row')).toHaveCount(6)
  await page.screenshot({ path: '../docs/screenshots/admin-post-list.png', fullPage: true })
  await page.getByRole('link', { name: '新建文章' }).click()
  const slug = `e2e-post-${Date.now()}`
  await page.getByLabel('文章标题', { exact: true }).fill('浏览器文章管理测试')
  await page.getByLabel('文章地址（slug）').fill(slug)
  await page.getByLabel('文章摘要').fill('记录文章管理完整流程。')
  await page.getByLabel('正文（Markdown）').fill('## 文章管理测试\n\n这是一篇自动验证用的文章。')
  await page.getByLabel('标签', { exact: true }).fill('React, 学习笔记')
  await page.screenshot({ path: '../docs/screenshots/admin-post-editor.png', fullPage: true })
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
  await expect(page.getByLabel('文章标题', { exact: true })).toHaveValue('浏览器文章管理测试')
  expect((await page.request.get(`/api/v1/posts/${slug}`)).status()).toBe(404)
  await page.getByLabel('文章标题', { exact: true }).fill('浏览器文章管理测试 · 已编辑')
  await page.getByRole('button', { name: '发布文章', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('文章已保存并发布')
  const publicPost = await page.request.get(`/api/v1/posts/${slug}`)
  expect(publicPost.status()).toBe(200)
  expect((await publicPost.json()).data.title).toContain('已编辑')
  await page.getByRole('link', { name: '返回文章列表' }).click()
  const row = page.locator('.admin-post-row').filter({ hasText: slug })
  await row.getByRole('button', { name: /^置顶：/ }).click()
  await expect(row.locator('.pinned-badge')).toHaveText('置顶')
  await row.getByRole('button', { name: /^转为草稿：/ }).click()
  await expect(row.locator('.status-badge')).toHaveText('草稿')
  expect((await page.request.get(`/api/v1/posts/${slug}`)).status()).toBe(404)
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: /^删除：/ }).click()
  await expect(row).toHaveCount(0)
  await expect(page.locator('.admin-post-row')).toHaveCount(6)
})

test('editor warns on unsaved navigation and list fits mobile viewport', async ({ page }) => {
  await login(page)
  await page.goto('/admin/posts/new')
  await page.getByLabel('文章标题', { exact: true }).fill('尚未保存的文章')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('link', { name: '返回文章列表' }).click()
  await expect(page).toHaveURL(/\/admin\/posts\/new$/)
  await expect(page.getByLabel('文章标题', { exact: true })).toHaveValue('尚未保存的文章')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('link', { name: '返回文章列表' }).click()
  await expect(page).toHaveURL(/\/admin\/posts$/)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.admin-post-row')).toHaveCount(6)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.screenshot({ path: '../docs/screenshots/admin-post-list-mobile.png', fullPage: true })
})
