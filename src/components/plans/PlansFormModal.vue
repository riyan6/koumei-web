<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Plan } from '../../types'
import { createPlan, updatePlan } from '../../api/plans'

const props = defineProps<{
  plan?: Plan | null
  modelValue?: boolean
}>()

const emit = defineEmits<{
  saved: []
  'update:modelValue': [value: boolean]
}>()

const toast = useToast()

const open = ref(props.modelValue ?? false)

watch(() => props.modelValue, (val) => {
  if (val !== undefined) open.value = val
})

watch(open, (val) => {
  emit('update:modelValue', val)
})

const schema = z.object({
  name: z.string().min(1, '套餐名称不能为空'),
  show: z.boolean(),
  sort: z.number().int(),
  content: z.string(),
  enabled: z.boolean()
})

type Schema = z.output<typeof schema>

const defaultState = (): Partial<Schema> => ({
  name: '',
  show: true,
  sort: 0,
  content: '',
  enabled: true
})

const state = reactive<Partial<Schema>>(defaultState())

function fillForm() {
  if (props.plan) {
    Object.assign(state, {
      name: props.plan.name,
      show: props.plan.show,
      sort: props.plan.sort,
      content: props.plan.content,
      enabled: props.plan.enabled
    })
  } else {
    Object.assign(state, defaultState())
  }
}

// 组件挂载时立即填充（编辑场景：v-if 挂载时 open 已为 true，watch 不会触发）
onMounted(() => {
  if (open.value) fillForm()
})

// 弹窗从关闭变为打开时填充（新增场景）
watch(open, (val) => {
  if (val) fillForm()
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    if (props.plan) {
      await updatePlan(props.plan.id, event.data)
      toast.add({ title: '更新成功', description: `套餐 "${event.data.name}" 已更新`, color: 'success' })
    } else {
      await createPlan(event.data)
      toast.add({ title: '创建成功', description: `套餐 "${event.data.name}" 已创建`, color: 'success' })
    }
    open.value = false
    emit('saved')
  } catch (e: unknown) {
    toast.add({ title: '操作失败', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="plan ? '编辑套餐' : '新增套餐'"
    :description="plan ? '修改套餐信息' : '创建一个新的套餐'"
  >
    <slot>
      <UButton label="新增套餐" icon="i-lucide-plus" />
    </slot>

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="套餐名称" name="name" required>
          <UInput v-model="state.name" class="w-full" placeholder="例如：基础套餐" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="排序" name="sort">
            <UInput v-model.number="state.sort" type="number" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="套餐描述" name="content">
          <UTextarea v-model="state.content" class="w-full" placeholder="套餐说明..." :rows="3" />
        </UFormField>

        <div class="flex items-center gap-6">
          <UFormField label="前端展示" name="show">
            <USwitch v-model="state.show" />
          </UFormField>
          <UFormField label="启用" name="enabled">
            <USwitch v-model="state.enabled" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton label="取消" color="neutral" variant="subtle" @click="open = false" />
          <UButton :label="plan ? '保存' : '创建'" color="primary" variant="solid" type="submit" loading-auto />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
