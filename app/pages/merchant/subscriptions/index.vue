<!-- pages/merchant/billing/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { Layers, Check, CreditCard, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, Loader2, RefreshCw, ShoppingCart, Package } from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')

const loadingPlanId = ref<number | null>(null)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Reactive states for dashboard data, loading, and error handling
const dashboardData = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Selected billing interval key per grouped plan tier
const selectedIntervalByTier = ref<Record<string, string>>({})

const INTERVAL_ORDER = ['monthly', 'quarterly', 'semi_annual', 'annual']

const INTERVAL_META: Record<string, { label: string; tabLabel: string; suffix: string; days: number }> = {
  monthly: { label: 'Monthly (30 Days)', tabLabel: 'Monthly', suffix: '/ month', days: 30 },
  quarterly: { label: 'Quarterly (90 Days)', tabLabel: 'Quarterly', suffix: '/ quarter', days: 90 },
  semi_annual: { label: '6 Months (180 Days)', tabLabel: '6 Months', suffix: '/ 6 months', days: 180 },
  annual: { label: 'Annually (365 Days)', tabLabel: 'Annual', suffix: '/ year', days: 365 }
}

const getIntervalMeta = (plan: any) => {
  const key = String(plan?.billing_interval || 'monthly').trim().toLowerCase()
  const meta = INTERVAL_META[key] ?? INTERVAL_META.monthly!
  return {
    key,
    label: meta.label,
    tabLabel: meta.tabLabel,
    suffix: meta.suffix,
    days: Number(plan?.duration_days) || meta.days
  }
}

// Derive a shared group key so e.g. "basic-monthly" and "basic-quarterly" merge into one card
const getTierGroupKey = (plan: any): string => {
  const rawSlug = String(plan?.slug || '').trim().toLowerCase()
  if (rawSlug) {
    const stripped = rawSlug.replace(/-(monthly|quarterly|semi_annual|semi-annual|annual|yearly)(-\d+)?$/, '')
    if (stripped) return stripped
  }
  return String(plan?.name || 'tier').trim().toLowerCase().replace(/\s+/g, '-')
}

const groupedPlanCards = computed(() => {
  const plans = Array.isArray(dashboardData.value?.platform_plans)
    ? dashboardData.value.platform_plans
    : []

  const groupsMap = new Map<string, { tierKey: string; name: string; description: string; variants: any[] }>()

  for (const plan of plans) {
    const tierKey = getTierGroupKey(plan)
    if (!groupsMap.has(tierKey)) {
      groupsMap.set(tierKey, {
        tierKey,
        name: plan.name || 'Subscription Tier',
        description: plan.description || 'Enterprise grade infrastructure tier.',
        variants: []
      })
    }
    const group = groupsMap.get(tierKey)!
    group.variants.push(plan)
    if (!group.description && plan.description) {
      group.description = plan.description
    }
  }

  return Array.from(groupsMap.values()).map(group => {
    const sortedVariants = [...group.variants].sort((a, b) => {
      const aKey = String(a?.billing_interval || 'monthly').toLowerCase()
      const bKey = String(b?.billing_interval || 'monthly').toLowerCase()
      const aIdx = INTERVAL_ORDER.indexOf(aKey)
      const bIdx = INTERVAL_ORDER.indexOf(bKey)
      const rankA = aIdx === -1 ? INTERVAL_ORDER.length : aIdx
      const rankB = bIdx === -1 ? INTERVAL_ORDER.length : bIdx
      if (rankA !== rankB) return rankA - rankB
      return Number(a?.price || 0) - Number(b?.price || 0)
    })

    const activeIntervalKey = selectedIntervalByTier.value[group.tierKey]
    const activePlan =
      sortedVariants.find(v => String(v?.billing_interval || 'monthly').toLowerCase() === activeIntervalKey)
      ?? sortedVariants[0]!

    const activeIntervalMeta = getIntervalMeta(activePlan)

    return {
      tierKey: group.tierKey,
      name: group.name,
      description: group.description,
      variants: sortedVariants,
      activePlan,
      activeIntervalMeta
    }
  })
})

watch(
  () => dashboardData.value?.platform_plans,
  () => {
    const nextSelections: Record<string, string> = { ...selectedIntervalByTier.value }
    for (const card of groupedPlanCards.value) {
      const currentSelected = nextSelections[card.tierKey]
      const hasMatch = card.variants.some(
        v => String(v?.billing_interval || 'monthly').toLowerCase() === currentSelected
      )
      if (!currentSelected || !hasMatch) {
        const defaultPlan = card.variants[0]
        nextSelections[card.tierKey] = String(defaultPlan?.billing_interval || 'monthly').toLowerCase()
      }
    }
    selectedIntervalByTier.value = nextSelections
  },
  { immediate: true }
)

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

const handleSubscribe = async (planId: number) => {
  loadingPlanId.value = planId
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
            <span
              v-if="dashboardData?.current_plan?.billing_interval"
              class="ml-2 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 text-slate-700 align-middle"
            >
              {{ getIntervalMeta(dashboardData.current_plan).tabLabel }}
            </span>
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

      <!-- Subscription Pricing Plans Grid (Grouped by Tier with Billing Cycle Toggle) -->
      <div v-if="groupedPlanCards.length" class="space-y-6">
        <div class="space-y-1">
          <h3 class="text-lg font-black text-[#0A1128] tracking-tight">Available Subscription Tiers</h3>
          <p class="text-xs text-gray-500 font-medium">Toggle billing cycles on each tier and subscribe instantly using OPay.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="card in groupedPlanCards"
            :key="card.tierKey"
            class="bg-white border border-gray-100 rounded-3xl shadow-sm p-8 flex flex-col justify-between space-y-6 relative hover:shadow-md transition-all"
          >
            <div class="space-y-4">
              <div class="w-12 h-12 rounded-2xl bg-[#0A1128]/5 text-[#0A1128] flex items-center justify-center font-black">
                <Layers :size="24" />
              </div>

              <div>
                <h4 class="text-lg font-black text-[#0A1128] tracking-tight">{{ card.name }}</h4>
                <p class="text-xs text-gray-500 font-medium mt-1">{{ card.description }}</p>
              </div>

              <!-- Billing Interval Toggle Pills -->
              <div v-if="card.variants.length > 1" class="p-1 bg-gray-100/90 rounded-2xl flex flex-wrap gap-1">
                <button
                  v-for="variant in card.variants"
                  :key="variant.id"
                  type="button"
                  @click="selectedIntervalByTier[card.tierKey] = getIntervalMeta(variant).key"
                  :class="[
                    'flex-1 min-w-[68px] py-2 px-2.5 rounded-xl text-[11px] font-black transition-all cursor-pointer outline-none border-0',
                    card.activePlan?.id === variant.id
                      ? 'bg-[#0A1128] text-white shadow-xs'
                      : 'bg-transparent text-gray-600 hover:text-[#0A1128]'
                  ]"
                >
                  {{ getIntervalMeta(variant).tabLabel }}
                </button>
              </div>
              <div v-else class="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                {{ card.activeIntervalMeta.label }}
              </div>

              <!-- Dynamic Price for Selected Billing Interval -->
              <div class="py-3 border-y border-gray-100">
                <div class="flex items-baseline gap-1.5">
                  <span class="text-3xl font-black text-[#0A1128]">₦{{ Number(card.activePlan?.price || 0).toLocaleString() }}</span>
                  <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">{{ card.activeIntervalMeta.suffix }}</span>
                </div>
                <p class="text-[11px] text-gray-400 font-semibold mt-1">
                  {{ card.activeIntervalMeta.days }} days coverage per billing cycle
                </p>
              </div>

              <!-- Plan Quotas -->
              <div class="grid grid-cols-2 gap-2">
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div class="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <ShoppingCart :size="11" />
                    <span>Monthly Orders</span>
                  </div>
                  <p class="text-xs font-black text-[#0A1128] mt-0.5">
                    {{ card.activePlan?.max_monthly_orders ? Number(card.activePlan.max_monthly_orders).toLocaleString() : 'Unlimited' }}
                  </p>
                </div>

                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div class="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <Package :size="11" />
                    <span>Max Products</span>
                  </div>
                  <p class="text-xs font-black text-[#0A1128] mt-0.5">
                    {{ card.activePlan?.max_products ? Number(card.activePlan.max_products).toLocaleString() : 'Unlimited' }}
                  </p>
                </div>
              </div>

              <!-- Included Capabilities -->
              <div class="space-y-2.5">
                <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Included Capabilities</p>
                <div class="space-y-2">
                  <div
                    v-for="(feature, idx) in (card.activePlan?.features_raw || '').split(/[\n,]/).map((f: string) => f.trim()).filter(Boolean)"
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
                @click="handleSubscribe(card.activePlan.id)"
                :disabled="!card.activePlan || loadingPlanId === card.activePlan.id"
                class="w-full py-3.5 bg-[#0A1128] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md hover:bg-opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer outline-none border-0"
              >
                <Loader2 v-if="loadingPlanId === card.activePlan?.id" class="w-4 h-4 animate-spin text-white" />
                <span v-else class="flex items-center gap-2">
                  {{ Number(card.activePlan?.price || 0) <= 0 ? 'Activate Free Tier' : `Proceed with OPay · ${card.activeIntervalMeta.tabLabel}` }}
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
                  <td class="py-4 px-6 text-[#0A1128] font-bold">
                    {{ inv.plan?.name }}
                    <span
                      v-if="inv.plan?.billing_interval"
                      class="ml-1.5 px-2 py-0.5 text-[10px] font-black uppercase rounded bg-slate-100 text-slate-600"
                    >
                      {{ getIntervalMeta(inv.plan).tabLabel }}
                    </span>
                  </td>
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