// composables/useCustomerSocket.ts
import { ref, computed, watch } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'

export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface CustomerNotification {
  id: string
  type: string
  title: string
  message: string
  order_reference: string | null
  audience: string | null
  timestamp: string
  read: boolean
  raw: Record<string, any>
}

export interface CustomerSocketPayload {
  event?: string
  type?: string
  id?: string | number
  title?: string
  text?: string
  message?: string
  order_reference?: string
  audience?: string
  created_at?: string
  timestamp?: string
  read?: boolean
  raw_id?: string | number
  [key: string]: any
}

export type CustomerSocketListener = (payload: CustomerSocketPayload) => void

const socketState = ref<WebSocket | null>(null)
const isConnected = ref<boolean>(false)
const connectionStatus = ref<SocketConnectionStatus>('disconnected')
const lastEvent = ref<CustomerSocketPayload | null>(null)
const notifications = ref<CustomerNotification[]>([])

let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let activeUserId: string | null = null
let intentionalClose = false
let isAuthWatcherRegistered = false

const MAX_RECONNECT_DELAY = 30000
const MAX_NOTIFICATIONS = 50
const listeners = new Set<CustomerSocketListener>()

const decodeJwtUserId = (token?: string | null): string | number | null => {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const decoded = JSON.parse(jsonPayload) as Record<string, any>
    return decoded.user_id ?? decoded.id ?? decoded.sub ?? null
  } catch {
    return null
  }
}

const buildWsBaseUrl = (apiBase?: string): string => {
  if (!apiBase) {
    if (import.meta.client) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${window.location.host}`
    }
    return ''
  }
  return String(apiBase)
    .replace(/^https:\/\//i, 'wss://')
    .replace(/^http:\/\//i, 'ws://')
    .replace(/\/+$/, '')
}

const pushNotification = (
  entry: Omit<Partial<CustomerNotification>, 'id'> & { id?: string | number }
): void => {
  const id =
    entry.id !== undefined && entry.id !== null
      ? String(entry.id)
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  if (notifications.value.some((n) => String(n.id) === id)) return

  notifications.value.unshift({
    id,
    type: entry.type || 'notification',
    title: entry.title || '',
    message: entry.message || '',
    order_reference: entry.order_reference || null,
    audience: entry.audience || null,
    timestamp: entry.timestamp || new Date().toISOString(),
    read: Boolean(entry.read),
    raw: entry.raw || entry,
  })

  if (notifications.value.length > MAX_NOTIFICATIONS) {
    notifications.value.length = MAX_NOTIFICATIONS
  }
}

const handleIncomingPayload = (data: CustomerSocketPayload): void => {
  if (!data || typeof data !== 'object') return

  lastEvent.value = data
  const eventType = data.event || data.type

  if (eventType === 'order_in_transit') {
    pushNotification({
      type: 'order_in_transit',
      title: 'Order In Transit',
      message: data.message || `Order ${data.order_reference || ''} is now in transit.`,
      order_reference: data.order_reference || null,
      raw: data,
    })
  } else if (eventType === 'order_completed') {
    pushNotification({
      type: 'order_completed',
      title: 'Order Completed',
      message: data.message || `Order ${data.order_reference || ''} has been delivered.`,
      order_reference: data.order_reference || null,
      raw: data,
    })
  } else if (eventType === 'system_broadcast_message') {
    const titleHtml = data.title ? `<b>${data.title}</b><br>` : ''
    const bodyHtml = data.text || data.message || ''
    pushNotification({
      type: 'broadcast',
      title: data.title || 'Broadcast',
      message: `${titleHtml}${bodyHtml}`,
      audience: data.audience || null,
      timestamp: data.created_at,
      raw: data,
    })
  } else if (data.message || data.type === 'notification') {
    pushNotification({
      id: data.id,
      type: data.type || 'notification',
      message: data.message || '',
      timestamp: data.timestamp,
      read: Boolean(data.read),
      raw: data,
    })
  }

  listeners.forEach((cb) => {
    try {
      cb(data)
    } catch (err) {
      console.error('[useCustomerSocket] Listener error:', err)
    }
  })
}

export const useCustomerSocket = () => {
  const config = useRuntimeConfig()
  const authToken = useCookie<string | null>('auth_token')
  const profileIdCookie = useCookie<string | number | null>('profile_id')
  const userIdCookie = useCookie<string | number | null>('user_id')

  const resolveUserId = (explicitUserId?: string | number | null): string | number | null => {
    return (
      explicitUserId ??
      userIdCookie.value ??
      decodeJwtUserId(authToken.value) ??
      profileIdCookie.value ??
      null
    )
  }

  const clearReconnectTimer = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = (): void => {
    const token = authToken.value?.trim()
    if (intentionalClose || !import.meta.client || !token || !activeUserId) return
    clearReconnectTimer()

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY)
    reconnectAttempts += 1
    connectionStatus.value = 'reconnecting'

    reconnectTimer = setTimeout(() => {
      connect(activeUserId)
    }, delay)
  }

  const connect = (explicitUserId: string | number | null = null): void => {
    if (!import.meta.client) return

    const token = authToken.value?.trim()
    const targetUserId = resolveUserId(explicitUserId)

    // Guard: Do not open a WebSocket or trigger backoff loops without a valid token and user ID
    if (!token || !targetUserId) {
      clearReconnectTimer()
      connectionStatus.value = 'disconnected'
      return
    }

    // Reuse existing open/connecting socket for the same user
    if (
      socketState.value &&
      String(activeUserId) === String(targetUserId) &&
      (socketState.value.readyState === WebSocket.OPEN ||
        socketState.value.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    disconnect(false)

    intentionalClose = false
    activeUserId = String(targetUserId)
    connectionStatus.value = 'connecting'

    const wsBase = buildWsBaseUrl(config.public.apiBase as string)
    const wsUrl = `${wsBase}/ws/customer/tracking/${encodeURIComponent(activeUserId)}/?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(wsUrl)
      socketState.value = ws

      ws.onopen = () => {
        isConnected.value = true
        connectionStatus.value = 'connected'
        reconnectAttempts = 0
        clearReconnectTimer()
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(String(event.data)) as CustomerSocketPayload
          handleIncomingPayload(parsed)
        } catch {
          console.warn('[useCustomerSocket] Non-JSON message received:', event.data)
        }
      }

      ws.onerror = (err: Event) => {
        console.error('[useCustomerSocket] WebSocket error:', err)
      }

      ws.onclose = (event: CloseEvent) => {
        isConnected.value = false
        socketState.value = null

        // 4003 = unauthorized / invalid token, or token cleared; do not loop reconnects
        if (event.code === 4003 || intentionalClose || !authToken.value?.trim()) {
          connectionStatus.value = 'disconnected'
          return
        }

        scheduleReconnect()
      }
    } catch (err) {
      console.error('[useCustomerSocket] Failed to initialize WebSocket:', err)
      scheduleReconnect()
    }
  }

  const disconnect = (permanent = true): void => {
    if (permanent) {
      intentionalClose = true
      activeUserId = null
    }
    clearReconnectTimer()

    if (socketState.value) {
      try {
        socketState.value.close(1000, 'Client disconnect')
      } catch {
        // ignore close errors
      }
      socketState.value = null
    }

    isConnected.value = false
    connectionStatus.value = 'disconnected'
  }

  // Register a single global watcher so logout cleanly disconnects and token refresh reconnects
  if (import.meta.client && !isAuthWatcherRegistered) {
    isAuthWatcherRegistered = true
    watch(authToken, (newToken, oldToken) => {
      const trimmed = newToken?.trim()
      if (!trimmed) {
        disconnect(true)
      } else if (trimmed !== oldToken?.trim()) {
        reconnectAttempts = 0
        disconnect(false)
        connect(activeUserId)
      }
    })
  }

  const onEvent = (callback: CustomerSocketListener): (() => void) => {
    if (typeof callback !== 'function') return () => {}
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }

  const markAllRead = (): void => {
    notifications.value.forEach((n) => {
      n.read = true
    })
  }

  const clearNotifications = (): void => {
    notifications.value = []
  }

  const unreadCount = computed<number>(() => notifications.value.filter((n) => !n.read).length)

  return {
    socket: socketState,
    isConnected,
    connectionStatus,
    lastEvent,
    notifications,
    unreadCount,
    connect,
    disconnect,
    onEvent,
    markAllRead,
    clearNotifications,
  }
}