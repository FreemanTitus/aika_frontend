<!-- pages/merchant/orders/active.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { 
  ShoppingBag, 
  Clock, 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Package, 
  Coins, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Eye,
  CheckCircle,
  X,
  Mail,
  ShieldCheck
} from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const backendHost = apiBase
const authToken = useCookie('auth_token')

// Operational Interaction State Trackers
const processingOrdersMap = ref<Record<string, boolean>>({})
const activeSelectedModalOrder = ref<any | null>(null)

// Reactive states for active orders data, loading, and error handling
const activeOrders = ref<any[]>([])
const isLoading = ref<boolean>(true)
const error = ref<any>(null)

// Fetch active orders with explicit headers on mount
const fetchActiveOrders = async () => {
  isLoading.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${backendHost}/api/v1/merchant/active-orders`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    console.log('Active Orders API Response:', res)
    activeOrders.value = res?.active_orders || []
  } catch (err: any) {
    console.error('Active Orders Fetch Error:', err)
    error.value = err
  } finally {
    isLoading.value = false
  }
}

// Trigger fetch immediately when component mounts
onMounted(() => {
  fetchActiveOrders()
})

// 2. Dynamic Status Badging Helper
const getStatusBadgeStyles = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'bg-blue-50 text-blue-700 border-blue-100'
    case 'assigned':
      return 'bg-purple-50 text-purple-700 border-purple-100'
    case 'in_transit':
    case 'acknowledged':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-100'
  }
}

// =========================================================================
// ASYNCHRONOUS API ORDER ACKNOWLEDGMENT ACTION TRIGGER
// =========================================================================

const executeOrderAcknowledgment = async (orderId: string, orderRef: string) => {
  if (processingOrdersMap.value[orderId]) return

  // Trigger the loading spinner state instantly using the string order_id
  processingOrdersMap.value[orderId] = true

  try {
    const response: any = await $fetch(
      `${backendHost}/api/v1/orders/acknowledge/${orderId}`,
      {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${authToken.value}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('Order Acknowledgment Response:', response)

    if (response.status === 'success') {
      // Filter the order entirely out of the active list
      activeOrders.value = activeOrders.value.filter(order => order.order_id !== orderId)

      // 3. If the modal is currently open for this specific order, close it smoothly
      if (
        activeSelectedModalOrder.value &&
        activeSelectedModalOrder.value.order_id === orderId
      ) {
        activeSelectedModalOrder.value = null
      }
    }
  } catch (err: any) {
    console.error('Order Acknowledgment Error:', err)
    alert(
      `Acknowledgment Interrupted: ${
        err?.data?.detail || 'Gateway refused action.'
      }`
    )
  } finally {
    // 4. Reset loading state
    processingOrdersMap.value[orderId] = false
  }
}

// Robust Computed Subtotal (Sums items dynamically if subtotal property is 0)
const computedSubtotal = computed(() => {
  const order = activeSelectedModalOrder.value
  if (!order) return 0.00
  if (order.subtotal && order.subtotal > 0) return order.subtotal
  
  if (order.items && order.items.length > 0) {
    return order.items.reduce((acc: number, item: any) => acc + (item.total_item_price || 0), 0)
  }
  return 0.00
})

const formatMoney = (value: number) => "₦" + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="p-6 space-y-6 text-left">
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
      <div>
        <span class="bg-[#84cc16]/10 text-emerald-800 font-black px-2.5 py-0.5 rounded text-[9px] uppercase tracking-widest inline-block mb-1">
          Logistics Manifest
        </span>
        <h1 class="text-2xl font-black text-[#0A1128] tracking-tight">Active Dispatches Deck</h1>
        <p class="text-xs text-gray-400 font-medium mt-0.5">Monitor all ongoing and processing doorstep deliveries across Akwanga.</p>
      </div>

      <div class="flex items-center gap-3 self-stretch sm:self-auto">
        <div class="inline-flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200/60 shadow-xs">
          <span class="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse"></span>
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-wider">Live Pipeline Logs:</span>
          <span class="font-mono font-black text-[#0A1128] text-xs px-1">{{ activeOrders.length }}</span>
        </div>

        <button 
          @click="fetchActiveOrders" 
          :disabled="isLoading"
          type="button" 
          class="bg-white border border-gray-200 shadow-sm text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
        >
          <RefreshCw :class="{ 'animate-spin': isLoading }" class="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start space-x-3 text-left">
      <AlertCircle class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div>
        <h4 class="text-xs font-black text-rose-900 uppercase tracking-wider">Failed to Hydrate Manifest Deck</h4>
        <p class="text-xs text-rose-700 font-semibold mt-0.5 leading-relaxed">{{ error?.data?.detail || error?.message || 'An unexpected server exception interrupted reading data.' }}</p>
      </div>
    </div>

    <div v-if="isLoading && activeOrders.length === 0" class="py-20 text-center space-y-3">
      <Loader2 class="w-8 h-8 animate-spin mx-auto text-[#0A1128]" />
      <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">Syncing Fleet Channels Memory...</p>
    </div>

    <div v-else-if="activeOrders.length === 0" class="bg-white border border-gray-200/60 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xs mt-6">
      <div class="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mx-auto text-gray-300">
        <ShoppingBag class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-black text-[#0A1128] uppercase tracking-wide">No Active Dispatches</h3>
        <p class="text-xs text-gray-400 leading-relaxed font-medium">You currently do not have any incoming orders processing transit cycles on the road right now.</p>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <div 
        v-for="order in activeOrders" 
        :key="order.id"
        class="bg-white border border-gray-200 rounded-[24px] shadow-xs hover:shadow-md hover:border-gray-300/80 transition duration-300 overflow-hidden flex flex-col"
      >
        <div class="p-5 border-b border-gray-100 bg-gray-50/40 flex justify-between items-center">
          <div class="space-y-0.5">
            <span class="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Waybill Invoice</span>
            <span class="font-mono text-xs font-black text-[#0A1128] bg-white border border-gray-200/80 px-2 py-1 rounded-lg">
              #WF-{{ order.order_reference }}
            </span>
          </div>

          <span 
            :class="getStatusBadgeStyles(order.status)"
            class="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all"
          >
            <Clock v-if="order.status?.toLowerCase() === 'pending'" class="w-3 h-3" />
            <Truck v-else class="w-3 h-3" />
            <span>{{ order.status?.replace('_', ' ') }}</span>
          </span>
        </div>

        <div class="p-5 flex-1 space-y-4 text-xs font-semibold text-gray-600">
          
          <div class="flex items-start space-x-2.5">
            <Package class="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <span class="text-[9px] text-gray-400 block uppercase tracking-wider font-bold">Consignment Brief</span>
              <p class="text-gray-900 font-bold mt-0.5 line-clamp-1">{{ order.package_description }}</p>
            </div>
          </div>

          <div class="flex items-start space-x-2.5">
            <User class="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <span class="text-[9px] text-gray-400 block uppercase tracking-wider font-bold">Recipient Customer</span>
              <p class="text-gray-900 font-bold mt-0.5">{{ order.receiver_name || "Marketplace Client" }}</p>
            </div>
          </div>

          <div class="flex items-start space-x-2.5">
            <MapPin class="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span class="text-[9px] text-gray-400 block uppercase tracking-wider font-bold">Delivery Destination</span>
              <p class="text-gray-700 font-medium leading-relaxed mt-0.5 line-clamp-2 text-[11px]">{{ order.delivery_address }}</p>
            </div>
          </div>

          <!-- Assigned Rider Indicator If Present -->
          <div v-if="order.assigned_rider" class="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <Truck class="w-3.5 h-3.5 text-[#84cc16]" />
              <span class="text-[10px] font-bold text-gray-700">Rider: {{ order.assigned_rider.name }}</span>
            </div>
            <a :href="`tel:${order.assigned_rider.phone_number}`" class="text-[10px] font-black text-indigo-600 hover:underline">
              Call
            </a>
          </div>
        </div>

        <div class="p-4 border-t border-gray-100 bg-gray-50/20 px-5 flex justify-between items-center text-xs gap-4">
          <div>
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Merchant Subtotal</span>
            <p class="text-sm font-black text-emerald-700 font-mono mt-0.5 flex items-center gap-1">
              <span>{{ formatMoney(order.subtotal) }}</span>
            </p>
          </div>
          
          <div class="flex items-center gap-2">
            <button 
              @click="activeSelectedModalOrder = order"
              type="button"
              class="p-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-[#0A1128] rounded-xl transition shadow-xs cursor-pointer outline-none"
              title="Inspect Complete Manifest Row Details"
            >
              <Eye class="w-4 h-4" />
            </button>

            <button 
              v-if="order.status?.toLowerCase() === 'pending'"
              @click="executeOrderAcknowledgment(order.order_id, order.order_reference)"
              :disabled="processingOrdersMap[order.order_id]"
              type="button"
              class="bg-[#0A1128] hover:bg-[#84cc16] text-white hover:text-[#0A1128] text-[10px] uppercase font-black tracking-wider px-3.5 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer border-0 outline-none"
            >
              <Loader2 v-if="processingOrdersMap[order.order_id]" class="w-3.5 h-3.5 animate-spin" />
              <CheckCircle v-else class="w-3.5 h-3.5" />
              <span>{{ processingOrdersMap[order.order_id] ? 'Saving...' : 'Acknowledge' }}</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Complete Inspection Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="activeSelectedModalOrder" class="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-xs z-[100000] flex items-center justify-center p-4">
          <div class="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-gray-100 transform transition-all duration-300 max-h-[90vh] flex flex-col animate-scale-up text-left">
            
            <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <span class="text-[9px] font-black tracking-widest text-gray-400 uppercase block">System Manifest</span>
                <h3 class="text-base font-black text-[#0A1128] font-mono">#WF-{{ activeSelectedModalOrder.order_reference }}</h3>
              </div>
              <button @click="activeSelectedModalOrder = null" class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition cursor-pointer border-0 outline-none">
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="p-6 space-y-5 overflow-y-auto flex-grow text-xs font-semibold">
              <div class="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-2xl">
                <span class="text-xs font-bold text-gray-500 tracking-tight">Pipeline Tracking State:</span>
                <span :class="getStatusBadgeStyles(activeSelectedModalOrder.status)" class="text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-wider border">
                  {{ activeSelectedModalOrder.status?.replace('_', ' ') }}
                </span>
              </div>

              <!-- Customer Node -->
              <div class="space-y-2">
                <h4 class="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center space-x-1.5">
                  <User class="w-3.5 h-3.5 text-[#84cc16]" />
                  <span>Customer Context Node</span>
                </h4>
                <div class="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-inner font-semibold">
                  <div class="flex justify-between items-center py-1 border-b border-gray-50">
                    <span class="text-gray-400 text-xs font-medium">Full Identity:</span>
                    <span class="text-[#0A1128] font-black">{{ activeSelectedModalOrder.receiver_name || "Marketplace Client" }}</span>
                  </div>
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-400 text-xs font-medium">Verified Active Phone:</span>
                    <span class="text-[#0A1128] font-black font-mono">{{ activeSelectedModalOrder.receiver_phone }}</span>
                  </div>
                </div>
              </div>

              <!-- Assigned Rider Details -->
              <div v-if="activeSelectedModalOrder.assigned_rider" class="space-y-2">
                <h4 class="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center space-x-1.5">
                  <Truck class="w-3.5 h-3.5 text-[#84cc16]" />
                  <span>Assigned Dispatch Rider</span>
                </h4>
                <div class="bg-white border border-gray-100 rounded-2xl p-4 space-y-2 shadow-inner font-semibold">
                  <div class="flex justify-between items-center py-1 border-b border-gray-50">
                    <span class="text-gray-400 text-xs font-medium">Rider Name:</span>
                    <span class="text-[#0A1128] font-black">{{ activeSelectedModalOrder.assigned_rider.name }}</span>
                  </div>
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-400 text-xs font-medium">Contact Phone:</span>
                    <a :href="`tel:${activeSelectedModalOrder.assigned_rider.phone_number}`" class="text-indigo-600 font-black font-mono hover:underline">
                      {{ activeSelectedModalOrder.assigned_rider.phone_number }}
                    </a>
                  </div>
                </div>
              </div>

              <!-- Dropoff Address -->
              <div class="space-y-2">
                <h4 class="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center space-x-1.5">
                  <MapPin class="w-3.5 h-3.5 text-[#84cc16]" />
                  <span>Dropoff Target Destination</span>
                </h4>
                <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <p class="text-gray-600 font-medium leading-relaxed text-[11px]">{{ activeSelectedModalOrder.delivery_address }}</p>
                </div>
              </div>

              <!-- Ordered Consignment Items List -->
              <div class="space-y-2">
                <h4 class="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center space-x-1.5">
                  <Package class="w-3.5 h-3.5 text-[#84cc16]" />
                  <span>Ordered Consignment Items</span>
                </h4>
                <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2.5">
                  <template v-if="activeSelectedModalOrder.items && activeSelectedModalOrder.items.length > 0">
                    <div v-for="(item, idx) in activeSelectedModalOrder.items" :key="idx" class="flex justify-between items-center py-1.5 border-b border-gray-200/60 last:border-0 text-xs">
                      <div>
                        <span class="font-bold text-[#0A1128]">{{ item.quantity }}x {{ item.name }}</span>
                        <p class="text-[10px] text-gray-400 font-mono">Unit: {{ formatMoney(item.price_at_order) }}</p>
                      </div>
                      <span class="font-mono font-black text-[#0A1128]">{{ formatMoney(item.total_item_price) }}</span>
                    </div>
                  </template>
                  <div v-else class="text-xs text-gray-500 italic py-1">
                    {{ activeSelectedModalOrder.package_description || 'No itemization records attached.' }}
                  </div>
                </div>
              </div>

              <!-- Financial Breakdown Ledger (Merchant Subtotal Only) -->
              <div class="space-y-2">
                <h4 class="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center space-x-1.5">
                  <Coins class="w-3.5 h-3.5 text-emerald-600" />
                  <span>Financial Ledger Breakdown</span>
                </h4>
                <div class="bg-emerald-50/25 border border-emerald-100 rounded-2xl p-4 space-y-2.5">
                  <div class="flex justify-between items-center pt-1">
                    <span class="text-xs font-black text-emerald-800 uppercase">Merchant Basket Subtotal:</span>
                    <span class="text-base font-black text-emerald-700 font-mono">{{ formatMoney(computedSubtotal) }}</span>
                  </div>
                </div>
              </div>

            </div>

            <div class="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2.5">
              <button @click="activeSelectedModalOrder = null" class="bg-white border border-gray-200 hover:border-gray-300 text-[#0A1128] font-black text-xs py-2.5 px-5 rounded-xl shadow-sm transition cursor-pointer border-0 outline-none">
                Dismiss Manifest View
              </button>
              
              <button 
                v-if="activeSelectedModalOrder.status?.toLowerCase() === 'pending'"
                @click="executeOrderAcknowledgment(activeSelectedModalOrder.order_id, activeSelectedModalOrder.order_reference)"
                :disabled="processingOrdersMap[activeSelectedModalOrder.order_id]"
                class="bg-[#0A1128] hover:bg-[#84cc16] text-white hover:text-[#0A1128] text-xs font-black px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border-0 outline-none"
              >
                <Loader2 v-if="processingOrdersMap[activeSelectedModalOrder.order_id]" class="w-3.5 h-3.5 animate-spin" />
                <span>{{ processingOrdersMap[activeSelectedModalOrder.order_id] ? 'Processing...' : 'Acknowledge Order Now' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>