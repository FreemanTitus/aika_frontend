<!-- pages/admin/staff/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { Shield, UserPlus, AlertCircle, Mail, Phone, MapPin, Briefcase, Search, Power, AlertTriangle, X, ShieldCheck, Ban, Loader2, RefreshCw } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

interface StaffProfile {
  department?: string
  is_available_for_assignment?: boolean
}

interface StaffMember {
  id: string | number
  first_name?: string
  last_name?: string
  role?: string
  base_location?: string
  email?: string
  phone_number?: string
  is_active?: boolean
  staff_profile?: StaffProfile
}

interface ApiErrorResponse {
  detail?: string
}

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')
const searchQuery = ref('')

// Reactive states for staff data, loading, and error handling
const staffMembers = ref<StaffMember[]>([])
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Modal State Control
const isModalOpen = ref(false)
const selectedStaff = ref<StaffMember | null>(null)
const isSubmitting = ref(false)

// Fetch all staff members from the Django Ninja backend on mount with explicit headers
const fetchStaffDirectory = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/staff`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    staffMembers.value = res?.staff_members || res?.data || res || []
  } catch (err: any) {
    console.error("Staff directory fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchStaffDirectory()
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  const errData = error.value?.data as ApiErrorResponse
  return errData?.detail || error.value?.message || 'Credential token handshake rejected.'
})

// Filter staff members based on search input
const filteredStaff = computed(() => {
  if (!staffMembers.value || !Array.isArray(staffMembers.value)) return []
  if (!searchQuery.value) return staffMembers.value
  
  const q = searchQuery.value.toLowerCase().trim()
  return staffMembers.value.filter((staff) => {
    const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.toLowerCase()
    const role = (staff.role || '').toLowerCase()
    const department = (staff.staff_profile?.department || '').toLowerCase()
    const location = (staff.base_location || '').toLowerCase()
    const email = (staff.email || '').toLowerCase()

    return (
      fullName.includes(q) ||
      role.includes(q) ||
      department.includes(q) ||
      location.includes(q) ||
      email.includes(q)
    )
  })
})

const openConfirmationModal = (staff: StaffMember) => {
  selectedStaff.value = staff
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedStaff.value = null
}

const confirmSuspensionToggle = async () => {
  if (!selectedStaff.value) return
  isSubmitting.value = true

  try {
    await $fetch(`${apiBase}/api/v1/admin/staff/${selectedStaff.value.id}/toggle-suspension`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    await fetchStaffDirectory()
    closeModal()
  } catch (err: any) {
    alert(err?.data?.detail || 'Failed to update staff suspension state.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left relative">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div class="space-y-1">
          <h1 class="text-xl font-black text-gray-900 tracking-tight">Staff & Agent Directory</h1>
          <p class="text-xs text-gray-500 font-medium">Manage administrative personnel, support agents, and departmental assignments.</p>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <!-- Search Bar -->
          <div class="relative w-full sm:w-72">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search :size="16" class="w-4 h-4 shrink-0" />
            </span>
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="Search staff, role, department..."
              class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 transition shadow-2xs"
            />
          </div>

          <div class="flex items-center gap-2">
            <!-- Onboard Button -->
            <NuxtLink 
              to="/admin/staff/onboard" 
              class="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <UserPlus :size="16" />
              Onboard New Staff
            </NuxtLink>

            <button 
              @click="fetchStaffDirectory" 
              :disabled="pending"
              type="button" 
              class="bg-white border border-gray-200 shadow-xs text-gray-700 text-xs font-bold p-2.5 rounded-xl transition flex items-center justify-center hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
              title="Refresh Staff Directory"
            >
              <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !staffMembers.length" class="py-20 text-center space-y-3">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Synchronizing Staff Registry...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !staffMembers.length" class="py-16 text-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-md mx-auto space-y-2">
        <div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="24" />
        </div>
        <p class="text-rose-600 font-black text-sm uppercase tracking-wider">Registry Synchronization Failure</p>
        <p class="text-xs text-gray-400 font-semibold">
          {{ errorMessage }}
        </p>
      </div>

      <!-- Data Table Workspace -->
      <div v-else class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50/75 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                <th class="py-4 px-6">Staff Member</th>
                <th class="py-4 px-6">Department</th>
                <th class="py-4 px-6">Base Location</th>
                <th class="py-4 px-6">Contact Info</th>
                <th class="py-4 px-6">Portal Access</th>
                <th class="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm font-medium">
              <tr v-for="staff in filteredStaff" :key="staff.id" class="hover:bg-gray-50/50 transition-colors">
                <td class="py-4 px-6 text-gray-900 font-bold flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">
                    {{ staff.first_name ? staff.first_name.charAt(0).toUpperCase() : 'S' }}
                  </div>
                  <div>
                    <div class="text-xs font-bold text-gray-900">{{ staff.first_name }} {{ staff.last_name }}</div>
                    <div class="text-[11px] text-gray-400 font-normal uppercase tracking-wider">{{ staff.role }}</div>
                  </div>
                </td>
                
                <td class="py-4 px-6">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg capitalize">
                    <Briefcase :size="12" />
                    {{ staff.staff_profile?.department || 'General Support' }}
                  </span>
                </td>

                <td class="py-4 px-6 text-gray-600 text-xs font-semibold">
                  <div class="flex items-center gap-1.5">
                    <MapPin :size="14" class="text-gray-400 shrink-0" />
                    {{ staff.base_location || 'Not Specified' }}
                  </div>
                </td>

                <td class="py-4 px-6 text-xs text-gray-600 space-y-1">
                  <div class="flex items-center gap-1.5 font-medium">
                    <Mail :size="13" class="text-gray-400 shrink-0" />
                    {{ staff.email }}
                  </div>
                  <div class="flex items-center gap-1.5 text-gray-400 font-semibold">
                    <Phone :size="13" class="shrink-0" />
                    {{ staff.phone_number || 'N/A' }}
                  </div>
                </td>

                <!-- Status Column -->
                <td class="py-4 px-6">
                  <span :class="[staff.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100']" class="px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                    <ShieldCheck v-if="staff.is_active !== false" :size="12" />
                    <Ban v-else :size="12" />
                    <span>{{ staff.is_active !== false ? 'Active' : 'Suspended' }}</span>
                  </span>
                </td>

                <!-- Actions Column -->
                <td class="py-4 px-6 text-right">
                  <button 
                    type="button"
                    @click="openConfirmationModal(staff)"
                    :class="[
                      staff.is_active !== false 
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-100' 
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100'
                    ]"
                    class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition inline-flex items-center gap-1.5 cursor-pointer outline-none"
                  >
                    <Power :size="12" />
                    <span>{{ staff.is_active !== false ? 'Suspend' : 'Activate' }}</span>
                  </button>
                </td>
              </tr>

              <!-- Empty State Matrix -->
              <tr v-if="!filteredStaff.length">
                <td colspan="6" class="py-16 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">
                  No staff members found matching your search query.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Confirmation Warning Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 text-left relative">
          
          <button type="button" @click="closeModal" class="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition cursor-pointer border-0 bg-transparent">
            <X :size="20" />
          </button>

          <div class="flex items-center gap-4">
            <div :class="[selectedStaff?.is_active !== false ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600']" class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle :size="24" />
            </div>
            <div>
              <h3 class="text-base font-black text-gray-900 tracking-tight">
                {{ selectedStaff?.is_active !== false ? 'Suspend Staff Portal Access?' : 'Restore Staff Portal Access?' }}
              </h3>
              <p class="text-xs text-gray-500 font-medium mt-0.5">
                {{ selectedStaff?.first_name }} {{ selectedStaff?.last_name }} ({{ selectedStaff?.role }})
              </p>
            </div>
          </div>

          <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-2 font-medium leading-relaxed">
            <p v-if="selectedStaff?.is_active !== false">
              Suspending this personnel will immediately terminate their active administrative sessions and block them from logging into the management portal.
            </p>
            <p v-else>
              Activating this account will restore full operational access, allowing the personnel to log back into their portal workspace.
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button 
              type="button"
              @click="closeModal" 
              class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer outline-none border-0"
            >
              Cancel
            </button>
            <button 
              type="button"
              @click="confirmSuspensionToggle" 
              :disabled="isSubmitting"
              :class="[selectedStaff?.is_active !== false ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100']"
              class="flex-1 py-3 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer outline-none flex items-center justify-center gap-2 border-0"
            >
              <Loader2 v-if="isSubmitting" class="animate-spin h-3.5 w-3.5 text-white" />
              <span>{{ selectedStaff?.is_active !== false ? 'Yes, Suspend' : 'Yes, Activate' }}</span>
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>