<!-- pages/auth/reset-password.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from '#app'
import { Lock, Loader2, Sparkles, CheckCircle2, ShieldCheck, Eye, EyeOff } from '@lucide/vue'

definePageMeta({
  layout: 'default'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const route = useRoute()
const router = useRouter()

const token = ref<string>('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isSuccess = ref(false)

const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

onMounted(() => {
  if (route.query.token) {
    token.value = String(route.query.token)
  } else {
    errorMessage.value = "Missing or invalid password reset token."
  }
})

const handlePasswordResetConfirm = async () => {
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "Passwords do not match."
    return
  }

  errorMessage.value = null
  isLoading.value = true

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/password/reset/confirm`, {
      method: 'POST',
      body: {
        token: token.value,
        new_password: newPassword.value
      }
    })

    isSuccess.value = true
    setTimeout(() => {
      router.push('/auth/login')
    }, 3000)
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Failed to reset password. Link may have expired.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-gray-50/50 min-h-screen flex items-center justify-center p-4 font-sans text-[#0A1128] relative overflow-hidden">
    <!-- Ambient Glow Background Effects -->
    <div class="absolute top-0 right-0 w-96 h-96 bg-[#D4F53C]/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md bg-white border border-gray-100 rounded-[32px] p-6 sm:p-10 shadow-xl relative z-10 space-y-6 text-left overflow-hidden">
      
      <!-- Decorative Top Accent Line -->
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0A1128] via-[#D4F53C] to-[#0A1128]"></div>

      <!-- Header -->
      <div class="space-y-2">
        <span class="inline-flex items-center space-x-1.5 text-[10px] font-black text-[#0A1128] uppercase tracking-widest bg-[#D4F53C]/20 px-3.5 py-1 rounded-full shadow-2xs">
          <Sparkles class="w-3 h-3" />
          <span>New Credentials</span>
        </span>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-[#0A1128]">Set New Password</h1>
        <p class="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
          Please enter a secure new password for your Aika account.
        </p>
      </div>

      <!-- Success State -->
      <div v-if="isSuccess" class="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl space-y-3 text-center shadow-sm">
        <CheckCircle2 class="w-10 h-10 text-emerald-600 mx-auto" />
        <h3 class="text-sm font-black text-[#0A1128]">Password Reset Successful!</h3>
        <p class="text-xs text-gray-600 leading-relaxed font-medium">
          Your password has been successfully updated. Redirecting you to login...
        </p>
      </div>

      <!-- Reset Form -->
      <form v-else @submit.prevent="handlePasswordResetConfirm" class="space-y-4">
        
        <!-- New Password Field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">New Password</label>
          <div class="relative group">
            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors" />
            <input 
              v-model="newPassword" 
              :type="showNewPassword ? 'text' : 'password'" 
              placeholder="••••••••" 
              required 
              minlength="8"
              class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl pl-11 pr-12 py-3.5 text-base sm:text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"
            />
            <button 
              type="button" 
              @click="showNewPassword = !showNewPassword" 
              class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A1128] bg-transparent border-0 cursor-pointer outline-none p-1"
            >
              <Eye v-if="!showNewPassword" class="w-4 h-4" />
              <EyeOff v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Confirm Password Field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Confirm New Password</label>
          <div class="relative group">
            <ShieldCheck class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors" />
            <input 
              v-model="confirmPassword" 
              :type="showConfirmPassword ? 'text' : 'password'" 
              placeholder="••••••••" 
              required 
              minlength="8"
              class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl pl-11 pr-12 py-3.5 text-base sm:text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"
            />
            <button 
              type="button" 
              @click="showConfirmPassword = !showConfirmPassword" 
              class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A1128] bg-transparent border-0 cursor-pointer outline-none p-1"
            >
              <Eye v-if="!showConfirmPassword" class="w-4 h-4" />
              <EyeOff v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="text-xs font-bold text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm">
          {{ errorMessage }}
        </div>

        <button 
          type="submit" 
          :disabled="isLoading || !token" 
          class="w-full py-4 bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 outline-none flex items-center justify-center space-x-2 active:scale-95"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin text-[#0A1128]" />
          <span>{{ isLoading ? 'Updating Password...' : 'Save New Password' }}</span>
        </button>
      </form>

    </div>
  </div>
</template>