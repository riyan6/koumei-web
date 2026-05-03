import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: User
  body: string
  date: string
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export interface PlanNode {
  id: number
  plan_id: number
  node_id: number
  sort: number
  node?: {
    id: number
    type: string
    name: string
  }
}

export interface Plan {
  id: number
  name: string
  show: boolean
  sort: number
  content: string
  enabled: boolean
  node_ids: number[]
  created_at: string
  updated_at: string
}

export interface PlanFormData {
  name: string
  show: boolean
  sort: number
  content: string
  enabled: boolean
}

export interface Node {
  id: number
  type: string
  name: string
  host: string | null
  port: number
  protocol_settings: Record<string, any> | null
  show: boolean
  sort: number
  remarks: string | null
  created_at: string
  updated_at: string
}

export interface NodeFormData {
  type: string
  name: string
  host?: string | null
  port: number
  protocol_settings: Record<string, any>
  show?: boolean
  sort: number
  remarks?: string | null
}

export interface AdminUser {
  id: number
  email: string | null
  uuid: string
  plan_id: number | null
  status: number
  is_admin: number
  remarks: string | null
  created_at: string
  updated_at: string
}

export interface AdminUserFormData {
  id?: number
  email?: string | null
  password?: string | null
  plan_id?: number | null
  status?: number
  is_admin?: number
  remarks?: string | null
}
