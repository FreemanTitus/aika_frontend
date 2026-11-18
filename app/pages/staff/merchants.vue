<!-- pages/agent/vendors/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCookie, useRuntimeConfig, navigateTo } from '#app'
import { ShieldCheck, AlertCircle, Eye, Loader2, RefreshCw } from '@lucide/vue'

definePageMeta({ 
  layout: 'staff', 
  middleware: 'auth' 
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')

const selectedFilter = ref('')

const businessTypes = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Retail', value: 'e_commerce' },
  { label: 'Services', value: 'services' }
]

// Reactive states for vendors dashboard data, loading, and error handling
const dashboardPayload = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Fetch data from dedicated agent endpoint on mount and filter changes with explicit headers
const fetchVendorsDashboard = async () => {
  pending.value = true
  error.value = null

  try {
    const queryParams: Record<string, string> = {}
    if (selectedFilter.value) {
      queryParams.type = selectedFilter.value
    }

    const res: any = await $fetch(`${apiBase}/api/v1/staff/vendors`, {
      method: 'GET',
      query: queryParams,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    dashboardPayload.value = res?.data || res || {}
  } catch (err: any) {
    console.error("Agent vendors dashboard fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchVendorsDashboard()
})

// Re-fetch when filter selection changes
watch(selectedFilter, () => {
  fetchVendorsDashboard()
})

const auditVendor = (id: number) => {
  navigateTo(`/staff/vendor/${id}`)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 relative text-left">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Assigned Merchant Oversight</h1>
          <p class="text-sm text-gray-500 font-medium">Audit, support, and oversee corporate business entities assigned to your node.</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Business Type Filters -->
          <div class="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              type="button"
              @click="selectedFilter = ''"
              :class="[
                'px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer',
                !selectedFilter 
                  ? 'bg-[#0A1128] text-white shadow-md' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              ]"
            >
              All Vendors
            </button>
            <button
              v-for="bt in businessTypes"
              :key="bt.value"
              type="button"
              @click="selectedFilter = bt.value"
              :class="[
                'px-4 py-2 text-xs font-bold rounded-xl transition-all capitalize cursor-pointer',
                selectedFilter === bt.value 
                  ? 'bg-[#0A1128] text-white shadow-md' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              ]"
            >
              {{ bt.label }}
            </button>
          </div>

          <button 
            @click="fetchVendorsDashboard" 
            :disabled="pending"
            type="button" 
            class="bg-white border border-gray-200 shadow-xs text-gray-700 text-xs font-bold p-2.5 rounded-xl transition flex items-center justify-center hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
            title="Refresh Vendors Ledger"
          >
            <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !dashboardPayload" class="py-20 text-center space-y-3">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-[#0A1128]" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Synchronizing Ledger Records...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !dashboardPayload" class="py-16 text-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-md mx-auto space-y-2">
        <div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="24" />
        </div>
        <p class="text-rose-600 font-black text-sm uppercase tracking-wider">Ledger Synchronization Failure</p>
        <p class="text-xs text-gray-400 font-semibold">
            {{ error?.data?.detail || error?.message || "Credential token handshake rejected." }}
        </p>
      </div>

      <!-- Data Table Workspace -->
      <div v-else class="bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div class="overflow-x-auto rounded-2xl">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50/75 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                <th class="py-4 px-6">Company Name</th>
                <th class="py-4 px-6">Business Type</th>
                <th class="py-4 px-6">Owner / User</th>
                <th class="py-4 px-6">Assigned Agent</th>
                <th class="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm font-medium">
              <tr v-for="vendor in dashboardPayload?.vendors" :key="vendor.id" class="hover:bg-gray-50/50 transition-colors">
                
                <td class="py-4 px-6 text-gray-900 font-bold">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-[#0A1128]/5 text-[#0A1128] flex items-center justify-center font-black shrink-0">
                      {{ vendor.company_name?.charAt(0).toUpperCase() || 'V' }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span>{{ vendor.company_name }}</span>
                        <span 
                          :class="[
                            'w-2 h-2 rounded-full',
                            vendor.is_approved ? 'bg-emerald-500' : 'bg-amber-500'
                          ]" 
                          :title="vendor.is_approved ? 'Verified Merchant' : 'Pending Clearance'"
                        ></span>
                      </div>
                    </div>
                  </div>
                </td>

                <td class="py-4 px-6">
                  <span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg capitalize">
                    {{ vendor.business_type || 'General' }}
                  </span>
                </td>

                <td class="py-4 px-6 text-gray-600">
                  <div class="text-xs font-bold text-gray-900">{{ vendor.user?.first_name }} {{ vendor.user?.last_name }}</div>
                  <div class="text-[11px] text-gray-400">{{ vendor.user?.email }}</div>
                </td>

                <td class="py-4 px-6">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                    YOU
                  </span>
                </td>

                <!-- Direct Action Button with Eye Icon -->
                <td class="py-4 px-6 text-right">
                  <button 
                    type="button"
                    @click="auditVendor(vendor.id)"
                    class="p-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl hover:bg-[#0A1128] hover:text-white transition-all cursor-pointer outline-none inline-flex items-center justify-center shadow-2xs"
                    title="Audit Vendor Details"
                  >
                    <Eye :size="16" />
                  </button>
                </td>

              </tr>

              <!-- Empty State Matrix -->
              <tr v-if="!dashboardPayload?.vendors?.length">
                <td colspan="5" class="py-16 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">
                  No corporate business entities found under your assigned agent scope.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>