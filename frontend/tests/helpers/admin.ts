import { expect, type Page } from '@playwright/test'
export async function login(page: Page) {
  await page.goto('/admin/login')
  await page.getByLabel('管理员账号').fill('test-admin')
  await page.getByLabel('密码', { exact: true }).fill('Test-Only-Password-2026')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
export async function adminMutation(page: Page, path: string, method: string, data?: unknown) {
  const csrf = (await (await page.request.get('/api/v1/auth/csrf')).json()).data
  return page.request.fetch(`/api/v1${path}`, {
    method,
    headers: { [csrf.headerName]: csrf.token },
    data,
  })
}
export async function createPost(page: Page, overrides: Record<string, unknown> = {}) {
  const response = await adminMutation(page, '/admin/posts', 'POST', {
    title: '功能联调测试',
    slug: `feature-test-${Date.now()}`,
    excerpt: '临时验证',
    content:
      '## 第一节\n\n```java\nclass Example { int number = 1; }\n```\n\n## 第二节\n\n' +
      '阅读验证段落。\n\n'.repeat(40),
    cover: '/images/landscape.svg',
    category: '随笔',
    tags: [],
    publishedAt: '2026-01-01',
    readingMinutes: 1,
    pinned: false,
    status: 'PUBLISHED',
    version: 0,
    ...overrides,
  })
  expect(response.status()).toBe(201)
  return (await response.json()).data
}
export async function deletePost(page: Page, id: number) {
  const current = (await (await page.request.get(`/api/v1/admin/posts/${id}`)).json()).data
  expect(
    (await adminMutation(page, `/admin/posts/${id}?version=${current.version}`, 'DELETE')).status(),
  ).toBe(200)
}
