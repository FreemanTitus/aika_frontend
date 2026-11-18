<!-- pages/rider/dashboard.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { Loader2, Star, Truck, MapPin, RefreshCw, Wallet, ShieldAlert, Settings, CheckCircle2, XCircle, Navigation, Power, Map } from '@lucide/vue'
import { useRiderSocket } from '~/composables/useRiderSocket'

definePageMeta({ layout: 'rider', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 })

const { isConnected, riderStatusPayload, walletUpdatePayload, newJobAlertPayload } = useRiderSocket()

interface DashboardData {
  rider_name: string;
  rating: number;
  status: string;
  is_vetted: boolean;
  base_location?: string | null;
  base_location_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  wallet?: {
    wallet_balance: number;
    total_deliveries: number;
  };
  active_deliveries: any[];
}

const dashboard = ref<DashboardData | null>(null)
const availableJobs = ref<any[]>([])
const selectedOrder = ref<any | null>(null)
const isLoading = ref(true)
const activeTab = ref<'active' | 'pool'>('active')
const isProcessing = ref(false)
const isAcceptingJob = ref(false)
const processingPickupIds = ref<Record<string, boolean>>({})

// Location Tracking Reactive States
const currentStatus = ref('offline')
const isTogglingLocation = ref(false)
const locationStatusText = ref('Acquiring satellite lock...')
let watchId: number | null = null

const isRiderOnline = computed(() => currentStatus.value === 'available')
const visibleAvailableJobs = computed(() => (isRiderOnline.value ? availableJobs.value : []))

// Popup Alert Modal State
const alertModal = ref<{ title: string; message: string; type: 'error' | 'success' } | null>(null)

const triggerAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
  alertModal.value = { title, message, type }
}

const stopBrowserGeolocation = () => {
  if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}

const updateLocationOnServer = async (lat: number, lng: number) => {
  try {
    await $fetch(`${apiBase}/api/v1/logistics/update-location`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: { latitude: lat, longitude: lng }
    })
    locationStatusText.value = 'GPS Active & Synced'
  } catch (err) {
    console.error("Failed to sync location", err)
    locationStatusText.value = 'Sync error'
  }
}

const fetchDashboard = async () => {
  try {
    const headers = { 
      'ngrok-skip-browser-warning': 'true',
      ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
    }

    const dash = await $fetch<DashboardData>(`${apiBase}/api/v1/rider/dashboard`, { headers })
    dashboard.value = dash
    currentStatus.value = dash?.status || 'offline'

    // Only fetch regional job pool when rider is online and vetted
    if (dash?.is_vetted !== false && dash?.status === 'available') {
      const pool: any = await $fetch(`${apiBase}/api/v1/rider/available-orders`, { headers })
      availableJobs.value = pool?.active_orders || []
    } else {
      availableJobs.value = []
      selectedOrder.value = null
    }

    // Check if location is already cached in the database. If so, DO NOT prompt the browser!
    if (dash?.latitude && dash?.longitude) {
      locationStatusText.value = dash?.status === 'available' ? 'Active (Using Cached GPS)' : 'Offline (GPS Cached)'
    } else if (dash?.status === 'available') {
      startBrowserGeolocation()
    } else {
      locationStatusText.value = 'Offline (Location Suspended)'
    }
  } catch (err) {
    console.error("Failed to load dashboard")
  } finally {
    isLoading.value = false
  }
}

const startBrowserGeolocation = () => {
  if (typeof navigator !== 'undefined' && navigator.geolocation && !watchId) {
    locationStatusText.value = 'Requesting browser GPS...'
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateLocationOnServer(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        console.warn("Geolocation access denied or unavailable", err)
        locationStatusText.value = 'GPS Permission Required'
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
  }
}

const toggleTransponderStatus = async () => {
  isTogglingLocation.value = true
  const nextStatus = currentStatus.value === 'offline' ? 'available' : 'offline'

  try {
    const endpoint = nextStatus === 'offline' ? '/api/v1/logistics/go-offline' : '/api/v1/rider/dashboard/status'
    const payload = nextStatus === 'offline' ? {} : { status: nextStatus }

    await $fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: payload
    })

    currentStatus.value = nextStatus
    if (dashboard.value) {
      dashboard.value.status = nextStatus
    }

    if (nextStatus === 'available') {
      startBrowserGeolocation()
      await fetchDashboard()
    } else {
      stopBrowserGeolocation()
      availableJobs.value = []
      selectedOrder.value = null
      locationStatusText.value = 'Offline (Location Suspended)'
    }
  } catch (err) {
    console.error("Failed to toggle status", err)
    triggerAlert("Status Error", "Could not update your online/offline status.")
  } finally {
    isTogglingLocation.value = false
  }
}

const resolveJobAcceptIdentifier = (job: any): string => {
  if (!job) return ''
  if (job.marketplace_id && job.marketplace_id !== 'N/A') {
    return String(job.marketplace_id)
  }
  return String(job.order_reference || job.id || '')
}

const acceptJob = async (job: any) => {
  const targetRef = resolveJobAcceptIdentifier(job)
  if (!targetRef || isAcceptingJob.value) return

  isAcceptingJob.value = true
  try {
    await $fetch(`${apiBase}/api/v1/rider/accept-order/${encodeURIComponent(targetRef)}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Authorization': `Bearer ${authToken.value}`
      }
    })
    selectedOrder.value = null
    activeTab.value = 'active'
    await fetchDashboard()
    triggerAlert("Success", "Order accepted successfully!", "success")
  } catch (err: any) {
    triggerAlert("Action Failed", err?.data?.detail || "Could not accept order.")
  } finally {
    isAcceptingJob.value = false
  }
}

const markAsPickedUp = async (orderIdentifier: string) => {
  if (!orderIdentifier) return
  processingPickupIds.value[orderIdentifier] = true

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/rider/order/pickup/${encodeURIComponent(orderIdentifier)}`, {
      method: 'POST',
      headers: { 
        'ngrok-skip-browser-warning': 'true',
        'Authorization': `Bearer ${authToken.value}` 
      }
    })
    await fetchDashboard()
    triggerAlert("Pickup Confirmed", res?.message || "Package marked as picked up.", "success")
  } catch (err: any) {
    triggerAlert("Pickup Failed", err?.data?.detail || err?.data?.message || "Could not mark order as picked up.")
  } finally {
    processingPickupIds.value[orderIdentifier] = false
  }
}

const markAsDelivered = async (orderIdentifier: string) => {
  if (!orderIdentifier) return
  isProcessing.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/rider/complete-delivery/${encodeURIComponent(orderIdentifier)}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Authorization': `Bearer ${authToken.value}`
      }
    })
    await fetchDashboard()
    triggerAlert("Delivery Complete", res?.message || "Order successfully marked as delivered.", "success")
  } catch (err: any) {
    triggerAlert("Update Failed", err?.data?.detail || "Could not complete delivery.")
  } finally {
    isProcessing.value = false
  }
}

// Watch for real-time status changes from admin
watch(riderStatusPayload, (newPayload: any) => {
  if (!newPayload) return
  if (newPayload.event === 'rider_status_change' && dashboard.value) {
    dashboard.value.status = newPayload.new_status
    currentStatus.value = newPayload.new_status
    if (newPayload.new_status !== 'available') {
      stopBrowserGeolocation()
      availableJobs.value = []
      selectedOrder.value = null
    } else {
      fetchDashboard()
    }
  }
})

// Watch for real-time wallet credits when customer completes an order
watch(walletUpdatePayload, (payload: any) => {
  if (!payload) return
  
  if (payload.new_balance !== undefined && dashboard.value) {
    if (!dashboard.value.wallet) {
      dashboard.value.wallet = { wallet_balance: 0, total_deliveries: 0 }
    }
    dashboard.value.wallet.wallet_balance = payload.new_balance
    dashboard.value.wallet.total_deliveries = (dashboard.value.wallet.total_deliveries || 0) + 1
    
    fetchDashboard()
    triggerAlert("Wallet Credited!", payload.message || "Order completed and wallet updated successfully.", "success")
  }
})

// Watch for real-time job availability updates when a merchant acknowledges an order
watch(newJobAlertPayload, (payload) => {
  if (!payload || !isRiderOnline.value) return
  fetchDashboard()
})

onMounted(fetchDashboard)
onBeforeUnmount(stopBrowserGeolocation)
</script>

<template>
  <div class="max-w-xl mx-auto py-8 px-4 font-sans text-[#0A1128] text-left">
    <div v-if="isLoading" class="flex justify-center py-20"><Loader2 class="animate-spin text-[#84cc16]" /></div>
    
    <div v-else class="space-y-6">
      
      <!-- VETTING STATUS BLOCKER -->
      <div v-if="dashboard?.is_vetted === false" class="bg-amber-50 border border-amber-200 p-6 rounded-[32px] shadow-sm text-center space-y-4">
        <div class="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-amber-700">
          <ShieldAlert class="w-6 h-6" />
        </div>
        <div>
          <h2 class="text-lg font-black text-[#0A1128]">Vetting in Progress</h2>
          <p class="text-xs font-bold text-amber-800 mt-1">Your account details and documents are currently under review. You must be fully vetted before you can accept jobs or view the active dispatch pool.</p>
        </div>
        <div class="pt-2">
          <NuxtLink to="/rider/preferences" class="inline-flex items-center gap-2 bg-[#0A1128] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg">
            <Settings class="w-4 h-4" /> Configure Payout Settings
          </NuxtLink>
        </div>
      </div>

      <!-- STANDARD ACTIVE RIDER DASHBOARD -->
      <template v-else-if="dashboard">
        <!-- Enhanced Profile, Rating & Wallet Header Card -->
        <div class="bg-[#0A1128] text-white p-6 rounded-[32px] shadow-xl space-y-6">
          
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-xl font-black tracking-tight">{{ dashboard.rider_name }}</h2>
              <div class="flex items-center gap-3 mt-1">
                <div class="flex items-center text-[#D4F53C] text-xs font-bold">
                  <Star class="w-3.5 h-3.5 fill-current mr-1" /> {{ dashboard.rating }} Rating
                </div>
                <span v-if="dashboard.base_location" class="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/10 text-emerald-300 px-2.5 py-0.5 rounded-full">
                  <MapPin class="w-3 h-3" /> {{ dashboard.base_location }} Hub
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <NuxtLink to="/rider/preferences" class="bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl text-white transition">
                <Settings class="w-4 h-4" />
              </NuxtLink>
            </div>
          </div>

          <!-- Rider Wallet Summary Widget -->
          <div class="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/10">
            <div class="flex items-center gap-3">
              <div class="bg-[#84cc16]/20 p-2.5 rounded-xl">
                <Wallet class="w-5 h-5 text-[#84cc16]" />
              </div>
              <div>
                <p class="text-[10px] uppercase font-bold text-gray-300 tracking-wider">Wallet Balance</p>
                <p class="text-xl font-black text-white font-mono">₦{{ Number(dashboard.wallet?.wallet_balance || 0).toLocaleString() }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-[10px] uppercase font-bold text-gray-300 tracking-wider">Completed Deliveries</p>
              <p class="text-base font-black text-[#D4F53C]">{{ dashboard.wallet?.total_deliveries || 0 }}</p>
            </div>
          </div>

        </div>

        <!-- Unified Live GPS Transponder Component with Smart Caching -->
        <div class="bg-white p-5 rounded-[24px] border shadow-sm flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div :class="currentStatus === 'available' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'" class="p-3 rounded-2xl transition">
              <Navigation :size="20" />
            </div>
            <div>
              <h4 class="text-xs font-black uppercase tracking-wider text-gray-400">Live Location</h4>
              <p class="text-sm font-black text-[#0A1128] mt-0.5">
                Status: <span class="text-xs font-semibold text-gray-600">{{ locationStatusText }}</span>
              </p>
            </div>
          </div>

          <button 
            type="button"
            @click="toggleTransponderStatus"
            :disabled="isTogglingLocation"
            :class="currentStatus === 'available' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'"
            class="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer border-0 outline-none disabled:opacity-50"
          >
            <Power :size="14" />
            <span>{{ currentStatus === 'available' ? 'Go Offline' : 'Go Online' }}</span>
          </button>
        </div>

        <!-- 3-Column Navigation Tabs (Deliveries, Pool, and Delivery Map) -->
        <div class="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-2xl">
          <button 
            @click="activeTab = 'active'" 
            :class="activeTab === 'active' ? 'bg-white shadow-sm text-[#0A1128]' : 'text-gray-500'" 
            class="py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border-0 outline-none bg-transparent"
          >
            Deliveries
          </button>
          
          <button 
            @click="activeTab = 'pool'" 
            :class="activeTab === 'pool' ? 'bg-white shadow-sm text-[#0A1128]' : 'text-gray-500'" 
            class="py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border-0 outline-none bg-transparent"
          >
            Pool ({{ visibleAvailableJobs.length }})
          </button>

          <NuxtLink 
            to="/rider/map" 
            class="py-2.5 bg-[#0A1128] text-[#D4F53C] hover:bg-opacity-90 font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm text-center no-underline"
          >
             Map View
          </NuxtLink>
        </div>

        <!-- Dynamic Task Pipeline -->
        <div class="space-y-4">
          <div class="flex justify-between items-center">
              <h3 class="font-black uppercase text-[10px] tracking-widest text-gray-400">
                {{ activeTab === 'active' ? 'Active Pipeline' : `Available Assignments${dashboard.base_location ? ` (${dashboard.base_location})` : ''}` }}
              </h3>
              <button @click="fetchDashboard" class="text-[#84cc16] p-1 cursor-pointer"><RefreshCw class="w-4 h-4" /></button>
          </div>

          <!-- VIEW 1: MY DELIVERIES -->
          <div v-if="activeTab === 'active'" class="space-y-4">
            <div v-if="!isRiderOnline && dashboard.active_deliveries.length === 0" 
                class="bg-amber-50 border p-6 rounded-[24px] text-center text-xs font-bold text-amber-800">
              You are offline. Go online to view your routes.
            </div>
            
            <div v-else-if="dashboard.active_deliveries.length === 0" 
                class="text-center py-10 text-gray-400 text-xs font-bold">
              No active deliveries.
            </div>

            <div v-for="task in dashboard.active_deliveries" :key="task.id" 
                class="bg-white p-5 rounded-[24px] border shadow-sm flex items-start gap-4">
              <div class="bg-[#84cc16]/10 p-3 rounded-xl">
                <Truck class="text-[#84cc16] w-5 h-5" />
              </div>
              <div class="flex-grow space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-md uppercase">
                    {{ task.status === 'in_transit' ? 'In Transit' : 'Processing / Ready for Pickup' }}
                  </span>
                </div>
                <p class="font-black text-sm text-[#0A1128] mt-1">{{ task.package_description || 'Store Marketplace Item Pickup' }}</p>
                
                <div class="text-xs font-bold text-gray-700 pt-1">
                  <p><span class="text-gray-400 uppercase text-[10px]">Receiver:</span> {{ task.receiver_name }}</p>
                  <p v-if="task.receiver_phone"><span class="text-gray-400 uppercase text-[10px]">Phone:</span> {{ task.receiver_phone }}</p>
                </div>

                <p class="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin class="w-3 h-3 flex-shrink-0" /> {{ task.delivery_address }}
                </p>
                
                <!-- Action Buttons -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  <button 
                    type="button"
                    @click="markAsPickedUp(task.marketplace_order_id || task.order_reference)" 
                    :disabled="processingPickupIds[task.marketplace_order_id || task.order_reference] || task.status === 'in_transit'"
                    :class="[
                      task.status === 'in_transit' 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none hover:bg-gray-200' 
                        : 'bg-[#0A1128] hover:bg-opacity-90 text-[#D4F53C] shadow-md'
                    ]"
                    class="py-2.5 disabled:opacity-50 text-[10px] font-black uppercase rounded-xl transition cursor-pointer border-0 outline-none"
                  >
                    {{ task.status === 'in_transit' ? 'Already Picked Up' : (processingPickupIds[task.marketplace_order_id || task.order_reference] ? 'Updating...' : 'Mark as Picked Up') }}
                  </button>

                  <button 
                    type="button"
                    @click="markAsDelivered(task.marketplace_order_id || task.order_reference)" 
                    :disabled="isProcessing"
                    class="py-2.5 bg-[#84cc16] hover:bg-[#77b713] disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl transition shadow-lg cursor-pointer border-0 outline-none"
                  >
                    {{ isProcessing ? 'Processing...' : 'Mark as Delivered' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- VIEW 2: JOB POOL -->
          <div v-else class="space-y-4">
            <div v-if="!isRiderOnline" class="bg-amber-50 border border-amber-200 p-6 rounded-[24px] text-center text-xs font-bold text-amber-800">
              You are currently offline. Go online to view and accept dispatch requests in your region.
            </div>
            <div v-else-if="visibleAvailableJobs.length === 0" class="text-center py-10 text-gray-400 text-xs font-bold">
              No available orders in your region right now.
            </div>
            <div v-else v-for="job in visibleAvailableJobs" :key="job.id" class="bg-white p-5 rounded-[24px] border shadow-sm flex justify-between items-center gap-3">
              <div class="min-w-0">
                <p class="font-black text-sm truncate">{{ job.package_description }}</p>
                <p class="text-[11px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                  <MapPin class="w-3 h-3 shrink-0 text-gray-400" /> {{ job.pickup_address }}
                </p>
                <p class="text-[10px] text-[#84cc16] font-black mt-1">PAYOUT: ₦{{ Number(job.delivery_fee || 1000).toLocaleString() }}</p>
              </div>
              <button type="button" @click="selectedOrder = job" class="shrink-0 bg-[#0A1128] text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-[#84cc16] transition cursor-pointer border-0 outline-none">Details</button>
            </div>
          </div>
        </div>
      </template>

    </div>

    <!-- Order Details Modal -->
    <div v-if="selectedOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1128]/80 backdrop-blur-sm">
      <div class="bg-white w-full max-w-sm rounded-[32px] p-6 space-y-4 text-left">
        <h3 class="font-black text-lg text-[#0A1128]">Delivery Request</h3>
        <div class="space-y-3 text-xs font-bold text-gray-700">
          <p><span class="text-gray-400 uppercase">Package:</span> {{ selectedOrder.package_description }}</p>
          <p><span class="text-gray-400 uppercase">From:</span> {{ selectedOrder.pickup_address }}</p>
          <p><span class="text-gray-400 uppercase">To:</span> {{ selectedOrder.delivery_address }}</p>
          <p class="text-[#84cc16] text-sm pt-2 font-mono">Your Payout: ₦{{ Number(selectedOrder.delivery_fee || 1000).toLocaleString() }}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-4">
          <button type="button" @click="selectedOrder = null" :disabled="isAcceptingJob" class="py-3 rounded-xl bg-gray-100 font-black text-xs uppercase cursor-pointer border-0 outline-none disabled:opacity-50">Cancel</button>
          <button type="button" @click="acceptJob(selectedOrder)" :disabled="isAcceptingJob"
                  class="py-3 rounded-xl bg-[#84cc16] text-white font-black text-xs uppercase shadow-lg cursor-pointer border-0 outline-none disabled:opacity-50">
            {{ isAcceptingJob ? 'Accepting...' : 'Confirm & Accept' }}
          </button>
        </div>
      </div>
    </div>

    <!-- GLOBAL POPUP ALERT MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="alertModal" class="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white w-full max-w-sm rounded-[28px] shadow-2xl border border-gray-100 p-6 text-center space-y-4 animate-scale-up">
            <div :class="[alertModal.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600']" class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 v-if="alertModal.type === 'success'" class="w-6 h-6 stroke-[2.5]" />
              <XCircle v-else class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div class="space-y-1">
              <h3 class="text-xs font-black uppercase tracking-wider text-gray-400">{{ alertModal.title }}</h3>
              <p class="text-xs text-gray-700 font-semibold leading-relaxed">{{ alertModal.message }}</p>
            </div>
            <button 
              type="button" 
              @click="alertModal = null" 
              class="w-full py-3.5 bg-[#0A1128] text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer border-0 outline-none"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
@keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>