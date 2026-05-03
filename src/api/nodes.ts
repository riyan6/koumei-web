import type { Node, NodeFormData } from '../types'

const BASE_URL = '/api/admin/nodes'

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

export async function fetchNodes(includeDisabled = false): Promise<Node[]> {
  const res = await request<Node[]>(`${BASE_URL}?include_disabled=${includeDisabled}`)
  return res.data ?? []
}

export async function createNode(data: NodeFormData): Promise<Node> {
  const res = await request<Node>(BASE_URL, { method: 'POST', body: JSON.stringify(data) })
  return res.data!
}

export async function updateNode(id: number, data: NodeFormData): Promise<Node> {
  const res = await request<Node>(BASE_URL, { method: 'PUT', body: JSON.stringify({ id, ...data }) })
  return res.data!
}

export async function deleteNode(id: number): Promise<void> {
  await request(BASE_URL, { method: 'DELETE', body: JSON.stringify({ id }) })
}
