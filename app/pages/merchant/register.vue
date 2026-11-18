<!-- pages/merchant/register.vue -->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRuntimeConfig } from '#app'
import { 
  Building2, 
  Layers3, 
  MapPin, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  Loader2,
  Eye, 
  EyeOff,
  Store,
  CheckCircle2,
  Info,
  Sparkles,
  ArrowRight
} from '@lucide/vue'

definePageMeta({
  layout: false // Full screen layout matching the login and signup portals
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const router = useRouter()

// UI Control States
const isSubmitting = ref(false)
const fetchingLocations = ref(false)
const errorText = ref<string | null>(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Dynamic Location Data States
const allLocations = ref<any[]>([])
const uniqueStates = ref<string[]>([])
const filteredHubs = ref<any[]>([])
const selectedState = ref<string>('')

// Business Onboarding Model
const form = ref({
  company_name: '',
  first_name: '',
  last_name: '',
  business_category: '',
  ecommerce_sub_category: '',
  branches: '1',
  street_address: '',
  email: '',
  phone_number: '',
  base_location: null as number | null,
  has_business_registration: 'no',
  whatsapp_updates: true,
  password: '',
  confirm_password: '',
  terms: false
})

const isEcommerceNicheVisible = computed(() => form.value.business_category === 'e_commerce')

// Fetch active coverage areas from the database
const fetchLocations = async () => {
  fetchingLocations.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/locations`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    const locationsData = res?.data || res || []
    allLocations.value = locationsData
    
    // Extract unique state names
    uniqueStates.value = Array.from(
      new Set(locationsData.map((loc: any) => loc.state_name?.toString()).filter(Boolean))
    ).sort() as string[]
  } catch (err) {
    console.error("Failed to load locations", err)
    errorText.value = "Failed to load location hubs. Please refresh the page."
  } finally {
    fetchingLocations.value = false
  }
}

// Handle cascading state selection
const onStateSelected = (stateName: string) => {
  selectedState.value = stateName
  form.value.base_location = null // Reset hub ID when state changes
  
  if (stateName) {
    filteredHubs.value = allLocations.value
      .filter((loc: any) => loc.state_name === stateName)
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
  } else {
    filteredHubs.value = []
  }
}

onMounted(() => {
  fetchLocations()
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

  if (isEcommerceNicheVisible.value && !form.value.ecommerce_sub_category) {
    errorText.value = "Please select a specification category niche for your E-commerce storefront."
    return false
  }

  if (!form.value.terms) {
    errorText.value = "You must accept the terms and privacy policy to proceed."
    return false
  }

  return true
}

const handleMerchantOnboardingSubmit = async () => {
  if (!validateFormInputMetrics()) {
    await nextTick()
    return
  }

  isSubmitting.value = true

  const payload = {
    account_role: 'business',
    company_name: form.value.company_name,
    first_name: form.value.first_name,
    last_name: form.value.last_name,
    business_category: form.value.business_category,
    branches: form.value.branches,
    email: form.value.email,
    phone_number: form.value.phone_number,
    base_location: form.value.base_location, // Sends integer hub ID
    street_address: form.value.street_address,
    has_business_registration: form.value.has_business_registration,
    password: form.value.password,
    whatsapp_updates: form.value.whatsapp_updates,
    is_terms_accepted: form.value.terms,
    ...(form.value.business_category === 'e_commerce' ? {
      ecommerce_sub_category: form.value.ecommerce_sub_category
    } : {})
  }

  try {
    const response: any = await $fetch(`${apiBase}/api/v1/auth/register/business`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json'
      },
      body: payload
    })

    if (response.status === 'success') {
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
          Merchant Partner Portal
        </span>
        <h2 class="text-5xl font-black leading-tight tracking-tight">
          Scale your business<br />
          <span class="text-[#D4F53C]">on the Aika network.</span>
        </h2>
        <p class="text-gray-300 text-sm leading-relaxed max-w-md font-medium">
          Launch your digital storefront or restaurant menu, accept split payments, and automate local rider logistics.
        </p>

        <ul class="space-y-4 pt-4">
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Instant e-commerce or restaurant menu branching
          </li>
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Automated Paystack checkout &amp; settlement splits
          </li>
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Reliable dispatch rider assignment &amp; tracking
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
            Merchant Portal
          </span>
          <h1 class="text-3xl font-black text-[#0A1128] tracking-tight">
            Create Merchant Account
          </h1>
          <p class="text-xs sm:text-sm text-gray-500 font-medium">
            Fill out your establishment profile details below to scale your storefront with Aika.
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
        <form @submit.prevent="handleMerchantOnboardingSubmit" class="space-y-3.5" novalidate>
          
          <!-- Establishment Name -->
          <div class="space-y-1">
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Name of Establishment *</label>
            <div class="relative group">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-[#0A1128] transition-colors"><Store class="w-4 h-4" /></span>
              <input v-model="form.company_name" type="text" placeholder="e.g. Opvine Kitchen &amp; Lounge" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
            </div>
          </div>

          <!-- Names Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">First Name *</label>
              <input v-model="form.first_name" type="text" placeholder="Oluwemi" required class="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Last Name *</label>
              <input v-model="form.last_name" type="text" placeholder="Tosin" required class="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
            </div>
          </div>

          <!-- Business Type & Branches Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Business Type *</label>
              <div class="relative">
                <select v-model="form.business_category" required class="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-bold text-xs appearance-none cursor-pointer shadow-2xs">
                  <option value="" disabled class="text-gray-400">Select business type</option>
                  <option value="restaurant">Restaurant / Food Vendor</option>
                  <option value="e_commerce">E-Commerce Retailer</option>
                  <option value="other">Other Commercial Business</option>
                </select>
                <span class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400 text-[10px]">▼</span>
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Branches *</label>
              <input v-model="form.branches" type="number" min="1" required class="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
            </div>
          </div>

          <!-- Conditional E-commerce Niche -->
          <div v-if="isEcommerceNicheVisible" class="space-y-1.5 p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200 animate-fade-in">
            <label class="block text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center space-x-2">
              <Layers3 class="w-4 h-4 text-emerald-600" />
              <span>Store Niche / Specialization *</span>
            </label>
            <div class="relative">
              <select v-model="form.ecommerce_sub_category" required class="w-full px-4 py-2.5 bg-white border border-emerald-300 rounded-xl outline-none focus:border-[#0A1128] text-[#0A1128] font-bold text-xs appearance-none cursor-pointer">
                <option value="" disabled class="text-gray-400">Select store focus niche</option>
                <option value="gadgets">Gadgets &amp; Tech</option>
                <option value="apparel">Clothing &amp; Apparel</option>
                <option value="appliances">Home Appliances</option>
                <option value="beauty">Beauty &amp; Cosmetics</option>
              </select>
              <span class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400 text-[10px]">▼</span>
            </div>
          </div>

          <!-- Email & Phone Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Business Email *</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><Mail class="w-4 h-4" /></span>
                <input v-model="form.email" type="email" placeholder="store@domain.com" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Mobile Phone Number *</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><Phone class="w-4 h-4" /></span>
                <input v-model="form.phone_number" type="tel" placeholder="+234 800 000 0000" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
              </div>
            </div>
          </div>

          <!-- Cascading State & Hub Dropdowns -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">State *</label>
              <div class="relative">
                <select 
                  v-model="selectedState" 
                  @change="onStateSelected(selectedState)"
                  required 
                  class="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-bold text-xs appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="" disabled class="text-gray-400">
                    {{ fetchingLocations ? 'Loading states...' : 'Select State' }}
                  </option>
                  <option v-for="state in uniqueStates" :key="state" :value="state">
                    {{ state }}
                  </option>
                </select>
                <span class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400 text-[10px]">▼</span>
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Hub Area *</label>
              <div class="relative">
                <select 
                  v-model="form.base_location" 
                  :disabled="!selectedState"
                  required 
                  class="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-bold text-xs appearance-none cursor-pointer shadow-2xs disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option :value="null" disabled class="text-gray-400">
                    {{ !selectedState ? 'Select state first' : 'Select Hub Area' }}
                  </option>
                  <option v-for="hub in filteredHubs" :key="hub.id" :value="hub.id">
                    {{ hub.name }}
                  </option>
                </select>
                <span class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400 text-[10px]">▼</span>
              </div>
            </div>
          </div>

          <!-- Street Address -->
          <div class="space-y-1">
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Street Address *</label>
            <div class="relative group">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><MapPin class="w-4 h-4" /></span>
              <input v-model="form.street_address" type="text" placeholder="Suite 4, Layout Road" required class="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
            </div>
          </div>

          <!-- Business Registration Radio -->
          <div class="space-y-1.5 pt-0.5">
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Do you have formal business registration? *</label>
            <div class="flex items-center space-x-6 bg-gray-50/80 p-3 rounded-2xl border border-gray-200">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input type="radio" v-model="form.has_business_registration" value="yes" class="w-4 h-4 text-[#0A1128] border-gray-300 focus:ring-0 cursor-pointer accent-[#0A1128]" />
                <span class="text-xs font-bold text-[#0A1128]">Yes (CAC Verified)</span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input type="radio" v-model="form.has_business_registration" value="no" class="w-4 h-4 text-[#0A1128] border-gray-300 focus:ring-0 cursor-pointer accent-[#0A1128]" />
                <span class="text-xs font-bold text-[#0A1128]">No (Independent Store)</span>
              </label>
            </div>
          </div>

          <!-- Password Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-dashed border-gray-200">
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Access Password *</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><Lock class="w-4 h-4" /></span>
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Min 8 characters" required class="w-full pl-10 pr-10 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
                <button @click="showPassword = !showPassword" type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#0A1128] bg-transparent border-0 cursor-pointer">
                  <EyeOff v-if="showPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Confirm Password *</label>
              <div class="relative group">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"><ShieldCheck class="w-4 h-4" /></span>
                <input v-model="form.confirm_password" :type="showConfirmPassword ? 'text' : 'password'" placeholder="Re-type password" required class="w-full pl-10 pr-10 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold text-xs transition shadow-2xs" />
                <button @click="showConfirmPassword = !showConfirmPassword" type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#0A1128] bg-transparent border-0 cursor-pointer">
                  <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Checkboxes -->
          <div class="space-y-2.5 pt-1">
            <label class="flex items-center space-x-2.5 cursor-pointer select-none">
              <input v-model="form.whatsapp_updates" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-[#0A1128] focus:ring-0 cursor-pointer accent-[#0A1128]" />
              <span class="text-[11px] font-bold text-gray-600">I'd like to receive rapid dispatch updates &amp; promos via WhatsApp 💚</span>
            </label>

            <label class="flex items-center space-x-2.5 cursor-pointer select-none">
              <input v-model="form.terms" type="checkbox" required class="w-4 h-4 rounded border-gray-300 text-[#0A1128] focus:ring-0 cursor-pointer accent-[#0A1128]" />
              <span class="text-[11px] font-bold text-gray-600">I agree to the <NuxtLink to="/privacy" class="text-[#0A1128] underline font-black">Privacy Policy</NuxtLink> and Terms of Service *</span>
            </label>
          </div>

          <!-- Submit Button -->
          <button type="submit" :disabled="isSubmitting" class="group w-full bg-[#0A1128] hover:bg-[#16224a] text-[#D4F53C] font-black py-3.5 rounded-2xl shadow-xl shadow-[#0A1128]/20 transition-all transform active:scale-98 mt-3 flex items-center justify-center space-x-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer border-0 outline-none text-xs uppercase tracking-wider">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin text-[#D4F53C]" />
            <template v-else>
              <span>Register Business Partner</span>
              <ArrowRight class="w-4 h-4 stroke-[3] transition-transform group-hover:translate-x-1" />
            </template>
          </button>
        </form>

        <div class="pt-4 border-t border-dashed border-gray-200 text-center text-xs text-gray-500 font-bold tracking-tight space-y-1.5">
          <div>
            Already have a merchant account? <NuxtLink to="/auth/login" class="text-[#0A1128] font-black hover:underline ml-1">Login</NuxtLink>
          </div>
          <div class="text-gray-400 font-medium text-[11px]">
            Looking for customer sign up? <NuxtLink to="/auth/register" class="text-[#0A1128] font-black hover:underline ml-1">Customer Portal</NuxtLink>
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
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>