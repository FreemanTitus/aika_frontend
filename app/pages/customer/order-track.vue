<script setup lang="ts">
import { ref } from 'vue'
import CustomerLiveMap from '~/components/CustomerLiveMap.vue'

const customerLat = ref(8.9167)
const customerLng = ref(8.4000)
const customerMapRef = ref<any>(null)

const handleCoordinatesUpdated = (newCoords: { lat: number, lng: number }) => {
  customerLat.value = newCoords.lat
  customerLng.value = newCoords.lng
  // Dispatch API call here to update backend coordinates instantly if desired
}
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <CustomerLiveMap 
      ref="customerMapRef"
      :initial-lat="customerLat"
      :initial-lng="customerLng"
      @update:coordinates="handleCoordinatesUpdated"
    />
  </div>
</template>