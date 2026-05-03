import { request } from './request'
import type { LoginResponse } from '../utils/auth'

// LoginRequest 登录请求
export interface LoginRequest {
  email: string
  password: string
}

// ProfileResponse 当前登录用户信息
export interface ProfileResponse {
  id: number
  email: string | null
  uuid: string
  plan_id: number | null
  status: number
  is_admin: number
}

// login 管理后台登录
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true
  })
  return res.data!
}

// getProfile 获取当前登录用户信息
export async function getProfile(): Promise<ProfileResponse> {
  const res = await request<ProfileResponse>('/api/auth/profile')
  return res.data!
}
