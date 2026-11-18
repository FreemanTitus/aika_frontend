<!-- pages/admin/faqs.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader2, HelpCircle, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const faqs = ref<any[]>([])
const isLoading = ref(true)
const isModalOpen = ref(false)
const faqToDelete = ref<number | null>(null)

// Custom Feedback Modal State
const feedbackModal = ref({
  isOpen: false,
  title: '',
  message: '',
  type: 'success' as 'success' | 'error'
})

const showFeedback = (title: string, message: string, type: 'success' | 'error' = 'success') => {
  feedbackModal.value = { isOpen: true, title, message, type }
}

const form = ref({
  question: '',
  answer: '',
  order: 0,
  is_active: true
})

const fetchFaqs = async () => {
  isLoading.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/faqs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    faqs.value = res?.faqs || []
  } catch (err) {
    console.error("Failed to fetch admin FAQs", err)
  } finally {
    isLoading.value = false
  }
}

const handleCreateFaq = async () => {
  try {
    await $fetch(`${apiBase}/api/v1/admin/faqs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: form.value
    })
    isModalOpen.value = false
    form.value = { question: '', answer: '', order: 0, is_active: true }
    await fetchFaqs()
    showFeedback("FAQ Created", "Your new FAQ item has been successfully added.")
  } catch (err: any) {
    showFeedback("Action Failed", err?.data?.detail || "Failed to create FAQ.", "error")
  }
}

const confirmDeleteFaq = (id: number) => {
  faqToDelete.value = id
}

const executeDeleteFaq = async () => {
  if (!faqToDelete.value) return
  const id = faqToDelete.value
  faqToDelete.value = null

  try {
    await $fetch(`${apiBase}/api/v1/admin/faqs/${id}/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    await fetchFaqs()
    showFeedback("FAQ Deleted", "The FAQ item was successfully removed.")
  } catch (err: any) {
    showFeedback("Action Failed", err?.data?.detail || "Failed to delete FAQ.", "error")
  }
}

onMounted(fetchFaqs)
</script>

<template>
  <div class="space-y-8 text-left max-w-5xl mx-auto">
    
    <!-- Header Banner Card -->
    <div class="bg-[#0A1128] text-white p-6 sm:p-8 rounded-[32px] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-[#D4F53C]/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div class="flex items-center space-x-4 relative z-10">
        <div class="w-14 h-14 bg-white/10 border border-white/20 text-[#D4F53C] rounded-2xl flex items-center justify-center shadow-inner shrink-0">
          <HelpCircle class="w-7 h-7" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-[#D4F53C] bg-[#D4F53C]/10 px-3 py-1 rounded-full border border-[#D4F53C]/20">Content Hub</span>
          <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">Frequently Asked Questions</h2>
          <p class="text-xs text-gray-300 font-medium mt-0.5">
            Add and manage public FAQs displayed on the platform landing page.
          </p>
        </div>
      </div>
      
      <div class="flex items-center gap-3 relative z-10">
        <button 
          type="button"
          @click="fetchFaqs" 
          :disabled="isLoading"
          class="px-4 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black rounded-2xl transition shadow-lg flex items-center gap-2 cursor-pointer outline-none backdrop-blur-md"
        >
          <RefreshCw :class="{ 'animate-spin': isLoading }" class="w-4 h-4 text-[#D4F53C]" />
          <span>Refresh</span>
        </button>
        <button 
          type="button"
          @click="isModalOpen = true" 
          class="px-5 py-3.5 bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] text-xs font-black rounded-2xl transition shadow-lg flex items-center gap-2 cursor-pointer outline-none"
        >
          <Plus class="w-4 h-4" />
          <span>Add New FAQ</span>
        </button>
      </div>
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="flex justify-center py-24">
      <Loader2 class="w-8 h-8 animate-spin text-[#0A1128]" />
    </div>

    <!-- Empty State -->
    <div v-else-if="faqs.length === 0" class="bg-white border border-gray-100 rounded-[32px] p-16 text-center text-gray-400 shadow-sm">
      <HelpCircle class="w-12 h-12 mx-auto mb-3 opacity-20 text-[#0A1128]" />
      <p class="text-xs font-black uppercase tracking-wider text-gray-500">No FAQs created yet.</p>
      <p class="text-[11px] text-gray-400 mt-1">Click "Add New FAQ" to create support items for your users.</p>
    </div>

    <!-- FAQ List Grid -->
    <div v-else class="space-y-4">
      <div 
        v-for="faq in faqs" 
        :key="faq.id" 
        class="bg-white border border-gray-100 rounded-[28px] p-6 shadow-md flex items-center justify-between gap-6"
      >
        <div class="space-y-1.5 flex-1 min-w-0">
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-mono font-bold text-gray-400">#{{ faq.order }}</span>
            <h4 class="text-sm font-black text-[#0A1128] truncate">{{ faq.question }}</h4>
            <span :class="faq.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'" class="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md">
              {{ faq.is_active ? 'Active' : 'Hidden' }}
            </span>
          </div>
          <p class="text-xs text-gray-600 font-medium leading-relaxed line-clamp-2">
            {{ faq.answer }}
          </p>
        </div>

        <button 
          @click="confirmDeleteFaq(faq.id)"
          class="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer border-0 shadow-2xs shrink-0"
          title="Delete FAQ"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Add FAQ Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/70 backdrop-blur-xs p-4">
      <div class="w-full max-w-lg bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-2xl relative space-y-6 text-[#0A1128] text-left animate-in fade-in zoom-in duration-200">
        
        <div class="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span class="text-[10px] font-black tracking-widest bg-[#D4F53C]/30 text-[#0A1128] px-3.5 py-1 rounded-full uppercase">Support</span>
            <h3 class="text-xl font-black tracking-tight text-[#0A1128] mt-1">Create FAQ Item</h3>
          </div>
          <button type="button" @click="isModalOpen = false" class="p-2 text-gray-400 hover:text-[#0A1128] bg-gray-100 rounded-xl border-0 cursor-pointer outline-none transition">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleCreateFaq" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Question</label>
            <input 
              v-model="form.question" 
              type="text" 
              required 
              placeholder="e.g. How are delivery prices calculated?" 
              class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl px-4 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Answer</label>
            <textarea 
              v-model="form.answer" 
              rows="4" 
              required 
              placeholder="Detailed answer for users..." 
              class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl px-4 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Display Order</label>
              <input 
                v-model.number="form.order" 
                type="number" 
                class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:border-[#0A1128] focus:bg-white transition"
              />
            </div>
            <div class="flex items-center pt-5">
              <label class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" v-model="form.is_active" class="w-4 h-4 rounded text-[#0A1128] accent-[#0A1128]">
                <span class="text-xs font-black uppercase text-[#0A1128]">Active (Publish)</span>
              </label>
            </div>
          </div>

          <div class="pt-2 flex items-center gap-3">
            <button 
              type="button" 
              @click="isModalOpen = false" 
              class="w-1/3 py-4 bg-gray-100 hover:bg-gray-200 text-[#0A1128] font-black text-xs uppercase tracking-wider rounded-2xl transition border-0 cursor-pointer outline-none"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="w-2/3 py-4 bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg cursor-pointer border-0 outline-none active:scale-95"
            >
              Save FAQ
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- Confirm Delete Modal -->
    <div v-if="faqToDelete !== null" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/70 backdrop-blur-xs p-4">
      <div class="w-full max-w-sm bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-2xl relative space-y-6 text-[#0A1128] text-center animate-in fade-in zoom-in duration-200">
        
        <div class="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
          <Trash2 class="w-8 h-8" />
        </div>

        <div class="space-y-2">
          <h3 class="text-xl font-black tracking-tight text-[#0A1128]">Delete FAQ Item?</h3>
          <p class="text-xs text-gray-500 font-medium leading-relaxed">
            Are you sure you want to remove this FAQ item? This action cannot be undone.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button 
            type="button" 
            @click="faqToDelete = null" 
            class="py-3.5 bg-gray-100 hover:bg-gray-200 text-[#0A1128] font-black text-xs uppercase tracking-wider rounded-2xl transition border-0 cursor-pointer outline-none"
          >
            Cancel
          </button>
          <button 
            type="button" 
            @click="executeDeleteFaq" 
            class="py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg cursor-pointer border-0 outline-none active:scale-95"
          >
            Yes, Delete
          </button>
        </div>

      </div>
    </div>

    <!-- Custom Feedback Modal -->
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