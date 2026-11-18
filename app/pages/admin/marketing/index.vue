<!-- pages/admin/marketing/index.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { Tag, Plus, RefreshCw, Loader2, CheckCircle2, AlertCircle, X } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const promos = ref<any[]>([])
const pending = ref<boolean>(true)
const isPromoModalOpen = ref(false)
const isSubmitting = ref(false)

// Custom Alert Modal State
const isAlertModalOpen = ref(false)
const alertModalTitle = ref('')
const alertModalMessage = ref('')
const alertModalType = ref<'success' | 'error'>('success')

const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
  alertModalTitle.value = title
  alertModalMessage.value = message
  alertModalType.value = type
  isAlertModalOpen.value = true
}

const promoForm = ref({ code: '', discount_type: 'percentage', value: 10, min_order_amount: 1000, usage_limit: 100, expires_at: '' })

const fetchPromos = async () => {
  pending.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/marketing/admin/promos`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true', Authorization: `Bearer ${authToken.value}` }
    })
    promos.value = res?.data || res || []
  } catch (err) {
    console.error("Failed to load promo codes", err)
  } finally {
    pending.value = false
  }
}

onMounted(fetchPromos)

const createPromo = async () => {
  if (!promoForm.value.code || !promoForm.value.expires_at) {
    showAlert("Validation Error", "Please fill in all required promo fields.", "error")
    return
  }
  isSubmitting.value = true
  try {
    await $fetch(`${apiBase}/api/v1/marketing/admin/promos/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: promoForm.value
    })
    isPromoModalOpen.value = false
    promoForm.value = { code: '', discount_type: 'percentage', value: 10, min_order_amount: 1000, usage_limit: 100, expires_at: '' }
    await fetchPromos()
    showAlert("Promo Created", "Discount coupon code has been generated successfully.", "success")
  } catch (err: any) {
    showAlert("Creation Failed", err?.data?.detail || "Failed to create promo code.", "error")
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left space-y-8">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Marketing &amp; Discounts Engine</h1>
          <p class="text-xs text-gray-500 font-medium mt-0.5">Manage and generate discount coupon codes for platform users.</p>
        </div>

        <div class="flex items-center gap-3">
          <button @click="isPromoModalOpen = true" class="px-4 py-2.5 bg-[#84cc16] text-[#0A1128] text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:bg-[#76b813] transition cursor-pointer flex items-center gap-2">
            <Tag :size="16" /> Create Promo Code
          </button>
        </div>
      </div>

      <!-- Promos Table Matrix -->
      <div class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 class="text-xs font-black text-gray-700 uppercase tracking-wider">Active Promo &amp; Discount Engine</h3>
          <span class="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-xl">Total Promos: {{ promos.length }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50/75 text-gray-400 uppercase text-[10px] font-black tracking-wider border-b border-gray-100">
                <th class="py-4 px-6">Coupon Code</th>
                <th class="py-4 px-6">Discount Type</th>
                <th class="py-4 px-6">Value</th>
                <th class="py-4 px-6">Min Order</th>
                <th class="py-4 px-6">Usage Count</th>
                <th class="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-semibold text-gray-700">
              <tr v-for="p in promos" :key="p.id" class="hover:bg-gray-50/50 transition">
                <td class="py-4 px-6 font-mono font-black text-indigo-600 text-sm tracking-wider">{{ p.code }}</td>
                <td class="py-4 px-6 uppercase text-[10px] font-black tracking-wider">{{ p.discount_type }}</td>
                <td class="py-4 px-6 font-mono font-black text-gray-900">{{ p.discount_type === 'percentage' ? p.value + '%' : '₦' + p.value.toLocaleString() }}</td>
                <td class="py-4 px-6 font-mono">₦{{ p.min_order_amount.toLocaleString() }}</td>
                <td class="py-4 px-6 font-mono">{{ p.times_used }} / {{ p.usage_limit }}</td>
                <td class="py-4 px-6">
                  <span :class="p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'" class="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border">
                    {{ p.is_active ? 'Active' : 'Expired/Inactive' }}
                  </span>
                </td>
              </tr>
              <tr v-if="promos.length === 0 && !pending">
                <td colspan="6" class="py-16 text-center text-gray-400 font-bold uppercase tracking-wider">
                  No promo codes created yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Create Promo Modal -->
    <Teleport to="body">
      <div v-if="isPromoModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <div class="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 text-left relative">
          <button type="button" @click="isPromoModalOpen = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition cursor-pointer border-0 bg-transparent"><X :size="20" /></button>
          <div>
            <h3 class="text-lg font-black text-gray-900 tracking-tight">Create Discount Coupon</h3>
            <p class="text-xs text-gray-500 font-medium mt-0.5">Configure promotional codes for user acquisition.</p>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Promo Code</label>
              <input v-model="promoForm.code" type="text" placeholder="e.g. AIKA50" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 uppercase outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Discount Type</label>
                <select v-model="promoForm.discount_type" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 outline-none">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (₦)</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Value</label>
                <input v-model.number="promoForm.value" type="number" placeholder="10" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 outline-none" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Min Order (₦)</label>
                <input v-model.number="promoForm.min_order_amount" type="number" placeholder="1000" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 outline-none" />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Usage Limit</label>
                <input v-model.number="promoForm.usage_limit" type="number" placeholder="100" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Expiration Date</label>
              <input v-model="promoForm.expires_at" type="datetime-local" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 outline-none" />
            </div>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button type="button" @click="isPromoModalOpen = false" class="flex-1 py-3 bg-gray-100 text-gray-700 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer">Cancel</button>
            <button type="button" @click="createPromo" :disabled="isSubmitting" class="flex-1 py-3 bg-[#84cc16] text-[#0A1128] font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2">
              <Loader2 v-if="isSubmitting" class="animate-spin h-3.5 w-3.5" /> Save Promo
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Custom Modal Alert Component -->
    <Teleport to="body">
      <div v-if="isAlertModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <div class="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-sm w-full p-6 sm:p-8 space-y-6 text-center relative">
          
          <div :class="alertModalType === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'" class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center">
            <CheckCircle2 v-if="alertModalType === 'success'" :size="28" />
            <AlertCircle v-else :size="28" />
          </div>

          <div class="space-y-1">
            <h3 class="text-base font-black text-gray-900 tracking-tight">{{ alertModalTitle }}</h3>
            <p class="text-xs text-gray-500 font-medium leading-relaxed">{{ alertModalMessage }}</p>
          </div>

          <button type="button" @click="isAlertModalOpen = false" class="w-full py-3 bg-[#0A1128] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer hover:bg-gray-900 transition">
            Dismiss
          </button>

        </div>
      </div>
    </Teleport>

  </div>
</template>