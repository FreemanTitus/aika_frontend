<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useFetch, useRuntimeConfig, useCookie, useRequestHeaders } from '#app'
import { 
  CheckCircle2, 
  ShoppingBag, 
  MapPin, 
  Store, 
  Clock, 
  ArrowLeft, 
  Receipt,
  AlertCircle,
  Loader2,
  Download
} from '@lucide/vue'

definePageMeta({
  layout: 'marketplace'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase 

const route = useRoute()
const token = useCookie('auth_token')
const orderId = route.params.id as string

// Capture incoming request headers (including cookies) so SSR forwards them
const headers = useRequestHeaders(['cookie'])

interface OrderSummaryPayload {
  status: string
  order_id: string | number
  vendor_name: string
  delivery_address: string
  item_total: number
  delivery_charge: number
  total_price: number
  order_status: string
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    price_at_order: number
  }>
}

const { data: payload, pending, error } = await useFetch<OrderSummaryPayload>(`${apiBase}/api/v1/marketplace/order-summary/${orderId}`, {
  key: `order-summary-trace-${orderId}`,
  headers: {
    'ngrok-skip-browser-warning': 'true',
    ...(headers.cookie ? { cookie: headers.cookie } : {}),
    ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
  },
  onRequest({ options }) {
    // Safely cast headers through unknown to avoid TypeScript overlap errors
    const headers = options.headers as unknown as Record<string, string>
    headers['ngrok-skip-browser-warning'] = 'true'
    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }
  }
})

// 2. Helper formatting functions
const formatCurrency = (value: number): string => {
  return "₦" + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getStatusBadgeClass = (status: string) => {
  const normalized = String(status).toLowerCase()
  if (normalized === 'pending') return 'bg-amber-50 text-amber-800 border-amber-200/60'
  if (normalized === 'cancelled') return 'bg-rose-50 text-rose-800 border-rose-200/60'
  return 'bg-emerald-50 text-emerald-800 border-emerald-200/60' 
}

const getStatusLabel = (status: string) => {
  const normalized = String(status).toLowerCase()
  if (normalized === 'pending') return 'Awaiting Payment'
  if (normalized === 'paid_unassigned') return 'Paid - Awaiting Merchant'
  if (normalized === 'processing') return 'Being Prepared'
  if (normalized === 'in_transit') return 'On The Way'
  if (normalized === 'completed') return 'Delivered'
  if (normalized === 'cancelled') return 'Cancelled'
  return status
}

// TRIGGER SECURE NATIVE BROWSER INTERFACE FOR PDF/PRINT CONVERSIONS
const triggerReceiptDownload = async () => {
  // The receipt endpoint now requires the customer's JWT (and a paid order), so a plain link
  // no longer works: fetch the PDF with the Authorization header and save the blob.
  try {
    const blob: Blob = await $fetch(`${apiBase}/api/v1/marketplace/receipt/${orderId}`, {
      responseType: 'blob',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${useCookie('auth_token').value}`
      }
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `receipt_${orderId}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
  } catch (err: any) {
    window.alert(err?.data?.detail || 'Could not download the receipt right now. Please try again.')
  }
}
</script>

<template>
  <div class="bg-gray-50/50 min-h-screen py-12 px-4 font-sans text-left print-container">
    
    <!-- LOADING BACKDROP STREAM -->
    <div v-if="pending" class="max-w-xl mx-auto py-32 text-center space-y-4 no-print">
      <Loader2 class="w-10 h-10 animate-spin text-[#0A1128] mx-auto" />
      <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">Compiling Transaction Invoices...</p>
    </div>

    <!-- ERROR BOUNDARY DISPLAY -->
    <div v-else-if="error || !payload" class="max-w-md mx-auto py-16 text-center no-print">
      <div class="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 flex flex-col items-center">
        <AlertCircle class="w-12 h-12 text-rose-500 mb-4" />
        <h2 class="text-xl font-black text-[#0A1128]">Invoice Resolution Error</h2>
        <p class="text-gray-500 text-sm mt-2 font-medium leading-relaxed">
          The order tracking key <span class="font-mono font-bold text-gray-700">{{ orderId }}</span> cannot be fetched or verified by this profile.
        </p>
        <NuxtLink to="/marketplace" class="mt-6 bg-[#0A1128] hover:bg-opacity-90 text-white font-black px-6 py-3 rounded-xl text-xs transition uppercase tracking-wider">
          Return to Market
        </NuxtLink>
      </div>
    </div>

    <!-- TRANSACTION SUCCESS MAIN LAYOUT HUB -->
    <div v-else class="max-w-2xl mx-auto bg-white rounded-[32px] border border-gray-100 p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden printable-card">
      
      <!-- Top Actions Navigation Row -->
      <div class="flex items-center justify-between border-b border-gray-100 pb-5 no-print">
        <NuxtLink to="/customer/dashboard" class="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-[#0A1128] transition group">
          <ArrowLeft class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>View Dashboard</span>
        </NuxtLink>
        
        <!-- DYNAMIC RECEIPT DOWNLOAD TRIGGER CONTAINER -->
        <button 
          type="button" 
          @click="triggerReceiptDownload"
          class="inline-flex items-center space-x-2 bg-[#0A1128] text-white hover:bg-emerald-800 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm active:scale-95 border-0 outline-none"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Download Receipt</span>
        </button>
      </div>

      <!-- Success Identity Hero Banner Header -->
      <div class="text-center space-y-3 py-4">
        <div class="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto shadow-2xs success-icon-box">
          <CheckCircle2 class="w-7 h-7 text-emerald-600 stroke-[2.5]" />
        </div>
        <div class="space-y-1">
          <h1 class="text-2xl font-black text-[#0A1128] tracking-tight">Order Confirmed Successfully</h1>
          <p class="text-xs text-gray-400">Your secure digital payment has been verified and settled cleanly.</p>
        </div>
        <div class="pt-2">
          <span class="font-mono bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-black text-gray-700 uppercase tracking-wider shadow-2xs id-badge">
            ID: {{ payload.order_id }}
          </span>
        </div>
      </div>

      <!-- Live Pipeline Fulfillment Status Node Bar -->
      <div class="p-4 border rounded-2xl flex items-center justify-between transition bg-gray-50/30 status-row" :class="getStatusBadgeClass(payload.order_status)">
        <div class="flex items-center space-x-3">
          <ShoppingBag class="w-4 h-4 no-print" />
          <span class="text-xs font-black uppercase tracking-wider">Fulfillment Progress Tracker</span>
        </div>
        <span class="text-xs font-black uppercase tracking-wider border px-3 py-1 rounded-lg bg-white shadow-2xs print-status-badge">
          {{ getStatusLabel(payload.order_status) }}
        </span>
      </div>

      <!-- Logistics Supply Routing Details Node Meta -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 routing-grid">
        <div class="p-4 bg-gray-50/40 border border-gray-100 rounded-2xl space-y-2 routing-card">
          <div class="flex items-center space-x-2 text-gray-400">
            <Store class="w-4 h-4 text-gray-400 no-print" />
            <span class="text-[10px] font-black uppercase tracking-wider">Storefront Origin</span>
          </div>
          <p class="text-xs font-black text-[#0A1128]">{{ payload.vendor_name }}</p>
        </div>

        <div class="p-4 bg-gray-50/40 border border-gray-100 rounded-2xl space-y-2 routing-card">
          <div class="flex items-center space-x-2 text-gray-400">
            <MapPin class="w-4 h-4 text-gray-400 no-print" />
            <span class="text-[10px] font-black uppercase tracking-wider">Delivery Destination</span>
          </div>
          <p class="text-xs font-semibold text-gray-600 leading-relaxed max-w-xs truncate-2-lines">
            {{ payload.delivery_address }}
          </p>
        </div>
      </div>

      <!-- Itemized Ledger Content Matrix Elements -->
      <div class="space-y-4">
        <h3 class="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center space-x-2 pl-0.5 section-title">
          <Receipt class="w-4 h-4 no-print" />
          <span>Itemized Purchase Ledger</span>
        </h3>
        
        <div class="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 bg-white shadow-2xs ledger-box">
          <div v-for="item in payload.items" :key="item.product_id" class="p-4 flex items-center justify-between text-xs sm:text-sm font-semibold transition hover:bg-gray-50/30 ledger-row">
            <div class="space-y-0.5 pr-4 text-left">
              <p class="font-black text-[#0A1128]">{{ item.product_name }}</p>
              <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">QTY: {{ item.quantity }}</p>
            </div>
            <span class="font-black text-[#0A1128] shrink-0">
              {{ formatCurrency(item.price_at_order * item.quantity) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Financial Calculations Total Board Box -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3 shadow-inner calculations-box">
        <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200/60 pb-2 border-title">
          Financial Invoice Breakdown
        </h4>
        <div class="space-y-2.5 text-xs sm:text-sm text-gray-600 font-bold">
          <div class="flex justify-between items-center calc-row">
            <span class="font-medium text-gray-400">Basket Subtotal</span>
            <span class="font-black text-[#0A1128]">{{ formatCurrency(payload.item_total) }}</span>
          </div>
          <div class="flex justify-between items-center calc-row">
            <span class="font-medium text-gray-400">Logistics Delivery Fee</span>
            <span class="font-black text-[#0A1128]">{{ formatCurrency(payload.delivery_charge) }}</span>
          </div>
          <hr class="border-gray-200/60 print-hr">
          <div class="flex justify-between text-base font-black text-[#0A1128] pt-1 final-total-row">
            <span class="text-gray-900">Total Invoice Amount</span>
            <span class="text-emerald-700 font-black print-emerald">{{ formatCurrency(payload.total_price) }}</span>
          </div>
        </div>
      </div>

      <!-- Secondary Help Notice Footer Text -->
      <p class="text-center text-[10px] font-medium text-gray-400 leading-relaxed pt-2 system-footer">
        A real-time waybill dispatch notification has been routed down your region's active delivery rider pool channels. Thank you for choosing our platform!
      </p>

    </div>
  </div>
</template>

<style scoped>
.truncate-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}

/* =========================================================================
   PROFESSIONAL PRINT MATRIX STYLESHEET OVERRIDES (PDF LOOK AND FEEL)
   ========================================================================= */
@media print {
@page {
  size: A4;
  margin: 1cm;
}

@media print {
  /* Use fixed widths for receipt paper look */
  .printable-card {
    width: 100% !important;
  }
}
  /* 1. Reset completely everything outside the core receipt bounds */
  body, .print-container {
    background: #ffffff !important;
    color: #000000 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .no-print {
    display: none !important;
  }

  /* 2. Remove layout boxes and drop shadow frame artifacts */
  .printable-card {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 auto !important;
    max-w-full: 100% !important;
  }

  /* 3. Maintain pristine borders and type weights */
  .ledger-box, .calculations-box, .routing-card, .status-row {
    border: 1px solid #e5e7eb !important;
    background-color: #ffffff !important;
    box-shadow: none !important;
  }

  .routing-grid {
    display: grid !important;
    grid-template-cols: 1fr 1fr !important;
    gap: 16px !important;
  }

  .print-status-badge {
    border: 1px solid #e5e7eb !important;
    background: #ffffff !important;
  }

  .success-icon-box {
    border: none !important;
    background: transparent !important;
  }

  .id-badge {
    background: #f3f4f6 !important;
    border: 1px solid #e5e7eb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-hr {
    border-top: 1px solid #e5e7eb !important;
  }

  .print-emerald {
    color: #047857 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>