<script setup lang="ts">
import { Clock, Star, ArrowRight } from '@lucide/vue'

// Define props coming from the parent (index.vue)
defineProps({
  restaurants: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <section id="featured-restaurants" class="py-16 md:py-24 bg-white border-b border-gray-100">
    <div class="max-w-6xl mx-auto px-3.5 sm:px-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div class="space-y-2">
          <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-3.5 py-1 rounded-full inline-block">
            Verified Kitchens
          </span>
          <h2 class="text-3xl sm:text-4xl font-black text-[#0A1128] tracking-tight">Popular Restaurants</h2>
          <p class="text-gray-500 text-sm font-medium">Top-rated spots cooking live right now.</p>
        </div>
        <NuxtLink
          to="/marketplace"
          class="text-xs font-black uppercase tracking-wider text-[#0A1128] hover:text-emerald-700 inline-flex items-center gap-1.5 no-underline"
        >
          <span>View All Restaurants</span>
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>

      <!-- Empty State Check -->
      <div v-if="restaurants.length === 0" class="text-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
        <p class="text-sm font-bold text-gray-400">No active restaurants available right now.</p>
      </div>

      <!-- Restaurant Grid (2 columns on mobile, 4 columns on large screens) -->
      <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <NuxtLink
          v-for="rest in restaurants"
          :key="rest.id"
          :to="`/marketplace?vendor=${rest.id}`"
          class="group rounded-2xl sm:rounded-[28px] border border-gray-100 bg-gray-50/50 hover:bg-white overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 no-underline text-[#0A1128] flex flex-col justify-between"
        >
          <div>
            <div class="relative h-32 sm:h-44 overflow-hidden bg-gray-100">
              <img
                :src="getMediaUrl(rest.cover_image) || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop'"
                :alt="rest.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent"></div>
              <span class="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#D4F53C] text-[#0A1128] text-[8px] sm:text-[10px] font-black uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-xs">
                {{ rest.badge }}
              </span>
              <span v-if="rest.is_open" class="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 text-white text-[10px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5">
                <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse"></span> Open Now
              </span>
              <span v-else class="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 text-rose-300 text-[10px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5">
                <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500"></span> Closed
              </span>
            </div>

            <div class="p-3 sm:p-5 space-y-1.5 sm:space-y-3">
              <div>
                <div class="flex items-center justify-between gap-1 sm:gap-2">
                  <h3 class="text-xs sm:text-base font-black text-[#0A1128] truncate">{{ rest.name }}</h3>
                  <span class="inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-black bg-amber-50 text-amber-700 px-1.5 py-0.5 sm:px-2 rounded-md sm:rounded-lg shrink-0">
                    <Star class="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" /> {{ rest.rating.toFixed(1) }}
                  </span>
                </div>
                <p class="text-[10px] sm:text-xs text-gray-500 font-medium mt-0.5 sm:mt-1 truncate">
                  {{ rest.tags.join(' • ') || 'Restaurant • Meals' }}
                </p>
              </div>
            </div>
          </div>

          <div class="px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3 border-t border-gray-100 flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-gray-500">
            <span class="inline-flex items-center gap-1 shrink-0">
              <Clock class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0A1128]" /> {{ rest.prep_minutes }}m
            </span>
            <span class="truncate">
              <span class="hidden sm:inline">Delivery: </span>
              <strong class="text-[#0A1128]">₦{{ rest.delivery_fee.toLocaleString() }}</strong>
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>