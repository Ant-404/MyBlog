import { expect, test } from '@playwright/test'
import { localMusic } from './helpers/music'

test('floating disc drags, remembers its position and visibility, and leaves playback intact', async ({
  page,
}) => {
  await localMusic(page)
  await page.goto('/anime')
  const disc = page.locator('.music-launcher')
  const player = page.getByRole('region', { name: '侧栏音乐播放器', exact: true })
  await expect(player).toBeVisible()
  await player.getByRole('button', { name: '播放音乐', exact: true }).click()
  const audio = page.locator('.music-widget audio')
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false)
  const original = (await page.locator('.music-widget').boundingBox())!
  expect(original.x + original.width).toBe(1440 - 22)
  expect(original.y + original.height).toBe(1100 - 22)
  await page.mouse.move(original.x + 28, original.y + 28)
  await page.mouse.down()
  await page.mouse.move(original.x - 272, original.y - 212, { steps: 12 })
  await page.mouse.up()
  const moved = (await page.locator('.music-widget').boundingBox())!
  expect(moved.x).toBeCloseTo(original.x - 300, 0)
  expect(moved.y).toBeCloseTo(original.y - 240, 0)
  await expect(page.locator('.music-widget #music-panel')).toHaveCount(0)
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false)
  await player.getByRole('button', { name: '隐藏悬浮唱片' }).click()
  await expect(disc).toHaveCount(0)
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false)
  await page.reload()
  await expect(disc).toHaveCount(0)
  await player.getByRole('button', { name: '显示悬浮唱片' }).click()
  const restored = (await page.locator('.music-widget').boundingBox())!
  expect(restored.x).toBeCloseTo(moved.x, 0)
  expect(restored.y).toBeCloseTo(moved.y, 0)
  await disc.hover()
  const floating = page.locator('.music-widget #music-panel')
  await expect(floating).toBeVisible()
  // Clicking a control must not pin the panel open after the mouse leaves.
  await floating.getByRole('button', { name: '下一首', exact: true }).click()
  await page.mouse.move(1200, 100)
  await expect(floating).toHaveCount(0, { timeout: 600 })
  await page.setViewportSize({ width: 390, height: 700 })
  const clamped = (await disc.boundingBox())!
  expect(clamped.x + clamped.width).toBeLessThanOrEqual(390 - 14)
  expect(clamped.y + clamped.height).toBeLessThanOrEqual(700 - 16)
  await disc.click()
  const panel = (await floating.boundingBox())!
  expect(panel.x).toBeGreaterThanOrEqual(0)
  expect(panel.x + panel.width).toBeLessThanOrEqual(390)
})

test('touch dragging moves the disc without opening the panel or scrolling the page', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    baseURL: 'http://127.0.0.1:5174',
  })
  const page = await context.newPage()
  try {
    await localMusic(page)
    await page.goto('/anime')
    const disc = page.locator('.music-launcher')
    await expect(disc).toBeVisible()
    const before = (await disc.boundingBox())!
    const session = await context.newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: before.x + 24, y: before.y + 24 }],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: before.x - 96, y: before.y - 156 }],
    })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.locator('.music-widget')).not.toHaveClass(/is-dragging/)
    const after = (await page.locator('.music-widget').boundingBox())!
    expect(after.x).toBeCloseTo(before.x - 120, 0)
    expect(after.y).toBeCloseTo(before.y - 180, 0)
    await expect(page.locator('.music-widget #music-panel')).toHaveCount(0)
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await page.touchscreen.tap(after.x + 24, after.y + 24)
    await expect(page.locator('.music-widget #music-panel')).toBeVisible()
    await page.screenshot({
      path: '../docs/screenshots/music-drag-touch.png',
      animations: 'disabled',
    })
  } finally {
    await context.close()
  }
})
