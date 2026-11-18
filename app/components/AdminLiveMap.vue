<!-- components/AdminLiveMap.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { Navigation, MapPin, CheckCircle } from '@lucide/vue'

const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
const markers = new Map<number | string, any>()
let tempMarker: any = null

const clickedCoords = ref<{ lat: number; lng: number } | null>(null)
const defaultCenter = ref<{ lat: number; lng: number }>({ lat: 8.9167, lng: 8.4000 })
const successMessage = ref('')

// Load saved custom default center from localStorage on setup if available
if (import.meta.client) {
  const savedCenter = localStorage.getItem('admin_map_default_center')
  if (savedCenter) {
    try {
      defaultCenter.value = JSON.parse(savedCenter)
    } catch (e) {
      console.error("Failed to parse saved map center", e)
    }
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

      // Click event to pick a new default center location
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        clickedCoords.value = { lat, lng }

        if (tempMarker) {
          tempMarker.setLatLng([lat, lng])
        } else {
          tempMarker = L.marker([lat, lng]).addTo(map)
        }
        tempMarker.bindPopup(`<div style="font-family:sans-serif; font-weight:800; color:#0A1128;">📍 Selected Location<br/>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</div>`).openPopup()
      })
    }
  }
})

// Save the currently clicked coordinates as the new permanent default map center
const saveAsDefaultCenter = () => {
  if (!clickedCoords.value) return

  defaultCenter.value = { ...clickedCoords.value }
  localStorage.setItem('admin_map_default_center', JSON.stringify(defaultCenter.value))

  if (map) {
    map.setView([defaultCenter.value.lat, defaultCenter.value.lng], map.getZoom())
  }

  if (tempMarker) {
    map.removeLayer(tempMarker)
    tempMarker = null
  }

  successMessage.value = `Default center updated to (${defaultCenter.value.lat.toFixed(4)}, ${defaultCenter.value.lng.toFixed(4)})!`
  setTimeout(() => {
    successMessage.value = ''
  }, 4000)

  clickedCoords.value = null
}

// Function called when new coordinates arrive for any specific rider
const updateRiderPosition = (riderId: number | string, lat: number, lng: number, name?: string) => {
  if (!map) return

  import('leaflet').then((L) => {
    const displayName = name || `Agent #${riderId}`

    if (markers.has(riderId)) {
      const marker = markers.get(riderId)
      marker.setLatLng([lat, lng])
      marker.bindPopup(`<div style="font-family:sans-serif; font-weight:800; color:#0A1128;">🚴 ${displayName}</div>`)
    } else {
      const marker = L.marker([lat, lng]).addTo(map)
      marker.bindPopup(`<div style="font-family:sans-serif; font-weight:800; color:#0A1128;">🚴 ${displayName}</div>`).openPopup()
      markers.set(riderId, marker)
    }
  })
}

defineExpose({ updateRiderPosition })
</script>

<template>
  <div class="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden p-6 space-y-4 text-left w-full max-w-none">
    
    <!-- Map Header Info Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
          <Navigation class="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 class="text-xs font-black text-gray-900 uppercase tracking-wider">Live Fleet Telemetry Grid</h3>
          <p class="text-xs text-gray-500 font-medium mt-0.5">
            Active Fleet: <span class="font-bold text-[#0A1128]">{{ markers.size }} Agents Online</span> 
            <span class="text-gray-400 mx-2">|</span> 
            Default Center: <span class="font-mono text-gray-700">{{ defaultCenter.lat.toFixed(4) }}, {{ defaultCenter.lng.toFixed(4) }}</span>
          </p>
        </div>
      </div>
      
      <!-- Action controls for setting default position -->
      <div class="flex items-center space-x-3">
        <div v-if="successMessage" class="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-bounce">
          <CheckCircle class="w-4 h-4" /> {{ successMessage }}
        </div>

        <button 
          v-if="clickedCoords"
          @click="saveAsDefaultCenter"
          class="px-4 py-2 bg-[#0A1128] hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
        >
          Set Pin as Default Center
        </button>

        <div class="flex items-center space-x-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span class="text-[10px] font-black tracking-wider uppercase text-emerald-700">Click Map to Re-anchor</span>
        </div>
      </div>
    </div>

    <!-- Map Canvas Container -->
    <div class="w-full h-[650px] rounded-2xl overflow-hidden shadow-inner border border-gray-100 relative cursor-crosshair">
      <div ref="mapContainer" class="w-full h-full z-15"></div>
    </div>

  </div>
</template>