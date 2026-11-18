<!-- pages/auth/reset-password.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from '#app'
import { Lock, Loader2, Sparkles, CheckCircle2, ShieldCheck, Eye, EyeOff, ArrowRight } from '@lucide/vue'

definePageMeta({
  layout: false // Full screen layout matching login and registration portals
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
  <div class="min-h-screen w-full grid lg:grid-cols-2 font-sans selection:bg-[#D4F53C] selection:text-[#0A1128]">

    <!-- ───────── Left Side: Full Colored Brand Panel ───────── -->
    <aside class="relative hidden lg:flex flex-col justify-between bg-[#0A1128] p-16 text-white overflow-hidden">
      <!-- Ambient Background Glows -->
      <div class="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#D4F53C]/10 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

      <div class="relative z-10">
        <NuxtLink to="/" class="inline-flex items-center space-x-2.5 group no-underline">
          <div class="w-28 flex items-center justify-center p-1">
            <img src="/images/logo_white.png" alt="Aika Logo" class="w-full h-full object-contain">
          </div>
        </NuxtLink>
      </div>

      <div class="relative z-10 space-y-6 my-auto py-12">
        <span class="inline-block bg-[#D4F53C] text-[#0A1128] font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          Account Security
        </span>
        <h2 class="text-5xl font-black leading-tight tracking-tight">
          Secure your account<br />
          <span class="text-[#D4F53C]">with a new password.</span>
        </h2>
        <p class="text-gray-300 text-sm leading-relaxed max-w-md font-medium">
          Choose a strong, unique password to keep your storefront, orders, and delivery ledger protected.
        </p>

        <ul class="space-y-4 pt-4">
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Minimum 8 characters with strong encryption
          </li>
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Instant token verification &amp; session reset
          </li>
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Enterprise-grade identity protection
          </li>
        </ul>
      </div>

      <p class="relative z-10 text-xs text-gray-400 font-medium">
        © {{ new Date().getFullYear() }} Aika. All rights reserved.
      </p>
    </aside>

    <!-- ───────── Right Side: Full White Form Panel ───────── -->
    <main class="flex flex-col justify-center items-center bg-white p-6 sm:p-12 lg:p-20 min-h-screen lg:min-h-0">
      <div class="w-full max-w-md mx-auto space-y-8">
        
        <!-- Mobile brand mark -->
        <div class="lg:hidden flex items-center justify-center mb-4">
          <div class="w-32">
            <img src="/images/logo.png" alt="Aika Logo" class="w-full object-contain">
          </div>
        </div>

        <!-- Header -->
        <header class="text-center lg:text-left space-y-2">
          <span class="inline-flex items-center space-x-1.5 text-[10px] font-black text-[#0A1128] uppercase tracking-widest bg-[#D4F53C]/40 px-3.5 py-1 rounded-full">
            <Sparkles class="w-3 h-3" />
            <span>New Credentials</span>
          </span>
          <h1 class="text-3xl font-black text-[#0A1128] tracking-tight">Set New Password</h1>
          <p class="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
            Please enter a secure new password for your Aika account.
          </p>
        </header>

        <!-- Success State -->
        <div v-if="isSuccess" class="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl space-y-3 text-center shadow-sm">
          <CheckCircle2 class="w-12 h-12 text-emerald-600 mx-auto" />
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
                class="w-full bg-gray-50/80 border border-gray-200 text-[#0A1128] rounded-2xl pl-11 pr-12 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"
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
                class="w-full bg-gray-50/80 border border-gray-200 text-[#0A1128] rounded-2xl pl-11 pr-12 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"
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
            class="group w-full py-4 bg-[#0A1128] hover:bg-[#16224a] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-xl shadow-[#0A1128]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 outline-none flex items-center justify-center space-x-2 active:scale-95 mt-2"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin text-[#D4F53C]" />
            <template v-else>
              <span>Save New Password</span>
              <ArrowRight class="w-4 h-4 stroke-[3] transition-transform group-hover:translate-x-1" />
            </template>
          </button>
        </form>

        <div class="text-center text-xs text-gray-500 font-bold">
          Remembered your password? <NuxtLink to="/auth/login" class="text-[#0A1128] font-black hover:underline ml-1">Login here</NuxtLink>
        </div>

      </div>
    </main>

  </div>
</template>