<script setup lang="ts">
import { ref, computed } from 'vue'
import { Flame, Clock, Star, ArrowRight } from '@lucide/vue'

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
</script>

<template>
  <section id="featured-foods" class="py-16 md:py-24 bg-gray-50/70 border-b border-gray-100">
    <div class="max-w-6xl mx-auto px-6">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
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

      <!-- Food Cards Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="food in filteredMeals"
          :key="food.id"
          :to="`/marketplace?vendor=${food.vendor_id}`"
          class="group bg-white rounded-[28px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between no-underline text-[#0A1128]"
        >
          <div>
            <div class="relative h-52 overflow-hidden bg-gray-100">
              <img
                :src="getMediaUrl(food.image) || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop'"
                :alt="food.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span class="absolute top-3.5 left-3.5 bg-[#0A1128]/90 backdrop-blur-md text-[#D4F53C] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                {{ food.badge }}
              </span>
              <span class="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-[#0A1128] text-[11px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1">
                <Clock class="w-3 h-3 text-emerald-600" /> {{ food.prep_minutes }} mins
              </span>
            </div>

            <div class="p-5 space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-gray-400">
                <span>{{ food.vendor_name }}</span>
                <span class="inline-flex items-center gap-1 text-[#0A1128] font-black">
                  <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {{ food.vendor_rating.toFixed(1) }}
                </span>
              </div>
              <h3 class="text-base font-black text-[#0A1128] group-hover:text-emerald-700 transition line-clamp-1">
                {{ food.name }}
              </h3>
            </div>
          </div>

          <div class="px-5 pb-5 pt-2 flex items-center justify-between border-t border-gray-50">
            <span class="text-lg font-black text-[#0A1128] font-mono">₦{{ food.price.toLocaleString() }}</span>
            <span class="bg-[#D4F53C] group-hover:bg-[#0A1128] text-[#0A1128] group-hover:text-[#D4F53C] text-xs font-black px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5">
              Order <ArrowRight class="w-3.5 h-3.5" />
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