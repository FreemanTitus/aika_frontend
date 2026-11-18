<!-- pages/auth/forgot-password.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { Mail, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from '@lucide/vue'

definePageMeta({
  layout: 'default'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase // Automatically picks up from your .env file

const email = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isSubmitted = ref(false)

const handlePasswordResetRequest = async () => {
  errorMessage.value = null
  isLoading.value = true

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/password/reset/request`, {
      method: 'POST',
      body: { email: email.value }
    })
    
    isSubmitted.value = true
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Failed to process password reset request.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-[#F9FAFB] min-h-screen flex items-center justify-center p-4 font-sans text-[#0A1128] relative overflow-hidden">
    <!-- Ambient Glow Background Effects -->
    <div class="absolute top-0 right-0 w-96 h-96 bg-[#D4F53C]/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md bg-white border border-gray-100 rounded-[36px] p-8 shadow-2xl relative z-10 space-y-6 text-left">
      
      <!-- Top Navigation back to login -->
      <div>
        <NuxtLink to="/auth/login" class="inline-flex items-center space-x-2 text-xs font-black text-gray-400 hover:text-[#0A1128] transition no-underline">
          <ArrowLeft class="w-4 h-4" />
          <span>Back to Login</span>
        </NuxtLink>
      </div>

      <!-- Header -->
      <div class="space-y-2">
        <span class="inline-flex items-center space-x-1.5 text-[10px] font-black text-[#0A1128] uppercase tracking-widest bg-[#D4F53C] px-3.5 py-1 rounded-full shadow-2xs">
          <Sparkles class="w-3 h-3" />
          <span>Account Recovery</span>
        </span>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-[#0A1128]">Forgot Password?</h1>
        <p class="text-xs text-gray-500 font-medium leading-relaxed">
          Enter the email address linked to your account and we'll send you a secure link to reset your password.
        </p>
      </div>

      <!-- Success State Message -->
      <div v-if="isSubmitted" class="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl space-y-3 text-center">
        <CheckCircle2 class="w-10 h-10 text-emerald-600 mx-auto" />
        <h3 class="text-sm font-black text-[#0A1128]">Check Your Inbox</h3>
        <p class="text-xs text-gray-600 leading-relaxed">
          If an account exists for <strong class="text-[#0A1128]">{{ email }}</strong>, you will receive password reset instructions shortly.
        </p>
      </div>

      <!-- Request Form -->
      <form v-else @submit.prevent="handlePasswordResetRequest" class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Email Address</label>
          <div class="relative">
            <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              v-model="email" 
              type="email" 
              placeholder="name@example.com" 
              required 
              class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"
            />
          </div>
        </div>

        <div v-if="errorMessage" class="text-xs font-bold text-rose-600 bg-rose-50 p-3.5 rounded-xl border border-rose-100">
          {{ errorMessage }}
        </div>

        <button 
          type="submit" 
          :disabled="isLoading" 
          class="w-full py-4 bg-[#0A1128] hover:bg-[#152248] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 outline-none flex items-center justify-center space-x-2"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin text-[#D4F53C]" />
          <span>{{ isLoading ? 'Sending Link...' : 'Send Reset Instructions' }}</span>
        </button>
      </form>

    </div>
  </div>
</template>