<!-- pages/agent/dashboard.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { MessageSquare, Users, Inbox, CheckCircle2, Send, Loader2, ArrowRight, Activity, ArrowLeft, Power, AlertCircle, Search, Package, MapPin, Phone, User, ExternalLink, X, Store } from '@lucide/vue'

definePageMeta({
  layout: 'agent',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const wsBase = config.public.wsBase || apiBase.replace(/^http/, 'ws')

// Initialize the notification sound from the public folder
const notificationSound = typeof window !== 'undefined' ? new Audio('/audio/tone.mp3') : null

const playNotificationSound = () => {
  if (notificationSound) {
    notificationSound.currentTime = 0
    notificationSound.play().catch(err => {
      console.warn("Audio autoplay blocked or failed:", err)
    })
  }
}

const unassignedQueue = ref<any[]>([])
const myActiveChats = ref<any[]>([])
const activeChat = ref<any>(null)
const messages = ref<any[]>([])
const inputMessage = ref('')
const isLoading = ref(true)
const isJoining = ref(false)
const isEnding = ref(false)

const isCustomerTyping = ref(false)
let typingTimeout: any = null

// Order Lookup States
const orderQuery = ref('')
const isSearchingOrder = ref(false)
const lookedUpOrder = ref<any>(null)
const showOrderDrawer = ref(false)

// Helper to safely decode JWT token on client to get current Agent's User ID
const currentAgentId = ref<any>(null)
const parseJwt = (token: string) => {
  try {
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    if (!base64Url) return null
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

// Custom Modal State
const modal = ref({
  isOpen: false,
  title: '',
  message: '',
  type: 'alert',
  onConfirm: () => {}
})

const showAlert = (title: string, message: string) => {
  modal.value = {
    isOpen: true,
    title,
    message,
    type: 'alert',
    onConfirm: () => { modal.value.isOpen = false }
  }
}

const showConfirm = (title: string, message: string, onConfirmAction: () => void) => {
  modal.value = {
    isOpen: true,
    title,
    message,
    type: 'confirm',
    onConfirm: () => {
      modal.value.isOpen = false
      onConfirmAction()
    }
  }
}

let socket: WebSocket | null = null
let queueSocket: WebSocket | null = null
const chatContainer = ref<HTMLElement | null>(null)

const authToken = useCookie('auth_token')

onMounted(async () => {
  if (!authToken.value) {
    console.warn("Auth token not found, delaying WebSocket connection.")
    return
  }
  
  // Extract agent user ID safely from auth cookie token
  const decodedToken = parseJwt(authToken.value as string)
  if (decodedToken) {
    currentAgentId.value = decodedToken.user_id || decodedToken.sub || decodedToken.id
  }

  await fetchQueues()
  connectQueueWebSocket()
})

onUnmounted(() => {
  if (socket) socket.close()
  if (queueSocket) queueSocket.close()
})

const fetchQueues = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/agent/queues`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    unassignedQueue.value = res.unassigned_queue || []
    myActiveChats.value = res.my_active_chats || []
  } catch (err) {
    console.error("Failed to load agent support queues:", err)
  } finally {
    isLoading.value = false
  }
}

const connectQueueWebSocket = () => {
  const token = authToken.value || ''
  queueSocket = new WebSocket(`${wsBase}/ws/support/queue/?token=${token}`)
  
  queueSocket.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    
    if (data.type === 'queue_update' || data.action === 'new_chat' || data.action === 'chat_closed') {
      await fetchQueues()
    }
    
    if (data.type === 'chat_message' && !data.sender_id) {
      playNotificationSound()
    }
  }

  queueSocket.onerror = (err) => {
    console.error("Queue WebSocket error:", err)
  }
}

const selectActiveChat = async (chat: any) => {
  activeChat.value = chat
  messages.value = []
  isCustomerTyping.value = false
  lookedUpOrder.value = null
  showOrderDrawer.value = false
  
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/agent/chat/${chat.id}/messages`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    messages.value = res.messages || []
    scrollToBottom()
  } catch (err) {
    console.error("Failed to load chat message history:", err)
  }

  if (socket) socket.close()
  connectChatWebSocket(chat.id)
}

const closeActiveChatMobile = () => {
  activeChat.value = null
  if (socket) socket.close()
}

const joinChat = async (convId: string) => {
  isJoining.value = true
  try {
    await $fetch(`${apiBase}/api/v1/agent/chat/${convId}/join`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    await fetchQueues()
    const joined = myActiveChats.value.find(c => c.id === convId)
    if (joined) selectActiveChat(joined)
  } catch (err: any) {
    showAlert("Action Failed", err?.data?.detail || "Could not claim conversation.")
  } finally {
    isJoining.value = false
  }
}

const endChat = () => {
  if (!activeChat.value) return
  showConfirm(
    "End Conversation",
    "Are you sure you want to end and close this support conversation?",
    async () => {
      isEnding.value = true
      try {
        await $fetch(`${apiBase}/api/v1/agent/chat/${activeChat.value.id}/end`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken.value}`
          }
        })

        activeChat.value = null
        showOrderDrawer.value = false
        if (socket) socket.close()
        await fetchQueues()
      } catch (err: any) {
        showAlert("Error", err?.data?.detail || "Failed to end conversation.")
      } finally {
        isEnding.value = false
      }
    }
  )
}

const lookupOrder = async () => {
  const query = orderQuery.value.trim()
  if (!query) return

  isSearchingOrder.value = true
  lookedUpOrder.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/agent/orders/lookup/${encodeURIComponent(query)}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    lookedUpOrder.value = res.order || null
    showOrderDrawer.value = true
  } catch (err: any) {
    showAlert("Order Not Found", err?.data?.detail || `No order matching '${query}' was found.`)
  } finally {
    isSearchingOrder.value = false
  }
}

const handleTyping = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  
  socket.send(JSON.stringify({
    type: 'typing',
    is_typing: true
  }))

  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'typing',
        is_typing: false
      }))
    }
  }, 1500)
}

const connectChatWebSocket = (convId: string) => {
  const token = authToken.value || ''
  socket = new WebSocket(`${wsBase}/ws/support/${convId}/?token=${token}`)

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'chat_message') {
      messages.value.push(data)
      scrollToBottom()

      if (!data.sender_id) {
        playNotificationSound()
      }

    } else if (data.type === 'typing_indicator') {
      if (data.sender_role === 'customer') {
        isCustomerTyping.value = data.is_typing
      }
    } else if (data.type === 'chat_ended') {
      showAlert("Session Ended", data.message || "This chat session has ended.")
      activeChat.value = null
      showOrderDrawer.value = false
      if (socket) socket.close()
      fetchQueues()
    }
  }
}

const sendMessage = () => {
  if (!inputMessage.value.trim() || !socket || socket.readyState !== WebSocket.OPEN || !activeChat.value) return

  socket.send(JSON.stringify({
    type: 'chat_message',
    message: inputMessage.value.trim()
  }))

  inputMessage.value = ''
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}
</script>

<template>
  <div class="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col md:flex-row font-sans text-left relative">
    
    <!-- Sidebar: Queues & Metrics -->
    <div 
      class="w-full md:w-96 bg-white border-r border-slate-200/80 flex flex-col h-full shrink-0 shadow-xs"
      :class="[activeChat ? 'hidden md:flex' : 'flex']"
    >
      <!-- Brand Header -->
      <div class="p-4 md:p-5 border-b border-slate-100 bg-[#0A1128] text-white flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-[#D4F53C] text-[#0A1128] flex items-center justify-center font-black shadow-md">
            <Activity class="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 class="text-xs font-black tracking-wider uppercase">Agent Dashboard</h2>
            <p class="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Support Active
            </p>
          </div>
        </div>
      </div>

      <!-- Quick Metrics Bar -->
      <div class="grid grid-cols-2 gap-2 p-3 md:p-4 bg-slate-50 border-b border-slate-100">
        <div class="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
          <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Pending Queue</span>
          <span class="text-base md:text-lg font-black text-[#0A1128]">{{ unassignedQueue.length }}</span>
        </div>
        <div class="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
          <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Active Sessions</span>
          <span class="text-base md:text-lg font-black text-emerald-600">{{ myActiveChats.length }}</span>
        </div>
      </div>

      <div class="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar pb-20 md:pb-4">
        <!-- SECTION 1: Unassigned Queue -->
        <div>
          <div class="flex items-center justify-between mb-3 px-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Inbox class="w-3.5 h-3.5 text-amber-500" /> Incoming Tickets
            </span>
          </div>

          <div v-if="isLoading" class="py-8 text-center">
            <Loader2 class="w-5 h-5 animate-spin mx-auto text-slate-400" />
          </div>

          <div v-else-if="unassignedQueue.length === 0" class="text-center py-8 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <p class="text-xs text-slate-400 font-medium">No pending tickets in queue.</p>
          </div>

          <div v-else class="space-y-2.5">
            <div 
              v-for="chat in unassignedQueue" 
              :key="chat.id"
              class="bg-white hover:border-slate-300 border border-slate-200/80 p-3.5 md:p-4 rounded-2xl transition space-y-2.5 shadow-2xs group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[#0A1128] truncate">{{ chat.customer_name }}</span>
                <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {{ new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>
              <p class="text-[10px] text-slate-500 truncate">{{ chat.customer_email }}</p>
              
              <button 
                @click="joinChat(chat.id)"
                :disabled="isJoining"
                class="w-full bg-[#0A1128] text-[#D4F53C] hover:bg-slate-900 text-[11px] font-black py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <span>Claim Ticket</span>
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- SECTION 2: My Active Chats -->
        <div>
          <div class="flex items-center justify-between mb-3 px-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare class="w-3.5 h-3.5 text-emerald-600" /> My Active Sessions
            </span>
          </div>

          <div v-if="myActiveChats.length === 0" class="text-center py-8 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <p class="text-xs text-slate-400 font-medium">No active sessions claimed.</p>
          </div>

          <div v-else class="space-y-2">
            <button 
              v-for="chat in myActiveChats" 
              :key="chat.id"
              @click="selectActiveChat(chat)"
              class="w-full text-left p-3.5 rounded-2xl transition border cursor-pointer flex flex-col space-y-1 shadow-2xs"
              :class="[
                activeChat?.id === chat.id 
                  ? 'bg-[#0A1128] text-white border-[#0A1128] shadow-md' 
                  : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold truncate" :class="[activeChat?.id === chat.id ? 'text-white' : 'text-[#0A1128]']">
                  {{ chat.customer_name }}
                </span>
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <span class="text-[10px] truncate" :class="[activeChat?.id === chat.id ? 'text-slate-300' : 'text-slate-400']">
                {{ chat.customer_email }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div 
      class="flex-grow flex flex-col h-full bg-white overflow-hidden relative"
      :class="[!activeChat ? 'hidden md:flex' : 'flex']"
    >
      <div v-if="!activeChat" class="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div class="w-20 h-20 rounded-[32px] bg-slate-100 text-slate-400 flex items-center justify-center shadow-inner">
          <MessageSquare class="w-9 h-9 stroke-[1.75]" />
        </div>
        <h3 class="text-base font-black text-[#0A1128]">Welcome to Agent Command Center</h3>
        <p class="text-xs text-slate-400 max-w-sm leading-relaxed">
          Select an active session from your sidebar or claim an incoming customer ticket to start providing real-time assistance.
        </p>
      </div>

      <div v-else class="flex-grow flex flex-col h-full overflow-hidden">
        <!-- Active Chat Header -->
        <div class="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-white shadow-2xs shrink-0">
          <div class="flex items-center space-x-3">
            <button 
              @click="closeActiveChatMobile" 
              class="md:hidden p-2 rounded-xl bg-slate-100 text-[#0A1128] hover:bg-slate-200 transition cursor-pointer"
              aria-label="Back to Queue"
            >
              <ArrowLeft class="w-4 h-4" />
            </button>

            <div class="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shadow-xs">
              {{ activeChat.customer_name.substring(0, 2).toUpperCase() }}
            </div>
            <div>
              <h3 class="text-xs font-black text-[#0A1128] truncate max-w-[110px] sm:max-w-xs">{{ activeChat.customer_name }}</h3>
              <p class="text-[10px] text-slate-400 font-semibold truncate max-w-[110px] sm:max-w-xs">{{ activeChat.customer_email }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- Order Lookup Input form -->
            <div class="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Search class="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input 
                v-model="orderQuery"
                @keyup.enter="lookupOrder"
                type="text"
                placeholder="Lookup Order ID..."
                class="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-28"
              />
              <button 
                @click="lookupOrder"
                :disabled="isSearchingOrder"
                class="text-[10px] font-black uppercase tracking-wider bg-[#0A1128] text-[#D4F53C] px-2.5 py-1 rounded-lg hover:bg-slate-900 transition cursor-pointer disabled:opacity-50"
              >
                <Loader2 v-if="isSearchingOrder" class="w-3 h-3 animate-spin" />
                <span v-else>Find</span>
              </button>
            </div>

            <button 
              @click="showOrderDrawer = !showOrderDrawer"
              class="lg:hidden bg-slate-100 hover:bg-slate-200 text-[#0A1128] p-2 rounded-xl transition text-xs font-black flex items-center gap-1.5"
              title="Lookup Order"
            >
              <Package class="w-4 h-4" />
            </button>

            <button 
              @click="endChat"
              :disabled="isEnding"
              class="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:bg-gray-100"
            >
              <Loader2 v-if="isEnding" class="w-3.5 h-3.5 animate-spin" />
              <Power v-else class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">End Chat</span>
            </button>
          </div>
        </div>

        <!-- Chat Area with Order Drawer Split -->
        <div class="flex-grow flex overflow-hidden relative">
          <!-- Messages Stream -->
          <div ref="chatContainer" class="flex-grow p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            <div 
              v-for="(msg, index) in messages" 
              :key="index"
              class="flex flex-col"
              :class="[
                String(msg.sender_id) === String(currentAgentId) ? 'items-end' : 'items-start'
              ]"
            >
              <div 
                class="max-w-[85%] md:max-w-[70%] p-3.5 md:p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs"
                :class="[
                  String(msg.sender_id) === String(currentAgentId)
                    ? 'bg-[#0A1128] text-white rounded-br-xs' 
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                ]"
              >
                {{ msg.message || msg.content }}
              </div>
              <span class="text-[9px] text-slate-400 mt-1 px-1 font-mono">
                {{ new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>
          </div>

          <!-- Order Details Slide-over Drawer / Panel -->
          <div 
            v-if="showOrderDrawer && lookedUpOrder"
            class="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col p-5 space-y-4 animate-in slide-in-from-right duration-200 overflow-y-auto"
          >
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="p-2 bg-[#0A1128] text-[#D4F53C] rounded-xl">
                  <Package class="w-4 h-4" />
                </div>
                <div>
                  <h4 class="text-xs font-black text-[#0A1128]">Order Details</h4>
                  <p class="text-[10px] text-slate-400 font-mono">#{{ lookedUpOrder.order_reference }}</p>
                </div>
              </div>
              <button @click="showOrderDrawer = false" class="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Order Status & Badges -->
            <div class="space-y-3 text-xs">
              <div class="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span class="text-slate-400 font-bold uppercase text-[10px]">Status</span>
                <span class="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase">
                  {{ lookedUpOrder.order_status }}
                </span>
              </div>

              <!-- Customer Info -->
              <div class="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Customer</p>
                <p class="font-bold text-slate-800">{{ lookedUpOrder.customer_name }}</p>
              </div>

              <!-- Sender / Vendor Info -->
              <div class="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p class="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Store class="w-3 h-3 text-slate-400" /> Sender / Vendor
                </p>
                <p class="font-bold text-slate-800">{{ lookedUpOrder.sender_name || 'N/A' }}</p>
                <p class="text-[11px] text-slate-500 font-medium" v-if="lookedUpOrder.sender_phone">📞 {{ lookedUpOrder.sender_phone }}</p>
                <p class="text-[11px] text-slate-500 font-medium" v-if="lookedUpOrder.sender_address">📍 {{ lookedUpOrder.sender_address }}</p>
              </div>

              <div class="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Delivery Address</p>
                <p class="font-semibold text-slate-700 leading-relaxed">{{ lookedUpOrder.delivery_address }}</p>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p class="text-[10px] text-slate-400 font-bold uppercase">Payment</p>
                  <p class="font-black text-slate-800 mt-0.5">{{ lookedUpOrder.payment_status }}</p>
                </div>
                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p class="text-[10px] text-slate-400 font-bold uppercase">Total Amount</p>
                  <p class="font-black text-[#84cc16] mt-0.5 font-mono">₦{{ Number(lookedUpOrder.total_amount || 0).toLocaleString() }}</p>
                </div>
              </div>

              <!-- Items List -->
              <div class="space-y-2 pt-2">
                <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Order Items</p>
                <div v-if="lookedUpOrder.items && lookedUpOrder.items.length > 0" class="space-y-2">
                  <div v-for="(item, idx) in lookedUpOrder.items" :key="idx" class="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span class="font-bold text-slate-800 truncate max-w-[150px]">{{ item.product_name }}</span>
                    <span class="text-slate-500 font-mono">x{{ item.quantity }}</span>
                  </div>
                </div>
                <p v-else class="text-[11px] text-slate-400 italic">No individual items recorded.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Animated Three-Dots Typing Indicator -->
        <div v-if="isCustomerTyping" class="px-4 md:px-6 py-2 bg-slate-50/50 flex items-center space-x-2 shrink-0">
          <div class="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-2xs flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
          </div>
          <span class="text-[10px] text-slate-400 font-semibold italic">Customer is typing...</span>
        </div>

        <!-- Message Input Bar -->
        <div class="p-3 md:p-4 bg-white border-t border-slate-100 flex items-center gap-2 md:gap-3 shrink-0">
          <input 
            v-model="inputMessage" 
            @input="handleTyping"
            @keyup.enter="sendMessage"
            type="text" 
            placeholder="Type your response..." 
            class="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-4 md:px-5 py-3.5 md:py-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0A1128] transition"
          />
          <button 
            @click="sendMessage"
            class="w-11 h-11 md:w-13 md:h-13 bg-[#0A1128] hover:bg-slate-900 text-[#D4F53C] rounded-2xl flex items-center justify-center transition shrink-0 cursor-pointer shadow-md"
            aria-label="Send Message"
          >
            <Send class="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>

    <!-- Reusable Confirmation / Alert Modal -->
    <Transition name="fade">
      <div v-if="modal.isOpen" class="fixed inset-0 z-[99999] bg-[#0A1128]/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-sm rounded-[28px] p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-scale-up">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle class="w-6 h-6 stroke-[2]" />
          </div>

          <div class="space-y-1">
            <h3 class="text-sm font-black text-[#0A1128]">{{ modal.title }}</h3>
            <p class="text-xs text-slate-500 leading-relaxed">{{ modal.message }}</p>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <button 
              v-if="modal.type === 'confirm'"
              @click="modal.isOpen = false"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              @click="modal.onConfirm"
              class="flex-1 bg-[#0A1128] hover:bg-slate-900 text-[#D4F53C] font-black text-xs py-3 rounded-xl transition shadow-md cursor-pointer"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>