<!-- components/RiderDeliveryMap.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { MapPin, Navigation, Phone, User, Loader2, RefreshCw } from '@lucide/vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
const markers = new Map<number | string, any>()

const deliveries = ref<any[]>([])
const isLoading = ref(true)
const selectedDelivery = ref<any>(null)
const defaultCenter = ref<{ lat: number; lng: number }>({ lat: 8.9167, lng: 8.4000 })

const fetchDeliveries = async () => {
  isLoading.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/logistics/deliveries`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    const rawDeliveries = res?.deliveries || res?.data || []
    
    // Filter out any deliveries that are already completed or delivered
    deliveries.value = rawDeliveries.filter((item: any) => {
      const status = String(item.status || '').toLowerCase()
      return status !== 'completed' && status !== 'delivered'
    })
    
    if (map && deliveries.value.length > 0) {
      updateMapMarkers()
      setTimeout(() => {
        map.invalidateSize()
      }, 250)
    } else if (map) {
      // Clear markers if all are completed
      markers.forEach((marker) => map.removeLayer(marker))
      markers.clear()
    }
  } catch (err) {
    console.error("Failed to fetch assigned deliveries", err)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (import.meta.client) {
    const L = await import('leaflet')
    await import('leaflet/dist/leaflet.css')

    if (mapContainer.value) {
      map = L.map(mapContainer.value).setView([defaultCenter.value.lat, defaultCenter.value.lng], 14)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)

      await fetchDeliveries()

      setTimeout(() => {
        map.invalidateSize()
      }, 300)
    }
  }
})

const updateMapMarkers = async () => {
  if (!map) return
  const L = await import('leaflet')

  markers.forEach((marker) => map.removeLayer(marker))
  markers.clear()

  deliveries.value.forEach((item) => {
    const lat = item.customer_latitude
    const lng = item.customer_longitude

    if (lat && lng) {
      // Create a custom Leaflet divIcon so each pin permanently displays the customer's name on mobile/desktop
      const customIcon = L.divIcon({
        className: 'custom-pin-label',
        html: `
          <div style="background: #0A1128; color: #D4F53C; padding: 4px 8px; border-radius: 12px; font-family: sans-serif; font-weight: 900; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 4px; border: 1.5px solid #D4F53C;">
            <span>📍</span> <span>${item.customer_name}</span>
          </div>
        `,
        iconSize: [120, 32],
        iconAnchor: [60, 16]
      })

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)
      
      const popupContent = `
        <div style="font-family:sans-serif; color:#0A1128; padding: 6px; min-width: 200px;">
          <div style="font-size: 10px; font-weight: 900; background: #D4F53C; color: #0A1128; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px; text-transform: uppercase;">
            Order #${item.order_id} — ${item.status}
          </div>
          <div style="font-size: 14px; font-weight: 900; margin-bottom: 4px;">
            👤 ${item.customer_name}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 10px;">
            📍 ${item.delivery_address || 'No address provided'}
          </div>
          ${item.customer_phone ? `
            <a href="tel:${item.customer_phone}" style="display: block; text-align: center; background: #0A1128; color: #D4F53C; font-size: 12px; font-weight: 900; padding: 8px 12px; border-radius: 10px; text-decoration: none;">
              📞 Call ${item.customer_phone}
            </a>
          ` : ''}
        </div>
      `

      marker.bindPopup(popupContent)

      marker.on('click', () => {
        selectedDelivery.value = item
      })

      markers.set(item.order_id, marker)
    }
  })

  const firstWithCoords = deliveries.value.find(d => d.customer_latitude && d.customer_longitude)
  if (firstWithCoords) {
    map.setView([firstWithCoords.customer_latitude, firstWithCoords.customer_longitude], 15)
  }
}

const focusOnDelivery = (item: any) => {
  selectedDelivery.value = item
  if (item.customer_latitude && item.customer_longitude && map) {
    map.setView([item.customer_latitude, item.customer_longitude], 16)
    const marker = markers.get(item.order_id)
    if (marker) {
      marker.openPopup()
    }
  }
}
</script>

<template>
  <div class="bg-white border border-gray-100 rounded-[24px] sm:rounded-[32px] shadow-xl overflow-hidden p-4 sm:p-8 space-y-6 text-left w-full max-w-7xl mx-auto">
    
    <!-- Header Info Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
      <div class="flex items-center space-x-3.5">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-[#D4F53C]/20 rounded-2xl flex items-center justify-center text-[#0A1128] shadow-2xs shrink-0">
          <Navigation class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h3 class="text-sm sm:text-base font-black text-[#0A1128] tracking-tight">Assigned Delivery Map</h3>
          <p class="text-xs text-gray-500 font-medium mt-0.5">
            Active Stops: <span class="font-bold text-[#0A1128]">{{ deliveries.length }} Customers</span> (Tap pins for details)
          </p>
        </div>
      </div>
      
      <button 
        type="button"
        @click="fetchDeliveries" 
        :disabled="isLoading"
        class="w-full sm:w-auto px-4.5 py-3 bg-gray-100 hover:bg-gray-200 text-[#0A1128] text-xs font-black rounded-2xl transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer outline-none border-0"
      >
        <RefreshCw :class="{ 'animate-spin': isLoading }" class="w-4 h-4" />
        <span>Refresh Deliveries</span>
      </button>
    </div>

    <!-- Layout Grid: Full-Width Map on Mobile, Queue Sidebar on Desktop -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Map Canvas Container (Full width on mobile, 2 cols on desktop) -->
      <div class="lg:col-span-2 w-full h-[500px] sm:h-[620px] rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative bg-gray-100">
        <div v-if="isLoading" class="absolute inset-0 bg-white/80 z-20 flex items-center justify-center backdrop-blur-xs">
          <Loader2 class="w-8 h-8 animate-spin text-[#0A1128]" />
        </div>
        <div ref="mapContainer" style="width: 100%; height: 100%; position: relative;" class="z-10"></div>
      </div>

      <!-- Delivery Queue Sidebar (Hidden on mobile to prioritize the map, visible on desktop lg+) -->
      <div class="hidden lg:flex bg-gray-50 border border-gray-200 rounded-2xl p-4 flex-col h-[620px] overflow-hidden shadow-2xs">
        <h4 class="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 px-1">Delivery Queue</h4>
        
        <div v-if="deliveries.length === 0 && !isLoading" class="flex-grow flex flex-col items-center justify-center text-center p-6 text-gray-400">
          <MapPin class="w-8 h-8 mb-2 opacity-40 text-gray-400" />
          <p class="text-xs font-bold leading-relaxed">No assigned deliveries found.</p>
        </div>

        <div v-else class="space-y-3 overflow-y-auto flex-grow pr-1">
          <div 
            v-for="item in deliveries" 
            :key="item.order_id"
            @click="focusOnDelivery(item)"
            :class="[
              'p-4 rounded-2xl border transition cursor-pointer bg-white space-y-2.5 shadow-2xs',
              selectedDelivery?.order_id === item.order_id ? 'border-[#0A1128] shadow-md ring-2 ring-[#0A1128]/20' : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black bg-[#D4F53C]/30 text-[#0A1128] px-3 py-1 rounded-full uppercase tracking-wider">
                Order #{{ item.order_id }}
              </span>
              <span class="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {{ item.status }}
              </span>
            </div>

            <div class="space-y-1">
              <p class="text-xs font-black text-[#0A1128] flex items-center gap-1.5">
                <User class="w-3.5 h-3.5 text-gray-400 shrink-0" /> {{ item.customer_name }}
              </p>
              <p class="text-xs text-gray-500 font-medium flex items-start gap-1.5 leading-relaxed">
                <MapPin class="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" /> 
                <span>{{ item.delivery_address || 'No address provided' }}</span>
              </p>
            </div>

            <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span class="text-[10px] font-mono text-gray-400 font-semibold">
                {{ item.customer_latitude ? `${item.customer_latitude.toFixed(4)}, ${item.customer_longitude.toFixed(4)}` : 'Coords Unsynced' }}
              </span>
              <a 
                v-if="item.customer_phone"
                :href="`tel:${item.customer_phone}`" 
                class="inline-flex items-center gap-1.5 text-[10px] font-black text-[#0A1128] bg-[#D4F53C] hover:bg-[#c3e334] px-3.5 py-2 rounded-xl shadow-2xs transition active:scale-95"
              >
                <Phone class="w-3.5 h-3.5" /> Call
              </a>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>