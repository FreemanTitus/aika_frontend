<!-- pages/admin/financials/rider-payouts.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useCookie, useRuntimeConfig } from '#app'
import { Bike, RefreshCw, Loader2, CheckCircle2, Clock, Calendar, Wallet, Search, ArrowLeft, Users, ShieldAlert, CreditCard } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')
const router = useRouter()

const riders = ref<any[]>([])
const pending = ref<boolean>(true)
const selectedSchedule = ref<string>('') // '' for all, 'daily', 'weekly'
const searchQuery = ref<string>('')
const processingId = ref<string | null>(null)

const fetchRiderPayouts = async () => {
  pending.value = true
  try {
    const url = selectedSchedule.value 
      ? `${apiBase}/api/v1/admin/financials/rider-payouts?schedule=${selectedSchedule.value}`
      : `${apiBase}/api/v1/admin/financials/rider-payouts`

    const res: any = await $fetch(url, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    riders.value = res?.data || res || []
  } catch (err) {
    console.error("Failed to load rider payouts ledger", err)
  } finally {
    pending.value = false
  }
}

onMounted(fetchRiderPayouts)

// Watch schedule filter changes to auto-refetch
const filterBySchedule = (schedule: string) => {
  selectedSchedule.value = schedule
  fetchRiderPayouts()
}

// Summary Metrics Computations
const totalLiability = computed(() => riders.value.reduce((acc, r) => acc + (Number(r.wallet_balance) || 0), 0))
const dailyCount = computed(() => riders.value.filter(r => r.payout_schedule === 'daily').length)
const weeklyCount = computed(() => riders.value.filter(r => r.payout_schedule === 'weekly').length)

const filteredRiders = computed(() => {
  if (!searchQuery.value) return riders.value
  const q = searchQuery.value.toLowerCase()
  return riders.value.filter(r => 
    r.rider_name?.toLowerCase().includes(q) || 
    r.bike_plate_number?.toLowerCase().includes(q) ||
    r.phone?.toLowerCase().includes(q)
  )
})

const markAsPaid = async (riderId: string) => {
  processingId.value = riderId
  try {
    await $fetch(`${apiBase}/api/v1/admin/financials/rider-payouts/${riderId}/mark-paid`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    await fetchRiderPayouts()
  } catch (err: any) {
    alert(err?.data?.detail || "Failed to process payout settlement.")
  } finally {
    processingId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left space-y-8">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header & Navigation -->
      <div class="space-y-4">
        <NuxtLink to="/admin/riders" class="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-2xs">
          <ArrowLeft :size="16" /> Back to Rider Fleet
        </NuxtLink>

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">Rider Payout &amp; Schedule Audit</h1>
            <p class="text-xs text-gray-500 font-medium mt-0.5">Manage daily and weekly rider disbursement queues and settlement preferences.</p>
          </div>

          <button @click="fetchRiderPayouts" :disabled="pending" class="bg-white border border-gray-200 shadow-2xs text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 hover:bg-gray-50 cursor-pointer outline-none shrink-0">
            <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4 text-indigo-600" />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      <!-- Financial Metrics Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Pending Payouts</p>
            <p class="text-2xl font-black text-gray-900 font-mono">₦{{ totalLiability.toLocaleString() }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Wallet :size="20" />
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-amber-600">Daily Queue Riders</p>
            <p class="text-2xl font-black text-amber-700 font-mono">{{ dailyCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar :size="20" />
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-indigo-600">Weekly Queue Riders</p>
            <p class="text-2xl font-black text-indigo-700 font-mono">{{ weeklyCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock :size="20" />
          </div>
        </div>
      </div>

      <!-- Filter Tabs & Search Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Schedule Filter Pills -->
        <div class="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl shadow-2xs">
          <button @click="filterBySchedule('')" :class="selectedSchedule === '' ? 'bg-[#0A1128] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer">
            All Riders
          </button>
          <button @click="filterBySchedule('daily')" :class="selectedSchedule === 'daily' ? 'bg-[#0A1128] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer">
            Daily Payouts
          </button>
          <button @click="filterBySchedule('weekly')" :class="selectedSchedule === 'weekly' ? 'bg-[#0A1128] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer">
            Weekly Payouts
          </button>
        </div>

        <!-- Search Input -->
        <div class="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-2xs flex items-center gap-3 sm:w-80">
          <Search :size="16" class="text-gray-400 shrink-0" />
          <input v-model="searchQuery" type="text" placeholder="Search rider name, phone..." class="w-full text-xs font-semibold text-gray-800 outline-none bg-transparent placeholder:text-gray-400" />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !riders.length" class="py-24 text-center bg-white border border-gray-100 rounded-3xl shadow-2xs">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">Loading Rider Payout Queue...</p>
      </div>

      <!-- Table Matrix -->
      <div v-else class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
            <h3 class="text-xs font-black text-gray-700 uppercase tracking-wider">Accumulated Rider Balances &amp; Schedules</h3>
          </div>
          <span class="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-2xs">Matching Records: {{ filteredRiders.length }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50/75 text-gray-400 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
                <th class="py-4 px-6">Rider Details</th>
                <th class="py-4 px-6">Schedule Preference</th>
                <th class="py-4 px-6">Payment Method</th>
                <th class="py-4 px-6">Wallet Balance Due</th>
                <th class="py-4 px-6">Action / Settlement</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-semibold text-gray-700">
              <tr v-for="rider in filteredRiders" :key="rider.id" class="hover:bg-indigo-50/20 transition-colors">
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                      {{ rider.rider_name?.charAt(0).toUpperCase() || 'R' }}
                    </div>
                    <div>
                      <p class="font-black text-gray-900 text-xs">{{ rider.rider_name }}</p>
                      <p class="text-[11px] text-gray-400 font-medium mt-0.5">{{ rider.phone }} • Plate: <strong class="text-gray-600">{{ rider.bike_plate_number || 'N/A' }}</strong></p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-6">
                  <span :class="rider.payout_schedule === 'daily' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'" class="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border shadow-2xs">
                    <Calendar :size="12" /> {{ rider.payout_schedule }}
                  </span>
                </td>
                <td class="py-4 px-6">
                  <span class="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg uppercase font-mono text-[10px] font-black tracking-wider border border-gray-200">
                    {{ rider.payout_method }}
                  </span>
                </td>
                <td class="py-4 px-6 font-mono font-black text-sm text-gray-900">
                  ₦{{ rider.wallet_balance.toLocaleString() }}
                </td>
                <td class="py-4 px-6">
                  <button 
                    @click="markAsPaid(rider.id)" 
                    :disabled="processingId === rider.id || rider.wallet_balance <= 0"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-black uppercase rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5 outline-none border-0"
                  >
                    <Loader2 v-if="processingId === rider.id" class="w-3.5 h-3.5 animate-spin" />
                    <CheckCircle2 v-else :size="14" />
                    Mark as Paid
                  </button>
                </td>
              </tr>
              <tr v-if="filteredRiders.length === 0 && !pending">
                <td colspan="5" class="py-20 text-center text-gray-400 font-bold uppercase tracking-wider space-y-1">
                  <p>No riders found matching the criteria.</p>
                  <p class="text-[10px] text-gray-300">Try adjusting your filter or search terms.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>