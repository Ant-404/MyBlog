import { test, expect } from '@playwright/test'
import { login, adminMutation, createPost, deletePost } from './helpers/admin'
import { loginMember, mailLink, memberPassword } from './helpers/member'

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

test('guestbook offers anonymous visitors a working moderated form', async ({ page, browser }) => {
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
    await expect(page.getByRole('status')).toContainText('审核通过后')
    await expect(page.getByLabel('写张便签')).toHaveValue('')
    await expect(page.getByLabel('写张便签')).toBeHidden()
    await expect(page.getByRole('button', { name: '写留言', exact: true })).toBeFocused()
    await expect(preview).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.guestbook-wall')).not.toContainText(content)
    await admin.goto('/admin/members')
    await admin.getByRole('button', { name: '留言墙审核', exact: true }).click()
    const row = admin.locator('.member-list-item').filter({ hasText: content })
    await expect(row).toContainText('匿名用户')
    const entries = (await (await admin.request.get('/api/v1/admin/guestbook')).json()).data.items
    id = entries.find((entry: { content: string }) => entry.content === content).id
    await row.getByRole('button', { name: '通过', exact: true }).click()
    await expect(row).toContainText('已公开')
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

test('anonymous comments retain drafts and stay hidden until approved', async ({
  page,
  browser,
}) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const admin = await context.newPage()
  await login(admin)
  const post = await createPost(admin, { slug: `guest-comment-${Date.now()}` })
  const content = `匿名评论-${Date.now()}`
  try {
    await page.goto(`/posts/${post.slug}`)
    await expect(page.locator('.comment-identity')).toContainText('匿名用户')
    await page.getByLabel('评论内容').fill(content)
    await expect(page.locator('.comment-counter')).toContainText('草稿已保存')
    await page.reload()
    await expect(page.getByLabel('评论内容')).toHaveValue(content)
    await page.getByRole('button', { name: '提交评论', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('审核通过后')
    await expect(page.getByLabel('评论内容')).toHaveValue('')
    await page.reload()
    await expect(page.getByLabel('评论内容')).toHaveValue('')
    await expect(page.locator('.comment-list')).not.toContainText(content)
    await admin.goto('/admin/comments')
    const pending = admin.locator('.comment-list article').filter({ hasText: content })
    await expect(pending).toContainText('匿名用户')
    await expect(pending).toContainText('未展示 · 待审核')
    await pending.getByRole('button', { name: '通过', exact: true }).click()
    await page.reload()
    const visible = page.locator('.comment-list article').filter({ hasText: content })
    await expect(visible).toContainText('匿名用户')
    await expect(visible.getByRole('link')).toHaveCount(0)
    await visible.getByRole('button', { name: '回复', exact: true }).click()
    await expect(page.getByLabel('评论内容')).toBeFocused()
    await admin.getByLabel('评论状态').selectOption('APPROVED')
    await admin
      .locator('.comment-list article')
      .filter({ hasText: content })
      .getByRole('button', { name: '拒绝', exact: true })
      .click()
    await page.reload()
    await expect(page.locator('.comment-list')).not.toContainText(content)
  } finally {
    await deletePost(admin, post.id)
    await context.close()
  }
})

test('QQ-compatible SMTP verification, profile, reset, and account closure work end to end', async ({
  page,
}) => {
  const email = `account-${Date.now()}@example.com`
  await page.goto('/account?mode=register')
  await page.getByLabel('邮箱', { exact: true }).fill(email)
  await page.getByRole('button', { name: '发送验证邮件' }).click()
  await expect(page.getByRole('status')).toContainText('验证邮件')
  const registration = await mailLink(page, email)
  await page.goto(registration)
  await expect(page).not.toHaveURL(/token=/)
  await page.getByLabel('昵称', { exact: true }).fill('邮箱验证用户')
  await page.getByLabel('密码', { exact: true }).fill(memberPassword)
  await page.getByLabel('确认密码', { exact: true }).fill(memberPassword)
  await page.getByRole('button', { name: '完成注册' }).click()
  await expect(page.getByRole('status')).toContainText('注册完成')
  await page.getByLabel('密码', { exact: true }).fill(memberPassword)
  await page.getByRole('button', { name: '登录账号' }).click()
  await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
  await page.getByLabel('昵称', { exact: true }).fill('更新后的昵称')
  await page.getByLabel('个人简介').fill('只公开这段简介。')
  await page.getByRole('button', { name: '保存资料' }).click()
  await expect(page.getByRole('status')).toContainText('资料已保存')
  await page.screenshot({ path: '../docs/screenshots/member-profile.png', fullPage: true })
  expect((await page.request.get('/api/v1/admin/members')).status()).toBe(403)
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await page.getByRole('button', { name: '找回密码', exact: true }).click()
  await page.getByLabel('邮箱', { exact: true }).fill(email)
  await page.getByRole('button', { name: '发送验证邮件' }).click()
  await expect(page.getByRole('status')).toContainText('验证邮件')
  await page.goto(await mailLink(page, email))
  const next = 'New-Member-Password-2026'
  await page.getByLabel('密码', { exact: true }).fill(next)
  await page.getByLabel('确认密码', { exact: true }).fill(next)
  await page.getByRole('button', { name: '重置密码', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('密码已重置')
  await page.getByLabel('密码', { exact: true }).fill(next)
  await page.getByRole('button', { name: '登录账号' }).click()
  await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
  await page.getByText('注销账号', { exact: true }).click()
  await page.getByLabel('输入密码确认注销').fill(next)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '永久注销账号' }).click()
  await expect(page.getByRole('button', { name: '登录账号', exact: true })).toBeVisible()
  expect((await page.request.get('/api/v1/members/me')).status()).toBe(401)
})

test('registered comments, reports, moderated notes, and user controls persist', async ({
  page,
  browser,
}) => {
  const adminContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const admin = await adminContext.newPage()
  await login(admin)
  const post = await createPost(admin, { slug: `member-flow-${Date.now()}` })
  const text = `实名评论-${Date.now()}`
  const note = `留下便签-${Date.now()}`
  await loginMember(page)
  try {
    await page.goto(`/posts/${post.slug}`)
    await expect(page.locator('.comment-identity')).toContainText('邮箱已验证')
    await page.getByLabel('评论内容').fill(text)
    await page.getByRole('button', { name: '提交评论', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('评论已发布')
    await expect(page.locator('.comment-list')).toContainText(text)
    await admin.goto('/admin/comments')
    await expect(admin.locator('.comment-list article').filter({ hasText: text })).toContainText(
      '已展示 · 待审核',
    )
    await admin
      .locator('.comment-list article')
      .filter({ hasText: text })
      .getByRole('button', { name: '通过', exact: true })
      .click()
    await page.reload()
    const row = page.locator('.comment-list article').filter({ hasText: text })
    await expect(row).toContainText('注册用户')
    const publicBody = await (await page.request.get(`/api/v1/posts/${post.slug}/comments`)).text()
    expect(publicBody).not.toContain('@example.com')
    await row.getByRole('button', { name: '回复', exact: true }).click()
    await expect(page.getByLabel('评论内容')).toBeFocused()
    await page.getByLabel('评论内容').fill('跟进说明')
    await page.getByRole('button', { name: '提交评论', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('评论已发布')
    await row.getByRole('button', { name: '举报', exact: true }).click()
    await row.getByLabel('举报原因').fill('测试举报流程')
    await row.getByRole('button', { name: '提交举报' }).click()
    await expect(page.getByRole('status')).toContainText('举报已提交')
    await page.goto('/guestbook')
    await page.getByRole('button', { name: '写留言', exact: true }).click()
    await page.getByLabel('写张便签').fill(note)
    await page.getByLabel('便签颜色').selectOption('mint')
    await page.getByRole('button', { name: '贴上便签' }).click()
    await expect(page.getByRole('status')).toContainText('审核通过后')
    await expect(page.locator('.guestbook-wall')).not.toContainText(note)
    await admin.goto('/admin/members')
    await admin.getByRole('button', { name: '评论举报', exact: true }).click()
    await expect(
      admin.locator('.member-list-item').filter({ hasText: '测试举报流程' }),
    ).toBeVisible()
    await admin.getByRole('button', { name: '留言墙审核', exact: true }).click()
    await admin
      .locator('.member-list-item')
      .filter({ hasText: note })
      .getByRole('button', { name: '通过', exact: true })
      .click()
    await page.reload()
    await expect(page.locator('.guestbook-note')).toContainText(note)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: '../docs/screenshots/member-guestbook-mobile.png',
      fullPage: true,
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.goto('/account')
    const own = page.locator('.member-list-item').filter({ hasText: note })
    page.once('dialog', (dialog) => dialog.accept())
    await own.getByRole('button', { name: '删除便签', exact: true }).click()
    await expect(own).toHaveCount(0)
    const me = (await (await page.request.get('/api/v1/members/me')).json()).data
    await admin.goto('/admin/members')
    await admin.getByLabel('搜索用户邮箱或昵称').fill(me.email)
    await admin.getByRole('button', { name: '搜索用户', exact: true }).click()
    const member = admin.locator('.member-list-item').filter({ hasText: me.email })
    admin.once('dialog', (dialog) => dialog.accept())
    await member.getByRole('button', { name: '禁言', exact: true }).click()
    await expect(admin.getByRole('status')).toContainText('操作成功')
    expect((await page.request.get('/api/v1/members/me')).status()).toBe(401)
    const current = (
      await (
        await admin.request.get(`/api/v1/admin/members?keyword=${encodeURIComponent(me.email)}`)
      ).json()
    ).data.items[0]
    expect(
      (
        await adminMutation(admin, `/admin/members/${me.id}`, 'PATCH', {
          status: 'ACTIVE',
          version: current.version,
        })
      ).status(),
    ).toBe(200)
  } finally {
    await deletePost(admin, post.id)
    await adminContext.close()
  }
})

test('weather respects motion preferences across viewport sizes', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('外观设置', { exact: true }).click()
  await page.getByRole('button', { name: '飘雪', exact: true }).click()
  await expect(page.locator('.weather-snow')).toBeVisible()
  await page.getByLabel('外观设置', { exact: true }).click()
  await page.getByRole('button', { name: '暂停横幅动画', exact: true }).click()
  await expect(page.locator('.weather-snow')).toHaveClass(/weather-paused/)
  await page.reload()
  await expect(page.locator('.weather-snow')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.weather-snow')).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByLabel('外观设置', { exact: true }).click()
  await page.getByLabel('动态效果', { exact: false }).uncheck()
  await expect(page.locator('.weather-snow')).toBeHidden()
  await page.getByRole('button', { name: '恢复默认外观' }).click()
  await expect(page.locator('.weather-atmosphere')).toHaveCount(0)
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('link', { name: '用户登录与注册', exact: true })).toBeVisible()
  }
  await page.goto('/posts/hello-world')
  await expect(page.locator('.post-comments')).toContainText('登录或注册')
  await expect(page.getByLabel('评论内容')).toBeVisible()
  await expect(page.locator('.comment-identity')).toContainText('匿名用户')
})
