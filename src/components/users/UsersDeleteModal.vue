<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AdminUser } from '../../types'
import { deleteUser } from '../../api/users'

const props = defineProps<{
  user: AdminUser
  modelValue?: boolean
}>()

const emit = defineEmits<{
  deleted: []
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

async function onConfirm() {
  try {
    await deleteUser(props.user.id)
    toast.add({ title: '删除成功', description: `用户 #${props.user.id} 已删除`, color: 'success' })
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
    title="删除用户"
    :description="`确定要删除用户 #${user.id} 吗？此操作不可撤销。`"
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
