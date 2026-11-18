<!-- pages/admin/vendors/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCookie, useRuntimeConfig, navigateTo } from '#app'
import { ShieldCheck, AlertCircle, MoreHorizontal, CheckCircle2, Ban, Trash2, X, AlertTriangle, Loader2, RefreshCw } from '@lucide/vue'

definePageMeta({ 
  layout: 'admin', 
  middleware: 'auth' 
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')

const selectedFilter = ref('')
const activeDropdownId = ref<number | null>(null) // Tracks which vendor's menu is open

// Modal state tracking
const showDeleteModal = ref(false)
const vendorToDelete = ref<{ id: number | null; companyName: string }>({ id: null, companyName: '' })
const isDeleting = ref(false)

const businessTypes = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Retail', value: 'e_commerce' },
  { label: 'Services', value: 'services' }
]

// Reactive states for vendors dashboard data, loading, and error handling
const dashboardPayload = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Fetch data from Django Ninja async backend endpoint on mount and filter changes with explicit headers
const fetchVendorsDashboard = async () => {
  pending.value = true
  error.value = null

  try {
    const queryParams: Record<string, string> = {}
    if (selectedFilter.value) {
      queryParams.type = selectedFilter.value
    }

    const res: any = await $fetch(`${apiBase}/api/v1/admin/vendors`, {
      method: 'GET',
      query: queryParams,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    dashboardPayload.value = res?.data || res || {}
  } catch (err: any) {
    console.error("Vendors dashboard fetch error:", err)
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
  navigateTo(`/admin/vendors/${id}`)
}

// Toggle action menu per row
const toggleMenu = (id: number) => {
  activeDropdownId.value = activeDropdownId.value === id ? null : id
}

// Handle inline assignment changes
const updateVendorAgent = async (vendorId: number, agentId: any) => {
  try {
    await $fetch(`${apiBase}/api/v1/admin/vendors/${vendorId}/assign`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: {
        assigned_agent_id: agentId ? Number(agentId) : null
      }
    })
    await fetchVendorsDashboard()
  } catch (err: any) {
    alert(err?.data?.detail || 'Failed to update assigned agent.')
  }
}

// Handle Approval / Unapproval toggle
const toggleApproval = async (vendorId: number, action: string) => {
  activeDropdownId.value = null
  try {
    await $fetch(`${apiBase}/api/v1/admin/vendors/${vendorId}/toggle-approval`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: {
        action: action // 'approve' or 'unapprove'
      }
    })
    await fetchVendorsDashboard()
  } catch (err: any) {
    alert(err?.data?.detail || 'Failed to update vendor approval status.')
  }
}

// Trigger Delete Confirmation Modal
const confirmDeleteVendor = (vendorId: number, companyName: string) => {
  activeDropdownId.value = null
  vendorToDelete.value = { id: vendorId, companyName }
  showDeleteModal.value = true
}

// Execute Permanent Deletion via Modal
const executeDelete = async () => {
  if (!vendorToDelete.value.id) return

  isDeleting.value = true
  try {
    await $fetch(`${apiBase}/api/v1/admin/vendors/${vendorToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    showDeleteModal.value = false
    await fetchVendorsDashboard()
  } catch (err: any) {
    alert(err?.data?.detail || 'Failed to delete vendor profile anchor.')
  } finally {
    isDeleting.value = false
    vendorToDelete.value = { id: null, companyName: '' }
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 relative text-left">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Merchant Audit & Oversight</h1>
          <p class="text-sm text-gray-500 font-medium">Audit, approve, and manage corporate business entities across the ecosystem.</p>
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
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
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
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
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
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
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
              <tr v-for="vendor in dashboardPayload?.vendors" :key="vendor.id" class="hover:bg-gray-50/50 transition-colors relative">
                
                <td class="py-4 px-6 text-gray-900 font-bold">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">
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
                  <select 
                    :value="vendor.assigned_agent?.id || null"
                    @change="updateVendorAgent(vendor.id, ($event.target as HTMLSelectElement).value ? ($event.target as HTMLSelectElement).value : null)"
                    class="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
                  >
                    <option :value="null">Unassigned</option>
                    <option v-for="agent in dashboardPayload?.staff_agents" :key="agent.id" :value="agent.id">
                      {{ agent.first_name }} {{ agent.last_name }}
                    </option>
                  </select>
                </td>

                <!-- Horizontal Line Popover Menu Actions -->
                <td class="py-4 px-6 text-right relative">
                  <div class="inline-block text-left">
                    <button 
                      type="button"
                      @click="toggleMenu(vendor.id)"
                      class="p-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer outline-none"
                      title="Manage Options"
                    >
                      <MoreHorizontal :size="16" />
                    </button>

                    <!-- Dropdown Menu Positioned Correctly On Screen -->
                    <div 
                      v-if="activeDropdownId === vendor.id" 
                      class="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 py-2 divide-y divide-gray-50 text-left"
                    >
                      <div class="px-3 py-1.5">
                        <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Oversight Actions</p>
                      </div>

                      <div class="py-1">
                        <button 
                          type="button"
                          @click="auditVendor(vendor.id)"
                          class="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                        >
                          <ShieldCheck :size="14" />
                          Audit Profile Details
                        </button>
                      </div>

                      <div class="py-1">
                        <button 
                          type="button"
                          v-if="!vendor.is_approved"
                          @click="toggleApproval(vendor.id, 'approve')"
                          class="w-full px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                        >
                          <CheckCircle2 :size="14" />
                          Approve Clearance
                        </button>
                        <button 
                          type="button"
                          v-else
                          @click="toggleApproval(vendor.id, 'unapprove')"
                          class="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                        >
                          <Ban :size="14" />
                          Revoke Approval
                        </button>
                      </div>

                      <div class="py-1">
                        <button 
                          type="button"
                          @click="confirmDeleteVendor(vendor.id, vendor.company_name)"
                          class="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                        >
                          <Trash2 :size="14" />
                          Delete Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </td>

              </tr>

              <!-- Empty State Matrix -->
              <tr v-if="!dashboardPayload?.vendors?.length">
                <td colspan="5" class="py-16 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">
                  No corporate business entities found under this filter scope.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Custom Deletion Confirmation Modal Overlay -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div class="bg-white border border-gray-100 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-6 relative animate-in fade-in zoom-in duration-200">
        
        <!-- Close Button -->
        <button 
          type="button"
          @click="showDeleteModal = false"
          class="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors border-0 bg-transparent cursor-pointer"
        >
          <X :size="20" />
        </button>

        <!-- Warning Icon & Header -->
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle :size="24" />
          </div>
          <div>
            <h3 class="text-base font-black text-gray-900 tracking-tight">Confirm Profile Deletion</h3>
            <p class="text-xs text-gray-500 font-medium">This action is irreversible and triggers structural cascade purges.</p>
          </div>
        </div>

        <!-- Warning Body Message -->
        <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-semibold text-gray-700 leading-relaxed">
          Are you sure you want to permanently purge <span class="text-gray-900 font-bold">"{{ vendorToDelete.companyName }}"</span> from the system ledger? All linked wallets, accounts, and records will be wiped out.
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button 
            type="button"
            @click="showDeleteModal = false"
            class="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer border-0 outline-none"
          >
            Cancel
          </button>
          
          <button 
            type="button"
            @click="executeDelete"
            :disabled="isDeleting"
            class="px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-100 hover:bg-rose-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer border-0 outline-none"
          >
            <Loader2 v-if="isDeleting" class="w-3.5 h-3.5 animate-spin text-white" />
            {{ isDeleting ? 'Purging Anchor...' : 'Yes, Permanently Delete' }}
          </button>
        </div>

      </div>
    </div>

  </div>
</template>