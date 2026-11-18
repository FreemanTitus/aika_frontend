<!-- pages/admin/disputes/index.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useCookie, useRuntimeConfig } from '#app'
import { AlertCircle, RefreshCw, Loader2, CheckCircle2, XCircle, ShieldAlert, Search, Wallet, Clock, CheckCircle, Eye, X } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const disputes = ref<any[]>([])
const pending = ref<boolean>(true)
const processingId = ref<number | null>(null)
const selectedFilter = ref<string>('') // '' for all, 'pending', 'approved', 'rejected'
const searchQuery = ref<string>('')

// Modal view detail state
const isDetailModalOpen = ref<boolean>(false)
const activeDispute = ref<any | null>(null)

const fetchDisputes = async () => {
  pending.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/disputes`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true', Authorization: `Bearer ${authToken.value}` }
    })
    disputes.value = res?.data || res || []
  } catch (err) {
    console.error("Failed to load dispute center", err)
  } finally {
    pending.value = false
  }
}

onMounted(fetchDisputes)

// Metrics Computations
const totalClaimsCount = computed(() => disputes.value.length)
const pendingCount = computed(() => disputes.value.filter(d => d.status === 'pending').length)
const approvedVolume = computed(() => disputes.value.filter(d => d.status === 'approved').reduce((acc, d) => acc + (Number(d.amount) || 0), 0))

// Filtered and Searched Disputes
const filteredDisputes = computed(() => {
  return disputes.value.filter(d => {
    const matchesFilter = selectedFilter.value === '' || d.status === selectedFilter.value
    const q = searchQuery.value.toLowerCase()
    const matchesSearch = !q || d.customer_name?.toLowerCase().includes(q) || String(d.order_id).toLowerCase().includes(q) || d.reason?.toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })
})

const openDetailModal = (dispute: any) => {
  activeDispute.value = dispute
  isDetailModalOpen.value = true
}

const resolveDispute = async (id: number, action: 'approve' | 'reject') => {
  processingId.value = id
  try {
    await $fetch(`${apiBase}/api/v1/admin/disputes/${id}/resolve?action=${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    await fetchDisputes()
    if (isDetailModalOpen.value) {
      isDetailModalOpen.value = false
    }
  } catch (err: any) {
    alert(err?.data?.detail || "Failed to process dispute action.")
  } finally {
    processingId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left space-y-8">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Dispute &amp; Refund Resolution Center</h1>
          <p class="text-xs text-gray-500 font-medium mt-0.5">Review customer refund claims, failed fulfillment complaints, and execute credit resolutions.</p>
        </div>

        <button @click="fetchDisputes" :disabled="pending" class="bg-white border border-gray-200 shadow-2xs text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 hover:bg-gray-50 cursor-pointer outline-none shrink-0">
          <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4 text-indigo-600" />
          <span>Refresh Claims</span>
        </button>
      </div>

      <!-- Overview Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Claims Logged</p>
            <p class="text-2xl font-black text-gray-900 font-mono">{{ totalClaimsCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldAlert :size="20" />
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-amber-600">Pending Review Queue</p>
            <p class="text-2xl font-black text-amber-700 font-mono">{{ pendingCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock :size="20" />
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-emerald-600">Approved Refunds Volume</p>
            <p class="text-2xl font-black text-emerald-700 font-mono">₦{{ approvedVolume.toLocaleString() }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet :size="20" />
          </div>
        </div>
      </div>

      <!-- Filter Tabs & Search Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Status Filter Pills -->
        <div class="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl shadow-2xs flex-wrap">
          <button @click="selectedFilter = ''" :class="selectedFilter === '' ? 'bg-[#0A1128] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer">
            All Claims
          </button>
          <button @click="selectedFilter = 'pending'" :class="selectedFilter === 'pending' ? 'bg-[#0A1128] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer">
            Pending
          </button>
          <button @click="selectedFilter = 'approved'" :class="selectedFilter === 'approved' ? 'bg-[#0A1128] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer">
            Approved
          </button>
          <button @click="selectedFilter = 'rejected'" :class="selectedFilter === 'rejected' ? 'bg-[#0A1128] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer">
            Rejected
          </button>
        </div>

        <!-- Search Input -->
        <div class="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-2xs flex items-center gap-3 sm:w-80">
          <Search :size="16" class="text-gray-400 shrink-0" />
          <input v-model="searchQuery" type="text" placeholder="Search customer, order ID..." class="w-full text-xs font-semibold text-gray-800 outline-none bg-transparent placeholder:text-gray-400" />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !disputes.length" class="py-24 text-center bg-white border border-gray-100 rounded-3xl shadow-2xs">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">Loading Dispute Claims...</p>
      </div>

      <!-- Table Matrix -->
      <div v-else class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-indigo-600"></div>
            <h3 class="text-xs font-black text-gray-700 uppercase tracking-wider">Active Claims &amp; Refund Queue</h3>
          </div>
          <span class="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-2xs">Matching Records: {{ filteredDisputes.length }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50/75 text-gray-400 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
                <th class="py-4 px-6">Order Reference</th>
                <th class="py-4 px-6">Customer Name</th>
                <th class="py-4 px-6">Dispute Reason</th>
                <th class="py-4 px-6">Claim Amount</th>
                <th class="py-4 px-6">Status</th>
                <th class="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-semibold text-gray-700">
              <tr v-for="d in filteredDisputes" :key="d.id" class="hover:bg-indigo-50/20 transition-colors">
                <td class="py-4 px-6 font-mono font-black text-indigo-600 text-sm">#{{ d.order_id }}</td>
                <td class="py-4 px-6 text-gray-900 font-bold">{{ d.customer_name }}</td>
                <td class="py-4 px-6 text-gray-600 max-w-xs truncate" :title="d.reason">{{ d.reason }}</td>
                <td class="py-4 px-6 font-mono font-black text-gray-900 text-sm">₦{{ Number(d.amount).toLocaleString() }}</td>
                <td class="py-4 px-6">
                  <span :class="{
                    'bg-amber-50 text-amber-700 border-amber-200': d.status === 'pending',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': d.status === 'approved',
                    'bg-rose-50 text-rose-700 border-rose-200': d.status === 'rejected'
                  }" class="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1.5 shadow-2xs">
                    <Clock v-if="d.status === 'pending'" :size="12" />
                    <CheckCircle2 v-else-if="d.status === 'approved'" :size="12" />
                    <XCircle v-else :size="12" />
                    {{ d.status }}
                  </span>
                </td>
                <td class="py-4 px-6 text-right space-x-2">
                  <button @click="openDetailModal(d)" class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer inline-flex items-center" title="View Dispute Details">
                    <Eye :size="14" />
                  </button>
                  <template v-if="d.status === 'pending'">
                    <button @click="resolveDispute(d.id, 'approve')" :disabled="processingId === d.id" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase transition cursor-pointer shadow-2xs inline-flex items-center gap-1">
                      <Loader2 v-if="processingId === d.id" class="w-3 h-3 animate-spin" />
                      Approve
                    </button>
                    <button @click="resolveDispute(d.id, 'reject')" :disabled="processingId === d.id" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase transition cursor-pointer shadow-2xs inline-flex items-center gap-1">
                      Reject
                    </button>
                  </template>
                  <span v-else class="text-gray-400 text-[11px] italic font-medium">Locked</span>
                </td>
              </tr>
              <tr v-if="filteredDisputes.length === 0 && !pending">
                <td colspan="6" class="py-20 text-center text-gray-400 font-bold uppercase tracking-wider space-y-1">
                  <p>No dispute or refund claims found.</p>
                  <p class="text-[10px] text-gray-300">Try adjusting your filter or search query.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Dispute Detail & Payout Modal -->
    <Teleport to="body">
      <div v-if="isDetailModalOpen && activeDispute" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <div class="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 text-left relative">
          
          <button type="button" @click="isDetailModalOpen = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition cursor-pointer border-0 bg-transparent">
            <X :size="20" />
          </button>

          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldAlert :size="22" />
            </div>
            <div>
              <h3 class="text-lg font-black text-gray-900 tracking-tight">Dispute Claim Details</h3>
              <p class="text-xs text-gray-500 font-medium">Order Reference: <span class="font-mono font-bold text-indigo-600">#{{ activeDispute.order_id }}</span></p>
            </div>
          </div>

          <!-- Claim Breakdown -->
          <div class="space-y-4 bg-gray-50/75 p-5 rounded-2xl border border-gray-100 text-xs">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[10px] font-black uppercase text-gray-400">Customer Name</p>
                <p class="font-bold text-gray-900 mt-0.5">{{ activeDispute.customer_name }}</p>
              </div>
              <div>
                <p class="text-[10px] font-black uppercase text-gray-400">Claim Amount</p>
                <p class="font-mono font-black text-gray-900 mt-0.5 text-sm">₦{{ Number(activeDispute.amount).toLocaleString() }}</p>
              </div>
            </div>

            <div>
              <p class="text-[10px] font-black uppercase text-gray-400">Reason for Dispute</p>
              <p class="font-medium text-gray-700 mt-1 leading-relaxed bg-white p-3 rounded-xl border border-gray-200">{{ activeDispute.reason }}</p>
            </div>

            <!-- Manual Payout Banking Info -->
            <div class="pt-2 border-t border-gray-200/60 space-y-2">
              <p class="text-[10px] font-black uppercase tracking-wider text-indigo-600">Manual Bank Transfer Details</p>
              <div class="grid grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
                <div>
                  <span class="text-[9px] font-bold text-gray-400 uppercase block">Bank Name</span>
                  <span class="font-bold text-gray-800">{{ activeDispute.bank_name || 'Not Provided' }}</span>
                </div>
                <div>
                  <span class="text-[9px] font-bold text-gray-400 uppercase block">Account Number</span>
                  <span class="font-mono font-bold text-indigo-600">{{ activeDispute.account_number || 'N/A' }}</span>
                </div>
                <div class="col-span-2 pt-1 border-t border-gray-100">
                  <span class="text-[9px] font-bold text-gray-400 uppercase block">Account Holder Name</span>
                  <span class="font-bold text-gray-900">{{ activeDispute.account_name || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions Footer -->
          <div class="flex items-center gap-3 pt-2">
            <button type="button" @click="isDetailModalOpen = false" class="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer">
              Close
            </button>
            
            <template v-if="activeDispute.status === 'pending'">
              <button @click="resolveDispute(activeDispute.id, 'reject')" :disabled="processingId === activeDispute.id" class="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer">
                Reject Claim
              </button>
              <button @click="resolveDispute(activeDispute.id, 'approve')" :disabled="processingId === activeDispute.id" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md">
                Approve &amp; Refund
              </button>
            </template>
            <span v-else class="ml-auto text-xs font-bold text-gray-400 italic">This claim has been {{ activeDispute.status }}.</span>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>