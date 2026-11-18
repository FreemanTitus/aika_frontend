<!-- pages/merchant/billing/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { Layers, Check, CreditCard, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, Loader2, RefreshCw } from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')

const loadingPlanId = ref(null)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Reactive states for dashboard data, loading, and error handling
const dashboardData = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Fetch subscription dashboard state from Django Ninja API on mount with explicit headers
const fetchBillingDashboard = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/payment/billing`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    dashboardData.value = res?.data || res || {}
  } catch (err: any) {
    console.error("Billing dashboard fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchBillingDashboard()
})

const handleSubscribe = async (planId: number, planPrice: number) => {
  loadingPlanId.value = planId as any
  errorMessage.value = null
  successMessage.value = null

  try {
    const response: any = await $fetch(`${apiBase}/api/v1/payment/billing/initiate/${planId}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })

    if (response.success && response.checkout_url) {
      // Redirect merchant to OPay secure cashier checkout URL
      window.location.href = response.checkout_url
    } else if (response.success) {
      successMessage.value = response.message
      await fetchBillingDashboard()
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.detail || 'Failed to initialize payment gateway checkout session.'
  } finally {
    loadingPlanId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left">
    <div class="max-w-7xl mx-auto space-y-10">
      
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-black text-[#0A1128] tracking-tight">Subscription &amp; Billing Mesh</h1>
          <p class="text-xs text-gray-500 font-medium">Manage your active corporate licensing tiers and automated OPay settlement gateways.</p>
        </div>

        <button 
          @click="fetchBillingDashboard" 
          :disabled="pending"
          type="button" 
          class="bg-white border border-gray-200 shadow-2xs text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
        >
          <RefreshCw :class="{ 'animate-spin': pending }" class="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
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

      <!-- Loading State -->
      <div v-if="pending && !dashboardData" class="py-20 text-center space-y-3">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-[#0A1128]" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Synchronizing Billing Records...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !dashboardData" class="py-16 text-center bg-white border border-gray-100 rounded-3xl p-6 shadow-sm max-w-md mx-auto space-y-2">
        <div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="24" />
        </div>
        <p class="text-rose-600 font-black text-sm uppercase tracking-wider">Synchronization Failure</p>
        <p class="text-xs text-gray-400 font-semibold">
          {{ error?.data?.detail || error?.message || "Credential token handshake rejected." }}
        </p>
      </div>

      <!-- Active Status Banner -->
      <div v-if="dashboardData" class="bg-white border border-gray-100 rounded-3xl shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold" :class="dashboardData?.has_access ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
            <ShieldCheck :size="16" />
            {{ dashboardData?.has_access ? 'Active Enterprise License' : 'Subscription Required / Inactive' }}
          </div>
          <h2 class="text-xl font-black text-[#0A1128] tracking-tight">
            Current Tier: {{ dashboardData?.current_plan?.name || 'No Active Plan' }}
          </h2>
          <p class="text-xs text-gray-500 font-medium">
            {{ dashboardData?.next_billing_date ? `Access valid through: ${new Date(dashboardData.next_billing_date).toLocaleDateString()}` : 'Select a pricing tier below to provision your store features.' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-right">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Gateway Provider</p>
            <p class="text-xs font-bold text-[#0A1128] flex items-center gap-1.5 mt-0.5">
              <CreditCard :size="14" class="text-[#0A1128]" /> OPay Secure Checkout
            </p>
          </div>
        </div>
      </div>

      <!-- Subscription Pricing Plans Grid -->
      <div v-if="dashboardData?.platform_plans" class="space-y-6">
        <div class="space-y-1">
          <h3 class="text-lg font-black text-[#0A1128] tracking-tight">Available Subscription Tiers</h3>
          <p class="text-xs text-gray-500 font-medium">Upgrade or renew your store operating license instantly using OPay.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="plan in dashboardData?.platform_plans" 
            :key="plan.id"
            class="bg-white border border-gray-100 rounded-3xl shadow-sm p-8 flex flex-col justify-between space-y-6 relative hover:shadow-md transition-all"
          >
            <div class="space-y-4">
              <div class="w-12 h-12 rounded-2xl bg-[#0A1128]/5 text-[#0A1128] flex items-center justify-center font-black">
                <Layers :size="24" />
              </div>

              <div>
                <h4 class="text-lg font-black text-[#0A1128] tracking-tight">{{ plan.name }}</h4>
                <p class="text-xs text-gray-500 font-medium mt-1">{{ plan.description || 'Enterprise grade infrastructure tier.' }}</p>
              </div>

              <div class="py-3 border-y border-gray-100">
                <div class="flex items-baseline gap-1">
                  <span class="text-3xl font-black text-[#0A1128]">₦{{ Number(plan.price).toLocaleString() }}</span>
                  <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">/ month</span>
                </div>
              </div>

              <div class="space-y-2.5">
                <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Included Capabilities</p>
                <div class="space-y-2">
                  <div 
                    v-for="(feature, idx) in plan.features_raw.split(/[\n,]/).map((f: string) => f.trim()).filter(Boolean)" 
                    :key="idx"
                    class="flex items-start gap-2 text-xs font-semibold text-gray-700"
                  >
                    <Check :size="14" class="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{{ feature }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-100">
              <button 
                type="button"
                @click="handleSubscribe(plan.id, plan.price)"
                :disabled="loadingPlanId === plan.id"
                class="w-full py-3.5 bg-[#0A1128] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md hover:bg-opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer outline-none border-0"
              >
                <Loader2 v-if="loadingPlanId === plan.id" class="w-4 h-4 animate-spin text-white" />
                <span v-else class="flex items-center gap-2">
                  {{ plan.price <= 0 ? 'Activate Free Tier' : 'Proceed with OPay' }}
                  <ArrowRight :size="14" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoices Ledger History Table -->
      <div v-if="dashboardData?.invoices?.length" class="space-y-6 pt-6">
        <div class="space-y-1">
          <h3 class="text-lg font-black text-[#0A1128] tracking-tight">Billing &amp; Invoice Ledger</h3>
          <p class="text-xs text-gray-500 font-medium">Historical audit trail of all subscription payments processed.</p>
        </div>

        <div class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50/75 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th class="py-4 px-6">Reference ID</th>
                  <th class="py-4 px-6">Plan Tier</th>
                  <th class="py-4 px-6">Amount</th>
                  <th class="py-4 px-6">Payment Date</th>
                  <th class="py-4 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 text-xs font-semibold">
                <tr v-for="inv in dashboardData.invoices" :key="inv.id" class="hover:bg-gray-50/50 transition-colors">
                  <td class="py-4 px-6 font-mono text-gray-600">{{ inv.reference_id }}</td>
                  <td class="py-4 px-6 text-[#0A1128] font-bold">{{ inv.plan.name }}</td>
                  <td class="py-4 px-6 text-[#0A1128] font-black">₦{{ Number(inv.amount).toLocaleString() }}</td>
                  <td class="py-4 px-6 text-gray-500">{{ new Date(inv.payment_date).toLocaleString() }}</td>
                  <td class="py-4 px-6 text-right">
                    <span 
                      :class="[
                        'px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg',
                        inv.status === 'successful' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      ]"
                    >
                      {{ inv.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>