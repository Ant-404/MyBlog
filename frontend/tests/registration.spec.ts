import { test, expect } from '@playwright/test'
import { memberPassword } from './helpers/member'

test('code cooldown survives tab changes and permits retry after 60 seconds', async ({ page }) => {
  await page.clock.install()
  let requests = 0
  await page.route('**/api/v1/members/email', async (route) => {
    requests++
    await route.fulfill({ json: { data: null } })
  })
  await page.goto('/account?mode=register')
  await page.getByLabel('邮箱', { exact: true }).fill('cooldown@example.com')
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  await expect(page.getByRole('button', { name: /秒后可重新发送/ })).toBeDisabled()
  await expect(
    page.getByText('请在当前页面输入邮件中的 6 位验证码。', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await page.getByRole('button', { name: '注册', exact: true }).click()
  await expect(page.getByRole('button', { name: /秒后可重新发送/ })).toBeDisabled()
  expect(requests).toBe(1)
  await page.clock.fastForward(61_000)
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  await expect.poll(() => requests).toBe(2)
})

test('wrong codes retain input and allow another code without leaving the page', async ({
  page,
}) => {
  await page.route('**/api/v1/members/register', (route) =>
    route.fulfill({ status: 400, json: { message: '验证码错误或已过期，请重新获取' } }),
  )
  await page.route('**/api/v1/members/email', (route) => route.fulfill({ json: { data: null } }))
  await page.goto('/account?mode=register')
  await page.getByLabel('邮箱', { exact: true }).fill('retry@example.com')
  await page.getByLabel('邮箱验证码', { exact: true }).fill('012345')
  await page.getByLabel('昵称', { exact: true }).fill('重试用户')
  await page.getByLabel('密码', { exact: true }).fill(memberPassword)
  await page.getByLabel('确认密码', { exact: true }).fill(memberPassword)
  await page.getByRole('button', { name: '完成注册', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('验证码错误或已过期')
  await expect(page.getByLabel('昵称', { exact: true })).toHaveValue('重试用户')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue(memberPassword)
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('验证码将发送')
  await expect(page.getByLabel('邮箱验证码', { exact: true })).toHaveValue('')
  await expect(page).toHaveURL(/\/account\?mode=register$/)
})

test('registration validates input and accepts issued codes while sending is disabled', async ({
  page,
}) => {
  await page.route('**/api/v1/members/config', (route) =>
    route.fulfill({ json: { data: { mailEnabled: false } } }),
  )
  let requests = 0
  await page.route('**/api/v1/members/register', async (route) => {
    requests++
    expect(route.request().postDataJSON()).toMatchObject({ nickname: '测试用户', code: '012345' })
    expect(route.request().postDataJSON()).not.toHaveProperty('token')
    await route.fulfill({ json: { data: {} } })
  })
  await page.goto('/account?mode=register')
  await page.getByLabel('邮箱', { exact: true }).fill('valid@example.com')
  await page.getByLabel('邮箱验证码', { exact: true }).fill('012345')
  await expect(page.getByRole('button', { name: '获取验证码', exact: true })).toBeDisabled()
  await page.getByLabel('昵称', { exact: true }).fill('   ')
  await page.getByLabel('密码', { exact: true }).fill(memberPassword)
  await page.getByLabel('确认密码', { exact: true }).fill(memberPassword)
  await page.getByRole('button', { name: '完成注册', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('请输入昵称')
  await page.getByLabel('昵称', { exact: true }).fill('  测试用户  ')
  await page.getByLabel('确认密码', { exact: true }).fill('Different-password')
  await page.getByRole('button', { name: '完成注册', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('两次输入的密码不一致')
  await page.getByLabel('密码', { exact: true }).fill('密'.repeat(25))
  await page.getByLabel('确认密码', { exact: true }).fill('密'.repeat(25))
  await page.getByRole('button', { name: '完成注册', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('72 字节')
  expect(requests).toBe(0)
  await page.getByLabel('密码', { exact: true }).fill(memberPassword)
  await page.getByLabel('确认密码', { exact: true }).fill(memberPassword)
  await page.getByRole('button', { name: '完成注册', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('注册完成，请登录')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
  expect(requests).toBe(1)
})

test('old verification links discard credentials and request a code', async ({ page }) => {
  await page.goto('/account?mode=register&email=old%40example.com&token=old-link')
  await expect(page).not.toHaveURL(/token=|email=/)
  await expect(page.getByRole('status').filter({ hasText: '现在使用邮箱验证码' })).toBeVisible()
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('邮箱验证码', { exact: true })).toHaveValue('')
})

test('both login forms start empty and mode changes clear passwords and codes', async ({
  page,
}) => {
  await page.goto('/account')
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveAttribute('autocomplete', 'off')
  await page.getByRole('button', { name: '注册', exact: true }).click()
  await page.getByLabel('邮箱验证码', { exact: true }).fill('012345')
  await page.getByLabel('密码', { exact: true }).fill(memberPassword)
  await page.getByLabel('确认密码', { exact: true }).fill(memberPassword)
  await page.getByRole('link', { name: '用户登录与注册', exact: true }).click()
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('确认密码', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '找回密码', exact: true }).click()
  await expect(page.getByLabel('邮箱验证码', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
  await page.goto('/admin/login')
  await expect(page.getByLabel('管理员账号', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
})
