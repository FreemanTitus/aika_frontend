// middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  // Safely check window protocol only if running on the client side
  const isHttps = import.meta.client && window.location.protocol === 'https:'
  const isProd = process.env.NODE_ENV === 'production' || isHttps

  const authToken = useCookie('auth_token', {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: isProd ? 'lax' : 'strict',
    secure: isProd
  })

  if (!authToken.value) {
    return navigateTo('/auth/login')
  }
})