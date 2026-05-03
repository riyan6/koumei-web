import type { AdminUser, AdminUserFormData } from '../types'

const BASE_URL = '/api/admin/users'

interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data?: T
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const text = await res.text()
  let body: ApiResponse<T>
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(`服务器返回了非 JSON 响应 (${res.status})`)
  }
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || res.statusText)
  }
  return body
}

export async function fetchUsers(params?: { plan_id?: number; status?: number }): Promise<AdminUser[]> {
  const query = new URLSearchParams()
  if (params?.plan_id !== undefined) query.set('plan_id', String(params.plan_id))
  if (params?.status !== undefined) query.set('status', String(params.status))
  const qs = query.toString()
  const res = await request<AdminUser[]>(`${BASE_URL}${qs ? `?${qs}` : ''}`)
  return res.data ?? []
}

export async function fetchUserDetail(userId: number): Promise<AdminUser> {
  const res = await request<AdminUser>(`${BASE_URL}/detail?user_id=${userId}`)
  return res.data!
}

export async function createUser(data: AdminUserFormData): Promise<AdminUser> {
  const res = await request<AdminUser>(BASE_URL, { method: 'POST', body: JSON.stringify(data) })
  return res.data!
}

export async function updateUser(data: AdminUserFormData): Promise<AdminUser> {
  const res = await request<AdminUser>(BASE_URL, { method: 'PUT', body: JSON.stringify(data) })
  return res.data!
}

export async function deleteUser(id: number): Promise<void> {
  await request(BASE_URL, { method: 'DELETE', body: JSON.stringify({ id }) })
}

export async function assignPlan(userId: number, planId: number | null): Promise<AdminUser> {
  const res = await request<AdminUser>(`${BASE_URL}/assign-plan`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, plan_id: planId })
  })
  return res.data!
}
