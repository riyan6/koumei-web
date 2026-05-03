// getServerBaseUrl 获取服务端基础地址，发布时通过环境变量切换
export function getServerBaseUrl(): string {
  // 开发环境统一走同源 /api，由 Vite 代理转发，避免浏览器直接跨域请求后端。
  if (import.meta.env.DEV) {
    return ''
  }

  const rawBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL ?? '').trim()
  return rawBaseUrl.replace(/\/+$/, '')
}

// buildServerUrl 根据基础地址拼接完整接口地址
export function buildServerUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = getServerBaseUrl()

  if (!baseUrl) {
    return normalizedPath
  }

  return `${baseUrl}${normalizedPath}`
}
