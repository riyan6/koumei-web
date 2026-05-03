// AUTH_TOKEN_KEY 登录 token 在 localStorage 中的存储键
export const AUTH_TOKEN_KEY = 'koumei_admin_token'

// AuthUser 登录用户信息
export interface AuthUser {
  id: number
  email: string | null
  uuid: string
  is_admin: number
}

// LoginResponse 登录响应
export interface LoginResponse {
  token: string
  expires_at: number
  user: AuthUser
}

// AUTH_PROFILE_KEY 当前登录用户信息缓存键
export const AUTH_PROFILE_KEY = 'koumei_admin_profile'

// getAuthToken 获取当前登录 token
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

// setAuthToken 保存登录 token
export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

// clearAuthToken 清理登录 token
export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_PROFILE_KEY)
}

// isAuthenticated 判断当前是否已登录
export function isAuthenticated(): boolean {
  return Boolean(getAuthToken())
}

// setAuthProfile 保存当前登录用户信息
export function setAuthProfile(user: AuthUser): void {
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(user))
}

// getAuthProfile 获取当前登录用户信息
export function getAuthProfile(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_PROFILE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem(AUTH_PROFILE_KEY)
    return null
  }
}
