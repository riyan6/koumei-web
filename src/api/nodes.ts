import type { Node, NodeFormData } from '../types'
import { request } from './request'

const BASE_URL = '/api/admin/nodes'

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

// duplicateNode 复制指定节点，后端会自动将新节点名称追加 _clone。
export async function duplicateNode(id: number): Promise<Node> {
  const res = await request<Node>(`${BASE_URL}/duplicate`, { method: 'POST', body: JSON.stringify({ id }) })
  return res.data!
}
