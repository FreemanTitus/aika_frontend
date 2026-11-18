<!-- pages/signup.vue -->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute, useRuntimeConfig } from '#app'
import { 
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
  layout: false // Full screen layout matching the login portal
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const captchaToken = ref('')
const widgetId = ref<string | null>(null)
let turnstileInterval: any = null

useHead({
  script: [
    {
      src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      async: true,
      defer: true
    }
  ]
})

const renderTurnstile = () => {
  const turnstile = (window as any).turnstile
  const siteKey = config.public.turnstileSiteKey
  if (!turnstile || !siteKey) return

  // Prevent duplicate renders if component remounts
  const container = document.getElementById('turnstile-widget')
  if (container && container.innerHTML.trim() !== '') return

  widgetId.value = turnstile.render('#turnstile-widget', {
    sitekey: siteKey,
    theme: 'light',
    callback: (token: string) => {
      captchaToken.value = token
    },
    'expired-callback': () => {
      captchaToken.value = ''
    },
    'error-callback': () => {
      captchaToken.value = ''
    }
  })
}

const resetTurnstile = () => {
  captchaToken.value = ''
  if ((window as any).turnstile && widgetId.value !== null) {
    ;(window as any).turnstile.reset(widgetId.value)
  }
}

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

// Single onMounted hook: initialize Turnstile, referral query param, and locations
onMounted(() => {
  if (route.query.ref) {
    form.value.referral_code = String(route.query.ref).trim().toUpperCase()
  }
  fetchLocations()

  turnstileInterval = setInterval(() => {
    if ((window as any).turnstile) {
      clearInterval(turnstileInterval)
      renderTurnstile()
    }
  }, 200)
})

onBeforeUnmount(() => {
  if (turnstileInterval) clearInterval(turnstileInterval)
  if ((window as any).turnstile && widgetId.value !== null) {
    ;(window as any).turnstile.remove(widgetId.value)
  }
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
  return availableLocations.value
    .filter(loc => loc.state_name === selectedState.value)
    .sort((a, b) => a.name.localeCompare(b.name))
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

  if (!captchaToken.value) {
    errorText.value = "Please complete the security verification check before submitting."
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
        'Content-Type': 'application/json',
        'X-Captcha-Token': captchaToken.value
      },
      body: payload
    })

    if (response.status === 'success' || response.user_id) {
      router.push('/auth/login') 
    }
  } catch (err: any) {
    errorText.value =
      err?.data?.message ||
      err?.data?.detail ||
      err.response?._data?.message ||
      err.response?._data?.detail ||
      "Registration failed. Please check your details and try again."

    resetTurnstile()
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full grid lg:grid-cols-2 font-sans selection:bg-[#D4F53C] selection:text-[#0A1128]">

    <!-- ───────── Left Side: Full Colored Brand Panel ───────── -->
    <aside class="relative hidden lg:flex flex-col justify-between bg-[#0A1128] p-16 text-white overflow-hidden">
      <!-- Ambient Background Glows -->
      <div class="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#D4F53C]/10 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

      <div class="relative z-10">
        <NuxtLink to="/" class="inline-flex items-center space-x-2.5 group no-underline">
          <div class="w-28 flex items-center justify-center p-1">
            <img src="/images/logo_white.png" alt="Aika Logo" class="w-full h-full object-contain">
          </div>
        </NuxtLink>
      </div>

      <div class="relative z-10 space-y-6 my-auto py-12">
        <span class="inline-block bg-[#D4F53C] text-[#0A1128] font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          Customer Onboarding
        </span>
        <h2 class="text-5xl font-black leading-tight tracking-tight">
          Join the Aika<br />
          <span class="text-[#D4F53C]">marketplace network.</span>
        </h2>
        <p class="text-gray-300 text-sm leading-relaxed max-w-md font-medium">
          Order fresh meals and retail goods directly from verified local storefronts with rapid rider delivery.
        </p>

        <ul class="space-y-4 pt-4">
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Live multi-vendor catalog browsing
          </li>
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Secure checkout and instant tracking
          </li>
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Referral rewards &amp; loyalty discounts
          </li>
        </ul>
      </div>

      <p class="relative z-10 text-xs text-gray-400 font-medium">
        © {{ new Date().getFullYear() }} Aika. All rights reserved.
      </p>
    </aside>

    <!-- ───────── Right Side: Full White Form Panel ───────── -->
    <main class="flex flex-col justify-center items-center bg-white p-6 sm:p-12 lg:p-16 min-h-screen lg:min-h-0 overflow-y-auto max-h-screen lg:max-h-screen no-scrollbar">
      <div class="w-full max-w-md mx-auto space-y-6 my-auto py-6">
        
        <!-- Mobile brand mark -->
        <div class="lg:hidden flex items-center justify-center mb-4">
          <div class="w-32">
            <img src="/images/logo.png" alt="Aika Logo" class="w-full object-contain">
          </div>
        </div>

        <!-- Header -->
        <header class="text-center lg:text-left space-y-2">
          <span class="inline-block text-[10px] font-black uppercase tracking-[0.15em] text-[#0A1128] bg-[#D4F53C]/40 px-3.5 py-1 rounded-full">
            Customer Portal
          </span>
          <h1 class="text-3xl font-black text-[#0A1128] tracking-tight">
            Create an Account
          </h1>
          <p class="text-xs sm:text-sm text-gray-500 font-medium">
            Register an individual profile to start placing marketplace orders.
          </p>
        </header>

        <!-- Error banner -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0"
        >
          <div
            v-if="errorText"
            role="alert"
            class="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700"
          >
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-500 mt-px" />
            <span>{{ errorText }}</span>
          </div>
        </Transition>

        <!-- Form -->
        <form @submit.prevent="handleOnboardingSubmit" class="space-y-3.5" novalidate>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">First Name</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><UserCheck class="w-4 h-4" /></span>
                <input v-model="form.first_name" type="text" placeholder="John" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Last Name</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Signature class="w-4 h-4" /></span>
                <input v-model="form.last_name" type="text" placeholder="Doe" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Street Address / Landmark</label>
            <div class="relative group">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><MapPin class="w-4 h-4" /></span>
              <input v-model="form.street_address" type="text" placeholder="e.g., No 5, Opposite Central Mosque" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Email Address</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Mail class="w-4 h-4" /></span>
                <input v-model="form.email" type="email" placeholder="name@domain.com" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Mobile Line</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Phone class="w-4 h-4" /></span>
                <input v-model="form.phone_number" type="tel" placeholder="08012345678" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
              </div>
            </div>
          </div>

          <!-- Cascading State and Location Dropdowns -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">State</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors">
                  <Loader2 v-if="fetchingLocations" class="w-4 h-4 animate-spin" />
                  <MapPin v-else class="w-4 h-4" />
                </span>
                <select 
                  v-model="selectedState" 
                  required 
                  :disabled="fetchingLocations || uniqueStates.length === 0"
                  class="w-full pl-10 pr-8 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-bold text-xs appearance-none cursor-pointer shadow-2xs disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>{{ fetchingLocations ? 'Loading...' : 'Select State' }}</option>
                  <option v-for="state in uniqueStates" :key="state" :value="state">
                    {{ state }}
                  </option>
                </select>
                <span class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400 text-[10px]">▼</span>
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Location Hub</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors">
                  <MapPin class="w-4 h-4" />
                </span>
                <select 
                  v-model="form.base_location" 
                  required 
                  :disabled="!selectedState || filteredLocations.length === 0"
                  class="w-full pl-10 pr-8 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-bold text-xs appearance-none cursor-pointer shadow-2xs disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>{{ !selectedState ? 'Select state first' : 'Select area' }}</option>
                  <option v-for="loc in filteredLocations" :key="loc.id" :value="loc.id">
                    {{ loc.name }}
                  </option>
                </select>
                <span class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400 text-[10px]">▼</span>
              </div>
            </div>
          </div>

          <!-- Referral Code Field -->
          <div class="space-y-1">
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Referral Code (Optional)</label>
            <div class="relative group">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Sparkles class="w-4 h-4" /></span>
              <input v-model="form.referral_code" type="text" placeholder="e.g., AIKA-X7Y8Z9" class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs uppercase" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-dashed border-gray-200">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Access Password</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Lock class="w-4 h-4" /></span>
                <input 
                  v-model="form.password" 
                  :type="showPassword ? 'text' : 'password'" 
                  placeholder="Min 8 characters" 
                  required 
                  class="w-full pl-10 pr-10 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" 
                />
                <button 
                  @click="showPassword = !showPassword" 
                  type="button" 
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#0A1128] transition border-0 bg-transparent cursor-pointer focus:outline-none"
                >
                  <EyeOff v-if="showPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Confirm Password</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><ShieldCheck class="w-4 h-4" /></span>
                <input 
                  v-model="form.confirm_password" 
                  :type="showConfirmPassword ? 'text' : 'password'" 
                  placeholder="Re-type password" 
                  required 
                  class="w-full pl-10 pr-10 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" 
                />
                <button 
                  @click="showConfirmPassword = !showConfirmPassword" 
                  type="button" 
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#0A1128] transition border-0 bg-transparent cursor-pointer focus:outline-none"
                >
                  <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-start pt-1">
            <input v-model="form.terms" type="checkbox" id="terms" required class="w-4 h-4 rounded border-gray-300 text-[#0A1128] focus:ring-0 cursor-pointer accent-[#0A1128]" />
            <label for="terms" class="ml-2.5 text-[11px] font-bold text-gray-500 select-none cursor-pointer leading-tight tracking-tight">
              I certify inputs are valid, and agree to the <NuxtLink to="/terms" class="text-[#0A1128] font-black hover:underline">Terms of Service</NuxtLink> and tracking policies.
            </label>
          </div>

          <!-- Cloudflare Turnstile Security Verification Widget -->
          <div class="pt-2 flex justify-center">
            <div id="turnstile-widget"></div>
          </div>

          <button type="submit" :disabled="isSubmitting" class="group w-full bg-[#0A1128] hover:bg-[#16224a] text-[#D4F53C] font-black py-3.5 rounded-2xl shadow-xl shadow-[#0A1128]/20 transition-all transform active:scale-98 mt-3 flex items-center justify-center space-x-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer border-0 outline-none text-xs uppercase tracking-wider">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin text-[#D4F53C]" />
            <template v-else>
              <span>Create Account</span>
              <ArrowRight class="w-4 h-4 stroke-[3] transition-transform group-hover:translate-x-1" />
            </template>
          </button>
        </form>

        <div class="pt-4 border-t border-dashed border-gray-200 text-center text-xs text-gray-500 font-bold tracking-tight space-y-1.5">
          <div>
            Already registered? <NuxtLink to="/auth/login" class="text-[#0A1128] font-black hover:underline ml-1">Login</NuxtLink>
          </div>
          <div class="text-gray-400 font-medium text-[11px]">
            Are you a business owner? <NuxtLink to="/merchant/register" class="text-[#0A1128] font-black hover:underline ml-1">Register as a Merchant</NuxtLink>
          </div>
        </div>

      </div>
    </main>

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>