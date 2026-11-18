<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter, useRuntimeConfig, useCookie } from '#app'
import { Loader2, CheckCircle, XCircle } from '@lucide/vue'

definePageMeta({
  layout: 'marketplace'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const route = useRoute()
const router = useRouter()
const authCookie = useCookie<string | null>('auth_token')

const status = ref<'processing' | 'success' | 'failed'>('processing')
const statusMessage = ref('Reaching out to regional payment verification clusters...')

onMounted(async () => {
  const orderId = Array.isArray(route.query.order_id) ? route.query.order_id[0] : route.query.order_id

  if (!orderId) {
    status.value = 'failed'
    statusMessage.value = 'Missing structural order identification parameters.'
    return
  }

  if (!authCookie.value) {
    // The verify endpoint is authenticated: send the customer through login and back here.
    router.push({ path: '/auth/login', query: { redirect: route.fullPath } })
    return
  }

  // The server verifies the payment against Paystack using the reference stored on the order
  // (nothing from the URL is trusted), so we only send the order id. Paystack's webhook can
  // arrive a moment after the redirect, so retry a few times before reporting a problem.
  const MAX_ATTEMPTS = 8
  const WAIT_MS = 2500
  let lastError: any = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await $fetch(`${apiBase}/api/v1/marketplace/verify-web/${orderId}`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${authCookie.value}`
        }
      })

      status.value = 'success'
      statusMessage.value = 'Payment confirmed! Your order has been sent to the merchant.'
      setTimeout(() => router.push(`/marketplace/order-summary/${orderId}`), 2500)
      return
    } catch (err: any) {
      lastError = err
      const code = err?.statusCode ?? err?.status ?? err?.response?.status
      if (code !== 400) break               // 401/403/404: retrying will not help
      statusMessage.value = `Waiting for payment confirmation (${attempt}/${MAX_ATTEMPTS})...`
      await new Promise(resolve => setTimeout(resolve, WAIT_MS))
    }
  }

  status.value = 'failed'
  const code = lastError?.statusCode ?? lastError?.status ?? lastError?.response?.status
  statusMessage.value = code === 400
    ? 'We could not confirm your payment yet. If you were charged, your order will be confirmed automatically within a few minutes: check your orders page.'
    : (lastError?.data?.detail || lastError?.message || 'We could not verify this payment.')
})
</script>
<template>
  <main class="min-h-screen bg-gray-50/50 flex items-center justify-center p-4 font-sans">
    <div class="max-w-md w-full bg-white rounded-[32px] border border-gray-100 p-8 text-center shadow-2xl transition-all">
      
      <div v-if="status === 'processing'" class="space-y-4 py-6">
        <Loader2 class="w-12 h-12 text-[#0A1128] animate-spin mx-auto" />
        <h2 class="text-xl font-black text-[#0A1128]">Verifying Ledger Settlement</h2>
        <p class="text-gray-400 text-xs font-semibold leading-relaxed px-4">{{ statusMessage }}</p>
      </div>

      <div v-else-if="status === 'success'" class="space-y-4 py-6 animate-fade-in">
        <div class="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle class="w-8 h-8" />
        </div>
        <h2 class="text-xl font-black text-[#0A1128]">Transaction Verified</h2>
        <p class="text-emerald-700 text-xs font-bold leading-relaxed px-4">{{ statusMessage }}</p>
      </div>

      <div v-else class="space-y-4 py-6 animate-fade-in">
        <div class="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <XCircle class="w-8 h-8" />
        </div>
        <h2 class="text-xl font-black text-[#0A1128]">Clearance Verification Fault</h2>
        <p class="text-rose-600 text-xs font-semibold leading-relaxed px-4">{{ statusMessage }}</p>
        <div class="pt-2">
          <NuxtLink to="/marketplace" class="inline-block bg-[#0A1128] text-white font-black text-xs px-6 py-2.5 rounded-xl transition shadow-md hover:bg-rose-950">
            Return to Marketplace
          </NuxtLink>
        </div>
      </div>

    </div>
  </main>
</template>