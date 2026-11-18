<!-- pages/signup.vue -->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRoute, useRuntimeConfig } from '#app'
import { 
  User, 
  UserCheck, 
  Signature, 
  MapPin, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  Loader2,
  Eye, 
  EyeOff,
  Sparkles
} from '@lucide/vue'

definePageMeta({
  layout: 'default'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const router = useRouter()
const route = useRoute()

const isSubmitting = ref(false)
const errorText = ref<string | null>(null)

const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Dynamic Locations State
const availableLocations = ref<any[]>([])
const fetchingLocations = ref(false)
const selectedState = ref('')

const form = ref({
  first_name: '',
  last_name: '',
  street_address: '',
  email: '',
  phone_number: '',
  base_location: '' as number | '', 
  password: '',
  confirm_password: '',
  referral_code: '',
  terms: false
})

// Auto-detect referral code from query parameters if shared via link (e.g., /signup?ref=AIKA-ABC123)
onMounted(() => {
  if (route.query.ref) {
    form.value.referral_code = String(route.query.ref).trim().toUpperCase()
  }
  fetchLocations()
})

// Fetch active coverage areas from the database
const fetchLocations = async () => {
  fetchingLocations.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/locations`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
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
  return availableLocations.value.filter(loc => loc.state_name === selectedState.value).sort((a, b) => a.name.localeCompare(b.name))
})

// Reset the area selection whenever the user changes the state
watch(selectedState, () => {
  form.value.base_location = ''
})

const validateFormInputMetrics = (): boolean => {
  errorText.value = null

  if (form.value.password.length < 8) {
    errorText.value = "Password must be at least 8 characters long."
    return false
  }

  if (form.value.password !== form.value.confirm_password) {
    errorText.value = "Passwords do not match. Please verify your entries."
    return false
  }

  if (!form.value.base_location) {
    errorText.value = "Please select a valid operational base market region."
    return false
  }

  if (!form.value.terms) {
    errorText.value = "You must accept the terms of service tracking policies to proceed."
    return false
  }

  return true
}

const handleOnboardingSubmit = async () => {
  if (!validateFormInputMetrics()) {
    await nextTick()
    return
  }

  isSubmitting.value = true

  const payload = {
    account_role: 'individual',
    email: form.value.email,
    phone_number: form.value.phone_number,
    base_location: form.value.base_location, 
    street_address: form.value.street_address,
    password: form.value.password,
    is_terms_accepted: form.value.terms, 
    first_name: form.value.first_name,
    last_name: form.value.last_name,
    referral_code: form.value.referral_code.trim()
  }

  const targetEndpoint = `${apiBase}/api/v1/auth/register/individual`

  try {
    const response: any = await $fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json'
      },
      body: payload
    })

    if (response.status === 'success' || response.user_id) {
      router.push('/auth/login') 
    }
  } catch (err: any) {
    errorText.value = err.response?._data?.detail || err?.data?.detail || err?.message || "An unresolved network handshake fault occurred."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="w-full min-h-[90vh] flex flex-col justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 text-left">
    <main class="max-w-xl w-full mx-auto">
      <div class="bg-white p-6 sm:p-10 rounded-[32px] shadow-xl border border-gray-100 relative overflow-hidden">
        
        <!-- Decorative Top Accent Line -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0A1128] via-[#D4F53C] to-[#0A1128]"></div>

        <div class="text-center mb-8 space-y-3">
          <span class="bg-[#D4F53C]/20 text-[#0A1128] font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest inline-block shadow-2xs">
            Customer Portal
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">
            Create an Account
          </h1>
          <p class="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto font-medium leading-relaxed">
            Create an individual account to order meals and retail goods from your local marketplace.
          </p>
        </div>

        <form @submit.prevent="handleOnboardingSubmit" class="space-y-5">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">First Name</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><UserCheck class="w-4 h-4" /></span>
                <input v-model="form.first_name" type="text" placeholder="John" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-base sm:text-sm transition shadow-2xs" />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Last Name</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Signature class="w-4 h-4" /></span>
                <input v-model="form.last_name" type="text" placeholder="Doe" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-base sm:text-sm transition shadow-2xs" />
              </div>
            </div>
            
            <div class="sm:col-span-2 space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Street Address / Landmark</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><MapPin class="w-4 h-4" /></span>
                <input v-model="form.street_address" type="text" placeholder="e.g., No 5, Opposite Central Mosque" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-base sm:text-sm transition shadow-2xs" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Email Address</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Mail class="w-4 h-4" /></span>
                <input v-model="form.email" type="email" placeholder="name@domain.com" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-base sm:text-sm transition shadow-2xs" />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Mobile Line</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Phone class="w-4 h-4" /></span>
                <input v-model="form.phone_number" type="tel" placeholder="08012345678" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-base sm:text-sm transition shadow-2xs" />
              </div>
            </div>
          </div>

          <!-- Cascading State and Location Dropdowns -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">State</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors">
                  <Loader2 v-if="fetchingLocations" class="w-4 h-4 animate-spin" />
                  <MapPin v-else class="w-4 h-4" />
                </span>
                <select 
                  v-model="selectedState" 
                  required 
                  :disabled="fetchingLocations || uniqueStates.length === 0"
                  class="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-bold text-base sm:text-sm appearance-none cursor-pointer shadow-2xs disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>{{ fetchingLocations ? 'Loading...' : 'Select State' }}</option>
                  <option v-for="state in uniqueStates" :key="state" :value="state">
                    {{ state }}
                  </option>
                </select>
                <span class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 text-xs">▼</span>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Location Hub</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors">
                  <MapPin class="w-4 h-4" />
                </span>
                <select 
                  v-model="form.base_location" 
                  required 
                  :disabled="!selectedState || filteredLocations.length === 0"
                  class="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-bold text-base sm:text-sm appearance-none cursor-pointer shadow-2xs disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>{{ !selectedState ? 'Select state first' : 'Select area' }}</option>
                  <option v-for="loc in filteredLocations" :key="loc.id" :value="loc.id">
                    {{ loc.name }}
                  </option>
                </select>
                <span class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 text-xs">▼</span>
              </div>
            </div>
          </div>

          <!-- Referral Code Field -->
          <div class="space-y-1.5">
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Referral Code (Optional)</label>
            <div class="relative group">
              <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Sparkles class="w-4 h-4" /></span>
              <input v-model="form.referral_code" type="text" placeholder="e.g., AIKA-X7Y8Z9" class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-base sm:text-sm transition shadow-2xs uppercase" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-200">
            <div class="space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Access Password</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Lock class="w-4 h-4" /></span>
                
                <input 
                  v-model="form.password" 
                  :type="showPassword ? 'text' : 'password'" 
                  placeholder="Min 8 characters" 
                  required 
                  class="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-base sm:text-sm transition shadow-2xs" 
                />
                
                <button 
                  @click="showPassword = !showPassword" 
                  type="button" 
                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#0A1128] transition border-0 bg-transparent cursor-pointer focus:outline-none"
                >
                  <EyeOff v-if="showPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div class="space-y-1.5">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Confirm Password</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><ShieldCheck class="w-4 h-4" /></span>
                
                <input 
                  v-model="form.confirm_password" 
                  :type="showConfirmPassword ? 'text' : 'password'" 
                  placeholder="Re-type password" 
                  required 
                  class="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-base sm:text-sm transition shadow-2xs" 
                />
                
                <button 
                  @click="showConfirmPassword = !showConfirmPassword" 
                  type="button" 
                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#0A1128] transition border-0 bg-transparent cursor-pointer focus:outline-none"
                >
                  <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-start pt-2">
            <input v-model="form.terms" type="checkbox" id="terms" required class="w-4 h-4 rounded border-gray-300 text-[#0A1128] focus:ring-0 cursor-pointer accent-[#0A1128]" />
            <label for="terms" class="ml-2.5 text-xs font-bold text-gray-500 select-none cursor-pointer leading-relaxed tracking-tight">
              I certify that my profile inputs are valid, and I agree to the <NuxtLink to="/terms" class="text-[#0A1128] font-black hover:underline">Terms of Service</NuxtLink> and tracking policies.
            </label>
          </div>

          <div v-if="errorText" class="text-xs font-black text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-200 flex items-center space-x-2.5 shadow-sm">
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-500" />
            <span>{{ errorText }}</span>
          </div>

          <button type="submit" :disabled="isSubmitting" class="w-full bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black py-4 rounded-2xl shadow-lg transition-all transform active:scale-95 mt-4 flex items-center justify-center space-x-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer border-0 outline-none text-xs sm:text-sm uppercase tracking-wider">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <template v-else>
              <span>Create Account</span>
              <ArrowRight class="w-4 h-4 stroke-[3]" />
            </template>
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-dashed border-gray-200 text-center text-xs text-gray-500 font-bold tracking-tight">
          Already registered? <NuxtLink to="/auth/login" class="text-[#0A1128] font-black hover:underline ml-1">Login</NuxtLink>
        </div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-center text-xs text-gray-400 font-medium tracking-tight">
          Are you a business owner? <NuxtLink to="/merchant/register" class="text-[#0A1128] font-black hover:underline ml-1">Register as a Merchant</NuxtLink>
        </div>
        
      </div>
    </main>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>