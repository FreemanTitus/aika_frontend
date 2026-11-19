// composables/useRiderSocket.ts
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'

export const useRiderSocket = () => {
  const config = useRuntimeConfig()
  const authToken = useCookie<string | null>('auth_token')

  const isConnected = ref(false)
  const riderStatusPayload = ref<any>(null)
  const walletUpdatePayload = ref<any>(null)
  const newJobAlertPayload = ref<any>(null) // <--- Track incoming job pool alerts
  
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let manuallyClosed = false
  let isMounted = false
  let retryDelay = 3000

  const clearTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const connect = () => {
    clearTimer()

    const token = authToken.value?.trim()
    if (!token) {
      isConnected.value = false
      return
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    manuallyClosed = false

    const apiBaseUrl = (config.public.apiBase || 'http://localhost:8000').replace(/\/+$/, '')
    const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss://' : 'ws://'
    const cleanHost = apiBaseUrl.replace(/^https?:\/\//, '')
    
    const wsUrl = `${wsProtocol}${cleanHost}/ws/rider/notifications?token=${encodeURIComponent(token)}`

    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      isConnected.value = true
      retryDelay = 3000
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const inner = data.payload || data

        if (inner.event === 'new_available_order') {
          newJobAlertPayload.value = inner
        } else if (inner.new_balance !== undefined || inner.type === 'wallet_update_alert') {
          walletUpdatePayload.value = inner
        } else {
          riderStatusPayload.value = inner
        }
      } catch (err) {
        console.error("Failed to parse rider WebSocket message", err)
      }
    }

    socket.onclose = (e) => {
      isConnected.value = false
      socket = null

      // Never retry on manual close, refused token (4003), or missing auth_token
      if (manuallyClosed || e.code === 4003 || !authToken.value?.trim()) {
        return
      }

      reconnectTimer = setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 30000)
    }

    socket.onerror = (error) => {
      console.error("Rider WebSocket error:", error)
      socket?.close()
    }
  }

  const disconnect = () => {
    manuallyClosed = true
    clearTimer()
    if (socket) {
      socket.close()
      socket = null
    }
    isConnected.value = false
  }

  // Automatically disconnect on logout and reconnect on token refresh/login
  watch(authToken, (newToken, oldToken) => {
    const trimmed = newToken?.trim()
    if (!trimmed) {
      disconnect()
    } else if (trimmed !== oldToken?.trim() && isMounted) {
      disconnect()
      retryDelay = 3000
      connect()
    }
  })

  onMounted(() => {
    isMounted = true
    connect()
  })

  onUnmounted(() => {
    isMounted = false
    disconnect()
  })

  return {
    isConnected,
    riderStatusPayload,
    walletUpdatePayload,
    newJobAlertPayload, // <--- Exposed here
    connect,
    disconnect
  }
}