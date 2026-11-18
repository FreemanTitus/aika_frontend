// composables/useRiderSocket.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'

export const useRiderSocket = () => {
  const config = useRuntimeConfig()
  const authToken = useCookie('auth_token')

  const isConnected = ref(false)
  const riderStatusPayload = ref<any>(null)
  const walletUpdatePayload = ref<any>(null)
  const newJobAlertPayload = ref<any>(null) // <--- Track incoming job pool alerts
  
  let socket: WebSocket | null = null
  let reconnectTimer: any = null
  let manuallyClosed = false
  let retryDelay = 3000

  const connect = () => {
    if (!authToken.value) return
    manuallyClosed = false

    const apiBaseUrl = config.public.apiBase || 'http://localhost:8000'
    const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss://' : 'ws://'
    const cleanHost = apiBaseUrl.replace(/^https?:\/\//, '')
    
    const wsUrl = `${wsProtocol}${cleanHost}/ws/rider/notifications?token=${encodeURIComponent(authToken.value)}`

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
      // disconnect() used to leave a reconnect timer behind, so the socket came back after the
      // page was left. Also never retry a refused token (4003); back off otherwise.
      if (manuallyClosed || e.code === 4003) return
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
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (socket) {
      socket.close()
      socket = null
    }
    isConnected.value = false
  }

  onMounted(() => { connect() })
  onUnmounted(() => { disconnect() })

  return {
    isConnected,
    riderStatusPayload,
    walletUpdatePayload,
    newJobAlertPayload, // <--- Exposed here
    connect,
    disconnect
  }
}