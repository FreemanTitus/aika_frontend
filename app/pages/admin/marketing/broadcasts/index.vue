<!-- pages/admin/marketing/broadcasts.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { Megaphone, Send, CheckCircle2, AlertCircle, Loader2 } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const form = ref({
  title: '',
  message: '',
  target_audience: 'all'
})

const isSubmitting = ref(false)
const feedbackMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const sendBroadcast = async () => {
  if (!form.value.title || !form.value.message) {
    feedbackMessage.value = { type: 'error', text: 'Please fill in both title and message body.' }
    return
  }

  isSubmitting.value = true
  feedbackMessage.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/broadcasts/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'Content-Type': 'application/json'
      },
      body: form.value
    })

    feedbackMessage.value = { type: 'success', text: res?.message || 'Broadcast dispatched successfully!' }
    form.value.title = ''
    form.value.message = ''
  } catch (err: any) {
    feedbackMessage.value = { type: 'error', text: err?.data?.detail || 'Failed to dispatch broadcast.' }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4 font-sans text-[#0A1128] text-left space-y-6">
    
    <div class="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
      <div class="flex items-center space-x-3 border-b border-gray-100 pb-4">
        <div class="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Megaphone class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-lg font-black text-[#0A1128]">System Push Broadcast</h2>
          <p class="text-xs text-gray-400 font-medium">Send real-time alerts or promotional notices to connected users.</p>
        </div>
      </div>

      <!-- Feedback Alert -->
      <div v-if="feedbackMessage" :class="feedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'" class="p-4 rounded-2xl border text-xs font-bold flex items-center gap-2">
        <CheckCircle2 v-if="feedbackMessage.type === 'success'" class="w-4 h-4 shrink-0 text-emerald-600" />
        <AlertCircle v-else class="w-4 h-4 shrink-0 text-rose-600" />
        <span>{{ feedbackMessage.text }}</span>
      </div>

      <form @submit.prevent="sendBroadcast" class="space-y-4">
        <div>
          <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Target Audience</label>
          <select 
            v-model="form.target_audience" 
            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:border-indigo-500 outline-none transition"
          >
            <option value="all">All Users (Merchants, Riders &amp; Customers)</option>
            <option value="merchants">Merchants Only</option>
            <option value="riders">Delivery Riders Only</option>
            <option value="customers">Customers Only</option>
          </select>
        </div>

        <div>
          <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Announcement Title</label>
          <input 
            v-model="form.title" 
            type="text" 
            placeholder="e.g. Scheduled System Maintenance Notice" 
            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:border-indigo-500 outline-none transition"
          />
        </div>

        <div>
          <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Message Body</label>
          <textarea 
            v-model="form.message" 
            rows="4" 
            placeholder="Type your broadcast message details here..." 
            class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-semibold focus:border-indigo-500 outline-none transition resize-none"
          ></textarea>
        </div>

        <div class="pt-2">
          <button 
            type="submit" 
            :disabled="isSubmitting"
            class="bg-[#0A1128] hover:bg-opacity-95 text-white text-xs font-black uppercase tracking-wider py-3.5 px-6 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer border-0 outline-none disabled:opacity-50 w-full sm:w-auto"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <Send v-else class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Dispatching Broadcast...' : 'Broadcast Announcement' }}</span>
          </button>
        </div>
      </form>
    </div>

  </div>
</template>