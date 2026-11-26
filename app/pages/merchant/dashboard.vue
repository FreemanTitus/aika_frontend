<!-- pages/merchant/dashboard.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Plus,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Sparkles
} from '@lucide/vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

type OrderFilter = 'all' | 'pending' | 'completed' | 'cancelled'
const activeFilter = ref<OrderFilter>('all')
const selectedTimeframe = ref<'days' | 'months'>('days')

// Reactive states for merchant dashboard data, loading, and error handling
const dashboardPayload = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Fetch live metrics, recent orders, and dynamic chart trends with explicit headers
const fetchDashboardData = async () => {
  pending.value = true
  error.value = null

  const authToken = useCookie('auth_token')

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/merchant/dashboard/summary`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })

    const rawData = res?.data || res || {}
    dashboardPayload.value = {
      metrics: rawData.metrics || { total_revenue: 0, orders_count: 0, success_rate: 0, active_deliveries: 0 },
      orders: rawData.recent_orders || [],
      trends: rawData.chart_trends || { days_labels: [], days_revenue: [], days_volumes: [] },
      subscription: rawData.subscription || {
        has_valid_access: false,
        plan_name: 'No Active Plan',
        remaining_orders: 0,
        is_on_trial: false,
        trial_days_remaining: 0,
        trial_ends_at: null,
        access_reason: 'none'
      }
    }
  } catch (err: any) {
    console.error("Merchant dashboard resolution error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

// Trigger fetch immediately when component mounts on route change
onMounted(() => {
  fetchDashboardData()
})

const subStatus = computed(() => dashboardPayload.value?.subscription || {})
const isOnFreeTrial = computed(() => Boolean(subStatus.value?.is_on_trial))
const hasValidAccess = computed(() => Boolean(subStatus.value?.has_valid_access))
const trialDaysLeft = computed(() => Number(subStatus.value?.trial_days_remaining || 0))

const formattedTrialEndDate = computed(() => {
  const rawDate = subStatus.value?.trial_ends_at
  if (!rawDate) return null
  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
})

const filteredOrders = computed(() => {
  if (!dashboardPayload.value?.orders) return []
  if (activeFilter.value === 'all') return dashboardPayload.value.orders
  return dashboardPayload.value.orders.filter((order: any) => order.status === activeFilter.value)
})

// Dynamic Chart Data computed from live backend payload trends
const chartData = computed(() => {
  const isDays = selectedTimeframe.value === 'days'
  const trends = dashboardPayload.value?.trends || {}

  return {
    labels: isDays
      ? (trends.days_labels?.length ? trends.days_labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Store Revenue (₦)',
        data: isDays
          ? (trends.days_revenue?.length ? trends.days_revenue : [0, 0, 0, 0, 0, 0, 0])
          : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        borderColor: '#84cc16',
        backgroundColor: 'rgba(132, 204, 22, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Order Volume',
        data: isDays
          ? (trends.days_volumes?.length ? trends.days_volumes : [0, 0, 0, 0, 0, 0, 0])
          : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        borderColor: '#0A1128',
        backgroundColor: 'rgba(10, 17, 40, 0.05)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
  },
  scales: {
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: { display: true, text: 'Revenue (₦)' }
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'Order Count' }
    }
  }
}

const formatCurrency = (value: number) => "₦" + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const getStatusClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    case 'pending': case 'assigned': case 'in_transit': return 'bg-amber-50 text-amber-700 border-amber-100'
    case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-100'
    default: return 'bg-gray-50 text-gray-600 border-gray-100'
  }
}
</script>

<template>
  <div class="py-8 px-4 sm:px-6 lg:px-8 text-left">
    <div class="space-y-8">

      <!-- TOP LEVEL ACTIONS BAR -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">Merchant Hub</h1>
          <p class="text-sm text-gray-500 font-medium mt-1">Monitor store dispatch tracking arrays and earnings metrics.</p>
        </div>

        <div class="flex items-center space-x-3 shrink-0">
          <NuxtLink to="/merchant/subscriptions" class="bg-white hover:bg-gray-50 text-[#0A1128] border border-gray-200 font-black text-sm px-4 py-3 rounded-xl shadow-sm transition flex items-center space-x-2 cursor-pointer">
            <Layers class="w-4 h-4 text-indigo-600" />
            <span>{{ isOnFreeTrial ? 'Trial & Plans' : 'Subscription & Billing' }}</span>
          </NuxtLink>

          <NuxtLink to="/merchant/products/create" class="bg-[#D4F53C] hover:bg-opacity-90 text-[#0A1128] font-black text-sm px-4 py-3 rounded-xl shadow-sm transition flex items-center space-x-2 cursor-pointer">
            <Plus class="w-4 h-4 stroke-[3]" />
            <span>Add New Product</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Loader Shell Framework Overlay -->
      <div v-if="pending" class="py-24 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1128] mx-auto"></div>
        <p class="text-gray-400 text-sm mt-4 font-bold">Querying merchant ledger summaries...</p>
      </div>

      <!-- Error State Panel -->
      <div v-else-if="error" class="py-16 text-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-md mx-auto space-y-2">
        <p class="text-rose-600 font-black text-sm uppercase tracking-wider">Ledger Synchronization Failure</p>
        <p class="text-xs text-gray-400 font-semibold">{{ error.data?.detail || error.message || "Credential token handshake rejected." }}</p>
      </div>

      <!-- Metrics Panels & Table View -->
      <div v-else-if="dashboardPayload" class="space-y-8">

        <!-- FREE TRIAL / SUBSCRIPTION STATUS BANNER (FREE TRIAL PRIORITIZED FIRST) -->
        <div
          :class="
            isOnFreeTrial
              ? 'bg-gradient-to-r from-[#0A1128] to-[#1b2d5c] border-[#D4F53C]/50'
              : hasValidAccess
                ? 'bg-gradient-to-r from-emerald-900 to-emerald-800 border-emerald-700'
                : 'bg-gradient-to-r from-rose-900 to-[#0A1128] border-rose-700'
          "
          class="p-6 rounded-[24px] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border"
        >
          <div class="flex items-center space-x-4">
            <div
              :class="
                isOnFreeTrial
                  ? 'bg-[#D4F53C]/20 text-[#D4F53C]'
                  : hasValidAccess
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
              "
              class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            >
              <Sparkles v-if="isOnFreeTrial" class="w-6 h-6" />
              <ShieldCheck v-else-if="hasValidAccess" class="w-6 h-6" />
              <AlertTriangle v-else class="w-6 h-6" />
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  :class="
                    isOnFreeTrial
                      ? 'bg-[#D4F53C] text-[#0A1128]'
                      : hasValidAccess
                        ? 'bg-emerald-400/20 text-emerald-300'
                        : 'bg-rose-400/20 text-rose-300'
                  "
                  class="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md"
                >
                  {{
                    isOnFreeTrial
                      ? `7-Day Free Trial · ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Day' : 'Days'} Left`
                      : `Tier: ${subStatus?.plan_name || 'No Active Plan'}`
                  }}
                </span>
                <span v-if="isOnFreeTrial && formattedTrialEndDate" class="text-[11px] text-gray-300 font-semibold">
                  Ends {{ formattedTrialEndDate }}
                </span>
              </div>

              <h3 class="text-base font-black tracking-tight mt-1">
                <template v-if="isOnFreeTrial">
                  You’re on Your 7-Day Free Trial — Storefront &amp; Listings Active
                </template>
                <template v-else-if="hasValidAccess">
                  Subscription Active &amp; Operational
                </template>
                <template v-else-if="subStatus?.access_reason === 'trial_expired'">
                  Your 7-Day Free Trial Has Ended
                </template>
                <template v-else>
                  Subscription Required / Expired
                </template>
              </h3>

              <p class="text-xs text-gray-300 font-medium mt-0.5">
                <template v-if="isOnFreeTrial">
                  Enjoy full access during your 7-day trial window. Pick a subscription plan anytime before your trial ends so your store stays live without interruption.
                </template>
                <template v-else-if="hasValidAccess">
                  Remaining order capacity: {{ subStatus?.remaining_orders ?? 'Unlimited' }}
                </template>
                <template v-else-if="subStatus?.access_reason === 'trial_expired'">
                  Your 7-day free trial expired. Subscribe to a plan to keep your storefront visible, publish products, and receive orders.
                </template>
                <template v-else>
                  You cannot publish products or accept orders without an active subscription plan.
                </template>
              </p>
            </div>
          </div>

          <NuxtLink
            to="/merchant/subscriptions"
            :class="
              isOnFreeTrial || !hasValidAccess
                ? 'bg-[#D4F53C] text-[#0A1128] hover:bg-opacity-90'
                : 'bg-white text-emerald-900 hover:bg-emerald-50'
            "
            class="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <Sparkles class="w-4 h-4" />
            <span>
              {{
                isOnFreeTrial
                  ? 'Upgrade Before Trial Ends'
                  : hasValidAccess
                    ? 'Manage Plan'
                    : 'Subscribe / Renew Now'
              }}
            </span>
          </NuxtLink>
        </div>

        <!-- METRICS GRID CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
            <div class="space-y-1">
              <span class="text-xs font-black uppercase text-gray-400 tracking-wider block">Gross Revenue</span>
              <span class="text-2xl font-black text-[#0A1128] tracking-tight block font-mono">{{ formatCurrency(dashboardPayload.metrics.total_revenue) }}</span>
            </div>
            <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><DollarSign class="w-5 h-5" /></div>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
            <div class="space-y-1">
              <span class="text-xs font-black uppercase text-gray-400 tracking-wider block">Fulfillments</span>
              <span class="text-2xl font-black text-[#0A1128] tracking-tight block font-mono">{{ dashboardPayload.metrics.orders_count }} Vol</span>
            </div>
            <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><ShoppingBag class="w-5 h-5" /></div>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
            <div class="space-y-1">
              <span class="text-xs font-black uppercase text-gray-400 tracking-wider block">Fulfillment Rate</span>
              <span class="text-2xl font-black text-[#0A1128] tracking-tight block font-mono">{{ dashboardPayload.metrics.success_rate }}%</span>
            </div>
            <div class="w-12 h-12 bg-lime-50 text-[#84cc16] rounded-xl flex items-center justify-center"><TrendingUp class="w-5 h-5" /></div>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-left">
            <div class="space-y-1">
              <span class="text-xs font-black uppercase text-gray-400 tracking-wider block">Active Runs</span>
              <span class="text-2xl font-black text-[#0A1128] tracking-tight block font-mono">{{ dashboardPayload.metrics.active_deliveries }} Transits</span>
            </div>
            <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Clock class="w-5 h-5" /></div>
          </div>
        </div>

        <!-- ANALYTICS CHART SECTION -->
        <div class="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 class="font-black text-sm uppercase tracking-wider text-[#0A1128] flex items-center gap-2">
                <TrendingUp class="w-4 h-4 text-[#84cc16]" /> Revenue &amp; Store Performance Trends
              </h3>
              <p class="text-xs text-gray-400 mt-0.5">Visualizing sales breakdowns and order volumes over time periods</p>
            </div>

            <!-- Timeframe Selector Tabs -->
            <div class="bg-gray-50 p-1 rounded-2xl border border-gray-100 flex items-center gap-1">
              <button
                @click="selectedTimeframe = 'days'"
                :class="selectedTimeframe === 'days' ? 'bg-[#0A1128] text-white shadow-sm' : 'text-gray-500 hover:text-[#0A1128]'"
                class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border-0 outline-none"
              >
                Days
              </button>
              <button
                @click="selectedTimeframe = 'months'"
                :class="selectedTimeframe === 'months' ? 'bg-[#0A1128] text-white shadow-sm' : 'text-gray-500 hover:text-[#0A1128]'"
                class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border-0 outline-none"
              >
                Months
              </button>
            </div>
          </div>

          <!-- Render Chart Component -->
          <div class="h-80 w-full relative">
            <Line :data="chartData" :options="chartOptions" />
          </div>
        </div>

        <!-- LIVE RECENT DISPATCH TRADING LEDGER TABLE -->
        <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 class="text-lg font-black text-[#0A1128] tracking-tight">Recent Dispatch Logs</h2>
            <div class="flex items-center space-x-1 overflow-x-auto pb-1 no-scrollbar">
              <button v-for="status in ['all', 'pending', 'completed', 'cancelled'] as OrderFilter[]" :key="status" @click="activeFilter = status" :class="[activeFilter === status ? 'bg-[#0A1128] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100']" class="px-3.5 py-1.5 rounded-xl text-xs font-black capitalize transition cursor-pointer">{{ status }}</button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th class="py-4 px-6">Reference ID</th>
                  <th class="py-4 px-6">Recipient Customer</th>
                  <th class="py-4 px-6">Calculated Total</th>
                  <th class="py-4 px-6">Handshake Status</th>
                  <th class="py-4 px-6 text-right">Data Link</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 text-sm font-semibold text-gray-600">
                <tr v-for="order in filteredOrders" :key="order.id" class="hover:bg-gray-50/50 transition">
                  <td class="py-4 px-6 font-mono font-bold text-[#0A1128] text-xs">{{ order.order_reference }}</td>
                  <td class="py-4 px-6">
                    <div class="flex flex-col text-left">
                      <span class="font-black text-[#0A1128]">{{ order.customer_name }}</span>
                      <span class="text-xs text-gray-400 font-medium">{{ order.customer_phone }}</span>
                    </div>
                  </td>
                  <td class="py-4 px-6 font-black text-[#0A1128] font-mono">{{ formatCurrency(order.total_amount) }}</td>
                  <td class="py-4 px-6">
                    <span :class="getStatusClass(order.status)" class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border inline-block">{{ order.status }}</span>
                  </td>
                  <td class="py-4 px-6 text-right">
                    <NuxtLink :to="`/merchant/receipts/${order.id}`" class="text-gray-400 hover:text-[#0A1128] p-1 inline-block transition"><ArrowUpRight class="w-4 h-4" /></NuxtLink>
                  </td>
                </tr>
                <tr v-if="filteredOrders.length === 0">
                  <td colspan="5" class="text-center py-16 text-gray-400 text-xs font-bold uppercase tracking-wider">No order ledger traces match criteria.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>