import './assets/css/main.css'

import { createApp } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'
import { createHead } from '@unhead/vue/client'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'
import { getProfile } from './api/auth'
import { clearAuthToken, getAuthProfile, isAuthenticated, setAuthProfile } from './utils/auth'

const app = createApp(App)

const head = createHead()
const router = createRouter({
  routes: setupLayouts(routes as RouteRecordRaw[]),
  history: createWebHistory()
})

let profileCheckPromise: Promise<boolean> | null = null

// ensureAdminProfile 校验当前 token 对应用户是否存在且拥有管理员权限
async function ensureAdminProfile(): Promise<boolean> {
  const cachedProfile = getAuthProfile()
  if (cachedProfile?.is_admin === 1) {
    return true
  }

  if (!profileCheckPromise) {
    profileCheckPromise = getProfile()
      .then((profile) => {
        if (profile.status !== 1 || profile.is_admin !== 1) {
          clearAuthToken()
          return false
        }

        setAuthProfile({
          id: profile.id,
          email: profile.email,
          uuid: profile.uuid,
          is_admin: profile.is_admin
        })
        return true
      })
      .catch(() => {
        clearAuthToken()
        return false
      })
      .finally(() => {
        profileCheckPromise = null
      })
  }

  return profileCheckPromise
}

// 全局登录守卫：未登录统一跳转登录页，非管理员也不允许进入后台
router.beforeEach(async (to) => {
  const loggedIn = isAuthenticated()

  if (to.path === '/login') {
    if (loggedIn) {
      const isAdmin = await ensureAdminProfile()
      if (isAdmin) {
        return '/'
      }
    }
    return true
  }

  if (!loggedIn) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    }
  }

  const isAdmin = await ensureAdminProfile()
  if (!isAdmin) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    }
  }

  return true
})

app.use(head)
app.use(router)
app.use(ui)

app.mount('#app')

// This will update routes at runtime without reloading the page
if (import.meta.hot) {
  handleHotUpdate(router)
}
