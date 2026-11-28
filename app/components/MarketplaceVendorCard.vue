<!-- components/VendorCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Store, MapPin, Star, Clock, Sparkles } from '@lucide/vue'

interface Vendor {
  id: string | number
  company_name?: string
  default_pickup_address?: string
  banner_image?: string | null
  hero_image?: string | null
  logo?: string | null
  rating?: string | number | null
  is_currently_open?: boolean
  is_featured_recommendation?: boolean
  [key: string]: any
}

const props = defineProps<{
  shop: Vendor
}>()

const formatRating = (rating: any): string => {
  const parsed = parseFloat(rating)
  return isNaN(parsed) ? '4.8' : parsed.toFixed(1)
}

const coverSrc = computed(() => props.shop.banner_image || props.shop.hero_image || '')
</script>

<template>
  <NuxtLink
    :to="`/marketplace/store/${shop.id}`"
    class="group flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200 bg-white text-left no-underline transition-colors duration-200 hover:border-[#0A1128]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A1128]"
  >
    <!-- Cover -->
    <div class="relative aspect-[4/3] sm:aspect-video w-full overflow-hidden bg-gradient-to-br from-[#0A1128] via-[#16224a] to-emerald-700">
      <img
        v-if="coverSrc"
        :src="getMediaUrl(coverSrc)"
        :alt="shop.company_name"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div v-else class="flex h-full w-full items-center justify-center">
        <Store class="h-7 w-7 sm:h-10 sm:w-10 text-white/30" />
      </div>

      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"></div>

      <!-- Featured pill (top-left) -->
      <span
        v-if="shop.is_featured_recommendation"
        class="absolute left-2 top-2 sm:left-3 sm:top-3 inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-[#D4F53C] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wide text-[#0A1128]"
      >
        <Sparkles class="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        Featured
      </span>

      <!-- Status badge (top-right) -->
      <span
        :class="shop.is_currently_open ? 'bg-white text-emerald-700' : 'bg-white text-rose-700'"
        class="absolute right-2 top-2 sm:right-3 sm:top-3 inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wide"
      >
        <span
          :class="shop.is_currently_open ? 'bg-emerald-500' : 'bg-rose-500'"
          class="h-1.5 w-1.5 rounded-full"
        ></span>
        {{ shop.is_currently_open ? 'Open' : 'Closed' }}<span class="hidden sm:inline">{{ shop.is_currently_open ? ' Now' : '' }}</span>
      </span>
    </div>

    <!-- Body -->
    <div class="flex flex-1 flex-col px-2.5 pb-2.5 sm:px-4 sm:pb-4">
      <!-- Overlapping logo -->
      <div class="-mt-5 mb-2 sm:-mt-7 sm:mb-3 flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border-2 sm:border-[3px] border-white bg-white text-xs sm:text-base font-extrabold uppercase text-[#0A1128] ring-1 ring-gray-200">
        <img
          v-if="shop.logo"
          :src="getMediaUrl(shop.logo)"
          :alt="`${shop.company_name} logo`"
          class="h-full w-full object-cover"
        />
        <span v-else>{{ shop.company_name ? shop.company_name.charAt(0) : 'M' }}</span>
      </div>

      <h3 class="truncate text-xs sm:text-base font-extrabold tracking-tight text-[#0A1128] transition-colors group-hover:text-emerald-700">
        {{ shop.company_name }}
      </h3>

      <p class="mt-1 sm:mt-1.5 flex items-start gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium leading-snug sm:leading-relaxed text-gray-500">
        <MapPin class="mt-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-gray-400" />
        <span class="line-clamp-1 sm:line-clamp-2">{{ shop.default_pickup_address || 'Central Delivery Hub' }}</span>
      </p>

      <!-- Meta row -->
      <div class="mt-auto flex items-center justify-between gap-1 sm:gap-2 pt-2.5 sm:pt-4">
        <span class="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-gray-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-bold text-gray-600">
          <Clock class="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-gray-400" />
          15-30m
        </span>
        <span class="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-extrabold text-[#0A1128]">
          <Star class="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 fill-amber-500 text-amber-500" />
          {{ formatRating(shop.rating) }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>