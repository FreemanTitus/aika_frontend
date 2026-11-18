<!-- pages/admin/riders.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Ban, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Power, 
  AlertTriangle, 
  X, 
  Loader2, 
  RefreshCw, 
  Wallet,
  Eye,
  Star,
  Award,
  Bike,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
  CheckCircle,
  Plus
} from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')
const searchQuery = ref('')

interface RiderReviewModel {
  id: number | string;
  rating: number;
  comment: string;
  customer_name: string;
  created_at: string;
}

interface RiderProfileModel {
  id: string
  email: string
  full_name: string
  phone_number: string
  bike_plate_number?: string
  device_type?: string
  employment_type?: string
  payout_schedule?: string
  base_location?: string
  street_address?: string
  default_delivery_address: string
  id_type?: string
  id_number?: string
  guarantor_name?: string
  guarantor_phone?: string
  guarantor_address?: string
  is_vetted?: boolean
  is_id_verified?: boolean
  is_active: boolean
  date_joined: string
  performance?: {
    total_reviews: number;
    average_rating: number;
  }
  reviews?: RiderReviewModel[]
}

const riders = ref<RiderProfileModel[]>([])
const pending = ref<boolean>(true)
const error = ref<any>(null)

const isModalOpen = ref(false)
const selectedRider = ref<RiderProfileModel | null>(null)
const isSubmitting = ref(false)

const isRegisterModalOpen = ref(false)
const isRegisteringRider = ref(false)
const registerError = ref<string | null>(null)
const newRiderForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  bike_plate_number: '',
  device_type: 'smartphone',
  employment_type: 'full_time',
  payout_schedule: 'daily',
  base_location: 'akwanga',
  street_address: '',
  id_type: 'nin',
  id_number: '',
  guarantor_name: '',
  guarantor_phone: '',
  guarantor_address: '',
  password: 'Password123!',
  terms: true
})

const isDetailModalOpen = ref(false)
const activeRiderDetail = ref<RiderProfileModel | null>(null)
const loadingDetail = ref(false)
const isVerifyingId = ref(false)
const actionMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)

const fetchRiders = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/riders`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    riders.value = res?.data || res || []
  } catch (err: any) {
    console.error("Riders list fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchRiders()
})

const filteredRiders = computed(() => {
  if (!riders.value || !Array.isArray(riders.value)) return []
  if (!searchQuery.value) return riders.value
  const q = searchQuery.value.toLowerCase()
  return riders.value.filter((r) => 
    r.full_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
  )
})

const openConfirmationModal = (rider: RiderProfileModel) => {
  selectedRider.value = rider
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedRider.value = null
}

const handleAdminRegisterRider = async () => {
  registerError.value = null
  isRegisteringRider.value = true

  try {
    await $fetch(`${apiBase}/api/v1/auth/register/rider`, {
      method: 'POST',
      body: {
        ...newRiderForm.value,
        account_role: 'rider',
        is_terms_accepted: true
      },
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })

    isRegisterModalOpen.value = false
    newRiderForm.value = {
      first_name: '', last_name: '', email: '', phone_number: '',
      bike_plate_number: '', device_type: 'smartphone', employment_type: 'full_time',
      payout_schedule: 'daily', base_location: 'akwanga', street_address: '',
      id_type: 'nin', id_number: '', guarantor_name: '', guarantor_phone: '',
      guarantor_address: '', password: 'Password123!', terms: true
    }
    await fetchRiders()
  } catch (err: any) {
    console.error(err?.data)
    registerError.value = err?.data?.message || err?.data?.detail || "Failed to register rider account."
  } finally {
    isRegisteringRider.value = false
  }
}

const openRiderDetail = async (rider: RiderProfileModel) => {
  activeRiderDetail.value = rider
  isDetailModalOpen.value = true
  loadingDetail.value = true
  actionMessage.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/riders/${rider.id}/detail`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    activeRiderDetail.value = res?.data || res || rider
  } catch (err: any) {
    console.error("Failed to fetch rider detail reviews", err)
  } finally {
    loadingDetail.value = false
  }
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  activeRiderDetail.value = null
  actionMessage.value = null
}

const handleVerifyRiderId = async (approved: boolean) => {
  if (!activeRiderDetail.value) return
  isVerifyingId.value = true
  actionMessage.value = null

  try {
    await $fetch(`${apiBase}/api/v1/admin/riders/${activeRiderDetail.value.id}/verify-id?approved=${approved}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    
    activeRiderDetail.value.is_id_verified = approved
    activeRiderDetail.value.is_vetted = approved
    activeRiderDetail.value.is_active = approved

    actionMessage.value = {
      type: 'success',
      text: approved ? 'Rider ID successfully verified and portal activated.' : 'Rider KYC verification rejected.'
    }

    await fetchRiders()
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.data?.detail || 'Failed to update rider KYC verification status.'
    }
  } finally {
    isVerifyingId.value = false
  }
}

const confirmSuspensionToggle = async () => {
  if (!selectedRider.value) return
  isSubmitting.value = true

  try {
    await $fetch(`${apiBase}/api/v1/admin/riders/${selectedRider.value.id}/toggle-suspension`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    await fetchRiders()
    closeModal()
  } catch (err: any) {
    alert(err?.data?.detail || 'Failed to update rider suspension state.')
  } finally {
    isSubmitting.value = false
  }
}

const navigateToPayouts = () => {
  navigateTo('/admin/financials/rider-payouts')
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-6 space-y-8 font-sans text-left relative">
    
    <!-- Header Section with Clean Structured Spacing -->
    <div class="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
      
      <!-- Top Row: Title & Primary Actions -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users :size="20" />
            </span>
            <h1 class="text-xl font-black text-gray-900 tracking-tight">Rider Fleet Management</h1>
          </div>
          <p class="text-xs text-gray-500 font-medium">Monitor active logistics personnel, operational status, and portal access rights.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Payout Ledger Navigation Button -->
          <button 
            type="button"
            @click="navigateToPayouts"
            class="px-4 py-3 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-2xl shadow-xs hover:bg-gray-50 transition-all flex items-center gap-2 cursor-pointer outline-none"
          >
            <Wallet :size="16" class="text-indigo-600" />
            Rider Payout Audit
          </button>

          <!-- Admin Register Rider Trigger Button -->
          <button 
            type="button"
            @click="isRegisterModalOpen = true"
            class="px-5 py-3 bg-[#0A1128] hover:bg-indigo-900 text-[#D4F53C] text-xs font-black uppercase tracking-wider rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer outline-none border-0"
          >
            <Plus :size="16" class="stroke-[3]" />
            Register New Rider
          </button>
        </div>
      </div>

      <!-- Bottom Row: Search & Table Filter Controls -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
        <div class="relative w-full sm:w-96">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search :size="16" class="w-4 h-4 shrink-0" />
          </span>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search rider by name or email..."
            class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 transition shadow-2xs"
          />
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">
            Showing {{ filteredRiders.length }} riders
          </span>
          <button 
            @click="fetchRiders" 
            :disabled="pending"
            type="button" 
            class="bg-white border border-gray-200 shadow-xs text-gray-700 text-xs font-bold p-3 rounded-2xl transition flex items-center justify-center hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
            title="Refresh Rider Fleet"
          >
            <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>

    <!-- Loading State -->
    <div v-if="pending && !riders.length" class="py-20 text-center space-y-3">
      <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
      <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading rider fleet records...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error && !riders.length" class="p-6 bg-rose-50 border border-rose-100 rounded-3xl text-center space-y-2">
      <h3 class="text-sm font-black text-rose-800">Failed to load rider directory</h3>
      <p class="text-xs text-rose-600 font-medium">Ensure you have active admin staff authorization credentials.</p>
    </div>

    <!-- Riders Table Grid -->
    <div v-else class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50/75 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th class="py-4 px-6">Rider Profile</th>
              <th class="py-4 px-6">Contact Info</th>
              <th class="py-4 px-6">Employment Tier</th>
              <th class="py-4 px-6">Base Location</th>
              <th class="py-4 px-6">Portal Status</th>
              <th class="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-xs font-medium text-gray-600">
            <tr v-for="rider in filteredRiders" :key="rider.id" class="hover:bg-gray-50/50 transition">
              
              <!-- Profile Column -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                    {{ rider.full_name ? rider.full_name.charAt(0).toUpperCase() : 'R' }}
                  </div>
                  <div>
                    <h4 class="font-black text-gray-900 tracking-tight">{{ rider.full_name }}</h4>
                    <p class="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Mail :size="12" /> {{ rider.email }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Phone Column -->
              <td class="py-4 px-6">
                <span class="flex items-center gap-1.5 text-gray-700 font-semibold">
                  <Phone :size="12" class="text-gray-400" /> {{ rider.phone_number }}
                </span>
              </td>

              <!-- Employment Tier Column -->
              <td class="py-4 px-6">
                <span class="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 text-[10px] font-black uppercase tracking-wider inline-block">
                  {{ rider.employment_type === 'casual' ? 'Casual / Part-Time' : 'Full-Time' }}
                </span>
              </td>

              <!-- Address Column -->
              <td class="py-4 px-6 max-w-xs">
                <span class="flex items-start gap-1.5 text-gray-600 truncate">
                  <MapPin :size="13" class="text-indigo-600 shrink-0 mt-0.5" />
                  <span class="truncate" :title="rider.default_delivery_address">{{ rider.default_delivery_address }}</span>
                </span>
              </td>

              <!-- Status Column -->
              <td class="py-4 px-6">
                <span :class="[rider.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100']" class="px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                  <ShieldCheck v-if="rider.is_active" :size="12" />
                  <Ban v-else :size="12" />
                  <span>{{ rider.is_active ? 'Active' : 'Suspended' }}</span>
                </span>
              </td>

              <!-- Action Column -->
              <td class="py-4 px-6 text-right space-x-2">
                <button 
                  type="button"
                  @click="openRiderDetail(rider)"
                  class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-100 text-[10px] font-black uppercase tracking-wider transition inline-flex items-center gap-1 cursor-pointer outline-none"
                >
                  <Eye :size="12" />
                  <span>View</span>
                </button>

                <button 
                  type="button"
                  @click="openConfirmationModal(rider)"
                  :class="[
                    rider.is_active 
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-100' 
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100'
                  ]"
                  class="px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition inline-flex items-center gap-1.5 cursor-pointer outline-none"
                >
                  <Power :size="12" />
                  <span>{{ rider.is_active ? 'Suspend' : 'Activate' }}</span>
                </button>
              </td>
            </tr>

            <tr v-if="filteredRiders.length === 0">
              <td colspan="6" class="py-16 text-center text-gray-400 font-bold uppercase tracking-wider text-xs">
                No rider accounts found matching query.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADMIN REGISTER RIDER MODAL -->
    <Teleport to="body">
      <div v-if="isRegisterModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 text-left relative max-h-[90vh] overflow-y-auto">
          
          <button type="button" @click="isRegisterModalOpen = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition cursor-pointer border-0 bg-transparent">
            <X :size="20" />
          </button>

          <div class="space-y-1 border-b border-gray-100 pb-4">
            <span class="text-[10px] font-black uppercase tracking-widest bg-lime-100 text-lime-800 px-2.5 py-0.5 rounded-full">Fleet Provisioning</span>
            <h2 class="text-lg font-black text-gray-900 tracking-tight mt-1">Register New Rider Account</h2>
            <p class="text-xs text-gray-500 font-medium">Provision a new full-time or casual rider with operational tier rules.</p>
          </div>

          <form @submit.prevent="handleAdminRegisterRider" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">First Name</label>
                <input v-model="newRiderForm.first_name" type="text" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="John" />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Last Name</label>
                <input v-model="newRiderForm.last_name" type="text" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="Doe" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Email Address</label>
                <input v-model="newRiderForm.email" type="email" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="rider@domain.com" />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Phone Number</label>
                <input v-model="newRiderForm.phone_number" type="tel" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="08012345678" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Bike Plate Number</label>
                <input v-model="newRiderForm.bike_plate_number" type="text" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 font-mono outline-none focus:border-indigo-600 focus:bg-white" placeholder="KEF-442-AB" />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Employment Model</label>
                <select v-model="newRiderForm.employment_type" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white cursor-pointer">
                  <option value="full_time">Full-Time (Fixed ₦1,000 / Order)</option>
                  <option value="casual">Casual (Threshold Revenue Share)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Payout Schedule</label>
                <select v-model="newRiderForm.payout_schedule" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white cursor-pointer">
                  <option value="daily">Daily Payout</option>
                  <option value="weekly">Weekly Payout</option>
                  <option value="monthly">Monthly Payout</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Base Location Hub</label>
                <select v-model="newRiderForm.base_location" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white cursor-pointer">
                  <option value="akwanga">Akwanga</option>
                  <option value="keffi">Keffi</option>
                  <option value="lafia">Lafia</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Residential Landmark</label>
              <input v-model="newRiderForm.street_address" type="text" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="e.g., Opposite Central Mosque" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Means of ID</label>
                <select v-model="newRiderForm.id_type" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white cursor-pointer">
                  <option value="nin">National ID (NIN)</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="voters_card">Voter's Card</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">ID Number</label>
                <input v-model="newRiderForm.id_number" type="text" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="ID Number" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Guarantor Name</label>
                <input v-model="newRiderForm.guarantor_name" type="text" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="Guarantor full name" />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Guarantor Phone</label>
                <input v-model="newRiderForm.guarantor_phone" type="tel" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="08000000000" />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Temporary Password</label>
              <input v-model="newRiderForm.password" type="text" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-600 focus:bg-white" placeholder="Temporary password" />
            </div>

            <div v-if="registerError" class="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600">
              {{ registerError }}
            </div>

            <button 
              type="submit" 
              :disabled="isRegisteringRider"
              class="w-full py-4 bg-[#0A1128] hover:bg-indigo-900 text-[#D4F53C] rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer outline-none border-0 disabled:opacity-50"
            >
              <Loader2 v-if="isRegisteringRider" class="w-4 h-4 animate-spin text-[#D4F53C]" />
              <span>{{ isRegisteringRider ? 'Provisioning Account...' : 'Create Rider Account' }}</span>
            </button>
          </form>

        </div>
      </div>
    </Teleport>

    <!-- RIDER DETAIL & KYC VETTING MODAL -->
    <Teleport to="body">
      <div v-if="isDetailModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 text-left relative max-h-[90vh] overflow-y-auto">
          
          <button type="button" @click="closeDetailModal" class="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition cursor-pointer border-0 bg-transparent">
            <X :size="20" />
          </button>

          <!-- Modal Header -->
          <div class="flex items-center gap-4 border-b border-gray-100 pb-5">
            <div class="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 font-black flex items-center justify-center text-xl shadow-xs shrink-0">
              {{ activeRiderDetail?.full_name ? activeRiderDetail.full_name.charAt(0).toUpperCase() : 'R' }}
            </div>
            <div>
              <span class="text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">Rider Vetting Profile</span>
              <h2 class="text-lg font-black text-gray-900 tracking-tight mt-1">{{ activeRiderDetail?.full_name }}</h2>
              <p class="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Mail :size="12" /> {{ activeRiderDetail?.email }}
              </p>
            </div>
          </div>

          <!-- Loading Spinner inside modal -->
          <div v-if="loadingDetail" class="py-12 text-center space-y-2">
            <Loader2 class="w-6 h-6 animate-spin mx-auto text-indigo-600" />
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Fetching profile details...</p>
          </div>

          <div v-else class="space-y-6">
            
            <!-- In-Modal Status Notification Banner -->
            <div v-if="actionMessage" :class="[actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800']" class="p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in">
              <CheckCircle v-if="actionMessage.type === 'success'" :size="16" class="shrink-0 text-emerald-600" />
              <AlertTriangle v-else :size="16" class="shrink-0 text-rose-600" />
              <span>{{ actionMessage.text }}</span>
            </div>

            <!-- KYC & VETTING APPROVAL BANNER -->
            <div class="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" :class="activeRiderDetail?.is_id_verified ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900' : 'bg-amber-50/80 border-amber-100 text-amber-900'">
              <div class="flex items-center gap-3">
                <span class="p-2 rounded-xl" :class="activeRiderDetail?.is_id_verified ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'">
                  <UserCheck :size="20" />
                </span>
                <div>
                  <h4 class="text-xs font-black uppercase tracking-wider">
                    {{ activeRiderDetail?.is_id_verified ? 'KYC Verified & Vetted' : 'Pending Administrative Vetting' }}
                  </h4>
                  <p class="text-[11px] font-medium opacity-80 mt-0.5">
                    {{ activeRiderDetail?.is_id_verified ? 'This rider has been cleared to operate deliveries on the platform.' : 'Review ID credentials and guarantor details below before approval.' }}
                  </p>
                </div>
              </div>

              <!-- Approve / Reject Toggle Buttons -->
              <div class="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  type="button"
                  @click="handleVerifyRiderId(true)"
                  :disabled="isVerifyingId"
                  class="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm outline-none border-0 disabled:opacity-50"
                >
                  <Loader2 v-if="isVerifyingId" class="w-3.5 h-3.5 animate-spin" />
                  <CheckCircle2 v-else :size="14" />
                  <span>{{ activeRiderDetail?.is_id_verified ? 'Verified' : 'Approve' }}</span>
                </button>

                <button 
                  type="button"
                  @click="handleVerifyRiderId(false)"
                  :disabled="isVerifyingId"
                  class="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm outline-none disabled:opacity-50"
                >
                  <XCircle :size="14" />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            <!-- Rider Meta Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                <p class="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Phone :size="12" /> Phone Number
                </p>
                <p class="text-xs font-bold text-gray-900">{{ activeRiderDetail?.phone_number || 'N/A' }}</p>
              </div>

              <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                <p class="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Bike :size="12" /> Bike Plate
                </p>
                <p class="text-xs font-bold text-gray-900 font-mono">{{ activeRiderDetail?.bike_plate_number || 'Not Assigned' }}</p>
              </div>

              <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                <p class="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Calendar :size="12" /> Employment Tier
                </p>
                <p class="text-xs font-bold text-indigo-600 uppercase">{{ activeRiderDetail?.employment_type || 'Full-Time' }}</p>
              </div>
            </div>

            <!-- KYC Identification & Guarantor Details Box -->
            <div class="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 space-y-4">
              <h3 class="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <FileText :size="14" class="text-indigo-600" /> Means of ID &amp; Guarantor Security Data
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="space-y-1 bg-white p-3.5 rounded-xl border border-gray-100">
                  <span class="text-[10px] font-black uppercase tracking-wider text-gray-400">ID Type &amp; Number</span>
                  <p class="font-bold text-gray-900 uppercase tracking-wide">
                    {{ activeRiderDetail?.id_type || 'N/A' }}: <span class="font-mono">{{ activeRiderDetail?.id_number || 'N/A' }}</span>
                  </p>
                </div>

                <div class="space-y-1 bg-white p-3.5 rounded-xl border border-gray-100">
                  <span class="text-[10px] font-black uppercase tracking-wider text-gray-400">Guarantor Name &amp; Phone</span>
                  <p class="font-bold text-gray-900">
                    {{ activeRiderDetail?.guarantor_name || 'N/A' }} <span class="text-gray-500 font-normal">({{ activeRiderDetail?.guarantor_phone || 'N/A' }})</span>
                  </p>
                </div>
              </div>

              <div class="space-y-1 bg-white p-3.5 rounded-xl border border-gray-100 text-xs">
                <span class="text-[10px] font-black uppercase tracking-wider text-gray-400">Guarantor Residential Address</span>
                <p class="font-semibold text-gray-700">{{ activeRiderDetail?.guarantor_address || 'N/A' }}</p>
              </div>
            </div>

            <!-- Performance Metrics Banner -->
            <div class="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
              <div class="space-y-1">
                <p class="text-[10px] font-black uppercase tracking-widest text-indigo-200">Customer Rating Score</p>
                <div class="flex items-center gap-2">
                  <div class="flex items-center text-amber-400">
                    <Star :size="18" class="fill-current" />
                  </div>
                  <span class="text-2xl font-black">{{ activeRiderDetail?.performance?.average_rating || '0.0' }}</span>
                  <span class="text-xs text-indigo-200 font-medium">/ 5.0</span>
                </div>
              </div>
              <div class="text-right space-y-1">
                <p class="text-[10px] font-black uppercase tracking-widest text-indigo-200">Total Reviews</p>
                <p class="text-2xl font-black">{{ activeRiderDetail?.performance?.total_reviews || 0 }}</p>
              </div>
            </div>

            <!-- Customer Reviews List -->
            <div class="space-y-3">
              <h3 class="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Award :size="14" class="text-indigo-600" /> Customer Review History
              </h3>

              <div v-if="!activeRiderDetail?.reviews || activeRiderDetail.reviews.length === 0" class="p-8 bg-gray-50 rounded-2xl text-center text-xs font-bold text-gray-400">
                No customer reviews recorded for this rider yet.
              </div>

              <div v-else class="space-y-3 max-h-60 overflow-y-auto pr-1">
                <div v-for="rev in activeRiderDetail.reviews" :key="rev.id" class="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1 text-amber-500">
                      <Star v-for="n in rev.rating" :key="n" :size="12" class="fill-current" />
                    </div>
                    <span class="text-[10px] font-mono font-medium text-gray-400">{{ rev.created_at }}</span>
                  </div>
                  <p class="text-xs text-gray-700 italic">"{{ rev.comment || 'No comment provided.' }}"</p>
                  <p class="text-[10px] font-black uppercase tracking-wider text-indigo-600">— {{ rev.customer_name }}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- Confirmation Warning Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
        <div class="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 text-left relative">
          
          <button type="button" @click="closeModal" class="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition cursor-pointer border-0 bg-transparent">
            <X :size="20" />
          </button>

          <div class="flex items-center gap-4">
            <div :class="[selectedRider?.is_active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600']" class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle :size="24" />
            </div>
            <div>
              <h3 class="text-base font-black text-gray-900 tracking-tight">
                {{ selectedRider?.is_active ? 'Suspend Rider Portal Access?' : 'Restore Rider Portal Access?' }}
              </h3>
              <p class="text-xs text-gray-500 font-medium mt-0.5">
                {{ selectedRider?.full_name }}
              </p>
            </div>
          </div>

          <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-2 font-medium leading-relaxed">
            <p v-if="selectedRider?.is_active">
              Suspending this account will immediately terminate the rider's active sessions and block them from logging into their mobile delivery portal.
            </p>
            <p v-else>
              Activating this account will restore full operational status, allowing the rider to log back into their portal and accept deliveries.
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
              :class="[selectedRider?.is_active ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100']"
              class="flex-1 py-3 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer outline-none flex items-center justify-center gap-2 border-0"
            >
              <Loader2 v-if="isSubmitting" class="animate-spin h-3.5 w-3.5 text-white" />
              <span>{{ selectedRider?.is_active ? 'Yes, Suspend' : 'Yes, Activate' }}</span>
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>