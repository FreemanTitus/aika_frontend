<!-- pages/admin/audits/index.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { ShieldCheck, RefreshCw, Loader2, Activity, Search, ShieldAlert, UserCheck, Clock } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const logs = ref<any[]>([])
const pending = ref<boolean>(true)
const searchQuery = ref<string>('')

const fetchAuditLogs = async () => {
  pending.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/audits/logs`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true', Authorization: `Bearer ${authToken.value}` }
    })
    logs.value = res?.data || res || []
  } catch (err) {
    console.error("Failed to load audit logs", err)
  } finally {
    pending.value = false
  }
}

onMounted(fetchAuditLogs)

// Metrics Computations
const totalActionsCount = computed(() => logs.value.length)
const uniqueOperatorsCount = computed(() => new Set(logs.value.map(l => l.user_email)).size)
const latestActionTime = computed(() => logs.value.length > 0 ? new Date(logs.value[0].created_at).toLocaleTimeString() : 'N/A')

// Filtered Logs
const filteredLogs = computed(() => {
  if (!searchQuery.value) return logs.value
  const q = searchQuery.value.toLowerCase()
  return logs.value.filter(l => 
    l.user_email?.toLowerCase().includes(q) || 
    l.action?.toLowerCase().includes(q) ||
    l.target_entity?.toLowerCase().includes(q) ||
    l.details?.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left space-y-8">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">System Accountability &amp; Audit Logs</h1>
          <p class="text-xs text-gray-500 font-medium mt-0.5">Immutable record trail capturing administrative and staff operational overrides across the platform.</p>
        </div>

        <button @click="fetchAuditLogs" :disabled="pending" class="bg-white border border-gray-200 shadow-2xs text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 hover:bg-gray-50 cursor-pointer outline-none shrink-0">
          <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4 text-indigo-600" />
          <span>Refresh Trail</span>
        </button>
      </div>

      <!-- Overview Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Recorded Actions</p>
            <p class="text-2xl font-black text-gray-900 font-mono">{{ totalActionsCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity :size="20" />
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-emerald-600">Active Operators</p>
            <p class="text-2xl font-black text-emerald-700 font-mono">{{ uniqueOperatorsCount }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck :size="20" />
          </div>
        </div>

        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-amber-600">Latest Event Triggered</p>
            <p class="text-lg font-black text-amber-700 font-mono mt-1">{{ latestActionTime }}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock :size="20" />
          </div>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-3">
        <Search :size="16" class="text-gray-400 shrink-0" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Filter audit logs by operator email, action trigger, entity, or description..." 
          class="w-full text-xs font-semibold text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
        />
        <span v-if="searchQuery" @click="searchQuery = ''" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-100 transition mr-2">Clear</span>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !logs.length" class="py-24 text-center bg-white border border-gray-100 rounded-3xl shadow-2xs">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">Loading System Audit Trail...</p>
      </div>

      <!-- Logs Table Matrix -->
      <div v-else class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-indigo-600"></div>
            <h3 class="text-xs font-black text-gray-700 uppercase tracking-wider">Activity Execution Trail</h3>
          </div>
          <span class="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-2xs">Matching Records: {{ filteredLogs.length }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50/75 text-gray-400 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
                <th class="py-4 px-6">Timestamp</th>
                <th class="py-4 px-6">Operator / User</th>
                <th class="py-4 px-6">Action Triggered</th>
                <th class="py-4 px-6">Target Entity</th>
                <th class="py-4 px-6">Execution Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-semibold text-gray-700">
              <tr v-for="log in filteredLogs" :key="log.id" class="hover:bg-indigo-50/20 transition-colors">
                <td class="py-4 px-6 font-mono text-gray-500 text-[11px] whitespace-nowrap">{{ new Date(log.created_at).toLocaleString() }}</td>
                <td class="py-4 px-6 font-bold text-gray-900">{{ log.user_email }}</td>
                <td class="py-4 px-6">
                  <span class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono shadow-2xs">
                    {{ log.action }}
                  </span>
                </td>
                <td class="py-4 px-6 text-gray-900 font-bold">{{ log.target_entity }}</td>
                <td class="py-4 px-6 text-gray-600 font-medium">{{ log.details || 'N/A' }}</td>
              </tr>
              <tr v-if="filteredLogs.length === 0 && !pending">
                <td colspan="5" class="py-20 text-center text-gray-400 font-bold uppercase tracking-wider space-y-1">
                  <p>No audit logs found matching query.</p>
                  <p class="text-[10px] text-gray-300">Try adjusting your search filter.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>