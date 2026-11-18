<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader2, Wallet, Banknote, Building2, CheckCircle2, ShieldCheck, ArrowRight } from '@lucide/vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase // Automatically picks up from your .env file

definePageMeta({ layout: 'rider', middleware: 'auth' })

interface SettlementAccount {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
}

interface RiderProfileSettings {
  payout_schedule: 'daily' | 'weekly';
  payout_method: 'cash' | 'account';
  settlement_account?: SettlementAccount | null;
}

const isLoading = ref(true)
const isSaving = ref(false)
const notification = ref<{ message: string; type: 'success' | 'error' } | null>(null)

// Form state
const payoutSchedule = ref<'daily' | 'weekly'>('daily')
const payoutMethod = ref<'cash' | 'account'>('account')
const bankName = ref('')
const bankCode = ref('')
const accountNumber = ref('')
const accountName = ref('')
const isVerified = ref(false)

// Helper for banner popups
const showPopup = (message: string, type: 'success' | 'error' = 'success') => {
  notification.value = { message, type }
  setTimeout(() => {
    if (notification.value?.message === message) notification.value = null
  }, 4000)
}

// Fetch current rider payout settings & linked account
const fetchPreferences = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/rider/preferences`, {
      headers: { Authorization: `Bearer ${useCookie('auth_token').value}` }
    })
    
    if (res) {
      payoutSchedule.value = res.payout_schedule || 'daily'
      payoutMethod.value = res.payout_method || 'account'
      if (res.settlement_account) {
        bankName.value = res.settlement_account.bank_name || ''
        bankCode.value = res.settlement_account.bank_code || ''
        accountNumber.value = res.settlement_account.account_number || ''
        accountName.value = res.settlement_account.account_name || ''
        isVerified.value = res.settlement_account.is_verified || false
      }
    }
  } catch (err) {
    console.error("Failed to load payout configurations", err)
  } finally {
    isLoading.value = false
  }
}

// Submit preferences configuration
const savePreferences = async () => {
  isSaving.value = true
  try {
    const payload = {
      payout_schedule: payoutSchedule.value,
      payout_method: payoutMethod.value,
      bank_name: bankName.value,
      bank_code: bankCode.value,
      account_number: accountNumber.value,
      account_name: accountName.value
    }

    const res: any = await $fetch(`${apiBase}/api/v1/rider/preferences`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${useCookie('auth_token').value}` },
      body: payload
    })

    showPopup(res?.message || "Payout settings saved successfully!", 'success')
  } catch (err: any) {
    console.error("Failed to update preferences", err)
    showPopup(err?.data?.detail || "Could not save payout settings.", 'error')
  } finally {
    isSaving.value = false
  }
}

onMounted(fetchPreferences)
</script>

<template>
  <div class="max-w-xl mx-auto py-8 px-4 font-sans text-[#0A1128]">
    <div v-if="isLoading" class="flex justify-center py-20">
      <Loader2 class="animate-spin text-[#84cc16] w-8 h-8" />
    </div>

    <div v-else class="space-y-6">
      
      <!-- Popup Notification Banner -->
      <transition enter-active-class="transform transition duration-300 ease-out" enter-from-class="-translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="notification" 
             :class="notification.type === 'success' ? 'bg-[#84cc16] text-white' : 'bg-rose-500 text-white'"
             class="p-4 rounded-2xl shadow-lg flex items-center justify-between text-xs font-black uppercase tracking-wider">
          <span>{{ notification.message }}</span>
          <button @click="notification = null" class="text-white font-bold ml-2 hover:opacity-70">&times;</button>
        </div>
      </transition>

      <!-- Top Header Card -->
      <div class="flex items-center justify-between bg-[#0A1128] text-white p-6 rounded-[32px] shadow-xl">
        <div>
          <h2 class="text-xl font-black tracking-tight">Payout Settings</h2>
          <p class="text-[#D4F53C] text-xs font-bold mt-1">Configure schedule & receiving accounts</p>
        </div>
        <NuxtLink to="/rider/dashboard" class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition">
          Dashboard
        </NuxtLink>
      </div>

      <div class="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
        
        <!-- SECTION 1: Payout Schedule -->
        <div class="space-y-3">
          <label class="block font-black uppercase text-[10px] tracking-widest text-gray-400">Payout Schedule</label>
          <div class="grid grid-cols-2 gap-3">
            <button type="button" @click="payoutSchedule = 'daily'"
                    :class="payoutSchedule === 'daily' ? 'bg-[#0A1128] text-white shadow-lg' : 'bg-gray-50 text-gray-600 border border-gray-200'"
                    class="p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition flex flex-col items-center gap-1">
              <span>Daily Payout</span>
              <span :class="payoutSchedule === 'daily' ? 'text-[#D4F53C]' : 'text-gray-400'" class="text-[9px] font-bold">Fast Settlement</span>
            </button>
            <button type="button" @click="payoutSchedule = 'weekly'"
                    :class="payoutSchedule === 'weekly' ? 'bg-[#0A1128] text-white shadow-lg' : 'bg-gray-50 text-gray-600 border border-gray-200'"
                    class="p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition flex flex-col items-center gap-1">
              <span>Weekly Payout</span>
              <span :class="payoutSchedule === 'weekly' ? 'text-[#D4F53C]' : 'text-gray-400'" class="text-[9px] font-bold">Consolidated batch</span>
            </button>
          </div>
        </div>

        <!-- SECTION 2: Payout Method -->
        <div class="space-y-3">
          <label class="block font-black uppercase text-[10px] tracking-widest text-gray-400">Receiving Method</label>
          <div class="grid grid-cols-2 gap-3">
            <button type="button" @click="payoutMethod = 'account'"
                    :class="payoutMethod === 'account' ? 'bg-[#84cc16] text-white shadow-lg' : 'bg-gray-50 text-gray-600 border border-gray-200'"
                    class="p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2">
              <Building2 class="w-4 h-4" /> Bank Account
            </button>
            <button type="button" @click="payoutMethod = 'cash'"
                    :class="payoutMethod === 'cash' ? 'bg-[#84cc16] text-white shadow-lg' : 'bg-gray-50 text-gray-600 border border-gray-200'"
                    class="p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2">
              <Banknote class="w-4 h-4" /> Physical Cash
            </button>
          </div>
        </div>

        <!-- SECTION 3: Bank Account Fields (Visible if Method == Account) -->
        <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-150 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-150" leave-to-class="opacity-0">
          <div v-if="payoutMethod === 'account'" class="space-y-4 pt-4 border-t border-gray-100">
            <h3 class="font-black text-xs uppercase text-[#0A1128] tracking-widest flex items-center gap-2">
              <ShieldCheck class="w-4 h-4 text-[#84cc16]" /> Settlement Bank Account
            </h3>

            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1">Bank Name</label>
                <input v-model="bankName" type="text" placeholder="e.g. OPay, GTBank, Access Bank" 
                       class="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold text-[#0A1128] focus:outline-none focus:border-[#84cc16]" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1">Account Number</label>
                  <input v-model="accountNumber" maxlength="10" type="text" placeholder="0123456789" 
                         class="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-mono text-xs font-bold text-[#0A1128] focus:outline-none focus:border-[#84cc16]" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1">Routing Bank Code</label>
                  <input v-model="bankCode" type="text" placeholder="e.g. 044, 950" 
                         class="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-mono text-xs font-bold text-[#0A1128] focus:outline-none focus:border-[#84cc16]" />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1">Account Holder Name</label>
                <input v-model="accountName" type="text" placeholder="Verified name on account" 
                       class="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-bold uppercase text-[#0A1128] focus:outline-none focus:border-[#84cc16]" />
              </div>
            </div>
          </div>
        </transition>

        <!-- Save Preferences Action Button -->
        <div class="pt-2 space-y-3">
          <button @click="savePreferences" :disabled="isSaving"
                  class="w-full py-4 bg-[#0A1128] hover:bg-opacity-90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl transition flex items-center justify-center gap-2">
            <Loader2 v-if="isSaving" class="animate-spin w-4 h-4 text-white" />
            <span>{{ isSaving ? 'Saving Configurations...' : 'Save Payout Configurations' }}</span>
          </button>

          <!-- Back to Dashboard Action Button -->
          <NuxtLink to="/rider/dashboard" 
                    class="block w-full py-4 bg-gray-100 hover:bg-gray-200 text-[#0A1128] text-xs font-black uppercase tracking-widest text-center rounded-2xl transition">
            &larr; Back to Dashboard
          </NuxtLink>
        </div>

      </div>

    </div>
  </div>
</template>