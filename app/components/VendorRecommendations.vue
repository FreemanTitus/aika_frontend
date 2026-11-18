<!-- components/VendorRecommendations.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRuntimeConfig } from '#app'
import { Store, Star, MapPin, ShieldCheck, ArrowRight, Loader2 } from '@lucide/vue'

const props = defineProps<{
  category?: 'restaurants' | 'e_commerce';
  limit?: number;
}>()

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const recommendedVendors = ref<any[]>([])
const pending = ref(true)

const fetchRecommendations = async () => {
  pending.value = true
  try {
    let url = `${apiBase}/api/v1/marketplace/recommended-vendors`
    if (props.category) {
      url += `?category=${props.category}`
    }

    const res: any = await $fetch(url, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    recommendedVendors.value = res?.data || []
  } catch (err) {
    console.error("Failed to load recommended vendors", err)
  } finally {
    pending.value = false
  }
}

onMounted(fetchRecommendations)
</script>

<template>
  <div class="space-y-6 text-left">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-black text-[#0A1128] tracking-tight">Recommended &amp; Featured Stores</h3>
        <p class="text-xs text-gray-400 font-medium mt-0.5">Top-rated partners with verified subscriptions and exceptional service.</p>
      </div>
    </div>

    <div v-if="pending" class="flex justify-center py-10">
      <Loader2 class="w-6 h-6 animate-spin text-[#0A1128]" />
    </div>

    <div v-else-if="recommendedVendors.length === 0" class="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-wider">
      No recommended stores available right now.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <NuxtLink 
        v-for="vendor in recommendedVendors" 
        :key="vendor.vendor_id"
        :to="`/marketplace/store/${vendor.vendor_id}`"
        class="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
      >
        <div v-if="vendor.is_premium_featured" class="absolute top-0 right-0 bg-[#D4F53C] text-[#0A1128] text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
          <ShieldCheck class="w-3 h-3" /> Featured Partner
        </div>

        <div class="space-y-3">
          <div class="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-[#0A1128] font-black text-base shadow-inner">
            {{ vendor.company_name.charAt(0).toUpperCase() }}
          </div>

          <div class="space-y-1">
            <h4 class="text-xs font-black text-[#0A1128] group-hover:text-[#84cc16] transition-colors truncate">
              {{ vendor.company_name }}
            </h4>
            <p class="text-[10px] text-gray-400 font-medium flex items-center gap-1 truncate">
              <MapPin class="w-3 h-3 text-[#84cc16] shrink-0" />
              {{ vendor.base_location || 'Hub Depot' }}
            </p>
          </div>
        </div>

        <div class="pt-4 mt-4 border-t border-gray-50 flex items-center justify-between">
          <div class="flex items-center space-x-1 text-xs font-black text-[#0A1128]">
            <Star class="w-3.5 h-3.5 fill-[#D4F53C] text-[#D4F53C]" />
            <span class="font-mono">{{ Number(vendor.rating || 5.0).toFixed(1) }}</span>
            <span class="text-[10px] text-gray-400 font-medium">({{ vendor.review_count }})</span>
          </div>
          <span class="text-[10px] font-black text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
            Visit <ArrowRight class="w-3 h-3" />
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>