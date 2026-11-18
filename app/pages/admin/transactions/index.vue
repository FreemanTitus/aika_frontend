<!-- pages/admin/transactions/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { 
  DollarSign, 
  Receipt, 
  Truck, 
  Layers, 
  Search, 
  Loader2, 
  AlertCircle,
  Calendar,
  RefreshCw
} from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const summaryData = ref({
  total_revenue: 0,
  delivery_profit: 0,
  subscription_profit: 0
})
const transactions = ref<any[]>([])

// Filter & Search State
const activeSourceFilter = ref<string>('all')
const searchQuery = ref<string>('')

// Fetch company profit data with explicit headers on mount
const fetchCompanyProfitData = async () => {
  isLoading.value = true
  errorMessage.value = null
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/company-profit`, {
      method: 'GET',
      headers: { 
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    
    if (res?.summary) {
      summaryData.value = res.summary
    }
    if (res?.transactions) {
      transactions.value = res.transactions
    }
  } catch (err: any) {
    console.error("Failed to fetch admin company profit data", err)
    errorMessage.value = err?.data?.detail || err.message || "Could not retrieve profit ledger logs."
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchCompanyProfitData()
})

// Filtered transactions computed based on type and search query
const filteredTransactions = computed(() => {
  if (!Array.isArray(transactions.value)) return []
  return transactions.value.filter(tx => {
    const matchesSource = activeSourceFilter.value === 'all' || tx.source_type === activeSourceFilter.value
    const matchesSearch = searchQuery.value === '' || 
      tx.transaction_reference?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesSource && matchesSearch
  })
})

const formatCurrency = (value: number) => "₦" + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getSourceBadgeClass = (sourceType: string) => {
  switch (sourceType?.toLowerCase()) {
    case 'delivery': return 'bg-blue-50 text-blue-700 border-blue-100'
    case 'subscription': return 'bg-indigo-50 text-indigo-700 border-indigo-100'
    default: return 'bg-gray-50 text-gray-600 border-gray-100'
  }
}

const formatSourceLabel = (sourceType: string) => {
  switch (sourceType?.toLowerCase()) {
    case 'delivery': return 'Logistics Cut (₦500)'
    case 'subscription': return 'Merchant Subscription'
    default: return sourceType
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto py-8 px-4 font-sans text-[#0A1128] text-left space-y-8">

    <!-- LOADING STATE -->
    <div v-if="isLoading && transactions.length === 0" class="py-24 text-center">
      <Loader2 class="animate-spin text-[#84cc16] w-10 h-10 mx-auto" />
      <p class="text-gray-400 text-xs font-black uppercase tracking-widest mt-4">Aggregating Financial Streams...</p>
    </div>

    <!-- ERROR STATE -->
    <div v-else-if="errorMessage && transactions.length === 0" class="bg-white p-12 rounded-[32px] border border-gray-100 text-center max-w-md mx-auto space-y-4 shadow-xl">
      <AlertCircle class="w-12 h-12 text-rose-500 mx-auto" />
      <h2 class="text-lg font-black text-[#0A1128]">Ledger Sync Error</h2>
      <p class="text-gray-500 text-xs font-medium leading-relaxed">{{ errorMessage }}</p>
      <button type="button" @click="fetchCompanyProfitData" class="bg-[#0A1128] text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer outline-none border-0">
        Retry Request
      </button>
    </div>

    <!-- DASHBOARD CONTENT -->
    <div v-else class="space-y-8">
      
      <!-- SUMMARY BREAKDOWN METRICS GRID -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        <!-- Total Revenue Card -->
        <div class="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><DollarSign class="w-5 h-5" /></div>
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">Net Profit</span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Company Revenue</p>
            <p class="text-2xl font-black text-[#0A1128] mt-1 font-mono">{{ formatCurrency(summaryData.total_revenue) }}</p>
          </div>
        </div>

        <!-- Delivery Profit Card -->
        <div class="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="bg-blue-50 p-3 rounded-2xl text-blue-600"><Truck class="w-5 h-5" /></div>
            <span class="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">Logistics Cut</span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Logistics Platform Share</p>
            <p class="text-2xl font-black text-[#0A1128] mt-1 font-mono">{{ formatCurrency(summaryData.delivery_profit) }}</p>
          </div>
        </div>

        <!-- Subscription Profit Card -->
        <div class="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Layers class="w-5 h-5" /></div>
            <span class="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">Subscriptions</span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Merchant Plans Revenue</p>
            <p class="text-2xl font-black text-[#0A1128] mt-1 font-mono">{{ formatCurrency(summaryData.subscription_profit) }}</p>
          </div>
        </div>

      </div>

      <!-- TRANSACTIONS AUDIT TABLE SECTION -->
      <div class="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden">
        
        <!-- Table Filters & Search -->
        <div class="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-lg font-black text-[#0A1128] tracking-tight">Unified Revenue Audit Trail</h2>
            <p class="text-xs text-gray-400 font-medium mt-0.5">Showing latest recorded profit transactions across logistics platform cuts and subscriptions.</p>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <!-- Search Bar -->
            <div class="relative">
              <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search reference or details..." 
                class="bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold focus:border-emerald-500 outline-none transition w-full sm:w-60"
              />
            </div>

            <!-- Source Filter Tabs -->
            <div class="flex items-center space-x-1 overflow-x-auto pb-1 no-scrollbar bg-gray-50 p-1 rounded-2xl border border-gray-200">
              <button 
                v-for="filterOpt in [
                  { label: 'All', value: 'all' },
                  { label: 'Logistics Cut', value: 'delivery' },
                  { label: 'Subscriptions', value: 'subscription' }
                ]" 
                :key="filterOpt.value" 
                type="button"
                @click="activeSourceFilter = filterOpt.value" 
                :class="[activeSourceFilter === filterOpt.value ? 'bg-[#0A1128] text-white shadow-sm' : 'text-gray-500 hover:text-[#0A1128]']"
                class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap border-0 outline-none"
              >
                {{ filterOpt.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50/70 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th class="py-4 px-6">Transaction Reference</th>
                <th class="py-4 px-6">Revenue Stream</th>
                <th class="py-4 px-6">Description</th>
                <th class="py-4 px-6">Timestamp</th>
                <th class="py-4 px-6 text-right">Amount Earned</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 text-xs sm:text-sm font-semibold text-gray-600">
              <tr v-for="(tx, index) in filteredTransactions" :key="index" class="hover:bg-gray-50/50 transition">
                <td class="py-4 px-6 font-mono font-bold text-[#0A1128] text-xs">
                  {{ tx.transaction_reference }}
                </td>
                <td class="py-4 px-6">
                  <span :class="getSourceBadgeClass(tx.source_type)" class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border inline-block">
                    {{ formatSourceLabel(tx.source_type) }}
                  </span>
                </td>
                <td class="py-4 px-6 text-gray-700 font-medium">
                  {{ tx.description }}
                </td>
                <td class="py-4 px-6 text-gray-400 text-xs font-medium flex items-center gap-1.5 pt-5">
                  <Calendar class="w-3.5 h-3.5" /> {{ formatDate(tx.created_at) }}
                </td>
                <td class="py-4 px-6 text-right font-black text-emerald-700 font-mono text-sm sm:text-base">
                  +{{ formatCurrency(tx.amount) }}
                </td>
              </tr>
              <tr v-if="filteredTransactions.length === 0">
                <td colspan="5" class="text-center py-16 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  No profit transactions match your search filter.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>