<!-- pages/admin/subscriptions/vendors.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useCookie, useRuntimeConfig, navigateTo } from '#app'
import { Users, ArrowLeft, RefreshCw, Loader2, AlertCircle, CheckCircle2, ShieldAlert, Search, Layers, Clock, Award } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')
const router = useRouter()

const vendorSubs = ref<any[]>([])
const pending = ref<boolean>(true)
const error = ref<any>(null)
const searchQuery = ref<string>('')

// Fetch vendor subscriptions audit list from Django Ninja API
const fetchVendorSubscriptions = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/subscriptions/vendors`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    vendorSubs.value = res?.data || res || []
  } catch (err: any) {
    console.error("Vendor subscriptions audit fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchVendorSubscriptions()
})

// Metrics Computation
const totalVendorsCount = computed(() => vendorSubs.value.length)
const activeCount = computed(() => vendorSubs.value.filter(s => s.has_valid_access).length)
const expiredCount = computed(() => totalVendorsCount.value - activeCount.value)

// Filtered vendor subscriptions search computation
const filteredSubs = computed(() => {
  if (!searchQuery.value) return vendorSubs.value
  const q = searchQuery.value.toLowerCase()
  return vendorSubs.value.filter(sub => 
    sub.vendor_name?.toLowerCase().includes(q) || 
    sub.vendor_email?.toLowerCase().includes(q) ||
    sub.plan_name?.toLowerCase().includes(q)
  )
})

const navigateBack = () => {
  navigateTo('/admin/subscriptions')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Back Button & Header -->
      <div class="space-y-4">
        <button 
          @click="navigateBack" 
          class="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-2xs cursor-pointer outline-none"
        >
          <ArrowLeft :size="16" />
          Back to Subscription Tiers
        </button>

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">Vendor Subscriptions Audit</h1>
            <p class="text-xs text-gray-500 font-medium mt-0.5">Monitor active merchant memberships, subscription expiry dates, and billing access control.</p>
          </div>

          <div class="flex items-center gap-3">
            <button 
              @click="fetchVendorSubscriptions" 
              :disabled="pending"
              type="button" 
              class="bg-white border border-gray-200 shadow-2xs text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
              title="Refresh Audit Ledger"
            >
              <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4 text-indigo-600" />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Overview Stats Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Merchants</p>
            <p class="text-2xl font-black text-gray-900 font-mono">{{ totalVendorsCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users :size="20" />
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-emerald-600">Active Memberships</p>
            <p class="text-2xl font-black text-emerald-700 font-mono">{{ activeCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 :size="20" />
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-rose-600">Expired / Lapsed</p>
            <p class="text-2xl font-black text-rose-700 font-mono">{{ expiredCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert :size="20" />
          </div>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div class="bg-white border border-gray-100 rounded-2xl p-3 shadow-2xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
          <Search :size="18" />
        </div>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Filter by vendor name, email address, or plan tier..." 
          class="w-full text-xs font-semibold text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
        />
        <span v-if="searchQuery" @click="searchQuery = ''" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-100 transition mr-2">Clear</span>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !vendorSubs.length" class="py-24 text-center space-y-3 bg-white border border-gray-100 rounded-3xl">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Synchronizing Merchant Subscriptions...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !vendorSubs.length" class="py-16 text-center bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs max-w-md mx-auto space-y-2">
        <div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="24" />
        </div>
        <p class="text-rose-600 font-black text-sm uppercase tracking-wider">Audit Retrieval Failed</p>
        <p class="text-xs text-gray-400 font-semibold">
          {{ error?.data?.detail || error?.message || "Unable to retrieve merchant subscription data." }}
        </p>
      </div>

      <!-- Subscriptions Ledger Table Matrix -->
      <div v-else class="bg-white border border-gray-100 rounded-3xl shadow-2xl shadow-gray-100 overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-indigo-600"></div>
            <h3 class="text-xs font-black text-gray-700 uppercase tracking-wider">Registered Merchant Memberships</h3>
          </div>
          <span class="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-2xs">Matching Records: {{ filteredSubs.length }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50/75 text-gray-400 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
                <th class="py-4 px-6">Merchant Entity</th>
                <th class="py-4 px-6">Assigned Plan Tier</th>
                <th class="py-4 px-6">Plan Price</th>
                <th class="py-4 px-6">Expiration Timestamp</th>
                <th class="py-4 px-6">Access Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-semibold text-gray-700">
              <tr v-for="sub in filteredSubs" :key="sub.id" class="hover:bg-indigo-50/20 transition-colors">
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                      {{ sub.vendor_name?.charAt(0).toUpperCase() || 'V' }}
                    </div>
                    <div>
                      <p class="font-black text-gray-900 text-xs">{{ sub.vendor_name }}</p>
                      <p class="text-[11px] text-gray-400 font-medium mt-0.5">{{ sub.vendor_email }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-6">
                  <span v-if="sub.plan_name" class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                    <Award :size="12" /> {{ sub.plan_name }}
                  </span>
                  <span v-else class="text-gray-400 text-[11px] italic bg-gray-100 px-2.5 py-1 rounded-md">No Plan Assigned</span>
                </td>
                <td class="py-4 px-6 font-mono font-black text-gray-900 text-sm">
                  {{ sub.plan_price !== null ? `₦${sub.plan_price.toLocaleString()}` : '—' }}
                </td>
                <td class="py-4 px-6 text-gray-500 font-mono text-[11px]">
                  <div class="flex items-center gap-1.5">
                    <Clock :size="13" class="text-gray-400" />
                    <span>{{ sub.subscription_expires_at ? new Date(sub.subscription_expires_at).toLocaleString() : 'Never / Not Set' }}</span>
                  </div>
                </td>
                <td class="py-4 px-6">
                  <span :class="sub.has_valid_access ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'" class="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 v-if="sub.has_valid_access" :size="13" />
                    <ShieldAlert v-else :size="13" />
                    {{ sub.has_valid_access ? 'Active Access' : 'Expired / Lapsed' }}
                  </span>
                </td>
              </tr>
              <tr v-if="filteredSubs.length === 0 && !pending">
                <td colspan="5" class="py-20 text-center text-gray-400 font-bold uppercase tracking-wider space-y-2">
                  <p>No matching vendor subscriptions found.</p>
                  <p class="text-[10px] text-gray-300">Try adjusting your search criteria.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>