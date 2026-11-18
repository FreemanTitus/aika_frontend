<!-- pages/admin/tracking.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import AdminLiveMap from '~/components/AdminLiveMap.vue'
import { useAdminSocket } from '~/composables/useAdminSocket'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const liveMapRef = ref<any>(null)
const activeFleetCount = ref(0)

// Initialize admin socket to listen for live telemetry broadcasts from all riders
const { riderLocationPayload } = useAdminSocket()

// Watcher: Catch live coordinate transmissions from ANY active rider in the fleet
watch(riderLocationPayload, (locationUpdate) => {
  if (!locationUpdate) return

  const { rider_id, latitude, longitude, rider_name } = locationUpdate

  if (liveMapRef.value) {
    liveMapRef.value.updateRiderPosition(rider_id, latitude, longitude, rider_name)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left space-y-8">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div>
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">Fleet Live Tracking Map</h1>
        <p class="text-xs text-gray-500 font-medium mt-0.5">Monitor all active delivery agents simultaneously across the city.</p>
      </div>

      <!-- Map View Wrapper handling multi-agent markers -->
      <AdminLiveMap ref="liveMapRef" />

    </div>
  </div>
</template>