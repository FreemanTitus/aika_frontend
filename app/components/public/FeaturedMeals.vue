<script setup lang="ts">
import { ref, computed } from 'vue'
import { Flame, Clock, Star, ArrowRight, Tag } from '@lucide/vue'

// Define props coming from the parent (index.vue)
const props = defineProps({
  meals: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  categories: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Selected category filter tab (defaults to 'All' or first available key)
const selectedCategory = ref('All')

// Computed filter based on selected tab/category key
const filteredMeals = computed(() => {
  if (selectedCategory.value === 'All') return props.meals
  return props.meals.filter((item) => item.category === selectedCategory.value)
})

const getDisplayPrice = (food: any) => Number(food.current_price ?? food.price ?? 0)

const isDiscountedBonanza = (food: any) => {
  if (!food.bonanza_mode) return false
  const original = Number(food.price ?? 0)
  const current = getDisplayPrice(food)
  return original > 0 && current < original
}

const getStoreItemUrl = (food: any) => {
  const vendorId =
    food?.vendor_id ??
    food?.vendor?.id ??
    food?.vendor_code ??
    food?.store_code ??
    food?.vendor?.vendor_code ??
    food?.vendor?.code ??
    food?.vendor?.store_code ??
    food?.vendor_slug ??
    food?.vendor?.store_slug

  if (!vendorId) {
    return '/marketplace'
  }

  const basePath = `/store/${encodeURIComponent(String(vendorId))}`
  if (food?.id != null && String(food.id).trim() !== '') {
    return `${basePath}?item=${encodeURIComponent(String(food.id))}`
  }

  return basePath
}
</script>

<template>
  <section id="featured-foods" class="py-16 md:py-24 bg-gray-50/70 border-b border-gray-100">
    <div class="max-w-6xl mx-auto px-3.5 sm:px-6">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10">
        <div class="space-y-2">
          <span class="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-3.5 py-1 rounded-full">
            <Flame class="w-3.5 h-3.5" /> Hot Right Now
          </span>
          <h2 class="text-3xl sm:text-4xl font-black text-[#0A1128] tracking-tight">Featured Meals</h2>
          <p class="text-gray-500 text-sm font-medium">Freshly prepared dishes ready for rapid doorstep delivery.</p>
        </div>

        <!-- Dynamic Filter Tabs (Driven by API meal_categories) -->
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            @click="selectedCategory = 'All'"
            :class="[
              selectedCategory === 'All'
                ? 'bg-[#0A1128] text-[#D4F53C] shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
            ]"
            class="px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer"
          >
            All
          </button>
          <button
            v-for="cat in categories"
            :key="cat.key"
            type="button"
            @click="selectedCategory = cat.key"
            :class="[
              selectedCategory === cat.key
                ? 'bg-[#0A1128] text-[#D4F53C] shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
            ]"
            class="px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Empty State / Loading Check -->
      <div v-if="meals.length === 0" class="text-center py-12 bg-white rounded-3xl border border-gray-100">
        <p class="text-sm font-bold text-gray-400">No featured meals available right now. Check back soon!</p>
      </div>

      <!-- Food Cards Grid (2 columns on mobile, 3 columns on large screens) -->
      <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <NuxtLink
          v-for="food in filteredMeals"
          :key="food.id"
          :to="getStoreItemUrl(food)"
          :class="food.bonanza_mode ? 'ring-2 ring-rose-500/70 border-rose-200' : 'border-gray-100'"
          class="group bg-white rounded-2xl sm:rounded-[28px] border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between no-underline text-[#0A1128]"
        >
          <div>
            <div class="relative h-32 sm:h-52 overflow-hidden bg-gray-100">
              <img
                :src="getMediaUrl(food.image) || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop'"
                :alt="food.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div class="absolute top-2 left-2 sm:top-3.5 sm:left-3.5 flex flex-wrap items-center gap-1 sm:gap-1.5">
                <span class="bg-[#0A1128]/90 backdrop-blur-md text-[#D4F53C] text-[8px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 sm:px-3 sm:py-1 rounded-full">
                  {{ food.badge }}
                </span>
                <span
                  v-if="food.bonanza_mode"
                  class="inline-flex items-center gap-0.5 sm:gap-1 bg-rose-600 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-xs"
                >
                  <Tag class="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Bonanza
                </span>
              </div>
              <span class="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-white/95 backdrop-blur-md text-[#0A1128] text-[9px] sm:text-[11px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl shadow-sm flex items-center gap-1">
                <Clock class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" /> {{ food.prep_minutes }}m
              </span>
            </div>

            <div class="p-3 sm:p-5 space-y-1 sm:space-y-2">
              <div class="flex items-center justify-between gap-1 text-[10px] sm:text-xs font-bold text-gray-400">
                <span class="truncate">{{ food.vendor_name }}</span>
                <span class="inline-flex items-center gap-0.5 sm:gap-1 text-[#0A1128] font-black shrink-0">
                  <Star class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400" /> {{ food.vendor_rating.toFixed(1) }}
                </span>
              </div>
              <h3 class="text-xs sm:text-base font-black text-[#0A1128] group-hover:text-emerald-700 transition line-clamp-1">
                {{ food.name }}
              </h3>
            </div>
          </div>

          <div class="px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-2 flex items-center justify-between gap-1.5 border-t border-gray-50">
            <div class="flex flex-col min-w-0">
              <span
                :class="food.bonanza_mode ? 'text-rose-600' : 'text-[#0A1128]'"
                class="text-sm sm:text-lg font-black font-mono leading-none truncate"
              >
                ₦{{ getDisplayPrice(food).toLocaleString() }}
              </span>
              <span
                v-if="isDiscountedBonanza(food)"
                class="text-[10px] sm:text-xs font-bold text-gray-400 line-through font-mono mt-0.5 truncate"
              >
                ₦{{ Number(food.price).toLocaleString() }}
              </span>
            </div>
            <span class="bg-[#D4F53C] group-hover:bg-[#0A1128] text-[#0A1128] group-hover:text-[#D4F53C] text-[10px] sm:text-xs font-black px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl transition inline-flex items-center gap-1 sm:gap-1.5 shrink-0">
              Order <ArrowRight class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          </div>
        </NuxtLink>
      </div>

      <div class="mt-10 text-center">
        <NuxtLink
          to="/marketplace"
          class="inline-flex items-center gap-2 bg-[#0A1128] hover:bg-[#16224a] text-[#D4F53C] font-black text-xs uppercase tracking-wider px-7 py-4 rounded-2xl shadow-lg transition no-underline"
        >
          <span>Browse Full Food Menu</span>
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>