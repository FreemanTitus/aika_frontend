<!-- pages/merchant/orders/[id].vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRuntimeConfig, useCookie } from '#app'
import { 
  ArrowLeft,
  Calendar,
  User,
  Receipt,
  AlertCircle,
  Loader2,
  MapPin,
  ShoppingBag
} from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const route = useRoute()
const authToken = useCookie('auth_token')
const orderId = route.params.id as string

// Define TypeScript Interface matching the Merchant Summary API response
interface MerchantOrderItem {
  product_name: string
  quantity: number
  unit_price: number
  total_item_price: number
}

interface MerchantOrderSummaryResponse {
  status: string
  order_reference: string
  items: MerchantOrderItem[]
  subtotal: number
  delivery_fee: number
  total_amount: number
}

// Reactive states for order summary data, loading, and error handling
const response = ref<MerchantOrderSummaryResponse | null>(null)
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Fetch targeted merchant order summary from backend endpoint on mount with explicit headers
const fetchOrderSummary = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/merchant/order-summary/${orderId}`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    response.value = res?.data || res || null
  } catch (err: any) {
    console.error("Merchant order summary fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchOrderSummary()
})

// Formatting & Style Mapping Agents
const formatCurrency = (value: number): string => {
  return "₦" + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="bg-gray-50/40 min-h-screen py-8 px-4 sm:px-8 font-sans text-left selection:bg-[#D4F53C] selection:text-[#0A1128]">
    <div class="max-w-4xl mx-auto space-y-6">
      
      <!-- TOP INTERACTIVE BACK NAVIGATION ROW -->
      <div class="flex items-center justify-between">
        <NuxtLink to="/merchant/dashboard" class="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-[#0A1128] transition group cursor-pointer">
          <ArrowLeft class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Dashboard</span>
        </NuxtLink>
        <div class="text-[10px] font-black uppercase text-gray-400 tracking-widest bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-2xs">
          Merchant Fulfillment Summary
        </div>
      </div>

      <!-- LOAD STATES LOADING BUFFER -->
      <div v-if="pending" class="bg-white rounded-3xl border border-gray-100 p-24 text-center space-y-4 shadow-xs">
        <Loader2 class="w-10 h-10 animate-spin text-[#0A1128] mx-auto stroke-[2.5]" />
        <p class="text-xs text-gray-400 font-black uppercase tracking-widest">Hydrating Merchant Order Ledger...</p>
      </div>

      <!-- RESPONSE ERROR FALLBACK BOUNDARY BOX -->
      <div v-else-if="error || !response" class="bg-white p-12 rounded-[32px] shadow-xl border border-gray-100 text-center max-w-md mx-auto space-y-4">
        <AlertCircle class="w-12 h-12 text-rose-500 mx-auto" />
        <h2 class="text-lg font-black text-[#0A1128]">Ledger Resolution Error</h2>
        <p class="text-gray-500 text-xs font-medium leading-relaxed">
          The requested transaction reference <span class="font-mono font-bold text-gray-800 bg-gray-50 px-1.5 py-0.5 rounded">{{ orderId }}</span> is either invalid or unauthorized for your merchant profile.
        </p>
        <NuxtLink to="/merchant/dashboard" class="mt-2 bg-[#0A1128] text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider block hover:bg-opacity-95 transition">
          Return to Dashboard
        </NuxtLink>
      </div>

      <!-- MAIN FULFILLMENT INTERFACE PANEL CONTAINER -->
      <div v-else class="space-y-6 animate-fade-in">
        
        <!-- HERO OVERVIEW BLOCK -->
        <div class="bg-white rounded-[28px] border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative overflow-hidden">
          <div class="absolute top-0 left-0 h-full w-[4px] bg-[#84cc16]"></div>
          
          <div class="space-y-2 text-left">
            <div class="flex items-center space-x-3 flex-wrap gap-y-2">
              <span class="font-mono bg-gray-100 border border-gray-200/60 text-gray-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                Ref: {{ response.order_reference }}
              </span>
              <span class="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                Storefront Verified
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-[#0A1128] tracking-tight">Merchant Order Breakdown</h1>
            <p class="text-xs text-gray-400 font-medium flex items-center">
              <Calendar class="w-3.5 h-3.5 mr-1 text-gray-400" /> Direct item fulfillment manifest
            </p>
          </div>

          <div class="text-left sm:text-right shrink-0">
            <span class="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Merchant Subtotal</span>
            <span class="text-2xl font-black text-emerald-700 tracking-tight block mt-0.5 font-mono">
              {{ formatCurrency(response.subtotal) }}
            </span>
          </div>
        </div>

        <!-- ITEMIZED INVENTORY MANIFEST BOARD -->
        <div class="bg-white p-6 sm:p-8 rounded-[28px] border border-gray-100 shadow-sm space-y-6 text-left">
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 border-b border-gray-100 pb-4">
            <Receipt class="w-4 h-4 text-[#84cc16]" /> Purchased Items Manifest
          </h3>

          <div class="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div v-for="(item, index) in response.items" :key="index" class="p-4 sm:p-5 flex items-center justify-between text-xs sm:text-sm font-semibold hover:bg-gray-50/40 transition">
              <div class="space-y-1 pr-4">
                <p class="font-black text-[#0A1128] text-sm tracking-tight">{{ item.product_name }}</p>
                <div class="flex items-center gap-3">
                  <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">Qty: {{ item.quantity }}</span>
                  <span class="text-[10px] text-gray-400 font-medium">Unit: {{ formatCurrency(item.unit_price) }}</span>
                </div>
              </div>
              <span class="font-black text-[#0A1128] shrink-0 font-mono text-sm sm:text-base">
                {{ formatCurrency(item.total_item_price) }}
              </span>
            </div>
          </div>

          <!-- GRAND TOTAL SETTLEMENT SUMMARY BOX -->
          <div class="bg-gray-50 p-5 border border-gray-100 rounded-2xl space-y-3 shadow-inner">
            <div class="flex justify-between items-center text-xs sm:text-sm font-bold">
              <span class="text-gray-500">Merchant Basket Subtotal</span>
              <span class="text-lg font-black text-emerald-700 font-mono">{{ formatCurrency(response.subtotal) }}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
</style>