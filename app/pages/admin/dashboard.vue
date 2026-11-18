<!-- pages/admin/index.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Loader2, RefreshCw, ShoppingBag, Users, Store, Bike, TrendingUp, BellRing, CheckCircle2 } from '@lucide/vue'
import { useAdminSocket } from '~/composables/useAdminSocket'
import { useCookie, useRuntimeConfig } from '#app'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const dashboardStats = ref<any>(null)
const chartTrends = ref<any>({ days_labels: [], days_revenue: [], days_volumes: [] })
const isLoading = ref(true)
const selectedTimeframe = ref<'days' | 'months'>('days')
const notification = ref<{ message: string; type: 'success' | 'error' | 'alert' } | null>(null)

const authToken = useCookie('auth_token')
const { newOrderAlertPayload, orderCompletedPayload } = useAdminSocket()

const showPopup = (message: string, type: 'success' | 'error' | 'alert' = 'success') => {
  notification.value = { message, type }
  setTimeout(() => {
    if (notification.value?.message === message) notification.value = null
  }, 5000)
}

const fetchDashboardStats = async () => {
  isLoading.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/dashboard-stats`, {
      method: 'GET',
      headers: { 
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    
    dashboardStats.value = res?.metrics || res
    chartTrends.value = res?.chart_trends || { days_labels: [], days_revenue: [], days_volumes: [] }
  } catch (err: any) {
    console.error("Failed to fetch admin stats", err)
    showPopup(err?.data?.detail || "Could not load system analytics.", 'error')
  } finally {
    isLoading.value = false
  }
}

// Chart Data bound directly to live backend database trends
const chartData = computed(() => {
  const isDays = selectedTimeframe.value === 'days'
  const trends = chartTrends.value || {}

  return {
    labels: isDays 
      ? (trends.days_labels?.length ? trends.days_labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) 
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Revenue (₦)',
        data: isDays 
          ? (trends.days_revenue?.length ? trends.days_revenue : [0, 0, 0, 0, 0, 0, 0]) 
          : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        borderColor: '#84cc16',
        backgroundColor: 'rgba(132, 204, 22, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        yAxisID: 'y'
      },
      {
        label: 'Engagement / Orders',
        data: isDays 
          ? (trends.days_volumes?.length ? trends.days_volumes : [0, 0, 0, 0, 0, 0, 0]) 
          : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        borderColor: '#0A1128',
        backgroundColor: 'rgba(10, 17, 40, 0.03)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
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
      grid: { color: 'rgba(0,0,0,0.03)' },
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

watch(newOrderAlertPayload, (payload) => {
  if (payload) {
    showPopup(payload.message || `New order received (#${payload.order_id})!`, 'alert')
    fetchDashboardStats()
  }
})

watch(orderCompletedPayload, (payload) => {
  if (payload) {
    showPopup(payload.message || `Order successfully completed (#${payload.order_reference})!`, 'success')
    fetchDashboardStats()
  }
})

onMounted(() => {
  fetchDashboardStats()
})
</script>

<template>
  <div class="max-w-7xl mx-auto py-6 px-4 font-sans text-[#0A1128] text-left space-y-6">
    <div v-if="isLoading" class="flex justify-center py-32">
      <Loader2 class="animate-spin text-[#84cc16] w-10 h-10" />
    </div>

    <div v-else class="space-y-6">
      
      <!-- Live Real-Time Popup Notification Banner -->
      <transition enter-active-class="transform transition duration-300 ease-out" enter-from-class="-translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="notification" 
             :class="{
               'bg-[#84cc16] text-slate-950 border border-lime-400': notification.type === 'success',
               'bg-rose-500 text-white border border-rose-600': notification.type === 'error',
               'bg-[#0A1128] text-[#D4F53C] border border-[#84cc16]/30': notification.type === 'alert'
             }"
             class="p-4 rounded-2xl shadow-lg flex items-center justify-between text-xs font-black uppercase tracking-wider">
          <div class="flex items-center gap-3">
            <BellRing v-if="notification.type === 'alert'" class="w-4 h-4 animate-bounce shrink-0" />
            <CheckCircle2 v-else class="w-4 h-4 shrink-0" />
            <span>{{ notification.message }}</span>
          </div>
          <button @click="notification = null" class="font-bold ml-4 hover:opacity-70 text-sm cursor-pointer">&times;</button>
        </div>
      </transition>

      <!-- STATS GRID CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
          <div class="flex items-center justify-between">
            <div class="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><ShoppingBag class="w-4 h-4" /></div>
            <span class="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">All Time</span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Orders Processed</p>
            <p class="text-2xl font-black text-[#0A1128] mt-1 font-mono">{{ dashboardStats?.total_orders || 0 }}</p>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
          <div class="flex items-center justify-between">
            <div class="bg-amber-50 p-2.5 rounded-xl text-amber-600"><Store class="w-4 h-4" /></div>
            <span class="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">Partners</span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Registered Merchants</p>
            <p class="text-2xl font-black text-[#0A1128] mt-1 font-mono">{{ dashboardStats?.total_merchants || 0 }}</p>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
          <div class="flex items-center justify-between">
            <div class="bg-lime-50 p-2.5 rounded-xl text-[#84cc16]"><Bike class="w-4 h-4" /></div>
            <span class="text-[9px] font-black uppercase tracking-wider text-lime-700 bg-lime-50 px-2.5 py-1 rounded-md">Logistics</span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Fleet Riders</p>
            <p class="text-2xl font-black text-[#0A1128] mt-1 font-mono">{{ dashboardStats?.total_riders || 0 }}</p>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
          <div class="flex items-center justify-between">
            <div class="bg-blue-50 p-2.5 rounded-xl text-blue-600"><Users class="w-4 h-4" /></div>
            <span class="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">Users</span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Registered Customers</p>
            <p class="text-2xl font-black text-[#0A1128] mt-1 font-mono">{{ dashboardStats?.total_customers || 0 }}</p>
          </div>
        </div>

      </div>

      <!-- ANALYTICS CHART SECTION -->
      <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 class="font-black text-xs uppercase tracking-wider text-[#0A1128] flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-[#84cc16]" /> Revenue & Engagement Matrix
            </h3>
            <p class="text-[11px] text-gray-400 mt-0.5 font-medium">Visualizing trends and platform velocity over periods</p>
          </div>

          <!-- Timeframe Selector Tabs -->
          <div class="bg-gray-100/80 p-1 rounded-xl border border-gray-200/60 flex items-center gap-1">
            <button 
              @click="selectedTimeframe = 'days'"
              :class="selectedTimeframe === 'days' ? 'bg-[#0A1128] text-white shadow-sm' : 'text-gray-500 hover:text-[#0A1128]'"
              class="px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer border-0 outline-none"
            >
              Days
            </button>
            <button 
              @click="selectedTimeframe = 'months'"
              :class="selectedTimeframe === 'months' ? 'bg-[#0A1128] text-white shadow-sm' : 'text-gray-500 hover:text-[#0A1128]'"
              class="px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer border-0 outline-none"
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

      <!-- OPERATIONAL METRICS ROW -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Pending Order Dispatches</p>
            <p class="text-3xl font-black text-amber-600 mt-2 font-mono">{{ dashboardStats?.pending_dispatches_count || 0 }}</p>
          </div>
          <p class="text-[11px] text-gray-500 font-medium pt-3 border-t border-gray-50">Orders awaiting rider allocation and assignment.</p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Online Available Riders</p>
            <p class="text-3xl font-black text-[#84cc16] mt-2 font-mono">{{ dashboardStats?.available_riders_count || 0 }}</p>
          </div>
          <p class="text-[11px] text-gray-500 font-medium pt-3 border-t border-gray-50">Active fleet operators online and ready for routes.</p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Completed Deliveries</p>
            <p class="text-3xl font-black text-emerald-600 mt-2 font-mono">{{ dashboardStats?.completed_deliveries_count || 0 }}</p>
          </div>
          <p class="text-[11px] text-gray-500 font-medium pt-3 border-t border-gray-50">Total successfully fulfilled waybills across the platform.</p>
        </div>

      </div>

    </div>
  </div>
</template>