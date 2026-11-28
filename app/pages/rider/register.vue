<!-- pages/rider/register.vue -->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRuntimeConfig } from '#app'
import { 
  Bike, 
  Mail, 
  Phone, 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  User,
  Signature,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Briefcase,
  Camera
} from '@lucide/vue'

definePageMeta({ layout: 'default' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const router = useRouter()
const currentStep = ref(1)
const totalSteps = 4
const isSubmitting = ref(false)
const errorText = ref<string | null>(null)

// Cloudflare Turnstile States
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

  const container = document.getElementById('turnstile-widget')
  if (!container || container.innerHTML.trim() !== '') return

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

const cleanupTurnstile = () => {
  if (turnstileInterval) {
    clearInterval(turnstileInterval)
    turnstileInterval = null
  }
  captchaToken.value = ''
  if ((window as any).turnstile && widgetId.value !== null) {
    ;(window as any).turnstile.remove(widgetId.value)
    widgetId.value = null
  }
}

const resetTurnstile = () => {
  captchaToken.value = ''
  if ((window as any).turnstile && widgetId.value !== null) {
    ;(window as any).turnstile.reset(widgetId.value)
  }
}

// Render Turnstile whenever Step 4 mounts into the DOM, and remove it if user clicks Back
watch(currentStep, async (step) => {
  if (step === totalSteps) {
    await nextTick()
    if ((window as any).turnstile) {
      renderTurnstile()
    } else {
      turnstileInterval = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(turnstileInterval)
          renderTurnstile()
        }
      }, 200)
    }
  } else {
    cleanupTurnstile()
  }
})

// Dynamic Locations State
const availableLocations = ref<any[]>([])
const fetchingLocations = ref(false)
const selectedState = ref('')
const guarantorPassportPreview = ref<string | null>(null)

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  bike_plate_number: '',
  device_type: 'smartphone',
  employment_type: 'full_time',
  payout_schedule: 'daily',
  base_location: '' as number | '',
  street_address: '',
  id_type: 'nin',
  id_number: '',
  guarantor_name: '',
  guarantor_phone: '',
  guarantor_relationship: '',
  guarantor_address: '',
  guarantor_employment_status: 'employed',
  guarantor_occupation: '',
  guarantor_workplace_address: '',
  guarantor_passport_photograph: null as File | null,
  password: '',
  confirm_password: '',
  terms: false
})

// Extract a unique list of states from the fetched rider-eligible locations
const uniqueStates = computed(() => {
  const states = availableLocations.value.map(loc => loc.state_name).filter(Boolean)
  return [...new Set(states)].sort() as string[]
})

// Fetch rider-eligible coverage areas from the database
const fetchLocations = async () => {
  fetchingLocations.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/locations`, {
      method: 'GET',
      params: {
        role: 'rider',
        for_rider: true
      },
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    const rawLocations = res?.data || res || []
    availableLocations.value = Array.isArray(rawLocations)
      ? rawLocations.filter((loc: any) => loc?.allows_rider_registration !== false)
      : []

    const firstState = uniqueStates.value[0]
    if (firstState && !selectedState.value) {
      selectedState.value = firstState
    }
  } catch (err) {
    console.error("Failed to load locations", err)
  } finally {
    fetchingLocations.value = false
  }
}

onMounted(() => {
  fetchLocations()
})

onBeforeUnmount(() => {
  cleanupTurnstile()
  if (guarantorPassportPreview.value) {
    URL.revokeObjectURL(guarantorPassportPreview.value)
  }
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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

const clearGuarantorPassport = (input?: HTMLInputElement | null) => {
  if (guarantorPassportPreview.value) {
    URL.revokeObjectURL(guarantorPassportPreview.value)
    guarantorPassportPreview.value = null
  }
  if (input) {
    input.value = ''
  }
  form.value.guarantor_passport_photograph = null
}

const handleGuarantorPassportChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0] || null

  if (!file) {
    clearGuarantorPassport(target)
    return
  }

  const lowerName = file.name.toLowerCase()
  const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext))
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())

  if (!hasValidExt || !hasValidMime) {
    clearGuarantorPassport(target)
    errorText.value = "Only JPG, JPEG, PNG, or WEBP image files are allowed."
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    clearGuarantorPassport(target)
    errorText.value = "Guarantor passport photograph must be less than 5MB."
    return
  }

  if (guarantorPassportPreview.value) {
    URL.revokeObjectURL(guarantorPassportPreview.value)
  }

  errorText.value = null
  form.value.guarantor_passport_photograph = file
  guarantorPassportPreview.value = URL.createObjectURL(file)
}

const nextStep = () => {
  errorText.value = null
  if (currentStep.value === 1) {
    if (!form.value.first_name || !form.value.last_name || !form.value.email || !form.value.phone_number) {
      errorText.value = "Please fill in all personal details before proceeding."
      return
    }
  } else if (currentStep.value === 2) {
    if (!form.value.bike_plate_number || !selectedState.value || !form.value.base_location || !form.value.street_address) {
      errorText.value = "Please provide your bike plate, state, base location hub, and residential landmark."
      return
    }
  } else if (currentStep.value === 3) {
    if (
      !form.value.id_number ||
      !form.value.guarantor_name ||
      !form.value.guarantor_phone ||
      !form.value.guarantor_relationship ||
      !form.value.guarantor_address ||
      !form.value.guarantor_employment_status ||
      !form.value.guarantor_occupation ||
      !form.value.guarantor_workplace_address ||
      !form.value.guarantor_passport_photograph
    ) {
      errorText.value = "Please complete all identification, guarantor employment, workplace, and passport photo details."
      return
    }
  }
  currentStep.value++
}

const prevStep = () => {
  errorText.value = null
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleRiderRegistration = async () => {
  errorText.value = null
  
  if (form.value.password.length < 8) {
    errorText.value = "Password must be at least 8 characters long."
    return
  }

  if (form.value.password !== form.value.confirm_password) {
    errorText.value = "Passwords do not match."
    return
  }

  if (!form.value.base_location) {
    errorText.value = "Please select a valid operational base location hub."
    return
  }

  if (!form.value.terms) {
    errorText.value = "You must agree to the Terms of Service."
    return
  }

  if (!captchaToken.value) {
    errorText.value = "Please complete the security verification check before submitting."
    return
  }

  isSubmitting.value = true

  try {
    const fd = new FormData()
    fd.append('email', form.value.email.trim())
    fd.append('phone_number', form.value.phone_number.trim())
    fd.append('password', form.value.password)
    fd.append('base_location', String(form.value.base_location))
    fd.append('street_address', form.value.street_address.trim())
    fd.append('is_terms_accepted', String(form.value.terms))
    fd.append('account_role', 'rider')
    fd.append('first_name', form.value.first_name.trim())
    fd.append('last_name', form.value.last_name.trim())
    fd.append('bike_plate_number', form.value.bike_plate_number.trim().toUpperCase())
    fd.append('device_type', form.value.device_type)
    fd.append('employment_type', form.value.employment_type)
    fd.append('payout_schedule', form.value.payout_schedule)
    fd.append('id_type', form.value.id_type)
    fd.append('id_number', form.value.id_number.trim())
    fd.append('guarantor_name', form.value.guarantor_name.trim())
    fd.append('guarantor_phone', form.value.guarantor_phone.trim())
    fd.append('guarantor_relationship', form.value.guarantor_relationship.trim())
    fd.append('guarantor_address', form.value.guarantor_address.trim())
    fd.append('guarantor_employment_status', form.value.guarantor_employment_status)
    fd.append('guarantor_occupation', form.value.guarantor_occupation.trim())
    fd.append('guarantor_workplace_address', form.value.guarantor_workplace_address.trim())

    if (form.value.guarantor_passport_photograph) {
      fd.append('guarantor_passport_photograph', form.value.guarantor_passport_photograph)
    }

    await $fetch(`${apiBase}/api/v1/auth/register/rider`, {
      method: 'POST',
      headers: {
        'X-Captcha-Token': captchaToken.value
      },
      body: fd
    })
    router.push('/auth/login')
  } catch (err: any) {
    console.error(err?.data)
    const detail = err?.response?._data?.detail || err?.data?.detail
    if (Array.isArray(detail) && detail.length > 0) {
      errorText.value = detail[0]?.msg || "Validation failed. Please verify your entries."
    } else {
      errorText.value =
        detail ||
        err?.data?.message ||
        err?.response?._data?.message ||
        "Registration failed. Verify your details."
    }

    resetTurnstile()
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="w-full min-h-[90vh] flex flex-col justify-center bg-gradient-to-b from-gray-50/80 to-gray-100/50 py-12 px-4 sm:px-6 lg:px-8 text-left font-sans">
    <main class="max-w-xl w-full mx-auto">
      <div class="bg-white p-8 sm:p-12 rounded-[36px] shadow-2xl shadow-gray-200/50 border border-gray-100/80 relative overflow-hidden backdrop-blur-xl">
        
        <!-- Top Visual Header & Step Indicators -->
        <div class="text-center mb-10 space-y-4">
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="p-2.5 bg-lime-50 text-lime-600 rounded-2xl shadow-xs">
              <Bike :size="24" />
            </span>
          </div>

          <!-- Step Progression Dots -->
          <div class="flex items-center justify-center gap-3 py-1">
            <div 
              v-for="step in totalSteps" 
              :key="step"
              :class="[
                currentStep === step 
                  ? 'w-8 bg-lime-500 text-white font-black' 
                  : currentStep > step 
                    ? 'w-6 bg-lime-100 text-lime-700 font-bold' 
                    : 'w-6 bg-gray-100 text-gray-400 font-semibold'
              ]"
              class="h-6 rounded-full text-[11px] flex items-center justify-center transition-all duration-300"
            >
              <CheckCircle2 v-if="currentStep > step" :size="12" class="stroke-[3]" />
              <span v-else>{{ step }}</span>
            </div>
          </div>

          <div class="space-y-1">
            <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">
              {{ 
                currentStep === 1 ? 'Personal Information' : 
                currentStep === 2 ? 'Logistics & Tier Structure' : 
                currentStep === 3 ? 'KYC & Guarantor Security' : 'Account Credentials' 
              }}
            </h1>
            <p class="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto font-medium leading-relaxed">
              {{ 
                currentStep === 1 ? 'Enter your legal identification names and contact details.' : 
                currentStep === 2 ? 'Select your engagement model, transport info, and payout schedule.' : 
                currentStep === 3 ? 'Means of ID, guarantor employment, and passport photo required for accountability.' : 'Secure your portal access credentials.' 
              }}
            </p>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner">
            <div 
              class="bg-gradient-to-r from-lime-500 to-[#84cc16] h-full transition-all duration-500 ease-out rounded-full" 
              :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
            ></div>
          </div>
        </div>

        <form @submit.prevent="currentStep === totalSteps ? handleRiderRegistration() : nextStep()" class="space-y-6">
          
          <!-- STEP 1: PERSONAL INFORMATION -->
          <div v-if="currentStep === 1" class="space-y-4 animate-fade-in">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">First Name</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400"><User class="w-4 h-4" /></span>
                  <input v-model="form.first_name" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="John" />
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Last Name</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400"><Signature class="w-4 h-4" /></span>
                  <input v-model="form.last_name" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="Doe" />
                </div>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Email Address</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400"><Mail class="w-4 h-4" /></span>
                <input v-model="form.email" type="email" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="rider@domain.com" />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Phone Number</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400"><Phone class="w-4 h-4" /></span>
                <input v-model="form.phone_number" type="tel" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="08012345678" />
              </div>
            </div>
          </div>

          <!-- STEP 2: LOGISTICS, TIER STRUCTURE & LOCATION -->
          <div v-else-if="currentStep === 2" class="space-y-4 animate-fade-in">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Bike Plate Number</label>
                <input v-model="form.bike_plate_number" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm transition shadow-2xs font-mono" placeholder="e.g., KEF-442-AB" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Device Connectivity</label>
                <select v-model="form.device_type" class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm cursor-pointer shadow-2xs">
                  <option value="smartphone">Smartphone (Android/iOS)</option>
                  <option value="feature_phone">Feature Phone (SMS)</option>
                </select>
              </div>
            </div>

            <!-- Employment Tier Structure & Payout Schedule Selectors -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Employment Model</label>
                <select v-model="form.employment_type" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm cursor-pointer shadow-2xs">
                  <option value="full_time">Full-Time (Fixed ₦1,000 / Order)</option>
                  <option value="casual">Casual (Threshold Revenue Share)</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Payout Schedule</label>
                <select v-model="form.payout_schedule" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm cursor-pointer shadow-2xs">
                  <option value="daily">Daily Payout</option>
                  <option value="weekly">Weekly Payout</option>
                  <option value="monthly">Monthly Payout</option>
                </select>
              </div>
            </div>

            <!-- Cascading State & Base Location Hub Dropdowns -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">State</label>
                <div class="relative group">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-lime-600 transition-colors">
                    <Loader2 v-if="fetchingLocations" class="w-4 h-4 animate-spin" />
                    <MapPin v-else class="w-4 h-4" />
                  </span>
                  <select 
                    v-model="selectedState" 
                    required 
                    :disabled="fetchingLocations || uniqueStates.length === 0"
                    class="w-full pl-11 pr-10 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm appearance-none cursor-pointer shadow-2xs disabled:opacity-70 disabled:cursor-not-allowed"
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
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Base Location Hub</label>
                <div class="relative group">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-lime-600 transition-colors">
                    <MapPin class="w-4 h-4" />
                  </span>
                  <select 
                    v-model="form.base_location" 
                    required 
                    :disabled="!selectedState || filteredLocations.length === 0"
                    class="w-full pl-11 pr-10 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm appearance-none cursor-pointer shadow-2xs disabled:opacity-70 disabled:cursor-not-allowed"
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

            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Residential Landmark</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400"><MapPin class="w-4 h-4" /></span>
                <input v-model="form.street_address" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="e.g., Opposite Central Mosque" />
              </div>
            </div>
          </div>

          <!-- STEP 3: KYC & GUARANTOR DETAILS -->
          <div v-else-if="currentStep === 3" class="space-y-4 animate-fade-in">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">ID Type</label>
                <select v-model="form.id_type" class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm cursor-pointer shadow-2xs">
                  <option value="nin">National ID Number (NIN)</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="voters_card">Voter's Card</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">ID Number</label>
                <input v-model="form.id_number" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm transition shadow-2xs font-mono" placeholder="Enter ID number" />
              </div>
            </div>

            <div class="pt-2 border-t border-dashed border-gray-200">
              <p class="text-[11px] font-black text-[#0A1128] uppercase tracking-wider">Guarantor Verification &amp; Employment</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Guarantor Full Name</label>
                <input v-model="form.guarantor_name" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="Guarantor full name" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Guarantor Phone</label>
                <input v-model="form.guarantor_phone" required type="tel" class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="08000000000" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Relationship to Rider</label>
                <input v-model="form.guarantor_relationship" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="e.g., Uncle, Father, Employer" />
              </div>

              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Employment Status</label>
                <select v-model="form.guarantor_employment_status" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm cursor-pointer shadow-2xs">
                  <option value="employed">Employed (Salaried)</option>
                  <option value="self_employed">Self-Employed / Business Owner</option>
                  <option value="civil_servant">Civil Servant / Government Worker</option>
                  <option value="retired">Retired</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Nature of Work / Occupation</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400"><Briefcase class="w-4 h-4" /></span>
                <input v-model="form.guarantor_occupation" required class="w-full pl-11 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="e.g., Secondary School Teacher, Provisions Trader, Civil Engineer" />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Guarantor Workplace / Business Address</label>
              <input v-model="form.guarantor_workplace_address" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="Office, ministry, school, or shop address" />
            </div>

            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Guarantor Residential Address</label>
              <input v-model="form.guarantor_address" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="Home residential address of guarantor" />
            </div>

            <!-- Guarantor Passport Photograph Upload -->
            <div class="space-y-2">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Guarantor Passport Photograph</label>
              <div class="flex items-center gap-4 p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl">
                <div class="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    v-if="guarantorPassportPreview"
                    :src="guarantorPassportPreview"
                    alt="Guarantor Passport Preview"
                    class="w-full h-full object-cover"
                  />
                  <Camera v-else class="w-5 h-5 text-gray-400" />
                </div>

                <div class="flex-1 min-w-0 space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    @change="handleGuarantorPassportChange"
                    class="w-full text-xs font-semibold text-[#0A1128] file:mr-3 file:rounded-xl file:border-0 file:bg-lime-500 file:px-3.5 file:py-2 file:text-[11px] file:font-black file:text-[#0A1128] file:cursor-pointer cursor-pointer"
                  />
                  <p class="text-[11px] text-gray-400 font-medium truncate">
                    {{ form.guarantor_passport_photograph ? form.guarantor_passport_photograph.name : 'Clear face portrait (JPG/PNG, max 5MB)' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 4: CREDENTIALS & TERMS -->
          <div v-else-if="currentStep === totalSteps" class="space-y-4 animate-fade-in">
            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Password</label>
              <input v-model="form.password" type="password" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 shadow-2xs" placeholder="Min 8 characters" />
            </div>
            
            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Confirm Password</label>
              <input v-model="form.confirm_password" type="password" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 shadow-2xs" placeholder="Re-type password" />
            </div>

            <div class="flex items-start pt-3 px-1">
              <input type="checkbox" v-model="form.terms" required class="w-4 h-4 rounded-lg border-gray-300 text-lime-600 focus:ring-lime-500 cursor-pointer" />
              <label class="ml-3 text-xs font-bold text-gray-500 cursor-pointer leading-relaxed">
                I certify that my profile inputs and guarantor credentials are valid, and I agree to the <span class="text-lime-600 font-black underline">Terms of Service</span>.
              </label>
            </div>

            <!-- Cloudflare Turnstile Security Verification Widget -->
            <div class="pt-2 flex justify-center">
              <div id="turnstile-widget"></div>
            </div>
          </div>

          <!-- Error Message Banner -->
          <div v-if="errorText" class="text-xs font-black text-rose-600 bg-rose-50/80 p-4 rounded-2xl border border-rose-100 flex items-center space-x-2.5 animate-shake">
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-500" />
            <span>{{ errorText }}</span>
          </div>

          <!-- Action Navigation Buttons -->
          <div class="flex items-center gap-3 pt-4">
            <button 
              v-if="currentStep > 1" 
              type="button" 
              @click="prevStep" 
              class="w-1/3 bg-gray-100 hover:bg-gray-200/80 text-[#0A1128] font-black py-4 rounded-2xl transition cursor-pointer flex items-center justify-center space-x-2 text-xs uppercase tracking-wider outline-none border-0"
            >
              <ArrowLeft class="w-4 h-4 stroke-[3]" />
              <span>Back</span>
            </button>

            <button 
              type="submit" 
              :disabled="isSubmitting" 
              :class="currentStep > 1 ? 'w-2/3' : 'w-full'"
              class="bg-lime-500 hover:bg-lime-600 text-[#0A1128] font-black py-4 rounded-2xl shadow-lg shadow-lime-500/20 transition-all active:scale-98 flex items-center justify-center space-x-2 cursor-pointer text-xs uppercase tracking-wider outline-none border-0"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin text-[#0A1128]" />
              <template v-else>
                <span>{{ currentStep === totalSteps ? 'Complete Registration' : 'Continue' }}</span>
                <ArrowRight class="w-4 h-4 stroke-[3]" />
              </template>
            </button>
          </div>

        </form>
      </div>
    </main>
  </div>
</template>