// composables/useAdminSocket.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'

// Global states shared across admin layouts and control desks
const isConnected = ref(false)
const newOrderAlertPayload = ref<any>(null)
const orderCompletedPayload = ref<any>(null)
const disputeAlertPayload = ref<any>(null)
const riderLocationPayload = ref<any>(null)
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

// Internal tracking configuration variables
let activeInstancesCount = 0
let adminSocket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

// Exponential Backoff Config Elements for Admin Socket
const BACKOFF_CONFIG = {
  initialDelay: 1000,
  maxDelay: 16000,
  factor: 2,
  jitter: 0.2
}
let currentReconnectDelay = BACKOFF_CONFIG.initialDelay

export const useAdminSocket = () => {
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
    
    // Mute temporarily during unlock initialization to prevent any accidental sound playback on load
    alertChime.muted = true
    alertChime.play()
      .then(() => {
        if (alertChime) {
          alertChime.pause()
          alertChime.currentTime = 0
          alertChime.muted = false // Unmute for actual notifications
        }
        isAudioUnlocked.value = true
        // console.log("%c🔊 Admin Audio: Live notification chimes primed successfully.", "color: #3b82f6; font-weight: bold;")
        removeUnlockListeners()
      })
      .catch(() => { 
        if (alertChime) alertChime.muted = false
      })
  }

  const removeUnlockListeners = () => {
    window.removeEventListener('click', silentAudioUnlockPipeline)
    window.removeEventListener('touchstart', silentAudioUnlockPipeline)
    window.removeEventListener('keydown', silentAudioUnlockPipeline)
  }

  const calculateNextBackoff = (): number => {
    const rawDelay = currentReconnectDelay * BACKOFF_CONFIG.factor
    const cappedDelay = Math.min(rawDelay, BACKOFF_CONFIG.maxDelay)
    const randomJitter = cappedDelay * BACKOFF_CONFIG.jitter * (Math.random() * 2 - 1)
    currentReconnectDelay = cappedDelay
    return Math.max(BACKOFF_CONFIG.initialDelay, cappedDelay + randomJitter)
  }

  const initAdminWebSocket = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (adminSocket) {
      if (adminSocket.readyState === WebSocket.OPEN || adminSocket.readyState === WebSocket.CONNECTING) {
        return
      }
      adminSocket = null
    }

    const authToken = useCookie('auth_token').value
    const backendHost = apiBase.replace(/^https?:\/\//, '')
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws"
    const socketUrl = `${wsScheme}://${backendHost}/ws/admin/notifications?token=${authToken || ''}`

    // console.log(`%c⚡ Admin WebSocket: Initializing handshake path...`, "color: #3b82f6; font-weight: bold;", socketUrl)
    adminSocket = new WebSocket(socketUrl)

    adminSocket.onopen = () => {
      isConnected.value = true
      currentReconnectDelay = BACKOFF_CONFIG.initialDelay
      // console.log("%c⚡ Admin WebSocket: Connected successfully to control desk!", "color: #10b981; font-weight: bold; background-color: #ecfdf5; padding: 4px; border-radius: 4px;")
    }

    adminSocket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        // console.log("ADMIN WEBSOCKET PAYLOAD", "background: #1d4ed8; color: white; font-weight: bold; padding: 2px 6px; border-radius: 3px;", data)

        const eventType = data.event || data.type

        // SILENT ROUTINE vs URGENT AUDIO FILTER:
        // Only trigger the audio chime for high-priority/dispute events. Routine order acknowledgements and 
        // standard order deliveries are kept 100% silent to prevent admin notification fatigue.
        if (["new_dispute", "admin_urgent_alert"].includes(eventType)) {
          triggerAudioChime()
        }

        switch(eventType) {
          case "new_order_alert":
            newOrderAlertPayload.value = data
            break
          case "order_completed":
            orderCompletedPayload.value = data
            break
          case "rider_location_update":
            riderLocationPayload.value = data
            break
          case "new_dispute":
          case "admin_notification_message":
            disputeAlertPayload.value = data.message || data
            break
          default:
            console.log("Unhandled admin structural event pipeline mapping:", eventType)
        }
      } catch (err) {
        console.error("Admin payload decoding mutation error:", err)
      }
    }

    adminSocket.onclose = (e) => {
      isConnected.value = false
      adminSocket = null

      if (e.code === 4003) {
        console.warn('Admin WebSocket refused by the server (4003). Not reconnecting.')
        return
      }

      const nextDelay = calculateNextBackoff()
      console.warn(`%c⚡ Admin WebSocket: Connection dropped (Code: ${e.code}). Reconnecting via backoff loop in ${(nextDelay / 1000).toFixed(2)}s...`, "color: #ef4444; font-weight: bold;")
      
      reconnectTimer = setTimeout(initAdminWebSocket, nextDelay)
    }

    adminSocket.onerror = () => {
      if (adminSocket) adminSocket.close()
    }
  }

  const closeAdminSocketGracefully = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    removeUnlockListeners()
    if (adminSocket) {
      adminSocket.close()
      adminSocket = null
    }
    isConnected.value = false
  }

  onMounted(() => {
    activeInstancesCount++

    if (!isAudioUnlocked.value) {
      window.addEventListener('click', silentAudioUnlockPipeline)
      window.addEventListener('touchstart', silentAudioUnlockPipeline)
      window.addEventListener('keydown', silentAudioUnlockPipeline)
    }

    if (!adminSocket || adminSocket.readyState === WebSocket.CLOSED) {
      initAdminWebSocket()
    }
  })

  onUnmounted(() => {
    activeInstancesCount--
    if (activeInstancesCount <= 0) {
      closeAdminSocketGracefully()
    }
  })

  return {
    isConnected,
    newOrderAlertPayload,
    orderCompletedPayload,
    disputeAlertPayload,
    riderLocationPayload,
    isAudioUnlocked,
    forceReconnect: initAdminWebSocket,
    forceDisconnect: closeAdminSocketGracefully
  }
}