// plugins/api.ts
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
  const authToken = useCookie('auth_token')

  const requestUrl = (request: any): string =>
    typeof request === 'string' ? request : String(request?.url || '')

  // The bearer token must only ever travel to OUR api (never to nominatim, map tiles, etc.).
  const isApiUrl = (request: any): boolean => !!apiBase && requestUrl(request).startsWith(apiBase)

  let redirecting = false
  const handleUnauthorized = (request: any, response: any, alwaysApi = false) => {
    if (!import.meta.client || response?.status !== 401) return
    if (!alwaysApi && !isApiUrl(request)) return
    // Wrong-password / reset attempts legitimately answer 401: never bounce those.
    if (requestUrl(request).includes('/api/v1/auth/')) return
    if (redirecting || !authToken.value) return

    // The token was revoked or expired (e.g. after a password change on another device).
    redirecting = true
    authToken.value = null
    Promise.resolve(
      navigateTo({
        path: '/auth/login',
        query: { redirect: window.location.pathname + window.location.search }
      })
    ).finally(() => { redirecting = false })
  }

  // Instance with a base URL, exposed as $api
  const api = $fetch.create({
    baseURL: apiBase,
    onRequest({ options }) {
      options.headers = new Headers(options.headers || {})
      options.headers.set('ngrok-skip-browser-warning', 'true')
      if (authToken.value && !options.headers.has('Authorization')) {
        options.headers.set('Authorization', `Bearer ${authToken.value}`)
      }
    },
    onResponseError({ request, response }) {
      handleUnauthorized(request, response, true)
      console.error('API Error intercepted globally:', response.status)
    }
  })

  // Most pages call the global $fetch with absolute `${apiBase}/...` URLs. Wrap it so those
  // calls get the same 401 handling (token revoked => back to login) and so the Authorization
  // header is attached ONLY when the URL points at our api.
  if (import.meta.client) {
    ;(globalThis as any).$fetch = $fetch.create({
      onRequest({ request, options }) {
        if (!isApiUrl(request)) return
        options.headers = new Headers(options.headers || {})
        options.headers.set('ngrok-skip-browser-warning', 'true')
        if (authToken.value && !options.headers.has('Authorization')) {
          options.headers.set('Authorization', `Bearer ${authToken.value}`)
        }
      },
      onResponseError({ request, response }) {
        handleUnauthorized(request, response)
      }
    })
  }

  return { provide: { api } }
})
