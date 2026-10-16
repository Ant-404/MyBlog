import { expect, test } from '@playwright/test'
import { adminMutation, createPost, deletePost, login } from './helpers/admin'

test('visitor comments and replies publish immediately and admins can delete them', async ({
  page,
  browser,
}) => {
  const adminContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const admin = await adminContext.newPage()
  await login(admin)
  const post = await createPost(admin)
  try {
    await page.goto(`/posts/${post.slug}`)
    await expect(page.getByRole('link', { name: '用户登录与注册' })).toHaveCount(0)
    await page.getByLabel('昵称', { exact: true }).fill('路过的小伙伴')
    await page.getByLabel('邮箱', { exact: true }).fill('private-visitor@example.com')
    await page.getByLabel('网址', { exact: true }).fill('https://example.com/my-blog')
    await page.getByLabel('评论内容').fill('**很喜欢这篇文章**，感谢分享！')
    await page.getByRole('button', { name: '添加颜文字', exact: true }).click()
    await page.getByRole('button', { name: '插入 (｡･ω･｡)', exact: true }).click()
    await page.getByRole('button', { name: '预览', exact: true }).click()
    await expect(page.getByRole('region', { name: '评论预览' }).locator('strong')).toHaveText(
      '很喜欢这篇文章',
    )
    await expect(page.getByRole('region', { name: '评论预览' })).toContainText('(｡･ω･｡)')
    await page.getByRole('button', { name: '收起预览' }).click()
    await page.locator('.comment-widget').screenshot({
      path: '../docs/screenshots/comments-editor-desktop.png',
      animations: 'disabled',
    })
    await page.getByRole('button', { name: '发送', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: '评论已发布' })).toBeVisible()
    await expect(page.getByLabel('评论内容')).toHaveValue('')
    await expect(page.locator('.comment-list .comment-item')).toHaveCount(1)
    const pending = (
      await (await admin.request.get('/api/v1/admin/comments')).json()
    ).data.items.find((item: { slug: string }) => item.slug === post.slug)
    expect(pending.email).toBe('private-visitor@example.com')
    await admin.goto('/admin/comments')
    const row = admin.locator('.comment-list article').filter({ hasText: post.title })
    await expect(row).toContainText('路过的小伙伴')
    await expect(row.getByRole('button', { name: '通过', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '刷新评论' }).click()
    const comment = page.locator('.comment-item')
    await expect(comment).toHaveCount(1)
    await expect(comment.locator('strong').first()).toHaveText('路过的小伙伴')
    await expect(comment.getByRole('link', { name: '路过的小伙伴' })).toHaveAttribute(
      'href',
      'https://example.com/my-blog',
    )
    const publicBody = await (await page.request.get(`/api/v1/posts/${post.slug}/comments`)).text()
    expect(publicBody).not.toContain('private-visitor@example.com')
    expect(publicBody).not.toContain('"email"')
    await comment.getByRole('button', { name: '回复', exact: true }).click()
    await expect(page.getByText('回复 路过的小伙伴', { exact: true })).toBeVisible()
    await page.getByLabel('评论内容').fill('谢谢！')
    await page.getByRole('button', { name: '发送', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: '评论已发布' })).toBeVisible()
    const replies = (await (await admin.request.get('/api/v1/admin/comments')).json()).data.items
    const reply = replies.find(
      (item: { slug: string; content: string }) =>
        item.slug === post.slug && item.content === '谢谢！',
    )
    expect(reply).toBeTruthy()
    await page.getByRole('button', { name: '刷新评论' }).click()
    await expect(page.locator('.comment-item')).toHaveCount(2)
    await expect(page.locator('.comment-reply-to')).toHaveText('回复 @路过的小伙伴')
    await page
      .locator('.comment-widget')
      .screenshot({ path: '../docs/screenshots/comments-with-replies.png', animations: 'disabled' })
    await admin.goto('/admin/comments')
    const replyRow = admin.locator('.comment-list article').filter({ hasText: '谢谢！' })
    admin.once('dialog', (dialog) => dialog.accept())
    await replyRow.getByRole('button', { name: '删除评论', exact: true }).click()
    await expect(replyRow).toHaveCount(0)
    await page.getByRole('button', { name: '刷新评论' }).click()
    await expect(page.locator('.comment-item')).toHaveCount(1)
  } finally {
    await deletePost(admin, post.id)
    await adminContext.close()
  }
})

test('preview sanitizes markup, errors preserve drafts, and fields restore after reload', async ({
  page,
}) => {
  await page.goto('/posts/hello-world')
  await page.getByLabel('昵称', { exact: true }).fill('草稿用户')
  await page.getByLabel('邮箱', { exact: true }).fill('draft@example.com')
  await page
    .getByLabel('评论内容')
    .fill(
      '**草稿** <script>window.commentXss=true</script><img src=x onerror="window.commentXss=true"><a href="javascript:alert(1)">危险链接</a>',
    )
  await page.getByRole('button', { name: '预览', exact: true }).click()
  const preview = page.getByRole('region', { name: '评论预览' })
  await expect(preview.locator('strong')).toHaveText('草稿')
  await expect(page.getByLabel('评论内容')).toBeVisible()
  const editorBox = await page.locator('.comment-editor').boundingBox()
  const previewBox = await preview.boundingBox()
  expect(previewBox!.y).toBeGreaterThan(editorBox!.y + editorBox!.height)
  const avatar = page.locator('.comment-composer-avatar img')
  await expect(avatar).toHaveAttribute('src', /^\/images\/user\//)
  await expect
    .poll(() => avatar.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true)
  await expect(preview.locator('script,[onerror],a[href^="javascript:"]')).toHaveCount(0)
  expect(await page.evaluate(() => 'commentXss' in window)).toBe(false)
  await page.getByLabel('评论内容').fill('**实时更新**')
  await expect(preview.locator('strong')).toHaveText('实时更新')
  await page
    .locator('.comment-widget')
    .screenshot({ path: '../docs/screenshots/comments-inline-preview.png', animations: 'disabled' })
  await page.getByRole('button', { name: '收起预览' }).click()
  await page.getByLabel('评论内容').fill('发送失败也要保留这段文字')
  await expect(page.locator('.comment-editor-note')).toContainText('草稿已保存')
  await page.route('**/api/v1/posts/hello-world/comments', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 503, json: { message: '暂时无法发送，请重试' } })
      : route.continue(),
  )
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('暂时无法发送')
  await expect(page.getByLabel('评论内容')).toHaveValue('发送失败也要保留这段文字')
  await page.reload()
  await expect(page.getByLabel('昵称', { exact: true })).toHaveValue('草稿用户')
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('draft@example.com')
  await expect(page.getByLabel('评论内容')).toHaveValue('发送失败也要保留这段文字')
  await page.getByRole('button', { name: '插入图片链接' }).click()
  await page.getByLabel('图片链接', { exact: true }).fill('https://example.com/photo.jpg')
  await page.getByRole('button', { name: '插入图片', exact: true }).click()
  await expect(page.getByLabel('评论内容')).toHaveValue(
    /!\[图片\]\(https:\/\/example.com\/photo.jpg\)/,
  )
})

test('comment editor fits light and dark layouts and obsolete account pages are gone', async ({
  page,
}) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/posts/hello-world')
    await expect(page.getByLabel('昵称', { exact: true })).toBeVisible()
    await page.getByLabel('评论内容').fill('**预览效果**')
    await page.getByRole('button', { name: '预览', exact: true }).click()
    await page.getByRole('button', { name: '添加颜文字', exact: true }).click()
    await expect(page.getByRole('group', { name: '选择颜文字' }).getByRole('button')).toHaveCount(
      24,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme)
      if (width === 1440 || width === 390)
        await page.locator('.comment-widget').screenshot({
          path: `../docs/screenshots/comments-${width}-${theme}.png`,
          animations: 'disabled',
        })
    }
  }
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
  await page.goto('/people/1')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})
