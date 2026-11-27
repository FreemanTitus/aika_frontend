<!-- pages/admin/subscriptions/edit/[id].vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from '#app'
import { AlertCircle, CheckCircle2, ArrowLeft, Layers, Loader2 } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')
const router = useRouter()
const route = useRoute()

const planId = route.params.id

const BILLING_INTERVALS = [
  { value: 'monthly', label: 'Monthly (30 Days)', shortLabel: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (90 Days)', shortLabel: 'Quarterly' },
  { value: 'semi_annual', label: '6 Months (180 Days)', shortLabel: '6-Month' },
  { value: 'annual', label: 'Annually (365 Days)', shortLabel: 'Annual' }
] as const

type BillingIntervalValue = (typeof BILLING_INTERVALS)[number]['value']

const normalizeBillingInterval = (raw: unknown): BillingIntervalValue => {
  const val = String(raw || 'monthly').trim().toLowerCase()
  const valid = BILLING_INTERVALS.some(item => item.value === val)
  return valid ? (val as BillingIntervalValue) : 'monthly'
}

const form = ref({
  name: '',
  billing_interval: 'monthly' as BillingIntervalValue,
  price: 0.00,
  description: '',
  features_raw: '',
  max_monthly_orders: null as number | string | null,
  max_products: null as number | string | null,
  has_priority_dispatch: false,
  has_featured_placement: false,
  has_advanced_analytics: false,
  is_available: true
})

const selectedIntervalMeta = computed(() => {
  return BILLING_INTERVALS.find(item => item.value === form.value.billing_interval) || BILLING_INTERVALS[0]
})

const fetching = ref(true)
const loading = ref(false)
const navigatingBack = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const fetchPlanDetails = async () => {
  fetching.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/subscription-plans`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: authToken.value ? `Bearer ${authToken.value}` : ''
      }
    })
    const plansList = res?.data || res || []
    const targetPlan = plansList.find((p: any) => String(p.id) === String(planId))

    if (targetPlan) {
      form.value = {
        name: targetPlan.name || '',
        billing_interval: normalizeBillingInterval(targetPlan.billing_interval),
        price: Number(targetPlan.price) || 0,
        description: targetPlan.description || '',
        features_raw: targetPlan.features_raw || '',
        max_monthly_orders: targetPlan.max_monthly_orders ?? null,
        max_products: targetPlan.max_products ?? null,
        has_priority_dispatch: targetPlan.has_priority_dispatch ?? false,
        has_featured_placement: targetPlan.has_featured_placement ?? false,
        has_advanced_analytics: targetPlan.has_advanced_analytics ?? false,
        is_available: targetPlan.is_available ?? true
      }
    } else {
      errorMessage.value = 'Subscription plan not found.'
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.detail || 'Failed to load subscription details.'
  } finally {
    fetching.value = false
  }
}

onMounted(() => {
  fetchPlanDetails()
})

const handleBack = () => {
  navigatingBack.value = true
  router.push('/admin/subscriptions')
}

const normalizeOptionalInt = (val: number | string | null): number | null => {
  if (val === '' || val === null || val === undefined || Number.isNaN(Number(val))) {
    return null
  }
  return Number(val)
}

const handleUpdatePlan = async () => {
  loading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const response: any = await $fetch(`${apiBase}/api/v1/admin/subscription-plans/${planId}`, {
      method: 'PUT',
      headers: {
        Authorization: authToken.value ? `Bearer ${authToken.value}` : '',
        'Content-Type': 'application/json'
      },
      body: {
        ...form.value,
        price: Number(form.value.price || 0),
        max_monthly_orders: normalizeOptionalInt(form.value.max_monthly_orders),
        max_products: normalizeOptionalInt(form.value.max_products)
      }
    })

    successMessage.value = `Subscription Plan "${response.name}" has been updated successfully!`
    setTimeout(() => {
      router.push('/admin/subscriptions')
    }, 1200)
  } catch (err: any) {
    errorMessage.value = err?.data?.detail || 'Failed to update subscription tier. Please verify your inputs.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left">
    <div class="max-w-3xl mx-auto space-y-8">

      <!-- Back Link -->
      <div>
        <button
          @click="handleBack"
          :disabled="navigatingBack"
          class="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer outline-none"
        >
          <div v-if="navigatingBack" class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <ArrowLeft v-else :size="16" />
          {{ navigatingBack ? 'Returning...' : 'Back to Subscriptions' }}
        </button>
      </div>

      <!-- Header Section -->
      <div class="space-y-1">
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">Edit Platform Tier</h1>
        <p class="text-sm text-gray-500 font-medium">Modify parameters, pricing structures, quantitative quotas, and capabilities for this service tier.</p>
      </div>

      <!-- Loading State -->
      <div v-if="fetching" class="py-20 text-center space-y-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading Tier Parameters...</p>
      </div>

      <template v-else>
        <!-- Feedback Alerts -->
        <div v-if="errorMessage" class="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
          <AlertCircle :size="20" class="shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 text-xs font-bold">
          <CheckCircle2 :size="20" class="shrink-0" />
          <span>{{ successMessage }}</span>
        </div>

        <!-- Edit Form Card -->
        <form @submit.prevent="handleUpdatePlan" class="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-6">

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Plan Name</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Billing Interval</label>
              <select
                v-model="form.billing_interval"
                class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
              >
                <option v-for="interval in BILLING_INTERVALS" :key="interval.value" :value="interval.value">
                  {{ interval.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Plan Price (₦) · {{ selectedIntervalMeta.shortLabel }}
              </label>
              <input
                v-model.number="form.price"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Description</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            ></textarea>
          </div>

          <!-- Quantitative Limits Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Max Monthly Orders</label>
              <p class="text-[10px] text-gray-400 font-medium mb-2">Leave blank or null for unlimited orders.</p>
              <input
                v-model.number="form.max_monthly_orders"
                type="number"
                min="0"
                placeholder="Unlimited"
                class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Max Active Products</label>
              <p class="text-[10px] text-gray-400 font-medium mb-2">Leave blank or null for unlimited catalog items.</p>
              <input
                v-model.number="form.max_products"
                type="number"
                min="0"
                placeholder="Unlimited"
                class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <!-- Feature Perks / Flags Toggles -->
          <div class="space-y-3 pt-4 border-t border-gray-100">
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">Advanced Feature Perks</label>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label class="flex items-center gap-2.5 p-3 bg-gray-50/60 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <input type="checkbox" v-model="form.has_priority_dispatch" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                <span class="text-xs font-bold text-gray-800">Priority Dispatch</span>
              </label>

              <label class="flex items-center gap-2.5 p-3 bg-gray-50/60 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <input type="checkbox" v-model="form.has_featured_placement" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                <span class="text-xs font-bold text-gray-800">Featured Placement</span>
              </label>

              <label class="flex items-center gap-2.5 p-3 bg-gray-50/60 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <input type="checkbox" v-model="form.has_advanced_analytics" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                <span class="text-xs font-bold text-gray-800">Advanced Analytics</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Features List (Newline or Comma separated)</label>
            <textarea
              v-model="form.features_raw"
              rows="4"
              required
              class="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            ></textarea>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              v-model="form.is_available"
              id="is_available"
              class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label for="is_available" class="text-xs font-bold text-gray-700 cursor-pointer">
              Make this tier immediately available for marketplace subscription purchases
            </label>
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button
              type="button"
              @click="handleBack"
              class="px-6 py-3 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-6 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer outline-none border-0"
            >
              <div v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <Layers v-else :size="16" />
              {{ loading ? 'Updating Tier...' : 'Save Changes' }}
            </button>
          </div>

        </form>
      </template>

    </div>
  </div>
</template>