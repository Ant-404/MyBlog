export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'same-origin',
    signal: options.signal || AbortSignal.timeout(10000),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok)
    throw new HttpError(body?.message || `请求失败（${response.status}）`, response.status)
  return body.data as T
}

export async function mutate<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const csrf = await request<{ token: string; headerName: string }>('/auth/csrf')
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
