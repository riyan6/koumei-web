<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import * as z from 'zod'
import nacl from 'tweetnacl'
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

// 表单校验规则
const schema = z.object({
  type: z.string().default('vless'),
  name: z.string().min(1, '节点名称不能为空'),
  host: z.string().min(1, '主机不能为空'),
  port: z.number().int().min(1).max(65535, '端口必须在 1-65535 之间'),
  sort: z.number().int().min(0),
  remarks: z.string().nullable().optional(),
  show: z.boolean().default(true),
  // Reality settings
  reality_short_id: z.string().min(1, '请填写 Short ID'),
  reality_private_key: z.string().min(1, '请填写私钥'),
  reality_public_key: z.string().min(1, '请填写公钥'),
  reality_server_name: z.string().min(1, '请填写 Server Name'),
  reality_server_port: z.number().int().min(1).max(65535),
  reality_allow_insecure: z.boolean().default(false),
  utls_fingerprint: z.string().default('chrome')
})

type Schema = z.output<typeof schema>

// 表单默认值
const defaultState = (): Partial<Schema> => ({
  type: 'vless',
  name: '',
  host: '',
  port: 443,
  sort: 0,
  remarks: null,
  show: true,
  reality_short_id: '',
  reality_private_key: '',
  reality_public_key: '',
  reality_server_name: '',
  reality_server_port: 443,
  reality_allow_insecure: false,
  utls_fingerprint: 'chrome'
})

const state = reactive<Partial<Schema>>(defaultState())

// 填充表单数据（编辑时回填节点信息，新增时重置为默认值）
const fillForm = () => {
  if (props.node) {
    const n = props.node
    Object.assign(state, {
      type: n.type,
      name: n.name,
      host: n.host || '',
      port: n.port || 443,
      sort: n.sort,
      remarks: n.remarks || null,
      show: n.show
    })

    // 从 protocol_settings 中提取 Reality 相关配置
    if (n.protocol_settings) {
      const settings = n.protocol_settings as Record<string, any>
      const realitySettings = settings.reality_settings || {}
      const utlsSettings = settings.utls || {}

      Object.assign(state, {
        reality_short_id: realitySettings.short_id || '',
        reality_private_key: realitySettings.private_key || '',
        reality_public_key: realitySettings.public_key || '',
        reality_server_name: realitySettings.server_name || '',
        reality_server_port: realitySettings.server_port || 443,
        reality_allow_insecure: realitySettings.allow_insecure || false,
        utls_fingerprint: utlsSettings.fingerprint || 'chrome'
      })
    }
  } else {
    Object.assign(state, defaultState())
  }
}

onMounted(() => { if (open.value) fillForm() })
watch(open, (val) => { if (val) fillForm() })

// 提交表单（组装 payload 并调用新增/更新接口）
const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  const payload = {
    type: 'vless',
    name: event.data.name,
    host: event.data.host,
    port: event.data.port,
    protocol_settings: {
      tls: 2, // REALITY
      flow: 'xtls-rprx-vision',
      utls: {
        enabled: true,
        fingerprint: event.data.utls_fingerprint
      },
      network: 'tcp',
      multiplex: {
        brutal: {
          enabled: false
        },
        enabled: false,
        padding: false,
        protocol: 'yamux'
      },
      encryption: {
        enabled: false
      },
      network_settings: {
        header: {
          type: 'none'
        }
      },
      reality_settings: {
        short_id: event.data.reality_short_id,
        public_key: event.data.reality_public_key,
        private_key: event.data.reality_private_key,
        server_name: event.data.reality_server_name,
        server_port: event.data.reality_server_port,
        allow_insecure: event.data.reality_allow_insecure
      }
    },
    show: event.data.show,
    sort: event.data.sort,
    remarks: event.data.remarks
  }

  try {
    if (props.node) {
      await updateNode(props.node.id, payload)
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

// 将 Uint8Array 转为 base64url 编码字符串
const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

// 生成 X25519 密钥对（Reality 协议使用）
const generateRealityKeyPair = () => {
  const kp = nacl.box.keyPair()
  state.reality_private_key = toBase64Url(kp.secretKey)
  state.reality_public_key = toBase64Url(kp.publicKey)
}

// 生成随机 Short ID（16 位 hex 字符串）
const generateShortId = () => {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  state.reality_short_id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

const utlsOptions = [
  { label: 'Chrome', value: 'chrome' },
  { label: 'Firefox', value: 'firefox' }
]
</script>

<template>
  <UModal
    v-model:open="open"
    :title="node ? '编辑节点' : '新增节点'"
    :description="node ? '修改节点信息' : '创建一个新的节点 (VLESS-Reality-Vision)'"
    :ui="{ content: 'max-w-2xl' }"
  >
    <slot>
      <UButton label="新增节点" icon="i-lucide-plus" />
    </slot>

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

        <!-- 基础信息 -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="节点名称" name="name" required>
            <UInput v-model="state.name" class="w-full" placeholder="例如：VLESS-Reality节点" />
          </UFormField>
          <UFormField label="排序" name="sort">
            <UInput v-model.number="state.sort" type="number" class="w-full" />
          </UFormField>
        </div>

        <!-- 网络配置 -->
        <div class="rounded-lg border border-default p-4 space-y-4">
          <p class="text-sm font-medium text-highlighted">网络配置</p>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="主机 IP" name="host" required>
              <UInput v-model="state.host" class="w-full" placeholder="127.0.0.1" />
            </UFormField>
            <UFormField label="端口" name="port" required>
              <UInput v-model.number="state.port" type="number" min="1" max="65535" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Reality 配置 -->
        <div class="rounded-lg border border-default p-4 space-y-4">
          <p class="text-sm font-medium text-highlighted">Reality 配置</p>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Server Name" name="reality_server_name" required>
              <UInput v-model="state.reality_server_name" class="w-full" placeholder="www.amd.com" />
            </UFormField>
            <UFormField label="Server Port" name="reality_server_port" required>
              <UInput v-model.number="state.reality_server_port" type="number" min="1" max="65535" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="私钥 (Private Key)" name="reality_private_key" required>
            <div class="flex gap-2">
              <UInput v-model="state.reality_private_key" class="w-full" placeholder="私钥" />
              <UButton label="生成" color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="generateRealityKeyPair" />
            </div>
          </UFormField>

          <UFormField label="公钥 (Public Key)" name="reality_public_key" required>
            <div class="flex gap-2">
              <UInput v-model="state.reality_public_key" class="w-full" placeholder="公钥" />
              <UButton label="生成" color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="generateRealityKeyPair" />
            </div>
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Short ID" name="reality_short_id" required>
              <div class="flex gap-2">
                <UInput v-model="state.reality_short_id" class="w-full" placeholder="例如：9f2e807212cadb" />
                <UButton label="生成" color="neutral" variant="subtle" icon="i-lucide-refresh-cw" @click="generateShortId" />
              </div>
            </UFormField>
            <UFormField label="uTLS 指纹" name="utls_fingerprint">
              <USelect v-model="state.utls_fingerprint" :items="utlsOptions" class="w-full" />
            </UFormField>
          </div>

          <div class="flex items-center gap-6">
            <UFormField label="允许不安全连接" name="reality_allow_insecure">
              <USwitch v-model="state.reality_allow_insecure" />
            </UFormField>
          </div>
        </div>

        <!-- 备注和状态 -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="备注" name="remarks">
            <UInput
              :model-value="state.remarks ?? ''"
              class="w-full"
              placeholder="可选"
              @update:model-value="(v: string) => state.remarks = v || null"
            />
          </UFormField>
          <div class="flex items-center">
            <UFormField label="启用节点" name="show">
              <USwitch v-model="state.show" />
            </UFormField>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton label="取消" color="neutral" variant="subtle" @click="open = false" />
          <UButton :label="node ? '保存' : '创建'" color="primary" variant="solid" type="submit" loading-auto />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
