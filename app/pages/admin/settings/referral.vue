<!-- pages/admin/settings/referral.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { 
  Gift, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  DollarSign,
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
  referral_order_threshold: 5000.00,
  referral_bonus_amount: 500.00
})

const fetching = ref(true)
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const fetchReferralSettings = async () => {
  fetching.value = true
  errorMessage.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/platform/referral`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    const data = res?.data || res
    if (data) {
      form.value = {
        referral_order_threshold: Number(data.referral_order_threshold) || 5000.00,
        referral_bonus_amount: Number(data.referral_bonus_amount) || 500.00
      }
    }
  } catch (err: any) {
    console.error("Failed to fetch referral settings", err)
    errorMessage.value = err?.data?.detail || "Failed to load referral configurations."
  } finally {
    fetching.value = false
  }
}

onMounted(() => {
  fetchReferralSettings()
})

const handleSaveSettings = async () => {
  saving.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    await $fetch(`${apiBase}/api/v1/admin/platform/referral`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: {
        referral_order_threshold: Number(form.value.referral_order_threshold),
        referral_bonus_amount: Number(form.value.referral_bonus_amount)
      }
    })

    successMessage.value = "Platform referral parameters updated successfully!"
  } catch (err: any) {
    console.error("Failed to update referral settings", err)
    errorMessage.value = err?.data?.detail || "Failed to update platform referral settings."
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
            <Gift :size="20" />
          </span>
          <h1 class="text-xl font-black text-gray-900 tracking-tight">Platform Referral Configuration</h1>
        </div>
        <p class="text-xs text-gray-500 font-medium">Manage global invitee spending thresholds and automated wallet bonus payouts.</p>
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
      <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading referral settings...</p>
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
        
        <!-- Referral Order Threshold Field -->
        <div class="space-y-2">
          <label class="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders :size="14" class="text-lime-600" /> Minimum Referral Order Spend Threshold (₦)
          </label>
          <p class="text-[11px] text-gray-500 font-medium">
            Minimum cumulative or order amount required for an invitee's order to unlock the referral reward.
          </p>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold text-sm">₦</span>
            <input 
              v-model.number="form.referral_order_threshold"
              type="number"
              step="0.01"
              required
              class="w-full pl-9 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 transition"
              placeholder="5000.00"
            />
          </div>
        </div>

        <!-- Referral Bonus Amount Field -->
        <div class="space-y-2">
          <label class="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Gift :size="14" class="text-lime-600" /> Inviter Wallet Bonus Amount (₦)
          </label>
          <p class="text-[11px] text-gray-500 font-medium">
            Wallet reward bonus credited instantly to the inviter when the referral threshold condition is met.
          </p>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold text-sm">₦</span>
            <input 
              v-model.number="form.referral_bonus_amount"
              type="number"
              step="0.01"
              required
              class="w-full pl-9 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-lime-500 focus:bg-white focus:ring-4 focus:ring-lime-500/10 transition"
              placeholder="500.00"
            />
          </div>
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
            <span>{{ saving ? 'Saving Changes...' : 'Save Referral Configuration' }}</span>
          </button>
        </div>

      </form>
    </div>

  </div>
</template>