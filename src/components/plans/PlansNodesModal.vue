<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import type { Plan, Node } from '../../types'
import { fetchPlanNodes, setPlanNodes } from '../../api/plans'
import { fetchNodes } from '../../api/nodes'

const props = defineProps<{
  plan: Plan
  modelValue?: boolean
}>()

const emit = defineEmits<{
  saved: []
  'update:modelValue': [value: boolean]
}>()

const open = ref(props.modelValue ?? false)

watch(() => props.modelValue, (val) => {
  if (val !== undefined) open.value = val
})

watch(open, (val) => {
  emit('update:modelValue', val)
})

const toast = useToast()
const loading = ref(false)
const saving = ref(false)

const allNodes = ref<Node[]>([])
const selectedNodeIds = ref<number[]>([])

const loadNodes = async () => {
  loading.value = true
  try {
    const [nodes, planNodes] = await Promise.all([
      fetchNodes(true),
      fetchPlanNodes(props.plan.id)
    ])
    allNodes.value = nodes
    selectedNodeIds.value = planNodes.map(pn => pn.node_id)
  } catch (e: unknown) {
    toast.add({ title: '加载失败', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (open.value) loadNodes()
})

watch(open, (val) => {
  if (val) loadNodes()
})

const nodeList = computed(() =>
  allNodes.value.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    host: node.host,
    port: node.port,
    selected: selectedNodeIds.value.includes(node.id)
  }))
)

function toggleNode(nodeId: number) {
  const idx = selectedNodeIds.value.indexOf(nodeId)
  if (idx === -1) {
    selectedNodeIds.value.push(nodeId)
  } else {
    selectedNodeIds.value.splice(idx, 1)
  }
}

async function onSave() {
  saving.value = true
  try {
    const nodes = selectedNodeIds.value.map((nodeId, index) => ({
      node_id: nodeId,
      sort: index
    }))
    await setPlanNodes(props.plan.id, nodes)
    toast.add({ title: '保存成功', description: `套餐 "${props.plan.name}" 的节点已更新`, color: 'success' })
    open.value = false
    emit('saved')
  } catch (e: unknown) {
    toast.add({ title: '保存失败', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="分配节点"
    :description="`为套餐「${plan.name}」分配节点`"
    :ui="{ content: 'max-w-2xl' }"
  >
    <slot />

    <template #body>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-primary" />
      </div>

      <div v-else class="space-y-4">
        <div class="text-sm text-muted">
          已选择 {{ selectedNodeIds.length }} 个节点
        </div>

        <div class="border border-default rounded-lg divide-y divide-default max-h-96 overflow-y-auto">
          <div
            v-for="node in nodeList"
            :key="node.id"
            class="flex items-center justify-between p-3 hover:bg-elevated/50 cursor-pointer"
            @click="toggleNode(node.id)"
          >
            <div class="flex items-center gap-3">
              <UCheckbox
                :model-value="node.selected"
                @update:model-value="toggleNode(node.id)"
              />
              <div>
                <p class="font-medium text-highlighted">{{ node.name }}</p>
                <p class="text-xs text-muted">
                  {{ node.type.toUpperCase() }} · {{ node.host }}:{{ node.port }}
                </p>
              </div>
            </div>
            <UBadge variant="subtle" :color="node.selected ? 'success' : 'neutral'">
              {{ node.selected ? '已选' : '未选' }}
            </UBadge>
          </div>

          <div v-if="nodeList.length === 0" class="p-4 text-center text-muted">
            暂无可用节点
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <UButton label="取消" color="neutral" variant="subtle" @click="open = false" />
        <UButton label="保存" color="primary" variant="solid" :loading="saving" @click="onSave" />
      </div>
    </template>
  </UModal>
</template>
