<!-- pages/rider/map.vue -->
<script setup lang="ts">
import RiderDeliveryMap from '~/components/RiderDeliveryMap.vue'
import { ArrowLeft } from '@lucide/vue'

definePageMeta({
  layout: 'rider',
  middleware: 'auth'
})
</script>

<template>
  <div class="py-10 px-4 sm:px-6 bg-gray-50/50 min-h-screen">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Back Button & Header Section -->
      <div class="space-y-4">
        <NuxtLink 
          to="/rider/dashboard" 
          class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0A1128] bg-white hover:bg-gray-100 px-4 py-2.5 rounded-2xl border border-gray-200 transition shadow-2xs"
        >
          <ArrowLeft class="w-4 h-4" /> Back to Dashboard
        </NuxtLink>

        <div>
          <span class="bg-[#D4F53C]/20 text-[#0A1128] font-black px-3.5 py-1 rounded-full text-[10px] uppercase tracking-widest inline-block shadow-2xs">
            Field Operations
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight mt-3">Delivery Navigation Map</h1>
          <p class="text-xs sm:text-sm text-gray-500 font-medium mt-1">
            Inspect customer drop-off locations and navigate active delivery routes.
          </p>
        </div>
      </div>

      <RiderDeliveryMap />

    </div>
  </div>
</template>