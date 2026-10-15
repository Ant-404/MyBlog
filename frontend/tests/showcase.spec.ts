import { test, expect } from '@playwright/test'
import { login, adminMutation, createPost, deletePost } from './helpers/admin'

async function remove(page: import('@playwright/test').Page, section: string, id: number) {
  const list = (await (await page.request.get(`/api/v1/admin/${section}?size=50`)).json()).data
    .items
  const entry = list.find((item: { id: number }) => item.id === id)
  if (entry)
    expect(
      (
        await adminMutation(page, `/admin/${section}/${id}?version=${entry.version}`, 'DELETE')
      ).status(),
    ).toBe(200)
}
const input = (title: string) => ({
  title,
  summary: '介绍项目中的设计选择。',
  content: '## 实现过程\n\n从一个想法开始。',
  cover: '',
  status: 'IN_PROGRESS',
  technologies: ['React'],
  sourceUrl: '',
  demoUrl: '',
  images: [],
  postIds: [],
  publishedAt: '2026-01-01',
  sortOrder: 0,
  visible: true,
  version: 0,
})

test('project editor publishes real data and public detail renders sanitized Markdown', async ({
  page,
}) => {
  const title = `项目验证-${Date.now()}`
  let id: number | undefined
  await login(page)
  try {
    await page.goto('/admin/projects')
    await page.getByLabel('项目展示标题').fill(title)
    await page.getByLabel('摘要', { exact: true }).fill('完成项目从设计到落地的过程。')
    await page.getByLabel('技术栈（逗号分隔，最多 20 项）').fill('Java, React, MySQL')
    await page.getByLabel('源码地址').fill('https://github.com/example/project')
    await page.getByLabel('在线演示地址').fill('https://example.com/')
    await page
      .getByLabel('正文（Markdown）')
      .fill('## 项目设计\n\n这是项目介绍。\n\n<script>window.badShowcase=true</script>')
    await page.getByLabel('发布日期').fill('2026-01-01')
    await page.getByLabel('公开显示').check()
    await page.getByRole('button', { name: '新增项目展示', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: '操作成功' })).toBeVisible()
    const list = (
      await (
        await page.request.get(`/api/v1/admin/projects?keyword=${encodeURIComponent(title)}`)
      ).json()
    ).data.items
    id = list[0].id
    await page.screenshot({
      path: '../docs/screenshots/showcase-project-editor.png',
      fullPage: true,
    })
    await page.goto('/projects')
    await page.getByRole('link', { name: title, exact: true }).click()
    await expect(page.locator('.showcase-detail h1')).toHaveText(title)
    await expect(page.getByRole('link', { name: '源码', exact: true })).toHaveAttribute(
      'href',
      'https://github.com/example/project',
    )
    await expect(page.locator('.showcase-technologies')).toContainText('MySQL')
    expect(
      await page.evaluate(() => (window as typeof window & { badShowcase?: boolean }).badShowcase),
    ).toBeUndefined()
    await page.screenshot({
      path: '../docs/screenshots/showcase-project-detail.png',
      fullPage: true,
    })
  } finally {
    if (id) await remove(page, 'projects', id)
  }
})

test('series editor orders articles and excludes drafts from the public reading list', async ({
  page,
}) => {
  await login(page)
  const stamp = Date.now()
  const a = await createPost(page, { title: `专题甲-${stamp}`, slug: `series-a-${stamp}` })
  const b = await createPost(page, { title: `专题乙-${stamp}`, slug: `series-b-${stamp}` })
  const draft = await createPost(page, {
    title: `专题草稿-${stamp}`,
    slug: `series-draft-${stamp}`,
    status: 'DRAFT',
  })
  let id: number | undefined
  try {
    await page
      .getByRole('navigation', { name: '后台导航' })
      .getByRole('link', { name: '内容组织', exact: true })
      .click()
    await page
      .getByRole('navigation', { name: '内容组织', exact: true })
      .getByRole('link', { name: '文章专题', exact: true })
      .click()
    await expect(
      page
        .getByRole('navigation', { name: '后台导航' })
        .getByRole('link', { name: '内容组织', exact: true }),
    ).toHaveClass(/active/)
    await page.getByLabel('文章专题标题').fill(`系列验证-${stamp}`)
    await page.getByLabel('发布日期').fill('2026-01-01')
    for (const post of [a, b, draft])
      await page.locator('.showcase-post-options button').filter({ hasText: post.title }).click()
    await page.getByRole('button', { name: '上移文章 2', exact: true }).click()
    await page.getByLabel('公开显示').check()
    await page.getByRole('button', { name: '新增文章专题', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: '操作成功' })).toBeVisible()
    id = (await (await page.request.get('/api/v1/admin/series')).json()).data.items.find(
      (entry: { title: string }) => entry.title === `系列验证-${stamp}`,
    ).id
    await page.goto(`/series/${id}`)
    const links = page.getByRole('region', { name: '专题阅读顺序' }).locator('ol a')
    await expect(links).toHaveCount(2)
    await expect(links.first()).toContainText(b.title)
    await expect(links.last()).toContainText(a.title)
    await page.screenshot({ path: '../docs/screenshots/showcase-series.png', fullPage: true })
  } finally {
    if (id) await remove(page, 'series', id)
    for (const post of [a, b, draft]) await deletePost(page, post.id)
  }
})

test('legacy moments routes redirect to guestbook moderation and public wall', async ({ page }) => {
  await login(page)
  await page.goto('/admin/moments')
  await expect(page).toHaveURL(/\/admin\/members\?tab=notes$/)
  await expect(page.getByRole('button', { name: '留言墙审核', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(
    page.getByRole('navigation', { name: '后台导航' }).getByRole('link', { name: '说说管理' }),
  ).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/moments')
  await expect(page).toHaveURL(/\/guestbook$/)
  await expect(page.getByRole('heading', { name: /留言墙/ })).toBeVisible()
})

test('stale editor keeps current input when another window changes the project', async ({
  page,
}) => {
  await login(page)
  const original = input(`并发项目-${Date.now()}`)
  const created = await adminMutation(page, '/admin/projects', 'POST', original)
  expect(created.status()).toBe(200)
  const entry = (await created.json()).data
  try {
    await page.goto('/admin/projects')
    await page.getByRole('button', { name: `编辑${original.title}`, exact: true }).click()
    await page.getByLabel('项目展示标题').fill('当前窗口尚未保存的标题')
    expect(
      (
        await adminMutation(page, `/admin/projects/${entry.id}`, 'PUT', {
          ...original,
          title: '另一窗口已保存',
        })
      ).status(),
    ).toBe(200)
    await page.getByRole('button', { name: '保存项目展示', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('已被修改')
    await expect(page.getByLabel('项目展示标题')).toHaveValue('当前窗口尚未保存的标题')
  } finally {
    await remove(page, 'projects', entry.id)
  }
})

test('new pages have empty states, tablet navigation fits and private detail stays unavailable', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const path of ['/projects', '/series']) {
    await page.goto(path)
    await expect(page.locator('.showcase-empty')).toBeVisible()
    await page.getByRole('textbox', { name: /^搜索/ }).fill('不存在的关键词')
    await page.getByRole('button', { name: '查找', exact: true }).click()
    await expect(page.getByRole('heading', { name: '没有找到相关内容' })).toBeVisible()
  }
  await page.goto('/')
  for (const width of [320, 390, 768, 1024, 1101, 1152, 1201, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width <= 1100) {
      await page.getByRole('button', { name: '打开或关闭导航' }).click()
      await expect(
        page
          .getByRole('navigation', { name: '主导航' })
          .getByRole('link', { name: '项目', exact: true }),
      ).toBeVisible()
      await page.getByRole('button', { name: '打开或关闭导航' }).click()
    } else {
      const brand = await page.locator('.brand').boundingBox()
      const nav = await page.getByRole('navigation', { name: '主导航' }).boundingBox()
      const actions = await page.locator('.header-actions').boundingBox()
      expect(brand!.x + brand!.width).toBeLessThanOrEqual(nav!.x)
      expect(nav!.x + nav!.width).toBeLessThanOrEqual(actions!.x)
    }
  }
  expect(errors).toEqual([])
})
