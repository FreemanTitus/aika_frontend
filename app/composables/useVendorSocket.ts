// composables/useVendorSocket.ts
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'

// Global states remain shared across all dashboard views
const isConnected = ref(false)
const latestOrderPayload = ref<any>(null)
const approvalStatusPayload = ref<any>(null)
const riderAllocationPayload = ref<any>(null)
const orderCompletedPayload = ref<any>(null)
const broadcastPayload = ref<any>(null)
const isAudioUnlocked = ref(false)

// Initialize the notification sound locally from the public folder
const alertChime = typeof window !== 'undefined' ? new Audio('/audio/tone.mp3') : null

const playNotificationSound = () => {
  if (alertChime) {
    alertChime.currentTime = 0 // Rewind to start
    alertChime.play().catch(err => {
      console.warn("Audio autoplay blocked or failed:", err)
    })
  }
}

// Internal instance counters & tracker configurations
let activeInstancesCount = 0
let vendorSocket: WebSocket | null = null
let currentVendorId: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

// Exponential Backoff Config Elements
const BACKOFF_CONFIG = {
  initialDelay: 1000,   // Start at 1 second
  maxDelay: 16000,      // Cap delay at 16 seconds
  factor: 2,            // Double the delay duration each iteration
  jitter: 0.2           // 20% randomized deviation variance to prevent server thundering herd
}
let currentReconnectDelay = BACKOFF_CONFIG.initialDelay

export const useVendorSocket = (vendorId: string | null) => {

  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase 

  const triggerAudioChime = () => {
    if (!alertChime) return
    if (isAudioUnlocked.value) {
      playNotificationSound()
    } else {
      console.warn("Audio skipped: Waiting for initial user micro-interaction gesture.")
    }
  }

  const silentAudioUnlockPipeline = () => {
    if (isAudioUnlocked.value || !alertChime) return
    
    alertChime.play()
      .then(() => {
        if (alertChime) {
          alertChime.pause()
          alertChime.currentTime = 0
        }
        isAudioUnlocked.value = true
        console.log("%c🔊 Nuxt Audio: Live notification chimes primed successfully.", "color: #10b981; font-weight: bold;")
        removeUnlockListeners()
      })
      .catch(() => { /* Silent failure until real physical gesture registers */ })
  }

  const removeUnlockListeners = () => {
    window.removeEventListener('click', silentAudioUnlockPipeline)
    window.removeEventListener('touchstart', silentAudioUnlockPipeline)
    window.removeEventListener('keydown', silentAudioUnlockPipeline)
  }

  const calculateNextBackoff = (): number => {
    const rawDelay = currentReconnectDelay * BACKOFF_CONFIG.factor
    const cappedDelay = Math.min(rawDelay, BACKOFF_CONFIG.maxDelay)
    // Add full randomized jitter window adjustments
    const randomJitter = cappedDelay * BACKOFF_CONFIG.jitter * (Math.random() * 2 - 1)
    currentReconnectDelay = cappedDelay
    return Math.max(BACKOFF_CONFIG.initialDelay, cappedDelay + randomJitter)
  }

  const initWebSocket = () => {
    // Clear out residual timeout sequences
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (!currentVendorId || currentVendorId === 'null') return

    // Explicitly destroy existing connection channels if switching vendor ids across panels
    if (vendorSocket) {
      if (vendorSocket.readyState === WebSocket.OPEN || vendorSocket.readyState === WebSocket.CONNECTING) {
        return // Connection is already active or routing
      }
      vendorSocket = null
    }

    const authToken = useCookie('auth_token').value
    const backendHost = apiBase.replace(/^https?:\/\//, '')
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws"
    const socketUrl = `${wsScheme}://${backendHost}/ws/vendor/dashboard/${currentVendorId}/?token=${authToken || ''}`

    // (The URL carries the JWT: never log it.)
    vendorSocket = new WebSocket(socketUrl)

    vendorSocket.onopen = () => {
      isConnected.value = true
      currentReconnectDelay = BACKOFF_CONFIG.initialDelay // Reset backoff back to baseline on successful linkage
      console.log("%c⚡ WebSocket: Connection successfully established and live!", "color: #10b981; font-weight: bold; background-color: #ecfdf5; padding: 4px; border-radius: 4px;")
    }

    vendorSocket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        console.log("%c📥 INCOMING WEBSOCKET PAYLOAD", "background: #2563eb; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;", data)
        
        triggerAudioChime()

        const eventType = data.event || data.type

        switch(eventType) {
          case "new_order":
            latestOrderPayload.value = data
            break
          case "approval_update":
            approvalStatusPayload.value = data
            break
          case "rider_allocated":
            riderAllocationPayload.value = data
            break
          case "order_completed":
            orderCompletedPayload.value = data
            break
          case "system_broadcast_message":
            broadcastPayload.value = data.message || data
            break
          default:
            console.log("Unhandled structural event pipeline mapping:", eventType)
        }
      } catch (err) {
        console.error("Payload decoding mutation error:", err)
      }
    }

    vendorSocket.onclose = (e) => {
      isConnected.value = false
      vendorSocket = null
      
      // Do not re-trigger reconnection sequences if all components unmounted or parameters vanished
      if (!currentVendorId) return

      // 4003 = the server refused this token/vendor (revoked, expired or not yours): retrying
      // with the same credentials can never succeed.
      if (e.code === 4003) {
        console.warn('Vendor WebSocket refused by the server (4003). Not reconnecting.')
        return
      }

      const nextDelay = calculateNextBackoff()
      console.warn(`%c⚡ WebSocket: Connection dropped (Code: ${e.code}). Reconnecting via backoff loop in ${(nextDelay / 1000).toFixed(2)}s...`, "color: #ef4444; font-weight: bold;")
      
      reconnectTimer = setTimeout(initWebSocket, nextDelay)
    }

    vendorSocket.onerror = () => {
      if (vendorSocket) vendorSocket.close()
    }
  }

  // Force-close the pipeline explicitly
  const closeWebSocketGracefully = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    currentVendorId = null
    if (vendorSocket) {
      vendorSocket.close()
      vendorSocket = null
    }
    isConnected.value = false
  }

  onMounted(() => {
    activeInstancesCount++
    
    // Sync current payload context argument down into closure
    if (vendorId) currentVendorId = vendorId

    if (!isAudioUnlocked.value) {
      window.addEventListener('click', silentAudioUnlockPipeline)
      window.addEventListener('touchstart', silentAudioUnlockPipeline)
      window.addEventListener('keydown', silentAudioUnlockPipeline)
    }

    // Initialize or keep persistent connection open
    if (!vendorSocket || vendorSocket.readyState === WebSocket.CLOSED) {
      initWebSocket()
    }
  })

  onUnmounted(() => {
    activeInstancesCount--
    removeUnlockListeners()

    // Completely drop socket ports only if no matching layout panels or dashboard widgets remain alive
    if (activeInstancesCount <= 0) {
      closeWebSocketGracefully()
    }
  })

  // Watch for dynamic route argument mutation parameters (e.g. admin toggling between target dashboards)
  watch(() => vendorId, (newId) => {
    if (newId && newId !== currentVendorId) {
      currentVendorId = newId
      currentReconnectDelay = BACKOFF_CONFIG.initialDelay
      initWebSocket()
    }
  })

  return {
    isConnected,
    latestOrderPayload,
    approvalStatusPayload,
    riderAllocationPayload,
    orderCompletedPayload,
    broadcastPayload,
    isAudioUnlocked,
    forceReconnet: initWebSocket,
    forceDisconnect: closeWebSocketGracefully
  }
}