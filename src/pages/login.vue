<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { z } from 'zod'
import { login } from '../api/auth'
import { clearAuthToken, setAuthProfile, setAuthToken } from '../utils/auth'

const toast = useToast()
const router = useRouter()
const route = useRoute()

// 登录表单校验规则
const schema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码')
})

// state 登录表单状态
const state = reactive({
  email: '',
  password: '',
  remember: true
})

// loading 控制登录提交态
const loading = ref(false)
// showPassword 控制密码显示状态
const showPassword = ref(false)

// onSubmit 提交登录并保存 token
async function onSubmit() {
  loading.value = true
  try {
    const res = await login({
      email: state.email,
      password: state.password
    })

    // 普通用户不允许进入后台，直接给出明确提示
    if (res.user.is_admin !== 1) {
      clearAuthToken()
      toast.add({
        title: '当前账号没有后台权限',
        description: '请使用管理员账号登录 Koumei Web 后台。',
        color: 'error'
      })
      return
    }

    setAuthToken(res.token)
    setAuthProfile(res.user)

    toast.add({
      title: '登录成功',
      color: 'success'
    })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    toast.add({
      title: error instanceof Error ? error.message : '登录失败',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<route lang="yaml">
meta:
  layout: false
</route>

<template>
  <div class="min-h-screen bg-default flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-xl">
      <UCard class="border border-default shadow-sm">
        <div class="flex flex-col items-center text-center space-y-5">
          <div class="inline-flex items-center justify-center size-16 rounded-full bg-primary/10">
            <UIcon name="i-lucide-lock" class="size-9 text-primary" />
          </div>

          <div class="space-y-3">
            <h1 class="text-3xl font-semibold text-highlighted">Welcome back</h1>
            <p class="text-base text-muted">登录后继续管理 Koumei 后台</p>
          </div>
        </div>

        <UForm :schema="schema" :state="state" class="mt-10 space-y-6" @submit="onSubmit">
          <UFormField label="Email" name="email" required>
            <UInput
              v-model="state.email"
              type="email"
              class="w-full"
              placeholder="Enter your email"
              autocomplete="username"
            />
          </UFormField>

          <UFormField label="Password" name="password" required>
            <UInput
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full"
              placeholder="Enter your password"
              autocomplete="current-password"
              :ui="{ trailing: 'pe-1' }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <UCheckbox
            v-model="state.remember"
            label="Remember me"
          />

          <UButton
            type="submit"
            color="primary"
            block
            size="lg"
            :loading="loading"
            label="Continue"
          />
        </UForm>

        <p class="mt-8 text-center text-sm text-muted">
          koumei admin.
        </p>
      </UCard>
    </div>
  </div>
</template>
