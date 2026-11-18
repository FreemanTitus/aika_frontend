<script setup lang="ts">
import { onMounted, watch, ref, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  lat: { type: [Number, null], default: null },
  lng: { type: [Number, null], default: null },
  zoom: { type: Number, default: 15 }
})

const mapContainer = ref<HTMLElement | null>(null)
let mapInstance: any = null
let markerInstance: any = null

onMounted(async () => {
  if (import.meta.client) {
    // Wait until the global window object catches the Leaflet script injection
    const checkLeafletGlobal = setInterval(async () => {
      // @ts-ignore
      if (window.L) {
        clearInterval(checkLeafletGlobal)
        // @ts-ignore
        const L = window.L

        // Fix default marker icon path tracking asset resolution bugs natively
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
        })

        await nextTick()

        const startingLat = props.lat || 8.9060
        const startingLng = props.lng || 8.4085

        if (mapContainer.value) {
          mapInstance = L.map(mapContainer.value, {
            zoomControl: true,
            attributionControl: false
          }).setView([startingLat, startingLng], props.zoom)

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(mapInstance)

          if (props.lat && props.lng) {
            markerInstance = L.marker([props.lat, props.lng]).addTo(mapInstance)
          }
        }
      }
    }, 100)
  }
})

watch(
  () => [props.lat, props.lng],
  ([newLat, newLng]) => {
    // @ts-ignore
    if (!mapInstance || !window.L || !newLat || !newLng) return
    // @ts-ignore
    const L = window.L

    const targetCoordinates: [number, number] = [Number(newLat), Number(newLng)]
    mapInstance.flyTo(targetCoordinates, props.zoom, { duration: 1.5 })

    if (markerInstance) {
      markerInstance.setLatLng(targetCoordinates)
    } else {
      markerInstance = L.marker(targetCoordinates).addTo(mapInstance)
    }
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
  }
})
</script>

<template>
  <div class="w-full h-full rounded-2xl overflow-hidden border border-gray-200/80 shadow-inner min-h-[250px] relative z-0">
    <div ref="mapContainer" class="w-full h-full min-h-[250px]"></div>
  </div>
</template>