<!-- pages/admin/settings/delivery-economics.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { 
  Truck, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  DollarSign,
  Percent,
  Sliders
} from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')
const router = useRouter()

const form = ref({
  full_time_rider_earning: 1000.00,
  casual_platform_percentage: 20.00
})

const fetching = ref(true)
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const lastUpdated = ref<string | null>(null)

const fetchDeliveryConfig = async () => {
  fetching.value = true
  errorMessage.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/delivery/config`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    const data = res?.data || res
    if (data) {
      form.value = {
        full_time_rider_earning: Number(data.full_time_rider_earning) || 1000.00,
        casual_platform_percentage: Number(data.casual_platform_percentage) || 20.00
      }
      lastUpdated.value = data.updated_at || null
    }
  } catch (err: any) {
    console.error("Failed to fetch delivery configuration", err)
    errorMessage.value = err?.data?.detail || "Failed to load delivery configuration settings."
  } finally {
    fetching.value = false
  }
}

onMounted(() => {
  fetchDeliveryConfig()
})

const handleSaveSettings = async () => {
  saving.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/delivery/config`, {
      method: 'PUT',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: {
        full_time_rider_earning: Number(form.value.full_time_rider_earning),
        casual_platform_percentage: Number(form.value.casual_platform_percentage)
      }
    })
    
    const data = res?.data || res
    if (data) {
      form.value = {
        full_time_rider_earning: Number(data.full_time_rider_earning) || form.value.full_time_rider_earning,
        casual_platform_percentage: Number(data.casual_platform_percentage) || form.value.casual_platform_percentage
      }
      lastUpdated.value = data.updated_at || new Date().toISOString()
    }

    successMessage.value = "Delivery economics & pricing updated successfully!"
  } catch (err: any) {
    console.error("Failed to update delivery configuration", err)
    errorMessage.value = err?.data?.detail || "Failed to update delivery economics settings."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 space-y-8 font-sans text-left">
    
    <!-- Top Header Navigation -->
    <div class="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="p-2 bg-lime-50 text-lime-600 rounded-xl">
            <Truck :size="20" />
          </span>
          <h1 class="text-xl font-black text-gray-900 tracking-tight">Delivery Economics & Pricing</h1>
        </div>
        <p class="text-xs text-gray-500 font-medium">Manage global rider payouts for full-time staff and platform revenue cuts for casual couriers.</p>
      </div>

      <button 
        type="button"
        @click="router.back()"
        class="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-2xl transition flex items-center gap-2 cursor-pointer outline-none border border-gray-200"
      >
        <ArrowLeft :size="14" />
        <span>Back</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="fetching" class="py-24 text-center space-y-3 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <Loader2 class="w-8 h-8 animate-spin mx-auto text-lime-600" />
      <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading delivery settings...</p>
    </div>

    <!-- Form Content Container -->
    <div v-else class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
      
      <!-- Feedback Banners -->
      <div v-if="successMessage" class="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2.5 animate-fade-in">
        <CheckCircle2 :size="16" class="shrink-0 text-emerald-600" />
        <span>{{ successMessage }}</span>
      </div>

      <div v-if="errorMessage" class="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2.5 animate-fade-in">
        <AlertCircle :size="16" class="shrink-0 text-rose-600" />
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="handleSaveSettings" class="space-y-6">
        
        <!-- Full-Time Rider Fixed Payout Field -->
        <div class="space-y-2">
          <label class="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign :size="14" class="text-lime-600" /> Full-Time Rider Fixed Payout (₦)
          </label>
          <p class="text-[11px] text-gray-500 font-medium">
            Fixed amount paid out to full-time staff riders per completed delivery trip.
          </p>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold text-sm">₦</span>
            <input 
              v-model.number="form.full_time_rider_earning"
              type="number"
              step="0.01"
              required
              class="w-full pl-9 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 transition"
              placeholder="1000.00"
            />
          </div>
        </div>

        <!-- Casual Rider Platform Cut Percentage Field -->
        <div class="space-y-2">
          <label class="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Percent :size="14" class="text-lime-600" /> Casual Rider Platform Cut (%)
          </label>
          <p class="text-[11px] text-gray-500 font-medium">
            Percentage of the total delivery fee withheld by the platform as commission for casual/part-time riders.
          </p>
          <div class="relative">
            <input 
              v-model.number="form.casual_platform_percentage"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              class="w-full pl-4 pr-9 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 transition"
              placeholder="20.00"
            />
            <span class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 font-bold text-sm">%</span>
          </div>
        </div>

        <!-- Last Updated Notice -->
        <div v-if="lastUpdated" class="text-[11px] font-semibold text-gray-400 pt-1">
          Last synchronized: {{ new Date(lastUpdated).toLocaleString() }}
        </div>

        <!-- Submit Action Button -->
        <div class="pt-4 border-t border-gray-100 flex justify-end">
          <button 
            type="submit"
            :disabled="saving"
            class="px-6 py-4 bg-[#0A1128] hover:bg-indigo-900 text-[#D4F53C] rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer outline-none border-0 disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin text-[#D4F53C]" />
            <Save v-else :size="16" />
            <span>{{ saving ? 'Saving Changes...' : 'Save Delivery Configuration' }}</span>
          </button>
        </div>

      </form>
    </div>

  </div>
</template>