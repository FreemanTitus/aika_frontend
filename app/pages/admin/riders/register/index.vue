<!-- pages/admin/register-rider.vue -->
<script setup lang="ts">
import { ref } from 'vue'
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
  ShieldCheck,
  AlertCircle,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Briefcase
} from '@lucide/vue'

definePageMeta({ layout: 'default' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const router = useRouter()
const currentStep = ref(1)
const totalSteps = 4
const isSubmitting = ref(false)
const errorText = ref<string | null>(null)

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  bike_plate_number: '',
  device_type: 'smartphone',
  employment_type: 'full_time',
  payout_schedule: 'daily',
  base_location: '',
  street_address: '',
  id_type: 'nin',
  id_number: '',
  guarantor_name: '',
  guarantor_phone: '',
  guarantor_address: '',
  password: '',
  confirm_password: '',
  terms: false
})

const nextStep = () => {
  errorText.value = null
  if (currentStep.value === 1) {
    if (!form.value.first_name || !form.value.last_name || !form.value.email || !form.value.phone_number) {
      errorText.value = "Please fill in all personal details before proceeding."
      return
    }
  } else if (currentStep.value === 2) {
    if (!form.value.bike_plate_number || !form.value.base_location || !form.value.street_address) {
      errorText.value = "Please provide your bike plate, employment type, and location info."
      return
    }
  } else if (currentStep.value === 3) {
    if (!form.value.id_number || !form.value.guarantor_name || !form.value.guarantor_phone || !form.value.guarantor_address) {
      errorText.value = "Please fill in your identification and guarantor security details."
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
  
  if (form.value.password !== form.value.confirm_password) {
    errorText.value = "Passwords do not match."
    return
  }

  if (!form.value.terms) {
    errorText.value = "You must agree to the Terms of Service."
    return
  }

  isSubmitting.value = true

  try {
    await $fetch(`${apiBase}/api/v1/auth/register/rider`, {
      method: 'POST',
      body: {
        email: form.value.email,
        phone_number: form.value.phone_number,
        password: form.value.password,
        base_location: form.value.base_location,
        street_address: form.value.street_address,
        is_terms_accepted: form.value.terms,
        account_role: 'rider',
        first_name: form.value.first_name,
        last_name: form.value.last_name,
        bike_plate_number: form.value.bike_plate_number,
        device_type: form.value.device_type,
        employment_type: form.value.employment_type,
        payout_schedule: form.value.payout_schedule,
        id_type: form.value.id_type,
        id_number: form.value.id_number,
        guarantor_name: form.value.guarantor_name,
        guarantor_phone: form.value.guarantor_phone,
        guarantor_address: form.value.guarantor_address
      }
    })
    router.push('/auth/login')
  } catch (err: any) {
    console.error(err?.data)
    errorText.value = err?.data?.message || err?.data?.detail || "Registration failed. Verify your details."
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
                currentStep === 3 ? 'Means of ID and local guarantor details required for anti-theft accountability.' : 'Secure your portal access credentials.' 
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

            <!-- New Employment Tier Structure & Payout Schedule Selectors -->
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

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Base Location Hub</label>
                <select v-model="form.base_location" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-bold text-sm cursor-pointer shadow-2xs">
                  <option value="" disabled>Select Location</option>
                  <option value="akwanga">Akwanga</option>
                  <option value="keffi">Keffi</option>
                  <option value="lafia">Lafia</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Residential Landmark</label>
                <input v-model="form.street_address" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="e.g., Opposite Central Mosque" />
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

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Guarantor Name</label>
                <input v-model="form.guarantor_name" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="Guarantor full name" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Guarantor Phone</label>
                <input v-model="form.guarantor_phone" required type="tel" class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="08000000000" />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Guarantor Residential Address</label>
              <input v-model="form.guarantor_address" required class="w-full px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 text-[#0A1128] font-semibold text-sm transition shadow-2xs" placeholder="Full address of guarantor" />
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
              <input type="checkbox" v-model="form.terms" required class="w-4 h-4 mt-0.5 rounded-lg border-gray-300 text-lime-600 focus:ring-lime-500 cursor-pointer" />
              <label class="ml-3 text-xs font-bold text-gray-500 cursor-pointer leading-relaxed">
                I certify that my profile inputs and guarantor credentials are valid, and I agree to the <span class="text-lime-600 font-black underline">Terms of Service</span>.
              </label>
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