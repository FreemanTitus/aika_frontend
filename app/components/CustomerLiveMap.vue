<!-- components/CustomerLiveMap.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Navigation, MapPin, CheckCircle } from '@lucide/vue'

const props = defineProps<{
  initialLat?: number
  initialLng?: number
  riderPosition?: { lat: number; lng: number; name?: string } | null
}>()

const emit = defineEmits(['update:coordinates'])

const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
let customerMarker: any = null
let riderMarker: any = null

const clickedCoords = ref<{ lat: number; lng: number } | null>(null)
const defaultCenter = ref<{ lat: number; lng: number }>({ 
  lat: props.initialLat || 8.9167, 
  lng: props.initialLng || 8.4000 
})
const successMessage = ref('')

onMounted(async () => {
  if (import.meta.client) {
    const L = await import('leaflet')
    await import('leaflet/dist/leaflet.css')

    if (mapContainer.value) {
      map = L.map(mapContainer.value).setView([defaultCenter.value.lat, defaultCenter.value.lng], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)

      // Place initial customer marker
      customerMarker = L.marker([defaultCenter.value.lat, defaultCenter.value.lng]).addTo(map)
      customerMarker.bindPopup(`<div style="font-family:sans-serif; font-weight:800; color:#0A1128;">🏠 Your Delivery Location</div>`).openPopup()

      // Click event to pick a new destination location pin
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        clickedCoords.value = { lat, lng }

        if (customerMarker) {
          customerMarker.setLatLng([lat, lng])
        } else {
          customerMarker = L.marker([lat, lng]).addTo(map)
        }
        customerMarker.bindPopup(`<div style="font-family:sans-serif; font-weight:800; color:#0A1128;">📍 Selected Destination<br/>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</div>`).openPopup()
      })
    }
  }
})

// Save the selected map pin coordinates as the active customer delivery destination
const confirmLocationPin = () => {
  if (!clickedCoords.value) return

  defaultCenter.value = { ...clickedCoords.value }
  emit('update:coordinates', defaultCenter.value)

  successMessage.value = `Location pin updated successfully!`
  setTimeout(() => {
    successMessage.value = ''
  }, 4000)

  clickedCoords.value = null
}

// Function to update the assigned rider's live position on the customer map
const updateRiderPosition = (lat: number, lng: number, name?: string) => {
  if (!map) return

  import('leaflet').then((L) => {
    const riderName = name || 'Assigned Delivery Rider'

    if (riderMarker) {
      riderMarker.setLatLng([lat, lng])
      riderMarker.bindPopup(`<div style="font-family:sans-serif; font-weight:800; color:#0A1128;">🚴 ${riderName} (En Route)</div>`)
    } else {
      riderMarker = L.marker([lat, lng]).addTo(map)
      riderMarker.bindPopup(`<div style="font-family:sans-serif; font-weight:800; color:#0A1128;">🚴 ${riderName} (En Route)</div>`).openPopup()
    }
  })
}

defineExpose({ updateRiderPosition })
</script>

<template>
  <div class="bg-white border border-gray-100 rounded-[32px] shadow-xl overflow-hidden p-6 space-y-4 text-left w-full">
    
    <!-- Map Header Info Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-[#D4F53C]/20 rounded-2xl flex items-center justify-center text-[#0A1128]">
          <MapPin class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-xs font-black text-[#0A1128] uppercase tracking-wider">Live Delivery Tracking Map</h3>
          <p class="text-xs text-gray-500 font-medium mt-0.5">
            Destination: <span class="font-mono text-gray-700">{{ defaultCenter.lat.toFixed(4) }}, {{ defaultCenter.lng.toFixed(4) }}</span>
          </p>
        </div>
      </div>
      
      <!-- Action controls for setting location pin -->
      <div class="flex items-center space-x-3">
        <div v-if="successMessage" class="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <CheckCircle class="w-4 h-4" /> {{ successMessage }}
        </div>

        <button 
          v-if="clickedCoords"
          @click="confirmLocationPin"
          class="px-4 py-2.5 bg-[#0A1128] hover:bg-opacity-90 text-[#D4F53C] text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer border-0 outline-none"
        >
          Confirm Location Pin
        </button>

        <div class="flex items-center space-x-2 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl">
          <span class="w-2 h-2 rounded-full bg-[#0A1128] animate-ping"></span>
          <span class="text-[10px] font-black tracking-wider uppercase text-gray-700">Click Map to Adjust Pin</span>
        </div>
      </div>
    </div>

    <!-- Map Canvas Container -->
    <div class="w-full h-[500px] rounded-2xl overflow-hidden shadow-inner border border-gray-100 relative cursor-crosshair">
      <div ref="mapContainer" class="w-full h-full z-15"></div>
    </div>

  </div>
</template>