import { buildServerUrl } from './config'
import { clearAuthToken, getAuthToken } from '../utils/auth'

// ApiResponse 通用接口响应
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data?: T
  error?: string
}

// RequestOptions 扩展请求参数，支持跳过鉴权
export interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

// request 统一请求封装，自动附带 token，并在 401/403 时清理登录态
export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { skipAuth = false, headers, ...restOptions } = options
  const token = skipAuth ? null : getAuthToken()
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> || {})
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  const res = await fetch(buildServerUrl(path), {
    ...restOptions,
    // JWT 通过 Authorization 头传递，跨域请求不携带 Cookie，避免和 CF 的 * CORS 头冲突。
    credentials: 'omit',
    headers: requestHeaders
  })

  const text = await res.text()
  let body: ApiResponse<T>

  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(`服务器返回了非 JSON 响应 (${res.status})`)
  }

  if (res.status === 401 || res.status === 403) {
    clearAuthToken()
  }

  if (!res.ok || body.code !== 0) {
    throw new Error(body.error || body.msg || `请求失败（${res.status}）`)
  }

  return body
}
