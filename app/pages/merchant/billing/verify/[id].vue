<!-- pages/merchant/billing/verify/[id].vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, useCookie, useRuntimeConfig } from '#app'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const route = useRoute()
const router = useRouter()
const authToken = useCookie('auth_token')

const invoiceId = route.params.id as string

const verificationStatus = ref<'verifying' | 'success' | 'error'>('verifying')
const message = ref('Contacting OPay secure gateway to verify transaction status...')

// Execute verification request on mount with explicit headers
const verifyPayment = async () => {
  verificationStatus.value = 'verifying'
  message.value = 'Contacting OPay secure gateway to verify transaction status...'

  try {
    const response: any = await $fetch(`${apiBase}/api/v1/payment/billing/verify/${invoiceId}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })

    verificationStatus.value = 'success'
    message.value = response?.message || 'Payment verified successfully! Your corporate tier has been upgraded.'
  } catch (err: any) {
    verificationStatus.value = 'error'
    message.value = err?.data?.detail || 'Payment verification failed or was declined by the gateway.'
  }
}

onMounted(() => {
  verifyPayment()
})

const goToBilling = () => {
  router.push('/merchant/billing')
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center p-6 text-left">
    <div class="max-w-md w-full bg-white border border-gray-100 rounded-3xl shadow-sm p-8 text-center space-y-6">
      
      <!-- Verifying Loading State -->
      <div v-if="verificationStatus === 'verifying'" class="space-y-4 py-6">
        <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Loader2 :size="32" class="animate-spin" />
        </div>
        <div class="space-y-1">
          <h1 class="text-xl font-black text-gray-900 tracking-tight">Verifying Payment</h1>
          <p class="text-xs text-gray-500 font-medium leading-relaxed px-4">{{ message }}</p>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="verificationStatus === 'success'" class="space-y-4 py-6">
        <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 :size="32" />
        </div>
        <div class="space-y-1">
          <h1 class="text-xl font-black text-gray-900 tracking-tight">Verification Confirmed</h1>
          <p class="text-xs text-emerald-700 font-bold leading-relaxed px-4">{{ message }}</p>
        </div>

        <div class="pt-4">
          <button 
            @click="goToBilling"
            class="w-full py-3.5 bg-indigo-600 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer outline-none border-0"
          >
            Return to Subscriptions
            <ArrowRight :size="14" />
          </button>
        </div>
      </div>

      <!-- Error State -->
      <div v-else class="space-y-4 py-6">
        <div class="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle :size="32" />
        </div>
        <div class="space-y-1">
          <h1 class="text-xl font-black text-gray-900 tracking-tight">Verification Failed</h1>
          <p class="text-xs text-rose-700 font-bold leading-relaxed px-4">{{ message }}</p>
        </div>

        <div class="pt-4">
          <button 
            @click="goToBilling"
            class="w-full py-3.5 bg-gray-900 text-white text-xs font-bold rounded-2xl shadow-md hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer outline-none border-0"
          >
            Back to Billing Dashboard
            <ArrowRight :size="14" />
          </button>
        </div>
      </div>

    </div>
  </div>
</template>