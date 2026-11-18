<!-- pages/customer/bookings.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { 
  Loader2, 
  RefreshCw, 
  MapPin, 
  Car, 
  Package, 
  Calendar, 
  ArrowLeft, 
  Clock,
  CheckCircle2,
  AlertCircle
} from '@lucide/vue'

definePageMeta({
  layout: 'customer',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')

interface BookingItem {
  booking_reference: string;
  status: string;
  fare_amount: number | string;
  pickup_address: string;
  dropoff_address: string;
  receiver_name?: string | null;
  package_description?: string | null;
  created_at: string;
  booking_type: 'ride' | 'package';
}

const bookings = ref<BookingItem[]>([])
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Transient notification banner state
const notification = ref<{ message: string; type: 'success' | 'error' } | null>(null)

const showPopup = (message: string, type: 'success' | 'error' = 'success') => {
  notification.value = { message, type }
  setTimeout(() => {
    if (notification.value?.message === message) {
      notification.value = null
    }
  }, 4000)
}

// Fetch unified bookings from backend
const fetchBookings = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/customer/bookings-list`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    bookings.value = res?.data || res || []
  } catch (err: any) {
    console.error("Bookings fetch error:", err)
    error.value = err
    showPopup(err?.data?.detail || "Failed to load bookings history.", 'error')
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchBookings()
})

const getStatusBadgeClass = (status: string) => {
  const s = status?.toLowerCase()
  if (s === 'completed' || s === 'delivered') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (s === 'cancelled' || s === 'failed') return 'bg-rose-100 text-rose-800 border-rose-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-10 px-4 sm:px-6 font-sans text-[#0A1128] text-left selection:bg-[#D4F53C] selection:text-[#0A1128]">
    <div class="space-y-6">
      
      <!-- Popup Banner Notification -->
      <transition enter-active-class="transform transition duration-300 ease-out" enter-from-class="-translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="notification" 
             :class="notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'"
             class="p-4 rounded-2xl shadow-xl flex items-center justify-between text-xs font-black uppercase tracking-wider">
          <span>{{ notification.message }}</span>
          <button type="button" @click="notification = null" class="text-white font-bold ml-2 hover:opacity-70 cursor-pointer">&times;</button>
        </div>
      </transition>

      <!-- Top Bar Header Card -->
      <div class="bg-gradient-to-br from-[#0A1128] via-[#101b3b] to-[#0A1128] text-white p-6 sm:p-8 rounded-[32px] shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border border-white/10 relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-[#D4F53C]/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div class="space-y-1.5 z-10">
          <span class="bg-[#D4F53C] text-[#0A1128] text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-xs">Mobility &amp; Logistics</span>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight">My Bookings History</h1>
          <p class="text-gray-300 text-xs font-medium">Track your ride hails and package delivery dispatches</p>
        </div>

        <div class="flex items-center gap-2.5 z-10">
          <button 
            type="button"
            @click="fetchBookings" 
            :disabled="pending"
            class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl transition flex items-center justify-center active:scale-95 disabled:opacity-50 cursor-pointer outline-none border border-white/15"
            title="Refresh Bookings"
          >
            <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4" />
          </button>
          <NuxtLink to="/customer/dashboard" class="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition border border-white/15 no-underline flex items-center gap-1.5">
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Bookings List Container -->
      <div class="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
        <div class="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 class="font-black uppercase text-xs tracking-widest text-gray-400">All Bookings &amp; Dispatches</h3>
          <span class="bg-gray-100 text-[#0A1128] text-xs font-black px-3 py-1 rounded-full">
            {{ bookings.length }} entries
          </span>
        </div>
        
        <div v-if="pending && !bookings.length" class="text-center py-20 text-gray-400 text-xs font-bold space-y-3">
          <Loader2 class="w-8 h-8 animate-spin mx-auto text-[#0A1128]" />
          <p class="uppercase tracking-widest text-[10px]">Loading bookings history...</p>
        </div>

        <div v-else-if="bookings.length === 0" class="text-center py-20 space-y-3">
          <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <Car class="w-7 h-7 stroke-[1.5]" />
          </div>
          <div class="space-y-1">
            <h4 class="text-sm font-black text-[#0A1128]">No Bookings Recorded</h4>
            <p class="text-xs text-gray-400">You haven't requested any rides or package deliveries yet.</p>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div v-for="item in bookings" :key="item.booking_reference" 
               class="p-5 sm:p-6 rounded-[24px] border border-gray-100 bg-gray-50/50 flex flex-col gap-4 transition hover:shadow-md hover:bg-white">
            
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="p-1.5 rounded-lg text-white" :class="item.booking_type === 'ride' ? 'bg-indigo-600' : 'bg-emerald-600'">
                    <Car v-if="item.booking_type === 'ride'" :size="14" />
                    <Package v-else :size="14" />
                  </span>
                  <span class="font-black text-sm text-[#0A1128]">Ref: {{ item.booking_reference }}</span>
                  <span :class="getStatusBadgeClass(item.status)" class="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border">
                    {{ item.status }}
                  </span>
                </div>

                <p class="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                  <Calendar :size="12" /> {{ item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A' }}
                </p>
              </div>

              <div class="font-mono font-black text-base text-[#0A1128] bg-white px-4 py-2 rounded-2xl border border-gray-200/60 shadow-2xs self-start sm:self-auto">
                ₦{{ Number(item.fare_amount || 0).toLocaleString() }}
              </div>
            </div>

            <!-- Route Details -->
            <div class="space-y-2 bg-white p-4 rounded-2xl border border-gray-100 text-xs">
              <div class="flex items-start gap-2">
                <MapPin :size="14" class="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span class="text-[10px] font-black uppercase text-gray-400 block">Pickup Location</span>
                  <span class="font-bold text-gray-800">{{ item.pickup_address }}</span>
                </div>
              </div>

              <div class="flex items-start gap-2 pt-1 border-t border-gray-50">
                <MapPin :size="14" class="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span class="text-[10px] font-black uppercase text-gray-400 block">Dropoff Destination</span>
                  <span class="font-bold text-gray-800">{{ item.dropoff_address }}</span>
                </div>
              </div>
            </div>

            <!-- Package specific details if applicable -->
            <div v-if="item.booking_type === 'package' && (item.receiver_name || item.package_description)" class="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100/60 text-xs space-y-1">
              <p v-if="item.receiver_name" class="font-bold text-emerald-900">
                Receiver: <span class="font-normal">{{ item.receiver_name }}</span>
              </p>
              <p v-if="item.package_description" class="text-emerald-800 italic">
                "{{ item.package_description }}"
              </p>
            </div>

          </div>
        </div>

      </div>

      <!-- Bottom Back to Dashboard Action Block -->
      <div>
        <NuxtLink to="/customer/dashboard" 
                  class="block w-full py-4 bg-[#0A1128] hover:bg-[#152248] text-white text-xs font-black uppercase tracking-widest text-center rounded-[24px] shadow-xl transition no-underline">
          &larr; Back to Dashboard
        </NuxtLink>
      </div>

    </div>
  </div>
</template>