<!-- components/SupportChatWidget.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { MessageSquare, X, Send, Loader2, User, Mail, Sparkles } from '@lucide/vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const wsBase = config.public.wsBase || apiBase.replace(/^http/, 'ws')

const isOpen = ref(false)
const chatStarted = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

// Form fields for guests or session state
const form = ref({
  full_name: '',
  email: '',
  initial_message: ''
})

const messages = ref<any[]>([])
const inputMessage = ref('')
const conversationId = ref<string | null>(null)
let socket: WebSocket | null = null
const chatContainer = ref<HTMLElement | null>(null)

const isAgentTyping = ref(false)
let typingTimeout: any = null

const clientSessionId = Math.random().toString(36).substring(2, 9)

// --- Access to a conversation ---------------------------------------------------------
// Logged-in customers are identified by their JWT. Guests receive a secret `guest_token` when
// the chat starts (the API no longer lets anyone read a conversation just by knowing its id).
const GUEST_TOKEN_KEY = 'active_support_guest_token'
const GUEST_EMAIL_KEY = 'active_support_guest_email'
const guestToken = ref<string | null>(null)
const ownEmail = ref<string>('')
const myUserId = ref<string | null>(null)

const readJwtClaims = (jwt?: string | null): any => {
  try {
    if (!jwt) return null
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(payload))))
  } catch { return null }
}

const resolveIdentity = () => {
  const claims = readJwtClaims(useCookie('auth_token').value)
  myUserId.value = claims?.sub ? String(claims.sub) : null
  ownEmail.value = claims?.email || localStorage.getItem(GUEST_EMAIL_KEY) || form.value.email || ''
  guestToken.value = localStorage.getItem(GUEST_TOKEN_KEY)
}

const chatAuthHeaders = (): Record<string, string> => {
  const jwt = useCookie('auth_token').value
  const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  else if (guestToken.value) headers['X-Chat-Token'] = guestToken.value
  return headers
}

const forgetConversation = () => {
  localStorage.removeItem('active_support_conv_id')
  localStorage.removeItem(GUEST_TOKEN_KEY)
  localStorage.removeItem(GUEST_EMAIL_KEY)
  guestToken.value = null
  chatStarted.value = false
  messages.value = []
  conversationId.value = null
}

const isOwnMessage = (msg: any): boolean => {
  if (msg.sender_role === 'system') return false
  if (msg.sender_role) return msg.sender_role === 'customer' || msg.sender_role === 'guest'
  if (myUserId.value) return msg.sender_id != null && String(msg.sender_id) === myUserId.value
  return !!msg.sender_email && msg.sender_email === ownEmail.value
}

onMounted(async () => {
  resolveIdentity()
  const savedConvId = localStorage.getItem('active_support_conv_id')
  if (savedConvId) {
    conversationId.value = savedConvId
    chatStarted.value = true
    await fetchChatHistory(savedConvId)
    connectWebSocket(savedConvId)
  }
})

onUnmounted(() => {
  if (socket) socket.close()
})

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value && chatStarted.value) {
    scrollToBottom()
  }
}

const fetchChatHistory = async (convId: string) => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/support/chat/${convId}/messages`, {
      headers: chatAuthHeaders()
    })
    messages.value = res.messages || []
    scrollToBottom()
    return true
  } catch (err) {
    console.error("Failed to load chat history:", err)
    forgetConversation()
    return false
  }
}

const handleStartChat = async () => {
  if (!form.value.initial_message.trim()) return

  isSubmitting.value = true
  errorMessage.value = null

  const authToken = useCookie('auth_token')

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/support/chat/start`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      },
      body: {
        full_name: form.value.full_name.trim() || undefined,
        email: form.value.email.trim() || undefined,
        initial_message: form.value.initial_message.trim()
      }
    })

    if (res?.conversation_id) {
      conversationId.value = res.conversation_id
      localStorage.setItem('active_support_conv_id', res.conversation_id)
      if (res.guest_token) {
        guestToken.value = res.guest_token
        localStorage.setItem(GUEST_TOKEN_KEY, res.guest_token)
        localStorage.setItem(GUEST_EMAIL_KEY, form.value.email.trim())
      }
      resolveIdentity()
      chatStarted.value = true
      form.value.initial_message = ''

      if (await fetchChatHistory(res.conversation_id)) {
        connectWebSocket(res.conversation_id)
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.detail || "Could not initialize support chat. Please try again."
  } finally {
    isSubmitting.value = false
  }
}

const connectWebSocket = (convId: string) => {
  const jwt = useCookie('auth_token').value
  const credential = jwt
    ? `token=${encodeURIComponent(jwt)}`
    : `guest_token=${encodeURIComponent(guestToken.value || '')}`
  socket = new WebSocket(`${wsBase}/ws/support/${convId}/?${credential}`)

  socket.onclose = (e) => {
    // 4003 = access refused (token revoked / not your conversation): drop the stale state.
    if (e.code === 4003) forgetConversation()
  }

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'chat_message') {
      messages.value.push(data)
      scrollToBottom()
    } else if (data.type === 'typing_indicator') {
      if (data.sender_role === 'agent') {
        isAgentTyping.value = data.is_typing
      }
    } else if (data.type === 'chat_ended') {
      forgetConversation()
      if (socket) socket.close()
    }
  }

  socket.onerror = (err) => {
    console.error("WebSocket connection error:", err)
  }
}

const handleTyping = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return

  socket.send(JSON.stringify({
    type: 'typing',
    sender_session: clientSessionId,
    is_typing: true
  }))

  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'typing',
        sender_session: clientSessionId,
        is_typing: false
      }))
    }
  }, 1500)
}

const sendMessage = () => {
  if (!inputMessage.value.trim() || !socket || socket.readyState !== WebSocket.OPEN) return

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
  <div class="fixed bottom-6 right-6 z-[9999] font-sans text-left">
    
    <!-- Floating Trigger Button -->
    <button 
      @click="toggleChat"
      class="w-14 h-14 bg-[#0A1128] hover:bg-slate-900 text-[#D4F53C] rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-white/20 relative group"
      aria-label="Open Support Chat"
    >
      <MessageSquare v-if="!isOpen" class="w-6 h-6 stroke-[2.5]" />
      <X v-else class="w-6 h-6 stroke-[2.5]" />
      
      <span class="absolute top-1 right-1 w-3.5 h-3.5 bg-[#D4F53C] rounded-full animate-ping"></span>
      <span class="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0A1128]"></span>
    </button>

    <!-- Chat Popup Window (Increased Size: w-[380px] to w-[420px], h-[480px] to h-[560px]) -->
    <Transition name="scale-up">
      <div 
        v-if="isOpen" 
        class="absolute bottom-20 right-0 w-[94vw] sm:w-[420px] h-[560px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden origin-bottom-right"
      >
        <!-- Header -->
        <div class="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between relative overflow-hidden shrink-0">
          <div class="absolute -right-8 -top-8 w-28 h-28 bg-[#D4F53C]/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div class="flex items-center space-x-3 relative z-10">
            <div class="w-9 h-9 rounded-xl bg-[#D4F53C] text-[#0A1128] flex items-center justify-center font-black shadow-sm">
              <Sparkles class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-white">Customer Support</h3>
              <p class="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Agents Online
              </p>
            </div>
          </div>

          <button @click="toggleChat" class="text-slate-400 hover:text-white transition p-1.5 cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- BODY VIEW 1: START CHAT FORM -->
        <div v-if="!chatStarted" class="p-6 flex-grow flex flex-col justify-between space-y-4 overflow-y-auto">
          <div class="space-y-1.5">
            <h4 class="text-sm font-black text-[#0A1128]">How can we help you today?</h4>
            <p class="text-xs text-slate-400 leading-relaxed">
              Drop a message below and an available support agent will join your session shortly.
            </p>
          </div>

          <form @submit.prevent="handleStartChat" class="space-y-4">
            <div v-if="errorMessage" class="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-semibold">
              {{ errorMessage }}
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400">Your Full Name</label>
              <div class="relative">
                <User class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  v-model="form.full_name" 
                  type="text" 
                  placeholder="e.g., Oluwaseyi Obanibi" 
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128]"
                  required 
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address</label>
              <div class="relative">
                <Mail class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  v-model="form.email" 
                  type="email" 
                  placeholder="e.g., seyí@example.com" 
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128]"
                  required 
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase tracking-wider text-slate-400">Initial Message</label>
              <textarea 
                v-model="form.initial_message" 
                rows="3" 
                placeholder="Type your inquiry or issue here..." 
                class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128] resize-none"
                required
              ></textarea>
            </div>

            <button 
              :disabled="isSubmitting"
              type="submit" 
              class="w-full bg-[#0A1128] text-white font-black text-xs py-3.5 rounded-xl shadow-md transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:bg-slate-300"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <span>Start Live Chat</span>
            </button>
          </form>
        </div>

        <!-- BODY VIEW 2: ACTIVE MESSAGING STREAM -->
        <div v-else class="flex-grow flex flex-col justify-between overflow-hidden bg-slate-50/50">
          
          <!-- Message History Stream -->
          <div ref="chatContainer" class="p-4 flex-grow overflow-y-auto space-y-3">
            <div class="text-center py-2">
              <span class="bg-slate-200/80 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full">
                Connected to Support Queue
              </span>
            </div>

            <div 
              v-for="(msg, index) in messages" 
              :key="index"
              class="flex flex-col"
              :class="[
                isOwnMessage(msg) ? 'items-end' : 'items-start'
              ]"
            >
              <div 
                class="max-w-[82%] p-3.5 rounded-2xl text-xs font-medium shadow-2xs leading-relaxed"
                :class="[
                  isOwnMessage(msg)
                    ? 'bg-[#0A1128] text-white rounded-br-xs' 
                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-xs'
                ]"
              >
                {{ msg.content || msg.message }}
              </div>
              <span class="text-[9px] text-slate-400 mt-1 px-1">
                {{ new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isAgentTyping" class="px-4 py-1.5 bg-slate-50/50 flex items-center space-x-2 shrink-0">
            <div class="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl rounded-bl-xs shadow-2xs flex items-center space-x-1.5">
              <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
            </div>
            <span class="text-[10px] text-slate-400 font-semibold italic">Support is typing...</span>
          </div>

          <!-- Message Input Bar -->
          <div class="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <input 
              v-model="inputMessage" 
              @input="handleTyping"
              @keyup.enter="sendMessage"
              type="text" 
              placeholder="Type your message..." 
              class="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0A1128]"
            />
            <button 
              @click="sendMessage"
              class="w-11 h-11 bg-[#0A1128] hover:bg-slate-900 text-[#D4F53C] rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer shadow-sm"
              aria-label="Send Message"
            >
              <Send class="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </Transition>

  </div>
</template>

<style scoped>
.scale-up-enter-active,
.scale-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.scale-up-enter-from,
.scale-up-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}
</style>