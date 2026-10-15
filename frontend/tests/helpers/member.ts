import { expect, type Page } from '@playwright/test'
import { adminMutation } from './admin'

export const memberPassword = 'Browser-Member-Test-2026'
let cached: { email: string; nickname: string } | undefined
export async function mailLink(page: Page, email: string) {
  const messages = await (
    await page.request.get(`http://127.0.0.1:8092/inbox?email=${encodeURIComponent(email)}`)
  ).json()
  expect(messages.length).toBeGreaterThan(0)
  const url = /https?:\/\/[^\s]+/.exec(messages.at(-1).text)?.[0]
  expect(url).toBeTruthy()
  const parsed = new URL(url!)
  return parsed.pathname + parsed.search
}
export async function loginMember(page: Page) {
  if (!cached) {
    const email = `browser-${Date.now()}@example.com`
    expect(
      (
        await adminMutation(page, '/members/email', 'POST', { email, purpose: 'REGISTER' })
      ).status(),
    ).toBe(200)
    const link = new URL(await mailLink(page, email), 'http://localhost')
    const nickname = 'FeatureComment'
    expect(
      (
        await adminMutation(page, '/members/register', 'POST', {
          email,
          token: link.searchParams.get('token'),
          nickname,
          password: memberPassword,
        })
      ).status(),
    ).toBe(200)
    cached = { email, nickname }
  }
  expect(
    (
      await adminMutation(page, '/members/login', 'POST', {
        email: cached.email,
        password: memberPassword,
      })
    ).status(),
  ).toBe(200)
  return cached
}
