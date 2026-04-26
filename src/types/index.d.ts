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
  ID: number
  PlanID: number
  NodeID: number
  Sort: number
  Node?: {
    ID: number
    Type: string
    Name: string
  }
}

export interface Plan {
  ID: number
  Name: string
  TransferEnable: number
  SpeedLimit: number | null
  DeviceLimit: number | null
  Show: boolean
  Sort: number
  Content: string
  Enabled: boolean
  CreatedAt: string
  UpdatedAt: string
  PlanNodes?: PlanNode[]
}

export interface PlanFormData {
  name: string
  transfer_enable: number
  speed_limit: number | null
  device_limit: number | null
  show: boolean
  sort: number
  content: string
  enabled: boolean
}

export interface NodeTLSSettings {
  dest?: string
  short_id?: string
  public_key?: string
  private_key?: string
  server_name?: string
  server_port?: number | string
  allow_insecure?: boolean
  utls?: string
}

export interface Node {
  ID: number
  Type: string
  Name: string
  ListenIP: string
  ServerPort: number
  Network: string
  TLS: number
  Flow: string | null
  Decryption: string | null
  Cipher: string | null
  Plugin: string | null
  PluginOpts: string | null
  ServerKey: string | null
  TLSSettings: NodeTLSSettings | null
  WSEnabled: boolean
  WSURL: string | null
  PushInterval: number
  PullInterval: number
  Enabled: boolean
  Sort: number
  Remarks: string | null
  CreatedAt: string
  UpdatedAt: string
  PlanNodes?: {
    ID: number
    PlanID: number
    NodeID: number
    Sort: number
    Plan?: { ID: number; Name: string }
  }[]
}

export interface NodeFormData {
  type: string
  name: string
  listen_ip: string
  server_port: number
  network: string
  tls: number
  flow: string | null
  decryption: string | null
  cipher: string | null
  plugin: string | null
  plugin_opts: string | null
  server_key: string | null
  tls_settings: NodeTLSSettings | null
  ws_enabled: boolean
  ws_url: string | null
  push_interval: number
  pull_interval: number
  enabled: boolean
  sort: number
  remarks: string | null
}
