<!-- components/AddressPicker.vue -->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { MapPin, Navigation, Loader2, AlertTriangle, CheckCircle2 } from '@lucide/vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  initialLat: { type: [Number, String, null], default: null },
  initialLng: { type: [Number, String, null], default: null }
})

const config = useRuntimeConfig()
const emit = defineEmits(['update:modelValue', 'locationSelected'])

const addressInput = ref(props.modelValue)
const isLocatingGps = ref(false)
const searchResults = ref<any[]>([])
const isSearching = ref(false)

const coordinateLock = ref({
  latitude: props.initialLat ? parseFloat(String(props.initialLat)) : null as number | null,
  longitude: props.initialLng ? parseFloat(String(props.initialLng)) : null as number | null
})

watch(() => props.modelValue, (newVal) => {
  if (newVal !== addressInput.value) {
    addressInput.value = newVal
  }
})

// GPS Geolocation Triangulation Engine
const getUserCurrentGpsCoordinates = (autoTrigger = false) => {
  if (!navigator.geolocation) {
    if (!autoTrigger) alert("Hardware Fault: Geolocation is not supported by your browser.")
    return
  }

  isLocatingGps.value = true
  searchResults.value = []
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      try {
        const response: any = await $fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        addressInput.value = response?.display_name || `GPS Pin Area (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      } catch (err) {
        addressInput.value = `GPS Pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
      } finally {
        coordinateLock.value.latitude = lat
        coordinateLock.value.longitude = lng

        emit('update:modelValue', addressInput.value)
        emit('locationSelected', { 
          address: addressInput.value, 
          latitude: lat, 
          longitude: lng,
          is_validated: true 
        })
        isLocatingGps.value = false
      }
    },
    (error) => {
      isLocatingGps.value = false
      if (!autoTrigger) {
        if (error.code === error.PERMISSION_DENIED) {
          alert("GPS Access Refused: Please allow location permissions or use the search field.")
        } else {
          alert("GPS Timeout: Unable to lock satellites. Please search your address manually.")
        }
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

// Automatically lock GPS on mount if coordinates aren't already set
onMounted(() => {
  if (!coordinateLock.value.latitude || !coordinateLock.value.longitude) {
    getUserCurrentGpsCoordinates(true)
  }
})

// Text Prediction Mapping (OpenStreetMap / LocationIQ Lookup)
let debounceTimeout: any = null
const handleAddressTypingSearch = () => {
  emit('update:modelValue', addressInput.value)
  
  if (coordinateLock.value.latitude || coordinateLock.value.longitude) {
    coordinateLock.value.latitude = null
    coordinateLock.value.longitude = null
    emit('locationSelected', { address: addressInput.value, latitude: null, longitude: null, is_validated: false })
  }

  clearTimeout(debounceTimeout)
  if (addressInput.value.length < 3) {
    searchResults.value = []
    return
  }

  debounceTimeout = setTimeout(async () => {
    isSearching.value = true
    searchResults.value = [] 
    
    const token = config.public.locationIqToken
    const primaryUrl = `https://us1.locationiq.com/v1/search?key=${token}&q=${encodeURIComponent(addressInput.value)}&format=json&countrycodes=ng&limit=5`

    try {
      const response = await $fetch.raw(primaryUrl)
      if (response.status === 200) {
        searchResults.value = (response._data as any[]) || []
      }
    } catch (err: any) {
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 500)
}

const selectPredictionPlace = (place: any) => {
  addressInput.value = place.display_name
  searchResults.value = []
  
  coordinateLock.value.latitude = parseFloat(place.lat)
  coordinateLock.value.longitude = parseFloat(place.lon)
  
  emit('update:modelValue', place.display_name)
  emit('locationSelected', {
    address: place.display_name,
    latitude: coordinateLock.value.latitude,
    longitude: coordinateLock.value.longitude,
    is_validated: true
  })
}
</script>

<template>
  <div class="space-y-2 relative text-left">
    <label class="block text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center space-x-1">
      <MapPin class="w-3.5 h-3.5 text-emerald-600" />
      <span>Primary Operational Base Address</span>
    </label>
    
    <div class="flex gap-2">
      <div class="relative flex-1">
        <MapPin class="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          v-model="addressInput"
          type="text"
          @input="handleAddressTypingSearch"
          placeholder="Type street name or use GPS pin..."
          class="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition"
        />
        <Loader2 v-if="isSearching" class="w-4 h-4 animate-spin text-[#0A1128] absolute right-4 top-1/2 -translate-y-1/2" />
      </div>

      <button 
        type="button"
        @click="getUserCurrentGpsCoordinates(false)"
        :disabled="isLocatingGps"
        class="bg-[#0A1128] hover:bg-opacity-95 text-white px-4 rounded-xl flex items-center justify-center transition border-0 disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer outline-none shrink-0 shadow-md"
        title="Lock accurate location coordinates via device GPS"
      >
        <Loader2 v-if="isLocatingGps" class="w-4 h-4 animate-spin" />
        <Navigation v-else class="w-4 h-4 text-[#D4F53C]" />
      </button>
    </div>

    <div v-if="coordinateLock.latitude && coordinateLock.longitude" class="flex items-center space-x-2 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/50 rounded-xl px-3 py-2 w-max animate-fade-in">
      <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span>Precision Coordinate Lock Active (Lat: {{ coordinateLock.latitude.toFixed(5) }}, Lng: {{ coordinateLock.longitude.toFixed(5) }})</span>
    </div>

    <div v-else class="flex items-start space-x-2 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100/60 rounded-xl px-3 py-2 animate-fade-in">
      <AlertTriangle class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
      <span>Precision Lock Missing. Tap the GPS compass button to capture your exact coordinates automatically.</span>
    </div>

    <div 
      v-if="searchResults.length > 0" 
      class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-2xl rounded-xl p-2 max-h-56 overflow-y-auto z-[999] space-y-0.5 custom-scrollbar"
    >
      <button 
        v-for="place in searchResults" 
        :key="place.place_id"
        type="button"
        @click="selectPredictionPlace(place)"
        class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition flex items-start space-x-2 border-0 bg-transparent cursor-pointer"
      >
        <MapPin class="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
        <span class="truncate">{{ place.display_name }}</span>
      </button>
    </div>
  </div>
</template>