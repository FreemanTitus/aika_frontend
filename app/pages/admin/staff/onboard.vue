<!-- pages/admin/onboard-user.vue -->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { UserPlus, AlertCircle, CheckCircle2, ArrowLeft } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')
const router = useRouter()

const form = ref({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  base_location: '', // Will hold the CoverageArea ID integer
  street_address: '',
  department: '',
  account_role: 'staff',
  is_terms_accepted: true
})

// Dynamic Location State Variables
const availableLocations = ref([])
const selectedState = ref('')
const fetchingLocations = ref(true)

const loading = ref(false)
const navigatingBack = ref(false)
const errorMessage = ref(null)
const successMessage = ref(null)

// Fetch active coverage areas from the database on mount
const fetchLocations = async () => {
  fetchingLocations.value = true
  try {
    const res = await $fetch(`${apiBase}/api/v1/auth/locations`, {
      method: 'GET',
      headers: { 
        'ngrok-skip-browser-warning': 'true',
        Authorization: authToken.value ? `Bearer ${authToken.value}` : ''
      }
    })
    availableLocations.value = res?.data || res || []
  } catch (err) {
    console.error("Failed to load locations", err)
  } finally {
    fetchingLocations.value = false
  }
}

// Extract a unique list of states from the fetched locations
const uniqueStates = computed(() => {
  const states = availableLocations.value.map(loc => loc.state_name)
  return [...new Set(states)].sort()
})

// Filter locations to only show areas within the selected state
const filteredLocations = computed(() => {
  if (!selectedState.value) return []
  return availableLocations.value
    .filter(loc => loc.state_name === selectedState.value)
    .sort((a, b) => a.name.localeCompare(b.name))
})

// Reset the area selection whenever the user changes the state
watch(selectedState, () => {
  form.value.base_location = ''
})

onMounted(() => {
  fetchLocations()
})

const handleBack = () => {
  navigatingBack.value = true
  router.push('/admin/staff')
}

const handleStaffOnboard = async () => {
  if (!form.value.base_location) {
    errorMessage.value = 'Please select a valid base hub location.'
    return
  }

  loading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const response = await $fetch(`${apiBase}/api/v1/admin/onboard/staff`, {
      method: 'POST',
      headers: {
        Authorization: authToken.value ? `Bearer ${authToken.value}` : ''
      },
      body: form.value
    })

    successMessage.value = response.message || 'User account successfully provisioned!'
    
    // Reset form fields
    form.value = {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      base_location: '',
      street_address: '',
      department: '',
      account_role: 'staff',
      is_terms_accepted: true
    }
    selectedState.value = ''
  } catch (err) {
    errorMessage.value = err?.data?.detail || 'Failed to onboard user account. Please check inputs.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10">
    <div class="max-w-3xl mx-auto space-y-8">
      
      <!-- Back Link -->
      <div>
        <button 
          @click="handleBack" 
          :disabled="navigatingBack"
          class="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <div v-if="navigatingBack" class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <ArrowLeft v-else :size="16" />
          {{ navigatingBack ? 'Returning...' : 'Back to Dashboard' }}
        </button>
      </div>

      <!-- Header -->
      <div class="space-y-1">
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">Onboard New Team Member</h1>
        <p class="text-sm text-gray-500 font-medium">Provision Administrator, Staff, or Support Agent credentials securely.</p>
      </div>

      <!-- Feedback Alerts -->
      <div v-if="errorMessage" class="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
        <AlertCircle :size="20" class="shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 text-xs font-bold">
        <CheckCircle2 :size="20" class="shrink-0" />
        <span>{{ successMessage }}</span>
      </div>

      <!-- Onboarding Form Card -->
      <form @submit.prevent="handleStaffOnboard" class="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-6">
        
        <!-- Role Selection Field -->
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Account Role Tier</label>
          <select 
            v-model="form.account_role" 
            required
            class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
          >
            <option value="staff">Staff (Vendor Management & Operations)</option>
            <option value="agent">Support Agent (Customer Support Queues)</option>
            <option value="admin">Admin (Full System Superuser Access)</option>
          </select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">First Name</label>
            <input 
              v-model="form.first_name" 
              type="text" 
              required
              placeholder="e.g. John" 
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Last Name</label>
            <input 
              v-model="form.last_name" 
              type="text" 
              required
              placeholder="e.g. Doe" 
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              v-model="form.email" 
              type="email" 
              required
              placeholder="user@enterprise.com" 
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Temporary Password</label>
            <input 
              v-model="form.password" 
              type="password" 
              required
              placeholder="Minimum 8 characters" 
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phone Number</label>
            <input 
              v-model="form.phone_number" 
              type="text" 
              required
              placeholder="+234..." 
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Department</label>
            <input 
              v-model="form.department" 
              type="text" 
              placeholder="e.g. Operations / Support" 
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <!-- Location Dropdowns -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- State Selection -->
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">State</label>
            <select 
              v-model="selectedState" 
              required
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
            >
              <option value="" disabled>{{ fetchingLocations ? 'Loading states...' : 'Select State' }}</option>
              <option v-for="state in uniqueStates" :key="state" :value="state">
                {{ state }}
              </option>
            </select>
          </div>

          <!-- Hub Area Selection -->
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Base Hub Location</label>
            <select 
              v-model.number="form.base_location" 
              required
              :disabled="!selectedState"
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer disabled:opacity-50"
            >
              <option value="" disabled>{{ selectedState ? 'Select Hub Area' : 'Select state first' }}</option>
              <option v-for="loc in filteredLocations" :key="loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Street Address / Landmark</label>
          <input 
            v-model="form.street_address" 
            type="text" 
            placeholder="e.g. Lafia Road" 
            class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div class="pt-4 flex justify-end">
          <button 
            type="submit" 
            :disabled="loading"
            class="px-6 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <div v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <UserPlus v-else :size="16" />
            {{ loading ? 'Provisioning Account...' : 'Provision User Account' }}
          </button>
        </div>

      </form>

    </div>
  </div>
</template>