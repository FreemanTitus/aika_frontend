<!-- components/RiderLocationTracker.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { MapPin, AlertTriangle } from '@lucide/vue'
import { useRiderTracker } from '~/composables/useRiderTracker'

const emit = defineEmits<{
  (e: 'status-changed', status: string, hubName?: string | null): void
}>()

const {
  isTracking,
  trackingStatus,
  assignedHub,
  coverageError,
  startTracking,
  stopTracking,
  checkInitialStatus,
} = useRiderTracker()

const handleGoOnline = () => {
  startTracking(false, (status, hubName) => {
    emit('status-changed', status, hubName)
  })
}

const handleGoOffline = async () => {
  await stopTracking()
  emit('status-changed', 'offline', assignedHub.value)
}

onMounted(() => {
  checkInitialStatus((status, hubName) => {
    emit('status-changed', status, hubName)
  })
})
</script>

<template>
  <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="text-xs font-black text-gray-900 uppercase tracking-wider">Live Location</h3>
          <span
            v-if="assignedHub"
            class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700"
          >
            <MapPin class="w-3 h-3" /> {{ assignedHub }}
          </span>
        </div>
        <p class="text-xs text-gray-500 font-medium mt-1 truncate">
          Status:
          <span
            :class="coverageError ? 'text-rose-600' : isTracking ? 'text-emerald-600' : 'text-indigo-600'"
            class="font-bold"
          >
            {{ trackingStatus }}
          </span>
        </p>
      </div>

      <button
        v-if="!isTracking"
        type="button"
        @click="handleGoOnline"
        class="shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md border-0 outline-none"
      >
        Go Online
      </button>
      <button
        v-else
        type="button"
        @click="handleGoOffline"
        class="shrink-0 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md border-0 outline-none"
      >
        Go Offline
      </button>
    </div>

    <div
      v-if="coverageError"
      class="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
    >
      <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
      <span>{{ coverageError }}</span>
    </div>
  </div>
</template>