import { expect, test } from '@playwright/test'

test('sticky wall switches latest and random nine, opens full notes and stays within viewport', async ({
  page,
}) => {
  const notes = Array.from({ length: 9 }, (_, index) => ({
    id: 300 + index,
    author: `路过的朋友 ${index + 1}`,
    content: `第 ${index + 1} 张便签。\n愿你今天也能遇到一点小小的美好。`.repeat(
      index === 0 ? 8 : 1,
    ),
    color: ['lavender', 'peach', 'mint', 'sky'][index % 4],
    version: 0,
    createdAt: '2026-10-16T12:30:00',
  }))
  let randomRequests = 0
  await page.route('**/api/v1/guestbook/highlights?*', (route) => {
    const random = route.request().url().includes('mode=random')
    if (random) randomRequests++
    return route.fulfill({ json: { data: random ? [...notes].reverse() : notes } })
  })
  await page.route('**/api/v1/guestbook?page=*', (route) =>
    route.fulfill({ json: { data: { items: notes, total: 9, page: 1, size: 20 } } }),
  )
  await page.goto('/guestbook')
  const wall = page.getByRole('region', { name: '精选便签墙' })
  await expect(wall.locator('.sticky-note')).toHaveCount(9)
  await expect(page.getByRole('button', { name: '最新九张' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await wall.getByRole('button', { name: '查看留言 #300', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(notes[0].content)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(wall.getByRole('button', { name: '查看留言 #300', exact: true })).toBeFocused()
  await page.getByRole('button', { name: '随机九张' }).click()
  await expect(wall.locator('.sticky-note').first()).toContainText('路过的朋友 9')
  const before = randomRequests
  await page.getByRole('button', { name: '换一组便签' }).click()
  await expect.poll(() => randomRequests).toBeGreaterThan(before)
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(
      (value) => (document.documentElement.dataset.theme = value),
      width < 400 ? 'dark' : 'light',
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 1440 || width === 390) {
      await wall.screenshot({
        path: `test-results/guestbook-wall-${width}.png`,
        animations: 'disabled',
      })
    }
  }
  await page.getByRole('button', { name: '写张便签 ↗', exact: true }).click()
  await expect(page.getByLabel('写张便签', { exact: true })).toBeFocused()
})

test('sticky wall supports errors, retry and empty state', async ({ page }) => {
  let fail = true
  await page.route('**/api/v1/guestbook/highlights?*', (route) =>
    fail
      ? route.fulfill({ status: 503, json: { message: '便签暂时不可用' } })
      : route.fulfill({ json: { data: [] } }),
  )
  await page.goto('/guestbook')
  const wall = page.getByRole('region', { name: '精选便签墙' })
  await expect(wall).toContainText('便签暂时不可用')
  fail = false
  await wall.getByRole('button', { name: '重新加载' }).click()
  await expect(wall).toContainText('墙上还没有便签')
})
