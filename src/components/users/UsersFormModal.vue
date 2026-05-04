<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AdminUser, Plan } from '../../types'
import { createUser, updateUser } from '../../api/users'
import { fetchPlans } from '../../api/plans'

const props = defineProps<{
  user?: AdminUser | null
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

const plans = ref<Plan[]>([])

const loadPlans = async () => {
  try {
    plans.value = await fetchPlans(true)
  } catch {
    // ignore
  }
}

const isEdit = computed(() => !!props.user)

const schema = z.object({
  email: z.string().nullable().optional(),
  password: z.string().min(1, '密码不能为空').nullable().optional(),
  plan_id: z.number().nullable().optional(),
  status: z.number().int(),
  is_admin: z.number().int(),
  remarks: z.string().nullable().optional()
})

type Schema = z.output<typeof schema>

const defaultState = (): Partial<Schema> => ({
  email: null,
  password: '',
  plan_id: null,
  status: 1,
  is_admin: 0,
  remarks: null
})

const state = reactive<Partial<Schema>>(defaultState())

function fillForm() {
  if (props.user) {
    Object.assign(state, {
      email: props.user.email || null,
      password: '',
      plan_id: props.user.plan_id,
      status: props.user.status,
      is_admin: props.user.is_admin,
      remarks: props.user.remarks || null
    })
  } else {
    Object.assign(state, defaultState())
  }
}

onMounted(() => {
  loadPlans()
  if (open.value) fillForm()
})

watch(open, (val) => {
  if (val) {
    loadPlans()
    fillForm()
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    if (props.user) {
      // 编辑模式：只传递允许修改的字段
      const payload: Record<string, unknown> = { id: props.user.id }
      if (event.data.email !== undefined) payload.email = event.data.email
      if (event.data.plan_id !== undefined) payload.plan_id = event.data.plan_id
      if (event.data.status !== undefined) payload.status = event.data.status
      if (event.data.is_admin !== undefined) payload.is_admin = event.data.is_admin
      if (event.data.remarks !== undefined) payload.remarks = event.data.remarks
      await updateUser(payload as any)
      toast.add({ title: '更新成功', description: `用户 #${props.user.id} 已更新`, color: 'success' })
    } else {
      // 新增模式：传递所有字段
      await createUser(event.data as any)
      toast.add({ title: '创建成功', description: '用户已创建', color: 'success' })
    }
    open.value = false
    emit('saved')
  } catch (e: unknown) {
    toast.add({ title: '操作失败', description: (e as Error).message, color: 'error' })
  }
}

const planOptions = computed(() => [
  { label: '无套餐', value: null },
  ...plans.value.map(p => ({ label: p.name, value: p.id }))
])

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
]

const adminOptions = [
  { label: '普通用户', value: 0 },
  { label: '管理员', value: 1, disabled: true }
]
</script>

<template>
  <UModal
    v-model:open="open"
    :title="user ? '编辑用户' : '新增用户'"
    :description="user ? '修改用户信息' : '创建一个新用户'"
  >
    <slot>
      <UButton label="新增用户" icon="i-lucide-plus" />
    </slot>

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <!-- 编辑时显示 UUID（只读） -->
        <UFormField v-if="isEdit" label="UUID" name="uuid">
          <UInput :model-value="user?.uuid" class="w-full" disabled />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="邮箱" name="email">
            <UInput
              :model-value="state.email ?? ''"
              class="w-full"
              placeholder="可选"
              @update:model-value="(v: string) => state.email = v || null"
            />
          </UFormField>
          <!-- 新增时显示密码输入框，编辑时隐藏 -->
          <UFormField v-if="!isEdit" label="密码" name="password" required>
            <UInput
              :model-value="state.password ?? ''"
              type="password"
              class="w-full"
              placeholder="请输入密码"
              @update:model-value="(v: string) => state.password = v"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="套餐" name="plan_id">
            <USelect v-model="state.plan_id" :items="planOptions" class="w-full" />
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
          <UFormField label="状态" name="status">
            <USelect v-model="state.status" :items="statusOptions" class="w-full" />
          </UFormField>
          <UFormField label="角色" name="is_admin">
            <USelect v-model="state.is_admin" :items="adminOptions" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton label="取消" color="neutral" variant="subtle" @click="open = false" />
          <UButton :label="user ? '保存' : '创建'" color="primary" variant="solid" type="submit" loading-auto />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
