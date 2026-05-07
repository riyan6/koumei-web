<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Node } from '../../types'

const props = defineProps<{
  node: Node
  modelValue?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const toast = useToast()
const open = ref(props.modelValue ?? false)
const activeTab = ref('init')

watch(() => props.modelValue, (val) => {
  if (val !== undefined) {
    open.value = val
  }
})

watch(open, (val) => {
  emit('update:modelValue', val)
})

const tabs = [
  { label: '初始化脚本', value: 'init' },
  { label: '替换配置脚本', value: 'replace' }
]

// nodeSettings 解析节点协议配置
const nodeSettings = computed<Record<string, any>>(() => props.node.protocol_settings || {})

// realitySettings 解析 Reality 配置
const realitySettings = computed<Record<string, any>>(() => nodeSettings.value.reality_settings || {})

// isShadowsocks 判断当前节点是否为 Shadowsocks。
const isShadowsocks = computed(() => ['shadowsocks', 'ss'].includes(props.node.type.toLowerCase()))

// shadowsocksCipher 获取 Shadowsocks 加密算法。
const shadowsocksCipher = computed(() => String(nodeSettings.value.cipher || '未配置'))

// inboundTag 生成 sing-box inbound tag
const inboundTag = computed(() => props.node.uuid || `node-${props.node.id}`)

// serverName 获取握手域名
const serverName = computed(() => realitySettings.value.server_name || 'www.apple.com')

// realityShortId 获取 short id
const realityShortId = computed(() => realitySettings.value.short_id || '')

// installConfigJson 生成初始化配置文件
const installConfigJson = computed(() => buildSingBoxConfig(props.node))

// replaceConfigJson 生成替换配置文件
const replaceConfigJson = computed(() => buildSingBoxConfig(props.node))

// initScript 初始化脚本内容
const initScript = computed(() => `#!/usr/bin/env bash
set -euo pipefail
export LANG=en_US.UTF-8

# ========== UI ==========
red()   { echo -e "\\e[1;91m$*\\033[0m"; }
green() { echo -e "\\e[1;32m$*\\033[0m"; }
yellow(){ echo -e "\\e[1;33m$*\\033[0m"; }
purple(){ echo -e "\\e[1;35m$*\\033[0m"; }
reading(){ read -r -p "$(red "$1")" "$2"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

purple "开始运行..."

purple "使用官方脚本安装/更新 sing-box..."
curl -fsSL https://sing-box.app/install.sh | sh

command_exists sing-box || { red "sing-box 安装失败：未找到 sing-box 命令"; exit 1; }

yellow "尝试启动官方 sing-box 服务（如果已存在）..."
systemctl daemon-reload >/dev/null 2>&1 || true
systemctl enable sing-box >/dev/null 2>&1 || true
systemctl restart sing-box >/dev/null 2>&1 || true

mkdir -p /etc/sing-box/
wget -O /etc/sing-box/geoip.db https://github.com/SagerNet/sing-geoip/releases/latest/download/geoip.db
wget -O /etc/sing-box/geosite.db https://github.com/SagerNet/sing-geosite/releases/latest/download/geosite.db

green "sing-box 已安装（若官方服务存在，已尝试启动）。"

sudo tee /etc/sing-box/config.json > /dev/null <<'EOF'
${installConfigJson.value}
EOF

chmod 600 /etc/sing-box/config.json
systemctl restart sing-box
systemctl status sing-box --no-pager
`)

// replaceScript 替换配置脚本内容
const replaceScript = computed(() => `#!/usr/bin/env bash
set -euo pipefail
export LANG=en_US.UTF-8

red()   { echo -e "\\e[1;91m$*\\033[0m"; }
green() { echo -e "\\e[1;32m$*\\033[0m"; }
yellow(){ echo -e "\\e[1;33m$*\\033[0m"; }

yellow "开始替换 sing-box 配置..."

sudo tee /etc/sing-box/config.json > /dev/null <<'EOF'
${replaceConfigJson.value}
EOF

chmod 600 /etc/sing-box/config.json
systemctl restart sing-box
systemctl status sing-box --no-pager

green "配置已替换并重启 sing-box。"
`)

// currentScript 当前选中的脚本内容
const currentScript = computed(() => activeTab.value === 'replace' ? replaceScript.value : initScript.value)

// copyScript 一键复制脚本
async function copyScript() {
  try {
    await navigator.clipboard.writeText(currentScript.value)
    toast.add({
      title: '脚本已复制',
      description: `${props.node.name} 的 ${activeTab.value === 'replace' ? '替换配置脚本' : '初始化脚本'} 已复制到剪贴板。`,
      color: 'success'
    })
  } catch {
    toast.add({
      title: '复制失败',
      description: '请手动复制脚本内容。',
      color: 'error'
    })
  }
}

// buildSingBoxConfig 根据节点生成 sing-box 配置
function buildSingBoxConfig(node: Node): string {
  const settings = (node.protocol_settings || {}) as Record<string, any>
  const inbound = buildSingBoxInbound(node, settings)

  const config = {
    log: {
      level: 'error',
      timestamp: true
    },
    dns: {
      servers: [
        {
          tag: 'local',
          type: 'local'
        }
      ]
    },
    ntp: {
      enabled: true,
      server: 'time.apple.com',
      server_port: 123,
      interval: '30m'
    },
    inbounds: [inbound],
    outbounds: [
      {
        type: 'direct',
        tag: 'direct',
        domain_resolver: {
          server: 'local',
          strategy: 'prefer_ipv6'
        }
      },
      {
        type: 'block',
        tag: 'block'
      }
    ],
    route: {
      rules: [
        {
          protocol: 'bittorrent',
          outbound: 'block'
        },
        {
          domain_regex: [
            '(^|\\\\.)dafahao\\\\.(org|com|net)$',
            '(^|\\\\.)mingjinglive\\\\.(org|com|net)$',
            '(^|\\\\.)botanwang\\\\.(org|com|net)$',
            '(^|\\\\.)minghui\\\\.(org|com|net)$',
            '(^|\\\\.)dongtaiwang\\\\.(org|com|net)$',
            '(^|\\\\.)falunaz\\\\.(org|com|net)$',
            '(^|\\\\.)epochtimes\\\\.(org|com|net)$',
            '(^|\\\\.)ntdtv\\\\.(org|com|net)$',
            '(^|\\\\.)falundafa\\\\.(org|com|net)$',
            '(^|\\\\.)falungong\\\\.(org|com|net)$',
            '(^|\\\\.)wujieliulan\\\\.(org|com|net)$',
            '(^|\\\\.)zhengjian\\\\.(org|com|net)$',
            '(^|\\\\.)pincong\\\\.rocks$'
          ],
          outbound: 'block'
        }
      ],
      final: 'direct'
    }
  }

  return JSON.stringify(config, null, 2)
}

// buildSingBoxInbound 根据协议类型生成 sing-box 入站配置。
function buildSingBoxInbound(node: Node, settings: Record<string, any>) {
  if (['shadowsocks', 'ss'].includes(node.type.toLowerCase())) {
    return {
      type: 'shadowsocks',
      tag: inboundTag.value,
      listen: '::',
      listen_port: node.port,
      method: String(settings.cipher || ''),
      password: String(settings.password || '')
    }
  }

  const reality = (settings.reality_settings || {}) as Record<string, any>
  const server = reality.server_name || 'www.apple.com'
  const shortId = reality.short_id ? [String(reality.short_id)] : []

  return {
    type: 'vless',
    tag: inboundTag.value,
    listen: '::',
    listen_port: node.port,
    users: [
      {
        uuid: node.uuid || '',
        flow: settings.flow || 'xtls-rprx-vision'
      }
    ],
    tls: {
      enabled: true,
      server_name: server,
      reality: {
        enabled: true,
        handshake: {
          server,
          server_port: Number(reality.server_port || 443)
        },
        private_key: String(reality.private_key || ''),
        short_id: shortId
      }
    }
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="`部署到 sing-box · ${node.name}`"
    :description="`已根据当前节点信息自动生成安装与替换配置脚本。`"
    :ui="{ content: 'max-w-4xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg border border-default p-3">
            <p class="text-xs text-muted">节点类型</p>
            <p class="mt-1 text-sm font-medium text-highlighted">{{ node.type.toUpperCase() }}</p>
          </div>
          <div class="rounded-lg border border-default p-3">
            <p class="text-xs text-muted">监听地址</p>
            <p class="mt-1 text-sm font-medium text-highlighted">{{ node.host || '::' }}:{{ node.port }}</p>
          </div>
          <div class="rounded-lg border border-default p-3">
            <p class="text-xs text-muted">{{ isShadowsocks ? '加密算法' : '节点 UUID' }}</p>
            <p class="mt-1 text-sm font-medium text-highlighted break-all">
              {{ isShadowsocks ? shadowsocksCipher : (node.uuid || '未配置') }}
            </p>
          </div>
          <div class="rounded-lg border border-default p-3">
            <p class="text-xs text-muted">{{ isShadowsocks ? '协议密码' : 'Reality 信息' }}</p>
            <p class="mt-1 text-sm font-medium text-highlighted break-all">
              {{ isShadowsocks ? '已写入配置文件' : `${serverName} / ${realityShortId || '未配置 short_id'}` }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3">
          <UTabs v-model="activeTab" :items="tabs" class="flex-1" />
          <UButton
            label="复制脚本"
            icon="i-lucide-copy"
            color="primary"
            variant="solid"
            @click="copyScript"
          />
        </div>

        <UTextarea
          :model-value="currentScript"
          :rows="26"
          readonly
          :autoresize="false"
          class="w-full font-mono"
          :ui="{ base: 'font-mono text-xs leading-6' }"
        />

        <div class="rounded-lg bg-elevated/50 p-3 text-xs text-muted space-y-1">
          <p>1. 初始化脚本适合首次部署 sing-box。</p>
          <p>2. 替换配置脚本适合节点参数更新后快速覆盖 `/etc/sing-box/config.json`。</p>
          <p>3. 执行前请确认 VPS 的系统为 systemd 环境，并且节点端口已放行。</p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
