<!-- pages/admin/subscriptions/index.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useCookie, useRuntimeConfig, navigateTo } from '#app'
import { Layers, Plus, AlertCircle, Check, Trash2, Edit3, RefreshCw, Loader2, Users, ShoppingCart, Package, Zap, Star, BarChart3 } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')
const router = useRouter()

const plans = ref<any[]>([])
const pending = ref<boolean>(true)
const error = ref<any>(null)
const deletingId = ref<number | null>(null)

const fetchSubscriptionPlans = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/subscription-plans`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    plans.value = res?.data || res || []
  } catch (err: any) {
    console.error("Subscription plans fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchSubscriptionPlans()
})

const navigateToCreate = () => {
  navigateTo('/admin/subscriptions/create')
}

const navigateToEdit = (id: number) => {
  navigateTo(`/admin/subscriptions/edit/${id}`)
}

const navigateToVendorSubscriptions = () => {
  navigateTo('/admin/subscriptions/vendors')
}

const deletePlan = async (id: number, name: string) => {
  if (!confirm(`Are you sure you want to delete the subscription tier "${name}"?`)) {
    return
  }

  deletingId.value = id
  try {
    await $fetch(`${apiBase}/api/v1/admin/subscription-plans/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authToken.value ? `Bearer ${authToken.value}` : ''
      }
    })
    plans.value = plans.value.filter(p => p.id !== id)
  } catch (err: any) {
    alert(err?.data?.detail || "Failed to delete subscription plan.")
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Subscription Tiers</h1>
          <p class="text-sm text-gray-500 font-medium">Manage pricing models, quantitative quotas, features, and active ecosystem service mesh tiers.</p>
        </div>

        <div class="flex items-center gap-3">
          <button 
            type="button"
            @click="navigateToVendorSubscriptions"
            class="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-xs hover:bg-gray-50 transition-all flex items-center gap-2 cursor-pointer outline-none"
          >
            <Users :size="16" class="text-indigo-600" />
            View Vendor Subscriptions
          </button>

          <button 
            type="button"
            @click="navigateToCreate"
            class="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer outline-none border-0"
          >
            <Plus :size="16" />
            Provision New Tier
          </button>

          <button 
            @click="fetchSubscriptionPlans" 
            :disabled="pending"
            type="button" 
            class="bg-white border border-gray-200 shadow-xs text-gray-700 text-xs font-bold p-2.5 rounded-xl transition flex items-center justify-center hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
            title="Refresh Subscription Tiers"
          >
            <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !plans.length" class="py-20 text-center space-y-3">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Synchronizing Subscription Mesh...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !plans.length" class="py-16 text-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-md mx-auto space-y-2">
        <div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="24" />
        </div>
        <p class="text-rose-600 font-black text-sm uppercase tracking-wider">Synchronization Failure</p>
        <p class="text-xs text-gray-400 font-semibold">
          {{ error?.data?.detail || error?.message || "Credential handshake rejected." }}
        </p>
      </div>

      <!-- Plans Grid Workspace -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div 
          v-for="plan in plans" 
          :key="plan.id" 
          class="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <!-- Availability Badge Tag -->
          <div class="absolute top-6 right-6">
            <span 
              :class="[
                'px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg',
                plan.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              ]"
            >
              {{ plan.is_available ? 'Active Tier' : 'Archived' }}
            </span>
          </div>

          <!-- Plan Info -->
          <div class="space-y-3 pr-16">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Layers :size="20" />
            </div>
            <div>
              <h3 class="text-base font-black text-gray-900 tracking-tight">{{ plan.name }}</h3>
              <p class="text-xs text-gray-500 font-medium line-clamp-2 mt-1">{{ plan.description || 'No description provided.' }}</p>
            </div>
          </div>

          <!-- Pricing Block -->
          <div class="py-4 border-y border-gray-100 flex items-center justify-between">
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-black text-gray-900">₦{{ Number(plan.price).toLocaleString() }}</span>
              <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">/ month</span>
            </div>
          </div>

          <!-- Quantitative Quotas Badges -->
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-0.5">
              <div class="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <ShoppingCart :size="12" />
                <span>Monthly Orders</span>
              </div>
              <p class="text-xs font-black text-gray-900">
                {{ plan.max_monthly_orders ? plan.max_monthly_orders.toLocaleString() : 'Unlimited' }}
              </p>
            </div>

            <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-0.5">
              <div class="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <Package :size="12" />
                <span>Max Products</span>
              </div>
              <p class="text-xs font-black text-gray-900">
                {{ plan.max_products ? plan.max_products.toLocaleString() : 'Unlimited' }}
              </p>
            </div>
          </div>

          <!-- Feature Perks Badges -->
          <div class="flex flex-wrap gap-1.5">
            <span v-if="plan.has_priority_dispatch" class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200">
              <Zap :size="10" /> Priority Dispatch
            </span>
            <span v-if="plan.has_featured_placement" class="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200">
              <Star :size="10" /> Featured
            </span>
            <span v-if="plan.has_advanced_analytics" class="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200">
              <BarChart3 :size="10" /> Analytics
            </span>
          </div>

          <!-- Features Breakdown -->
          <div class="space-y-2 flex-1 pt-1">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Mesh Capabilities</p>
            <div class="space-y-1.5">
              <div 
                v-for="(feature, idx) in plan.features_raw?.split(/[\n,]/).map((f: string) => f.trim()).filter(Boolean)" 
                :key="idx"
                class="flex items-start gap-2 text-xs font-semibold text-gray-700"
              >
                <Check :size="14" class="text-emerald-600 shrink-0 mt-0.5" />
                <span>{{ feature }}</span>
              </div>
            </div>
          </div>

          <!-- Action Footer -->
          <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span class="text-[11px] font-mono text-gray-400">slug: {{ plan.slug }}</span>
            <div class="flex items-center gap-2">
              <button 
                type="button"
                @click="navigateToEdit(plan.id)"
                class="p-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 rounded-xl transition-all cursor-pointer outline-none"
                title="Edit Plan"
              >
                <Edit3 :size="16" />
              </button>
              <button 
                type="button"
                @click="deletePlan(plan.id, plan.name)"
                :disabled="deletingId === plan.id"
                class="p-2 bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-600 rounded-xl transition-all cursor-pointer outline-none disabled:opacity-50"
                title="Delete Plan"
              >
                <Loader2 v-if="deletingId === plan.id" class="w-4 h-4 animate-spin text-rose-600" />
                <Trash2 v-else :size="16" />
              </button>
            </div>
          </div>

        </div>

        <!-- Empty State Matrix -->
        <div v-if="!plans?.length" class="col-span-full py-20 text-center bg-white border border-gray-100 rounded-2xl shadow-sm space-y-3">
          <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Layers :size="24" />
          </div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">No Subscription Tiers Deployed</p>
          <button 
            type="button"
            @click="navigateToCreate"
            class="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all cursor-pointer outline-none border-0"
          >
            Deploy First Tier
          </button>
        </div>

      </div>

    </div>
  </div>
</template>