<!-- pages/agent/newsletter.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader2, Mail, Send, Users, CheckCircle2, AlertCircle } from '@lucide/vue'

definePageMeta({ layout: 'staff', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const subscribers = ref<any[]>([])
const isLoading = ref(true)
const isSending = ref(false)

const broadcastForm = ref({
  subject: '',
  content: ''
})

const feedbackModal = ref({
  isOpen: false,
  title: '',
  message: '',
  type: 'success' as 'success' | 'error'
})

const showFeedback = (title: string, message: string, type: 'success' | 'error' = 'success') => {
  feedbackModal.value = { isOpen: true, title, message, type }
}

const fetchSubscribers = async () => {
  isLoading.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/staff/newsletter/subscribers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    subscribers.value = res?.subscribers || []
  } catch (err) {
    console.error("Failed to fetch subscribers", err)
  } finally {
    isLoading.value = false
  }
}

const sendBroadcast = async () => {
  isSending.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/staff/newsletter/broadcast`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: broadcastForm.value
    })
    broadcastForm.value = { subject: '', content: '' }
    showFeedback("Broadcast Sent", res?.message || "Newsletter broadcasted successfully.")
  } catch (err: any) {
    showFeedback("Broadcast Failed", err?.data?.detail || "Failed to send broadcast.", "error")
  } finally {
    isSending.value = false
  }
}

onMounted(fetchSubscribers)
</script>

<template>
  <div class="space-y-8 text-left max-w-5xl mx-auto">
    
    <!-- Header Banner -->
    <div class="bg-[#0A1128] text-white p-6 sm:p-8 rounded-[32px] shadow-xl flex items-center justify-between gap-6 relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-[#D4F53C]/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div class="flex items-center space-x-4 relative z-10">
        <div class="w-14 h-14 bg-white/10 border border-white/20 text-[#D4F53C] rounded-2xl flex items-center justify-center shadow-inner shrink-0">
          <Mail class="w-7 h-7" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-[#D4F53C] bg-[#D4F53C]/10 px-3 py-1 rounded-full border border-[#D4F53C]/20">Marketing Hub</span>
          <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">Newsletter &amp; Broadcasts</h2>
          <p class="text-xs text-gray-300 font-medium mt-0.5">
            Manage subscriber lists and broadcast updates to your community.
          </p>
        </div>
      </div>

      <div class="hidden sm:flex items-center space-x-3 bg-white/10 border border-white/20 px-4 py-3 rounded-2xl backdrop-blur-md relative z-10">
        <Users class="w-5 h-5 text-[#D4F53C]" />
        <div>
          <p class="text-[9px] uppercase font-bold text-gray-300 tracking-wider">Total Subscribers</p>
          <p class="text-base font-black text-white font-mono">{{ subscribers.length }}</p>
        </div>
      </div>
    </div>

    <!-- Broadcast Form Section -->
    <div class="bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-xl space-y-6">
      <div class="border-b border-gray-100 pb-4">
        <h3 class="text-lg font-black text-[#0A1128]">Compose Newsletter Broadcast</h3>
        <p class="text-xs text-gray-500 font-medium mt-0.5">Send an email announcement to all active subscribers instantly.</p>
      </div>

      <form @submit.prevent="sendBroadcast" class="space-y-4">
        <div>
          <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Email Subject Line</label>
          <input 
            v-model="broadcastForm.subject" 
            type="text" 
            required 
            placeholder="e.g. Exciting New Features &amp; Lower Delivery Rates!" 
            class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl px-4 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition"
          />
        </div>

        <div>
          <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Email Content Message</label>
          <textarea 
            v-model="broadcastForm.content" 
            rows="6" 
            required 
            placeholder="Write your newsletter message here..." 
            class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl px-4 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition resize-none"
          ></textarea>
        </div>

        <button 
          type="submit" 
          :disabled="isSending"
          class="w-full py-4 bg-[#0A1128] hover:bg-[#151f42] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg cursor-pointer border-0 outline-none flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <Loader2 v-if="isSending" class="w-4 h-4 animate-spin" />
          <Send v-else class="w-4 h-4" />
          <span>{{ isSending ? 'Broadcasting...' : 'Broadcast to All Subscribers' }}</span>
        </button>
      </form>
    </div>

    <!-- Subscribers Table -->
    <div class="bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-xl space-y-6">
      <div class="flex justify-between items-center border-b border-gray-100 pb-4">
        <div>
          <h3 class="text-lg font-black text-[#0A1128]">Active Subscribers List</h3>
          <p class="text-xs text-gray-500 font-medium mt-0.5">Users currently opted in to receive updates.</p>
        </div>
        <button @click="fetchSubscribers" class="text-xs font-black text-[#0A1128] bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition cursor-pointer">
          Refresh List
        </button>
      </div>

      <div v-if="isLoading" class="flex justify-center py-12">
        <Loader2 class="w-6 h-6 animate-spin text-[#0A1128]" />
      </div>

      <div v-else-if="subscribers.length === 0" class="text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-wider">
        No newsletter subscribers yet.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
              <th class="py-3 px-4">#</th>
              <th class="py-3 px-4">Email Address</th>
              <th class="py-3 px-4">Subscribed Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
            <tr v-for="(sub, index) in subscribers" :key="sub.id" class="hover:bg-gray-50/50 transition">
              <td class="py-3.5 px-4 font-mono text-gray-400">{{ index + 1 }}</td>
              <td class="py-3.5 px-4 font-bold text-[#0A1128]">{{ sub.email }}</td>
              <td class="py-3.5 px-4 font-mono text-gray-500">{{ new Date(sub.subscribed_at).toLocaleDateString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Feedback Modal -->
    <div v-if="feedbackModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/70 backdrop-blur-xs p-4">
      <div class="w-full max-w-sm bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-2xl relative space-y-6 text-[#0A1128] text-center animate-in fade-in zoom-in duration-200">
        
        <div :class="feedbackModal.type === 'success' ? 'bg-[#D4F53C]/20 text-[#0A1128]' : 'bg-rose-100 text-rose-600'" class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 v-if="feedbackModal.type === 'success'" class="w-8 h-8" />
          <AlertCircle v-else class="w-8 h-8" />
        </div>

        <div class="space-y-2">
          <h3 class="text-xl font-black tracking-tight text-[#0A1128]">{{ feedbackModal.title }}</h3>
          <p class="text-xs text-gray-500 font-medium leading-relaxed">
            {{ feedbackModal.message }}
          </p>
        </div>

        <button 
          type="button" 
          @click="feedbackModal.isOpen = false" 
          class="w-full py-4 bg-[#0A1128] hover:bg-[#151f42] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg cursor-pointer border-0 outline-none active:scale-95"
        >
          Okay
        </button>

      </div>
    </div>

  </div>
</template>