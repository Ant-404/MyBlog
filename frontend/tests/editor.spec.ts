import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/admin/login')
  await page.getByLabel('管理员账号').fill('test-admin')
  await page.getByLabel('密码', { exact: true }).fill('Test-Only-Password-2026')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
async function mutate(page: Page, path: string, method: string, data?: unknown) {
  const csrf = (await (await page.request.get('/api/v1/auth/csrf')).json()).data
  return page.request.fetch(`/api/v1/admin/posts${path}`, {
    method,
    headers: { [csrf.headerName]: csrf.token },
    data,
  })
}
async function create(page: Page) {
  const response = await mutate(page, '', 'POST', {
    title: '编辑器验证',
    slug: `editor-test-${Date.now()}`,
    excerpt: '',
    content: '初始正文',
    cover: '/images/landscape.svg',
    category: '随笔',
    tags: [],
    publishedAt: '2026-01-01',
    readingMinutes: 1,
    pinned: false,
    status: 'DRAFT',
    version: 0,
  })
  expect(response.status()).toBe(201)
  const post = (await response.json()).data
  await page.goto(`/admin/posts/${post.id}/edit`)
  await expect(page.getByLabel('正文（Markdown）')).toHaveValue('初始正文')
  return post
}
async function detail(page: Page, id: number) {
  return (await (await page.request.get(`/api/v1/admin/posts/${id}`)).json()).data
}
async function cleanup(page: Page, id: number) {
  const post = await detail(page, id)
  expect((await mutate(page, `/${id}?version=${post.version}`, 'DELETE')).status()).toBe(200)
}

test('taxonomy loading errors can be retried without losing article input', async ({ page }) => {
  await login(page)
  let unavailable = true
  await page.route('**/api/v1/admin/posts/options', (route) =>
    unavailable
      ? route.fulfill({ status: 503, json: { message: '选项暂时不可用' } })
      : route.continue(),
  )
  await page.goto('/admin/posts/new')
  await page.getByLabel('文章标题', { exact: true }).fill('保留正在编辑的文章')
  const slug = await page.getByLabel('文章地址（slug）').inputValue()
  await expect(page.getByRole('alert')).toContainText('分类和标签加载失败')
  await expect(page.getByLabel('分类', { exact: true })).toBeDisabled()
  unavailable = false
  await page.getByRole('alert').getByRole('button', { name: '刷新选项' }).click()
  await page.getByLabel('分类', { exact: true }).selectOption('随笔')
  await expect(page.getByLabel('文章标题', { exact: true })).toHaveValue('保留正在编辑的文章')
  await expect(page.getByLabel('文章地址（slug）')).toHaveValue(slug)
  await page
    .getByLabel('正文（Markdown）')
    .fill('[正文](' + 'https://example.com/'.repeat(100) + ')')
  await expect(page.getByLabel('阅读时长（分钟）')).toHaveValue('1')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: '../docs/screenshots/admin-post-options-mobile.png',
    fullPage: true,
  })
})

test('preview sanitizes Markdown, toolbar wraps selection and mobile layout fits', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/posts/new')
  const content = page.getByLabel('正文（Markdown）')
  await content.fill(
    '## 预览标题\n\n正文<script>window.editorUnsafe = true</script><a href="javascript:alert(1)">危险链接</a>',
  )
  const preview = page.getByRole('region', { name: 'Markdown 实时预览' })
  await expect(preview.getByRole('heading', { name: '预览标题' })).toBeVisible()
  expect(await preview.locator('script, [href^="javascript:"]').count()).toBe(0)
  expect(await page.evaluate(() => 'editorUnsafe' in window)).toBe(false)
  await content.fill('选择文字')
  await content.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, 4))
  await page.getByRole('button', { name: '插入加粗', exact: true }).click()
  await expect(content).toHaveValue('**选择文字**')
  await expect(preview.locator('strong')).toHaveText('选择文字')
  await page.getByRole('button', { name: '预览', exact: true }).click()
  await expect(content).toBeHidden()
  await page.getByRole('button', { name: '分栏', exact: true }).click()
  await page.screenshot({ path: '../docs/screenshots/markdown-editor-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '../docs/screenshots/markdown-editor-mobile.png', fullPage: true })
})

test('draft autosave persists after reload, can be disabled and never auto-publishes', async ({
  page,
}) => {
  await login(page)
  const post = await create(page)
  try {
    await page.getByLabel('正文（Markdown）').fill('## 自动保存的新正文')
    await expect(page.getByRole('status')).toContainText('草稿已自动保存', { timeout: 10000 })
    expect((await detail(page, post.id)).content).toBe('## 自动保存的新正文')
    expect((await page.request.get(`/api/v1/posts/${post.slug}`)).status()).toBe(404)
    await page.reload()
    await expect(page.getByLabel('正文（Markdown）')).toHaveValue('## 自动保存的新正文')
    await page.getByLabel('自动保存草稿').uncheck()
    await page.getByLabel('正文（Markdown）').fill('手动发布的正文')
    await page.waitForTimeout(3500)
    expect((await detail(page, post.id)).content).toBe('## 自动保存的新正文')
    await page.getByRole('button', { name: '发布文章', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('文章已保存并发布')
    await page.getByLabel('自动保存草稿').check()
    await page.getByLabel('正文（Markdown）').fill('尚未提交的公开文章修改')
    await page.waitForTimeout(3500)
    expect((await detail(page, post.id)).content).toBe('手动发布的正文')
    const publicPost = (await (await page.request.get(`/api/v1/posts/${post.slug}`)).json()).data
    expect(publicPost.content).toBe('手动发布的正文')
  } finally {
    await cleanup(page, post.id)
  }
})

test('autosave conflict preserves input and pauses retries', async ({ page }) => {
  await login(page)
  const post = await create(page)
  try {
    expect(
      (
        await mutate(page, `/${post.id}`, 'PUT', { ...post, content: '另一个窗口的新版本' })
      ).status(),
    ).toBe(200)
    let writes = 0
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().endsWith(`/admin/posts/${post.id}`)) writes++
    })
    await page.getByLabel('正文（Markdown）').fill('当前窗口需要保留的文字')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.autosave-bar')).toContainText('自动保存已暂停')
    await expect(page.getByLabel('正文（Markdown）')).toHaveValue('当前窗口需要保留的文字')
    await page.waitForTimeout(3500)
    expect(writes).toBe(1)
    expect((await detail(page, post.id)).content).toBe('另一个窗口的新版本')
  } finally {
    await cleanup(page, post.id)
  }
})

test('autosave network failure keeps input and manual save resumes it', async ({ page }) => {
  await login(page)
  const post = await create(page)
  const pattern = `**/api/v1/admin/posts/${post.id}`
  try {
    await page.route(pattern, (route) =>
      route.request().method() === 'PUT' ? route.abort() : route.continue(),
    )
    await page.getByLabel('正文（Markdown）').fill('网络中断时的草稿')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel('正文（Markdown）')).toHaveValue('网络中断时的草稿')
    await expect(page.locator('.autosave-bar')).toContainText('自动保存已暂停')
    await page.unroute(pattern)
    await page.getByRole('button', { name: '保存草稿', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('草稿已保存')
    await page.getByLabel('正文（Markdown）').fill('连接恢复后的自动保存')
    await expect(page.getByRole('status')).toContainText('草稿已自动保存', { timeout: 10000 })
    expect((await detail(page, post.id)).content).toBe('连接恢复后的自动保存')
  } finally {
    await page.unroute(pattern)
    await cleanup(page, post.id)
  }
})
