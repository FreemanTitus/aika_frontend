<!-- pages/marketplace/[id].vue -->
<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute, useRouter, useRuntimeConfig } from '#app'
import {
  MapPin,
  Star,
  Info,
  Layers,
  ShoppingBag,
  Clock,
  Store,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft
} from '@lucide/vue'
import { useCart } from '~/composables/useCart'
import VendorRecommendations from '~/components/VendorRecommendations.vue'
import MarketplaceMenuItemRow from '~/components/marketplace/MarketplaceMenuItemRow.vue'
import MarketplaceProductCard from '~/components/marketplace/MarketplaceProductCard.vue'
import MarketplaceMenuOptionModal from '~/components/marketplace/MarketplaceMenuOptionModal.vue'

definePageMeta({
  layout: 'marketplace'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const route = useRoute()
const router = useRouter()

const getStoreId = (): string => {
  const paramId = route.params.id
  return Array.isArray(paramId) ? (paramId[0] || '') : (paramId || '')
}

const storeId = ref<string>(getStoreId())

const { addToCart, cartItemCount, cartTotal, cartItems, updateQuantity, removeFromCart } = useCart()

const isCartDrawerOpen = ref(false)
const activeTab = ref<'catalog' | 'reviews'>('catalog')
const activeSubcategory = ref<string | null>((route.query.subcategory as string) || null)

const storePayload = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<boolean>(false)

// Restaurant Menu Option Modal State
const selectedMenuItem = ref<any>(null)
const activeSelectedOption = ref<any>(null)
const isMenuModalOpen = ref(false)

const getMediaUrl = (url: string | null) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase
  const cleanPath = url.startsWith('/') ? url : `/${url}`
  return `${cleanBase}${cleanPath}`
}

const fetchStoreData = async () => {
  pending.value = true
  error.value = false

  const currentId = getStoreId()
  storeId.value = currentId
  const authToken = useCookie('auth_token')

  let url = `${apiBase}/api/v1/marketplace/vendor/${currentId}`
  if (activeSubcategory.value) {
    url += `?subcategory=${encodeURIComponent(activeSubcategory.value)}`
  }

  try {
    const res: any = await $fetch(url, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })

    const rawData = res?.data || {}
    storePayload.value = {
      vendor_id: rawData.vendor_id,
      company_name: rawData.company_name,
      business_type: rawData.business_type,
      base_location: rawData.base_location,
      rating: rawData.rating !== undefined && rawData.rating !== null ? rawData.rating : 0.0,
      review_count: rawData.review_count || 0,
      is_currently_open: rawData.is_currently_open,
      ratings_distribution: rawData.ratings_distribution || {},
      reviews: rawData.reviews || [],
      storefront_meta: rawData.storefront_meta || {},
      sidebar_categories: rawData.sidebar_categories || [],
      products: rawData.products || [],
      menu_categories: rawData.menu_categories || null
    }
  } catch (err) {
    console.error("Store resolution error:", err)
    error.value = true
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchStoreData()
})

watch(
  () => [route.params.id, route.query.subcategory],
  ([newId, newSubcat]) => {
    storeId.value = Array.isArray(newId) ? (newId[0] || '') : (newId || '')
    activeSubcategory.value = (newSubcat as string) || null
    fetchStoreData()
  }
)

const filterSubcategory = (subCatName: string | null): void => {
  activeSubcategory.value = subCatName
  router.push({
    query: {
      ...route.query,
      subcategory: subCatName || undefined
    }
  })
}

const displayRating = computed(() => {
  const rawRating = storePayload.value?.rating
  const parsed = parseFloat(rawRating as any)
  return isNaN(parsed) ? '0.0' : parsed.toFixed(1)
})

// Unified category list for sidebar (desktop) and chips (mobile)
const categoryList = computed(() => {
  if (!storePayload.value) return []
  if (storePayload.value.business_type === 'e_commerce') {
    return (storePayload.value.sidebar_categories || []).map((cat: any) => ({
      key: String(cat.id),
      label: String(cat.name)
    }))
  }
  return Object.keys(storePayload.value.menu_categories || {}).map((cat) => ({
    key: cat,
    label: cat
  }))
})

const showToast = ref(false)

const resolveStoreItemImage = (item: any, optionOverride: any = null): string => {
  const raw =
    optionOverride?.image ||
    optionOverride?.image_url ||
    item?.image ||
    item?.image_url ||
    item?.food_image ||
    item?.photo ||
    selectedMenuItem.value?.image ||
    selectedMenuItem.value?.image_url ||
    selectedMenuItem.value?.food_image ||
    ''
  if (!raw) return ''
  return getMediaUrl(raw)
}

const handleAddToCart = (item: any) => {
  if (storePayload.value?.business_type === 'restaurant' && item.menu_options && item.menu_options.length > 0) {
    selectedMenuItem.value = item
    activeSelectedOption.value = item.menu_options[0]
    isMenuModalOpen.value = true
    return
  }

  dispatchAddToCart(item)
}

const dispatchAddToCart = (item: any, optionOverride: any = null) => {
  const vendorName = storePayload.value?.company_name || 'AiKA Partner'
  const resolvedImg = resolveStoreItemImage(item, optionOverride)

  const itemToAdd = optionOverride
    ? {
        ...item,
        id: `${item.id}-opt-${optionOverride.id}`,
        name: `${item.name} (${optionOverride.name})`,
        current_price: optionOverride.price,
        price: optionOverride.price,
        selected_option_id: optionOverride.id,
        image: resolvedImg
      }
    : {
        ...item,
        image: resolvedImg
      }

  addToCart(itemToAdd, String(storeId.value), vendorName)
  isMenuModalOpen.value = false
  selectedMenuItem.value = null
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2500)
}

const closeMenuModal = (): void => {
  isMenuModalOpen.value = false
}

const confirmMenuOption = (): void => {
  dispatchAddToCart(selectedMenuItem.value, activeSelectedOption.value)
}
</script>

<template>
  <div class="relative min-h-screen bg-[#F8FAFC] pb-24 text-left font-sans selection:bg-[#D4F53C] selection:text-[#0A1128]">

    <!-- ===================== LOADING SKELETON ===================== -->
    <div v-if="pending && !storePayload" class="mx-auto max-w-7xl space-y-6 px-4 pt-5 sm:px-6" aria-busy="true" aria-label="Loading storefront">
      <div class="shimmer h-44 w-full rounded-3xl sm:h-60"></div>
      <div class="space-y-3">
        <div class="shimmer h-7 w-64 rounded-lg"></div>
        <div class="shimmer h-4 w-80 max-w-full rounded-md"></div>
      </div>
      <div class="shimmer h-12 w-72 rounded-2xl"></div>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div v-for="n in 8" :key="n" class="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div class="shimmer aspect-square w-full"></div>
          <div class="space-y-3 p-4">
            <div class="shimmer h-5 w-20 rounded-full"></div>
            <div class="shimmer h-4 w-full rounded-md"></div>
            <div class="flex items-center justify-between pt-2">
              <div class="shimmer h-5 w-16 rounded-md"></div>
              <div class="shimmer h-10 w-10 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== ERROR STATE ===================== -->
    <div v-else-if="error || !storePayload" class="mx-auto max-w-md px-4 py-24 text-center">
      <div class="flex flex-col items-center space-y-5 rounded-3xl border border-gray-200 bg-white p-10">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle class="h-7 w-7" />
        </div>
        <div class="space-y-1">
          <h2 class="text-base font-extrabold text-[#0A1128]">Catalog Resolution Error</h2>
          <p class="text-xs font-medium leading-relaxed text-gray-500">Could not load this storefront.</p>
        </div>
        <div class="flex w-full flex-col gap-2.5">
          <button
            @click="fetchStoreData"
            class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[#0A1128] py-3.5 text-xs font-bold text-white outline-none transition-colors hover:bg-[#16224a] focus-visible:ring-2 focus-visible:ring-[#D4F53C]"
          >
            <RefreshCw class="h-4 w-4" />
            Retry Connection
          </button>
          <NuxtLink
            to="/marketplace"
            class="block w-full rounded-xl bg-gray-100 py-3.5 text-center text-xs font-bold text-gray-700 no-underline transition-colors hover:bg-gray-200"
          >
            Return to Marketplace
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-else>

      <!-- ===================== COMPACT STORE HEADER ===================== -->
      <div class="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <NuxtLink
          to="/marketplace"
          class="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 no-underline transition-colors hover:text-[#0A1128]"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          All storefronts
        </NuxtLink>

        <!-- Cover with Integrated Store Info -->
        <div class="relative flex min-h-[210px] w-full flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A1128] via-[#16224a] to-emerald-700 p-5 sm:min-h-[250px] sm:p-8">
          <div
            v-if="storePayload.storefront_meta?.hero_image"
            :style="{ backgroundImage: `url(${getMediaUrl(storePayload.storefront_meta.hero_image)})` }"
            class="absolute inset-0 bg-cover bg-center"
          ></div>
          <div class="absolute inset-0 bg-gradient-to-t from-[#0A1128]/95 via-[#0A1128]/55 to-[#0A1128]/25"></div>

          <!-- Top Badges -->
          <div class="relative z-10 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-[#D4F53C] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0A1128]">
              <Sparkles class="h-3 w-3" />
              Certified Storefront
            </span>
            <span
              :class="storePayload.is_currently_open ? 'text-emerald-700' : 'text-rose-700'"
              class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide"
            >
              <span :class="storePayload.is_currently_open ? 'bg-emerald-500' : 'bg-rose-500'" class="h-1.5 w-1.5 rounded-full"></span>
              {{ storePayload.is_currently_open ? 'Open Now' : 'Closed' }}
            </span>
          </div>

          <!-- Bottom Store Name, Location & Rating Overlay -->
          <div class="relative z-10 mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div class="min-w-0 space-y-1.5">
              <h1 class="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                {{ storePayload.company_name || 'AiKA Partner' }}
              </h1>
              <p v-if="storePayload.storefront_meta?.tagline" class="text-xs font-semibold text-[#D4F53C] sm:text-sm">
                "{{ storePayload.storefront_meta.tagline }}"
              </p>
              <p class="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                <MapPin class="h-4 w-4 shrink-0 text-[#D4F53C]" />
                {{ storePayload.base_location || 'Operational Grid Hub Depot' }}
              </p>
            </div>

            <button
              type="button"
              @click="activeTab = 'reviews'"
              class="inline-flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-md outline-none transition-colors hover:border-[#D4F53C]/50 hover:bg-white/15 sm:self-end"
              aria-label="View reviews"
            >
              <Star class="h-4 w-4 fill-[#D4F53C] text-[#D4F53C]" />
              <span class="text-lg font-extrabold leading-none text-white">{{ displayRating }}</span>
              <span class="text-xs font-bold text-gray-300">({{ storePayload.review_count }})</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ===================== STORE CLOSED NOTICE ===================== -->
      <div v-if="!storePayload.is_currently_open" class="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl space-y-6 rounded-3xl border border-rose-100 bg-white p-8 text-center sm:p-14">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600">
            <Clock class="h-10 w-10 stroke-[2.5]" />
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-extrabold tracking-tight text-[#0A1128] sm:text-3xl">{{ storePayload.company_name }} is Currently Closed</h2>
            <p class="mx-auto max-w-md text-xs leading-relaxed text-gray-500 sm:text-sm">
              This merchant is not accepting orders at the moment. Product listings and catalog menus are temporarily unavailable until business hours resume.
            </p>
          </div>
          <div class="flex justify-center border-t border-gray-100 pt-5">
            <NuxtLink to="/marketplace" class="inline-block rounded-xl bg-[#0A1128] px-7 py-3.5 text-xs font-bold text-white no-underline transition-colors hover:bg-[#16224a]">
              Browse Open Storefronts
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- ===================== STORE OPEN VIEWPORT ===================== -->
      <template v-else>

        <!-- Sticky tabs + mobile category chips -->
        <div class="sticky top-0 z-30 mt-6 border-y border-gray-200 bg-white/95 backdrop-blur-md">
          <div class="mx-auto max-w-7xl space-y-2.5 px-4 py-3 sm:px-6">
            <div role="tablist" class="flex max-w-sm items-center gap-1 rounded-2xl border border-gray-200 bg-gray-100 p-1">
              <button
                role="tab"
                :aria-selected="activeTab === 'catalog'"
                @click="activeTab = 'catalog'"
                :class="activeTab === 'catalog' ? 'bg-[#0A1128] text-white' : 'bg-transparent text-gray-500 hover:text-[#0A1128]'"
                class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-2.5 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0A1128]"
              >
                <Store class="h-4 w-4" />
                Catalog / Menu
              </button>
              <button
                role="tab"
                :aria-selected="activeTab === 'reviews'"
                @click="activeTab = 'reviews'"
                :class="activeTab === 'reviews' ? 'bg-[#0A1128] text-white' : 'bg-transparent text-gray-500 hover:text-[#0A1128]'"
                class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-2.5 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0A1128]"
              >
                <MessageSquare class="h-4 w-4" />
                Reviews
                <span
                  :class="activeTab === 'reviews' ? 'bg-[#D4F53C] text-[#0A1128]' : 'bg-white text-gray-500'"
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none"
                >{{ storePayload.review_count }}</span>
              </button>
            </div>

            <!-- Mobile category chips (sidebar is desktop-only) -->
            <div
              v-if="activeTab === 'catalog' && categoryList.length > 0"
              class="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 lg:hidden"
            >
              <button
                @click="filterSubcategory(null)"
                :class="!activeSubcategory ? 'border-[#0A1128] bg-[#0A1128] text-white' : 'border-gray-200 bg-white text-gray-600'"
                class="shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-bold outline-none transition-colors"
              >
                All items
              </button>
              <button
                v-for="cat in categoryList"
                :key="cat.key"
                @click="filterSubcategory(cat.label)"
                :class="activeSubcategory === cat.label ? 'border-[#0A1128] bg-[#0A1128] text-white' : 'border-gray-200 bg-white text-gray-600'"
                class="shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-bold outline-none transition-colors"
              >
                {{ cat.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6">

          <!-- Brand bio (e-commerce) -->
          <div
            v-if="storePayload.business_type === 'e_commerce' && storePayload.storefront_meta?.brand_bio"
            class="mb-6 rounded-3xl border border-gray-200 bg-white p-6 text-left"
          >
            <h3 class="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#0A1128]">
              <Info class="h-4 w-4 text-[#84cc16]" />
              About our identity
            </h3>
            <p class="max-w-4xl text-xs font-medium leading-relaxed text-gray-600 sm:text-sm">
              {{ storePayload.storefront_meta.brand_bio }}
            </p>
          </div>

          <!-- TAB 1: CATALOG -->
          <div v-if="activeTab === 'catalog'" class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">

            <!-- Desktop sidebar -->
            <aside class="sticky top-28 hidden space-y-4 lg:col-span-3 lg:block">
              <div class="rounded-3xl border border-gray-200 bg-white p-4">
                <h3 class="mb-3 flex items-center gap-2 border-b border-gray-100 px-2 pb-2.5 text-xs font-extrabold text-gray-400">
                  <Layers class="h-4 w-4 text-[#84cc16]" />
                  Categories
                </h3>
                <div class="space-y-1">
                  <button
                    @click="filterSubcategory(null)"
                    :class="!activeSubcategory ? 'bg-[#0A1128] font-extrabold text-[#D4F53C]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128]'"
                    class="flex w-full cursor-pointer items-center justify-between rounded-xl border-0 bg-transparent px-4 py-2.5 text-left text-xs font-bold outline-none transition-colors"
                  >
                    <span>All Items</span>
                  </button>
                  <button
                    v-for="cat in categoryList"
                    :key="cat.key"
                    @click="filterSubcategory(cat.label)"
                    :class="activeSubcategory === cat.label ? 'bg-[#0A1128] font-extrabold text-[#D4F53C]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128]'"
                    class="flex w-full cursor-pointer items-center justify-between rounded-xl border-0 bg-transparent px-4 py-2.5 text-left text-xs font-bold outline-none transition-colors"
                  >
                    <span class="truncate pr-2">{{ cat.label }}</span>
                  </button>
                </div>
              </div>
            </aside>

            <!-- Feed -->
            <main
              class="w-full space-y-10 transition-opacity duration-200 lg:col-span-9"
              :class="pending ? 'pointer-events-none opacity-60' : ''"
            >

              <!-- E-Commerce grid -->
              <div v-if="storePayload.business_type === 'e_commerce'">
                <div v-if="storePayload.products.length > 0" class="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <MarketplaceProductCard
                    v-for="item in storePayload.products"
                    :key="item.id"
                    :item="item"
                    @add="handleAddToCart"
                  />
                </div>

                <div v-else class="space-y-4 rounded-3xl border border-gray-200 bg-white py-20 text-center">
                  <ShoppingBag class="mx-auto h-10 w-10 stroke-[1.5] text-gray-300" />
                  <p class="text-xs font-bold text-gray-400">No active stock matching this section category index.</p>
                  <button
                    v-if="activeSubcategory"
                    @click="filterSubcategory(null)"
                    class="cursor-pointer rounded-xl border-0 bg-[#0A1128] px-5 py-3 text-xs font-bold text-white outline-none transition-colors hover:bg-[#16224a]"
                  >
                    Show all items
                  </button>
                </div>
              </div>

              <!-- Restaurant menu -->
              <div v-else class="w-full space-y-10 text-left">
                <section
                  v-for="(products, menuCategoryName) in storePayload.menu_categories"
                  :key="menuCategoryName"
                  class="space-y-4"
                >
                  <h2 class="flex items-center justify-between border-b border-gray-200 pb-3 text-base font-extrabold tracking-tight text-[#0A1128]">
                    <span>{{ menuCategoryName }}</span>
                  </h2>

                  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <MarketplaceMenuItemRow
                      v-for="item in products"
                      :key="item.id"
                      :item="item"
                      @add="handleAddToCart"
                    />
                  </div>
                </section>
              </div>

            </main>
          </div>

          <!-- TAB 2: REVIEWS -->
          <div v-else-if="activeTab === 'reviews'" class="w-full text-left">
            <div class="space-y-6 rounded-3xl border border-gray-200 bg-white p-5 sm:p-10">

              <div class="flex flex-col justify-between gap-5 border-b border-gray-100 pb-6 sm:flex-row sm:items-center">
                <div>
                  <h3 class="text-xl font-extrabold tracking-tight text-[#0A1128]">Customer Reviews &amp; Ratings</h3>
                  <p class="mt-1 text-xs font-medium text-gray-400">Verified feedback from customers who completed orders with this storefront.</p>
                </div>
                <div class="flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3">
                  <Star class="h-6 w-6 fill-amber-400 text-amber-400" />
                  <div>
                    <div class="flex items-baseline gap-1.5">
                      <span class="text-xl font-extrabold text-[#0A1128]">{{ displayRating }}</span>
                      <span class="text-xs font-bold text-gray-400">/ 5.0</span>
                    </div>
                    <p class="text-[11px] font-bold text-gray-400">{{ storePayload.review_count }} total ratings</p>
                  </div>
                </div>
              </div>

              <div
                v-if="!storePayload.reviews || storePayload.reviews.length === 0"
                class="rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center text-xs font-bold text-gray-400"
              >
                <MessageSquare class="mx-auto mb-3 h-10 w-10 stroke-[1.5] text-gray-300" />
                No reviews yet. Be the first to leave a review after completing an order!
              </div>

              <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div
                  v-for="review in storePayload.reviews"
                  :key="review.id"
                  class="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-5"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A1128] text-xs font-extrabold text-[#D4F53C]">
                        {{ review.customer_name ? review.customer_name.charAt(0).toUpperCase() : 'U' }}
                      </div>
                      <div>
                        <h4 class="text-xs font-extrabold text-[#0A1128]">{{ review.customer_name }}</h4>
                        <p class="text-[10px] font-semibold text-gray-400">{{ new Date(review.created_at).toLocaleDateString() }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1">
                      <Star class="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span class="text-xs font-extrabold text-amber-700">{{ review.rating }}.0</span>
                    </div>
                  </div>
                  <p class="text-xs font-medium leading-relaxed text-gray-600">
                    {{ review.comment || 'No written comment provided.' }}
                  </p>
                </div>
              </div>

            </div>
          </div>

          <!-- RECOMMENDATIONS -->
          <div class="mt-20 border-t border-gray-200 pt-10">
            <VendorRecommendations
              :category="storePayload.business_type === 'restaurant' ? 'restaurants' : 'e_commerce'"
              :limit="4"
            />
          </div>
        </div>
      </template>

      <!-- FLOATING MOBILE CART BAR -->
      <Transition name="slide-up">
        <div v-if="cartItemCount > 0" class="fixed inset-x-0 bottom-4 z-40 px-4 sm:hidden">
          <div class="flex items-center justify-between rounded-2xl bg-[#0A1128] px-5 py-3.5 text-white shadow-2xl border border-white/10 backdrop-blur-md">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4F53C] text-xs font-black text-[#0A1128]">
                {{ cartItemCount }}
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Items</p>
                <p class="text-sm font-black text-[#D4F53C]">₦{{ cartTotal.toLocaleString() }}</p>
              </div>
            </div>
            <button
              @click="isCartDrawerOpen = true"
              class="cursor-pointer rounded-xl bg-[#D4F53C] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#0A1128] transition-transform active:scale-95 border-0"
            >
              View Cart
            </button>
          </div>
        </div>
      </Transition>

      <!-- MENU OPTION MODAL -->
      <Transition name="fade">
        <MarketplaceMenuOptionModal
          v-if="isMenuModalOpen && selectedMenuItem"
          :item="selectedMenuItem"
          v-model="activeSelectedOption"
          @close="closeMenuModal"
          @confirm="confirmMenuOption"
        />
      </Transition>

      <!-- TOAST -->
      <Transition name="fade">
        <div
          v-if="showToast"
          role="status"
          class="fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-[#0A1128] px-5 py-3.5 text-xs font-bold text-[#D4F53C] sm:left-auto sm:right-6 sm:translate-x-0"
        >
          <CheckCircle2 class="h-4 w-4" />
          Item successfully added to cart!
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(30px);
  opacity: 0;
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
  .fade-enter-active, .fade-leave-active, .slide-up-enter-active, .slide-up-leave-active { transition: none; }
}
</style>