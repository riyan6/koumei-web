import type { Plan, PlanFormData, PlanNode } from '../types'

const BASE_URL = '/api/admin/plans'

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

export async function fetchPlans(includeDisabled = false): Promise<Plan[]> {
  const res = await request<Plan[]>(`${BASE_URL}?include_disabled=${includeDisabled}`)
  return res.data ?? []
}

export async function createPlan(data: PlanFormData): Promise<Plan> {
  const res = await request<Plan>(BASE_URL, { method: 'POST', body: JSON.stringify(data) })
  return res.data!
}

export async function updatePlan(id: number, data: PlanFormData): Promise<Plan> {
  const res = await request<Plan>(BASE_URL, { method: 'PUT', body: JSON.stringify({ id, ...data }) })
  return res.data!
}

export async function deletePlan(id: number): Promise<void> {
  await request(BASE_URL, { method: 'DELETE', body: JSON.stringify({ id }) })
}

export async function fetchPlanNodes(planId: number): Promise<PlanNode[]> {
  const res = await request<PlanNode[]>(`${BASE_URL}/nodes?plan_id=${planId}`)
  return res.data ?? []
}

export async function setPlanNodes(planId: number, nodes: { node_id: number; sort: number }[]): Promise<void> {
  await request(`${BASE_URL}/nodes/set`, {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId, nodes })
  })
}
