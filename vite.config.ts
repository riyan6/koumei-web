import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueRouter from 'vue-router/vite'
import vueLayouts from 'vite-plugin-vue-layouts'
import ui from '@nuxt/ui/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devProxyTarget = (env.VITE_DEV_PROXY_TARGET || 'http://localhost:8893').trim()

  return {
    server: {
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true
        }
      }
    },
    plugins: [vueRouter({
      dts: 'src/route-map.d.ts'
    }), vueLayouts(), vue(), ui({
      ui: {
        colors: {
          primary: 'green',
          neutral: 'zinc'
        }
      }
    }), cloudflare()]
  };
})