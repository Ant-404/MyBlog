import { test, expect } from '@playwright/test'

test('owner identity is consistent and anonymous admin visits require login', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.profile-card h2')).toHaveText('憨Ant')
  await expect(page.locator('.brand')).toContainText('憨Ant')
  await expect(page).toHaveTitle(/憨Ant/)
  const [admin] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('link', { name: '管理后台' }).click(),
  ])
  await expect(admin).toHaveURL(/\/admin\/login$/)
  await expect(admin.getByRole('heading', { name: '憨Ant的管理后台' })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await admin.screenshot({ path: '../docs/screenshots/admin-login.png', fullPage: true })
  await admin.close()
})

test('login, refresh, dashboard and logout work through the real session API', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login$/)
  await page.getByLabel('管理员账号').fill('test-admin')
  await page.getByLabel('密码', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page.getByRole('alert')).toContainText('账号或密码不正确')
  await page.getByLabel('密码', { exact: true }).fill('Test-Only-Password-2026')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: /你好，憨Ant/ })).toBeVisible()
  await expect(page.locator('.dashboard-stats section').first().locator('strong')).toHaveText('6')
  await page.screenshot({ path: '../docs/screenshots/admin-dashboard.png', fullPage: true })
  await page.reload()
  await expect(page.getByRole('heading', { name: /你好，憨Ant/ })).toBeVisible()
  await page.getByRole('button', { name: '退出登录' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  const protectedResponse = await page.request.get('/api/v1/admin/dashboard')
  expect(protectedResponse.status()).toBe(401)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login$/)
  expect(errors).toEqual([])
})

test('mobile login is usable and a lost session returns to login', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel('管理员账号').fill('test-admin')
  await page.getByLabel('密码', { exact: true }).fill('Test-Only-Password-2026')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page.getByRole('heading', { name: /你好，憨Ant/ })).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.screenshot({ path: '../docs/screenshots/admin-mobile.png', fullPage: true })
  await page.context().clearCookies()
  await page.reload()
  await expect(page).toHaveURL(/\/admin\/login$/)
})
