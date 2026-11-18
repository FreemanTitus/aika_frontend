// composables/useWebPush.ts
import { useRuntimeConfig, useCookie } from '#app'

export const useWebPush = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const authToken = useCookie('auth_token')

  const registerServiceWorker = async (groupName: string = 'all_users') => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      // The key lives in the server's environment (VAPID_PUBLIC_KEY): no key baked into the bundle.
      const keyRes: any = await $fetch(`${apiBase}/api/v1/public/vapid-key`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      if (!keyRes?.public_key) return
      const convertedVapidKey = urlBase64ToUint8Array(keyRes.public_key)

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })

      await $fetch(`${apiBase}/webpush/save_information/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
        },
        body: {
          status: 'subscribe',
          subscription: subscription.toJSON(),
          group: groupName
        }
      })
    } catch (err) {
      console.error('Failed to register web push subscription:', err)
    }
  }

  return { registerServiceWorker }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}