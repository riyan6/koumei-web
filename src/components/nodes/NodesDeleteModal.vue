<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Node } from '../../types'
import { deleteNode } from '../../api/nodes'

const props = defineProps<{
  node: Node
  modelValue?: boolean
}>()

const emit = defineEmits<{
  deleted: []
  'update:modelValue': [value: boolean]
}>()

const open = ref(props.modelValue ?? false)
watch(() => props.modelValue, (val) => { if (val !== undefined) open.value = val })
watch(open, (val) => emit('update:modelValue', val))

const toast = useToast()

async function onConfirm() {
  try {
    await deleteNode(props.node.id)
    toast.add({ title: '删除成功', description: `节点 "${props.node.name}" 已删除`, color: 'success' })
    open.value = false
    emit('deleted')
  } catch (e: unknown) {
    toast.add({ title: '删除失败', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="删除节点"
    :description="`确定要删除节点「${node.name}」吗？此操作会同时删除其所有套餐关联，不可撤销。`"
  >
    <slot />
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="取消" color="neutral" variant="subtle" @click="open = false" />
        <UButton label="删除" color="error" variant="solid" loading-auto @click="onConfirm" />
      </div>
    </template>
  </UModal>
</template>
