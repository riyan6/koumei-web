<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Node } from '../../types'
import { createNode, updateNode } from '../../api/nodes'

const props = defineProps<{
  node?: Node | null
  modelValue?: boolean
}>()

const emit = defineEmits<{
  saved: []
  'update:modelValue': [value: boolean]
}>()

const toast = useToast()
const open = ref(props.modelValue ?? false)

watch(() => props.modelValue, (val) => { if (val !== undefined) open.value = val })
watch(open, (val) => emit('update:modelValue', val))

// ---- schema ----
const realitySettingsSchema = z.object({
  dest: z.string().min(1, '请填写伪装站点'),
  private_key: z.string().min(1, '请填写私钥'),
  public_key: z.string().min(1, '请填写公钥'),
  short_id: z.string().min(1, '请填写 Short ID'),
  server_name: z.string().optional(),
  utls: z.string().optional()
})

const schema = z.object({
  type: z.string().min(1),
  name: z.string().min(1, '节点名称不能为空'),
  listen_ip: z.string().min(1),
  server_port: z.number().int().min(1).max(65535),
  network: z.string(),
  tls: z.number().int(),
  flow: z.string().nullable(),
  cipher: z.string().nullable(),
  ws_enabled: z.boolean(),
  ws_url: z.string().nullable(),
  push_interval: z.number().int().min(1),
  pull_interval: z.number().int().min(1),
  enabled: z.boolean(),
  sort: z.number().int(),
  remarks: z.string().nullable(),
  reality: realitySettingsSchema.optional()
})

type Schema = z.output<typeof schema>

// ---- state ----
const defaultState = (): Partial<Schema> => ({
  type: 'vless',
  name: '',
  listen_ip: '0.0.0.0',
  server_port: 443,
  network: 'tcp',
  tls: 0,
  flow: null,
  cipher: null,
  ws_enabled: true,
  ws_url: null,
  push_interval: 60,
  pull_interval: 60,
  enabled: true,
  sort: 0,
  remarks: null,
  reality: undefined
})

const state = reactive<Partial<Schema>>(defaultState())

// reality sub-fields as a separate reactive object for easier binding
const reality = reactive({
  dest: '',
  private_key: '',
  public_key: '',
  short_id: '',
  server_name: '',
  utls: 'chrome'
})

// ---- computed ----
const isVless = computed(() => state.type === 'vless')
const isShadowsocks = computed(() => state.type === 'shadowsocks')
const isReality = computed(() => state.tls === 2)

// ---- fill form ----
function fillForm() {
  if (props.node) {
    const n = props.node
    Object.assign(state, {
      type: n.Type,
      name: n.Name,
      listen_ip: n.ListenIP,
      server_port: n.ServerPort,
      network: n.Network,
      tls: n.TLS,
      flow: n.Flow,
      cipher: n.Cipher,
      ws_enabled: n.WSEnabled,
      ws_url: n.WSURL,
      push_interval: n.PushInterval,
      pull_interval: n.PullInterval,
      enabled: n.Enabled,
      sort: n.Sort,
      remarks: n.Remarks
    })
    if (n.TLSSettings) {
      Object.assign(reality, {
        dest: n.TLSSettings.dest ?? '',
        private_key: n.TLSSettings.private_key ?? '',
        public_key: n.TLSSettings.public_key ?? '',
        short_id: n.TLSSettings.short_id ?? '',
        server_name: n.TLSSettings.server_name ?? '',
        utls: n.TLSSettings.utls ?? 'chrome'
      })
    }
  } else {
    Object.assign(state, defaultState())
    Object.assign(reality, { dest: '', private_key: '', public_key: '', short_id: '', server_name: '', utls: 'chrome' })
  }
}

onMounted(() => { if (open.value) fillForm() })
watch(open, (val) => { if (val) fillForm() })

// ---- submit ----
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const payload: Parameters<typeof createNode>[0] = {
    type: event.data.type,
    name: event.data.name,
    listen_ip: event.data.listen_ip,
    server_port: event.data.server_port,
    network: event.data.network,
    tls: event.data.tls,
    flow: isVless.value ? (event.data.flow ?? null) : null,
    decryption: isVless.value ? 'none' : null,
    cipher: isShadowsocks.value ? (event.data.cipher ?? null) : null,
    plugin: null,
    plugin_opts: null,
    server_key: null,
    tls_settings: isReality.value ? {
      dest: reality.dest,
      private_key: reality.private_key,
      public_key: reality.public_key,
      short_id: reality.short_id,
      server_name: reality.server_name || undefined,
      utls: reality.utls || undefined
    } : null,
    ws_enabled: event.data.ws_enabled,
    ws_url: event.data.ws_url ?? null,
    push_interval: event.data.push_interval,
    pull_interval: event.data.pull_interval,
    enabled: event.data.enabled,
    sort: event.data.sort,
    remarks: event.data.remarks ?? null
  }

  try {
    if (props.node) {
      await updateNode(props.node.ID, payload)
      toast.add({ title: '更新成功', description: `节点 "${payload.name}" 已更新`, color: 'success' })
    } else {
      await createNode(payload)
      toast.add({ title: '创建成功', description: `节点 "${payload.name}" 已创建`, color: 'success' })
    }
    open.value = false
    emit('saved')
  } catch (e: unknown) {
    toast.add({ title: '操作失败', description: (e as Error).message, color: 'error' })
  }
}

// ---- options ----
const typeOptions = [
  { label: 'VLESS', value: 'vless' },
  { label: 'Shadowsocks', value: 'shadowsocks' }
]

const networkOptions = [
  { label: 'TCP', value: 'tcp' },
  { label: 'WebSocket', value: 'ws' },
  { label: 'gRPC', value: 'grpc' }
]

const vlessTlsOptions = [
  { label: 'None', value: 0 },
  { label: 'Reality', value: 2 }
]

const flowOptions = [
  { label: 'none', value: null },
  { label: 'xtls-rprx-vision', value: 'xtls-rprx-vision' }
]

const cipherOptions = [
  { label: 'aes-128-gcm', value: 'aes-128-gcm' },
  { label: 'aes-256-gcm', value: 'aes-256-gcm' },
  { label: 'chacha20-ietf-poly1305', value: 'chacha20-ietf-poly1305' },
  { label: '2022-blake3-aes-128-gcm', value: '2022-blake3-aes-128-gcm' },
  { label: '2022-blake3-aes-256-gcm', value: '2022-blake3-aes-256-gcm' }
]

const utlsOptions = [
  { label: 'Chrome', value: 'chrome' },
  { label: 'Firefox', value: 'firefox' }
]
</script>

<template>
  <UModal
    v-model:open="open"
    :title="node ? '编辑节点' : '新增节点'"
    :description="node ? '修改节点信息' : '创建一个新的节点'"
    :ui="{ content: 'max-w-2xl' }"
  >
    <slot>
      <UButton label="新增节点" icon="i-lucide-plus" />
    </slot>

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

        <!-- 基础信息 -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="节点类型" name="type" required>
            <USelect v-model="state.type" :items="typeOptions" class="w-full" />
          </UFormField>
          <UFormField label="节点名称" name="name" required>
            <UInput v-model="state.name" class="w-full" placeholder="例如：VLESS-Reality节点" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="监听 IP" name="listen_ip">
            <UInput v-model="state.listen_ip" class="w-full" placeholder="0.0.0.0" />
          </UFormField>
          <UFormField label="服务端口" name="server_port" required>
            <UInput v-model.number="state.server_port" type="number" min="1" max="65535" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="网络类型" name="network">
            <USelect v-model="state.network" :items="networkOptions" class="w-full" />
          </UFormField>
          <UFormField label="排序" name="sort">
            <UInput v-model.number="state.sort" type="number" class="w-full" />
          </UFormField>
        </div>

        <!-- VLESS 专属 -->
        <template v-if="isVless">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="安全性" name="tls">
              <USelect v-model="state.tls" :items="vlessTlsOptions" class="w-full" />
            </UFormField>
            <UFormField label="流控 (Flow)" name="flow">
              <USelect
                :model-value="state.flow"
                :items="flowOptions"
                class="w-full"
                @update:model-value="(v: string | null) => state.flow = v"
              />
            </UFormField>
          </div>

          <!-- Reality 专属字段 -->
          <template v-if="isReality">
            <div class="rounded-lg border border-default p-4 space-y-4">
              <p class="text-sm font-medium text-highlighted">Reality 配置</p>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="伪装站点 (dest)" name="reality.dest" required>
                  <UInput v-model="reality.dest" class="w-full" placeholder="swdist.apple.com:443" />
                </UFormField>
                <UFormField label="Server Name" name="reality.server_name">
                  <UInput v-model="reality.server_name" class="w-full" placeholder="swdist.apple.com" />
                </UFormField>
              </div>

              <UFormField label="私钥 (Private Key)" name="reality.private_key" required>
                <UInput v-model="reality.private_key" class="w-full" placeholder="私钥" />
              </UFormField>

              <UFormField label="公钥 (Public Key)" name="reality.public_key" required>
                <UInput v-model="reality.public_key" class="w-full" placeholder="公钥" />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Short ID" name="reality.short_id" required>
                  <UInput v-model="reality.short_id" class="w-full" placeholder="例如：498d8d61" />
                </UFormField>
                <UFormField label="uTLS 指纹" name="reality.utls">
                  <USelect v-model="reality.utls" :items="utlsOptions" class="w-full" />
                </UFormField>
              </div>
            </div>
          </template>
        </template>

        <!-- Shadowsocks 专属 -->
        <template v-if="isShadowsocks">
          <UFormField label="加密方式" name="cipher" required>
            <USelect
              :model-value="state.cipher ?? undefined"
              :items="cipherOptions"
              class="w-full"
              placeholder="选择加密方式"
              @update:model-value="(v: string | undefined) => state.cipher = v ?? null"
            />
          </UFormField>
        </template>

        <!-- WebSocket & 通用 -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="WebSocket URL" name="ws_url">
            <UInput
              :model-value="state.ws_url ?? ''"
              class="w-full"
              placeholder="ws://127.0.0.1:8893/ws"
              @update:model-value="(v: string) => state.ws_url = v || null"
            />
          </UFormField>
          <UFormField label="备注" name="remarks">
            <UInput
              :model-value="state.remarks ?? ''"
              class="w-full"
              placeholder="可选"
              @update:model-value="(v: string) => state.remarks = v || null"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="推送间隔 (秒)" name="push_interval">
            <UInput v-model.number="state.push_interval" type="number" min="1" class="w-full" />
          </UFormField>
          <UFormField label="拉取间隔 (秒)" name="pull_interval">
            <UInput v-model.number="state.pull_interval" type="number" min="1" class="w-full" />
          </UFormField>
        </div>

        <div class="flex items-center gap-6">
          <UFormField label="启用 WebSocket" name="ws_enabled">
            <USwitch v-model="state.ws_enabled" />
          </UFormField>
          <UFormField label="启用节点" name="enabled">
            <USwitch v-model="state.enabled" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton label="取消" color="neutral" variant="subtle" @click="open = false" />
          <UButton :label="node ? '保存' : '创建'" color="primary" variant="solid" type="submit" loading-auto />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
