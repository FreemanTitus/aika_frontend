<!-- pages/marketplace/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import {
  Utensils,
  Shirt,
  Store,
  Search,
  Building2,
  Flame,
  Bike,
  ShieldCheck,
  Clock,
  ShoppingBag,
  Wrench,
  PackageCheck,
  BadgeCheck,
  Handshake,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles
} from '@lucide/vue'
import MarketplaceVendorCard from '~/components/MarketplaceVendorCard.vue'


definePageMeta({
  layout: 'marketplace'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

type MarketTab = 'restaurants' | 'ecommerce' | 'others'
const activeTab = ref<MarketTab>('restaurants')
const searchQuery = ref<string>('')
const selectedLocationId = useCookie('customer_location_id')

// Quick filters
const openNowOnly = ref<boolean>(false)
const featuredOnly = ref<boolean>(false)

const switchTab = (tab: MarketTab): void => {
  activeTab.value = tab
}

// Reactive states for data, loading, and error handling
const response = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<boolean>(false)

// Fetch function that triggers reliably on every client-side route transition
const fetchVendors = async () => {
  pending.value = true
  error.value = false

  const authToken = useCookie('auth_token')

  try {
    // Build query parameters dynamically if location ID is selected
    const queryParams: Record<string, any> = {}
    if (selectedLocationId.value) {
      queryParams.customer_location_id = selectedLocationId.value
    }

    const res: any = await $fetch(`${apiBase}/api/v1/marketplace/vendors`, {
      method: 'GET',
      params: queryParams, // <--- Passes customer_location_id to backend
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    response.value = res
  } catch (err) {
    console.error("Telemetry sync error:", err)
    error.value = true
  } finally {
    pending.value = false
  }
}
// Trigger fetch immediately when component mounts on route change
onMounted(() => {
  fetchVendors()
})

// Transform or extract your data safely
const vendorsData = computed(() => {
  const res = response.value?.data || response.value || {}
  return {
    restaurants: res.restaurants || [],
    e_commerce: res.e_commerce || [],
    other_businesses: res.other_businesses || []
  }
})

// Live counts for the category tabs
const tabCounts = computed(() => ({
  restaurants: vendorsData.value.restaurants.length,
  ecommerce: vendorsData.value.e_commerce.length,
  others: vendorsData.value.other_businesses.length
}))

// Client Side Live Filtering Engine
const filteredVendors = computed(() => {
  if (!response.value) return []

  let targetCollection: any[] = []
  if (activeTab.value === 'restaurants') targetCollection = vendorsData.value.restaurants
  else if (activeTab.value === 'ecommerce') targetCollection = vendorsData.value.e_commerce
  else targetCollection = vendorsData.value.other_businesses

  let result = targetCollection

  if (openNowOnly.value) result = result.filter((shop: any) => shop.is_currently_open)
  if (featuredOnly.value) result = result.filter((shop: any) => shop.is_featured_recommendation)

  if (!searchQuery.value.trim()) return result

  const query = searchQuery.value.toLowerCase().trim()
  return result.filter((shop: any) =>
    shop.company_name?.toLowerCase().includes(query) ||
    shop.default_pickup_address?.toLowerCase().includes(query)
  )
})

const hasActiveFilters = computed(
  () => !!searchQuery.value.trim() || openNowOnly.value || featuredOnly.value
)

const clearFilters = (): void => {
  searchQuery.value = ''
  openNowOnly.value = false
  featuredOnly.value = false
}

// Tab definitions (labels + icons + counts)
const tabs = computed(() => [
  { key: 'restaurants' as MarketTab, label: 'Restaurants', icon: Utensils, count: tabCounts.value.restaurants },
  { key: 'ecommerce' as MarketTab, label: 'E-Commerce', icon: Shirt, count: tabCounts.value.ecommerce },
  { key: 'others' as MarketTab, label: 'Services & Others', icon: Store, count: tabCounts.value.others }
])

// Hero content adapts to the active category
const hero = computed(() => {
  if (activeTab.value === 'restaurants') {
    return {
      badgeIcon: Flame,
      badge: 'Hot meals, delivered fast',
      title: 'Craving something good? Get fresh food in minutes.',
      pills: [
        { icon: Bike, text: 'Instant dispatch' },
        { icon: ShieldCheck, text: 'Verified kitchens' },
        { icon: Clock, text: '15-30m delivery' }
      ]
    }
  }
  if (activeTab.value === 'ecommerce') {
    return {
      badgeIcon: ShoppingBag,
      badge: 'Retail storefronts online',
      title: 'Shop top retail brands, straight from store to door.',
      pills: [
        { icon: PackageCheck, text: 'Direct merchant fulfillment' },
        { icon: ShieldCheck, text: 'Verified sellers' },
        { icon: Bike, text: 'Rider delivery' }
      ]
    }
  }
  return {
    badgeIcon: Wrench,
    badge: 'Local services & businesses',
    title: 'Find verified local services and commercial partners.',
    pills: [
      { icon: BadgeCheck, text: 'Certified providers' },
      { icon: Handshake, text: 'Independent businesses' },
      { icon: ShieldCheck, text: 'Vetted storefronts' }
    ]
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-left font-sans selection:bg-[#D4F53C] selection:text-[#0A1128]">

    <!-- ===================== COMPACT HERO ===================== -->
    <section class="relative overflow-hidden bg-[#0A1128] px-5 py-8 text-white sm:px-8 md:py-12">
      <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D4F53C]/10 blur-[100px]"></div>

      <div class="relative z-10 mx-auto max-w-7xl space-y-4">
        <span class="inline-flex items-center gap-2 rounded-full bg-[#D4F53C] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#0A1128]">
          <component :is="hero.badgeIcon" class="h-3.5 w-3.5" />
          {{ hero.badge }}
        </span>

        <h1 class="max-w-3xl text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
          {{ hero.title }}
        </h1>

        <!-- Value pills -->
        <ul class="flex flex-wrap gap-2 pt-1">
          <li
            v-for="pill in hero.pills"
            :key="pill.text"
            class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200"
          >
            <component :is="pill.icon" class="h-3.5 w-3.5 text-[#D4F53C]" />
            {{ pill.text }}
          </li>
        </ul>
      </div>
    </section>

    <!-- ===================== STICKY DISCOVERY BAR ===================== -->
    <div class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div class="mx-auto max-w-7xl space-y-3 px-5 py-3 sm:px-8">

        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <!-- Category tabs with live counts -->
          <div
            role="tablist"
            aria-label="Marketplace categories"
            class="no-scrollbar flex max-w-full items-center gap-1 self-start overflow-x-auto rounded-2xl border border-gray-200 bg-gray-100 p-1"
          >
            <button
              v-for="tab in tabs"
              :key="tab.key"
              role="tab"
              :aria-selected="activeTab === tab.key"
              @click="switchTab(tab.key)"
              :class="activeTab === tab.key ? 'bg-[#0A1128] text-white' : 'bg-transparent text-gray-500 hover:text-[#0A1128]'"
              class="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border-0 px-4 py-2.5 text-xs font-bold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#0A1128]"
            >
              <component :is="tab.icon" class="h-4 w-4" />
              <span>{{ tab.label }}</span>
              <span
                :class="activeTab === tab.key ? 'bg-[#D4F53C] text-[#0A1128]' : 'bg-white text-gray-500'"
                class="rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none"
              >
                {{ pending ? '–' : tab.count }}
              </span>
            </button>
          </div>

          <!-- Search -->
          <div class="relative w-full md:max-w-sm">
            <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search vendor name or address..."
              aria-label="Search vendors"
              class="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-xs font-semibold text-[#0A1128] placeholder-gray-400 transition-colors focus:border-[#0A1128] focus:bg-white focus:outline-none"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              aria-label="Clear search"
              class="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-gray-200 text-gray-600 outline-none transition-colors hover:bg-gray-300"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Quick filters -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="openNowOnly = !openNowOnly"
            :aria-pressed="openNowOnly"
            :class="openNowOnly ? 'border-[#0A1128] bg-[#0A1128] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold outline-none transition-colors"
          >
            <span :class="openNowOnly ? 'bg-[#D4F53C]' : 'bg-emerald-500'" class="h-1.5 w-1.5 rounded-full"></span>
            Open now
          </button>

          <button
            @click="featuredOnly = !featuredOnly"
            :aria-pressed="featuredOnly"
            :class="featuredOnly ? 'border-[#0A1128] bg-[#0A1128] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold outline-none transition-colors"
          >
            <Sparkles :class="featuredOnly ? 'text-[#D4F53C]' : 'text-gray-400'" class="h-3.5 w-3.5" />
            Featured
          </button>

          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="inline-flex cursor-pointer items-center gap-1 rounded-full border-0 bg-transparent px-2 py-1.5 text-[11px] font-bold text-emerald-700 outline-none hover:underline"
          >
            <X class="h-3 w-3" />
            Clear all
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== VENDOR GRID ===================== -->
    <main class="mx-auto max-w-7xl px-5 py-8 sm:px-8 md:py-10">

      <!-- Loading: 8-card shimmer skeleton matching VendorCard -->
      <div v-if="pending" class="space-y-6" aria-busy="true" aria-label="Loading storefronts">
        <div class="shimmer h-7 w-48 rounded-lg"></div>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div
            v-for="n in 8"
            :key="n"
            class="flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white"
          >
            <div class="shimmer aspect-video w-full"></div>
            <div class="flex flex-1 flex-col px-4 pb-4">
              <div class="shimmer -mt-7 mb-3 h-14 w-14 rounded-2xl border-[3px] border-white"></div>
              <div class="shimmer h-4 w-3/4 rounded-md"></div>
              <div class="shimmer mt-3 h-3 w-full rounded-md"></div>
              <div class="shimmer mt-2 h-3 w-2/3 rounded-md"></div>
              <div class="flex items-center gap-2 pt-5">
                <div class="shimmer h-6 w-16 rounded-full"></div>
                <div class="shimmer ml-auto h-6 w-14 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="mx-auto max-w-md space-y-4 rounded-3xl border border-gray-200 bg-white p-10 text-center"
      >
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertCircle class="h-7 w-7" />
        </div>
        <h3 class="text-base font-extrabold text-[#0A1128]">Connection Timeout</h3>
        <p class="text-xs leading-relaxed text-gray-500">Could not fetch vendors.</p>
        <button
          @click="fetchVendors"
          class="inline-flex cursor-pointer items-center gap-2 rounded-xl border-0 bg-[#0A1128] px-5 py-3 text-xs font-bold text-white outline-none transition-colors hover:bg-[#16224a] focus-visible:ring-2 focus-visible:ring-[#D4F53C]"
        >
          <RefreshCw class="h-4 w-4" />
          Retry Connection
        </button>
      </div>

      <!-- Results -->
      <div v-else class="space-y-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="text-xl font-extrabold tracking-tight text-[#0A1128] sm:text-2xl">Available Storefronts</h2>
            <p class="mt-1 text-xs font-medium text-gray-500">Showing active partners sorted by subscription value and reputation.</p>
          </div>
          <span class="shrink-0 rounded-full bg-[#0A1128] px-3.5 py-1.5 text-xs font-extrabold text-[#D4F53C]">
            {{ filteredVendors.length }} active
          </span>
        </div>

        <!-- Grid -->
        <div
          v-if="filteredVendors.length > 0"
          class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <MarketplaceVendorCard
            v-for="shop in filteredVendors"
            :key="shop.id"
            :shop="shop"
          />
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="mx-auto max-w-md space-y-4 rounded-3xl border border-gray-200 bg-white px-8 py-16 text-center"
        >
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <Building2 class="h-7 w-7 stroke-[1.5]" />
          </div>
          <div class="space-y-1.5">
            <h4 class="text-base font-extrabold text-[#0A1128]">No Storefronts Found</h4>
            <p class="mx-auto max-w-xs text-xs font-medium leading-relaxed text-gray-500">
              We couldn't locate any active merchants matching your query inside this category right now.
            </p>
          </div>
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="inline-flex cursor-pointer items-center gap-2 rounded-xl border-0 bg-[#0A1128] px-5 py-3 text-xs font-bold text-white outline-none transition-colors hover:bg-[#16224a] focus-visible:ring-2 focus-visible:ring-[#D4F53C]"
          >
            <X class="h-4 w-4" />
            Clear Filters
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.shimmer {
  background: linear-gradient(90deg, #eef0f3 25%, #f8f9fb 50%, #eef0f3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .shimmer { animation: none; }
}
</style>
