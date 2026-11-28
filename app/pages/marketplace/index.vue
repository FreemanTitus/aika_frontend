<!-- pages/marketplace/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
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
  Sparkles,
  LayoutGrid,
  UtensilsCrossed,
  Loader2
} from '@lucide/vue'
import MarketplaceVendorCard from '~/components/MarketplaceVendorCard.vue'
import MarketplaceProductCard from '~/components/MarketplaceProductCard.vue'
import { useCart } from '~/composables/useCart'

definePageMeta({
  layout: 'marketplace'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const route = useRoute()

const { cartItems, addToCart, updateQuantity } = useCart()

const getItemQuantity = (productId: number | string): number => {
  const found = cartItems.value.find(item => String(item.id) === String(productId))
  return found ? Number(found.quantity || 0) : 0
}

const onAddToCart = async (payload: {
  item: Record<string, any>
  vendor: Record<string, any>
  quantity: number
}) => {
  const storeId = String(payload.vendor?.id || payload.item?.vendor_id || '')
  const storeName = String(payload.vendor?.company_name || payload.item?.vendor_name || '')
  await addToCart(payload.item, storeId, storeName, payload.quantity || 1, false)
}

const onUpdateCartQuantity = async (payload: {
  item: Record<string, any>
  vendor: Record<string, any>
  quantity: number
}) => {
  const productId = payload.item?.id
  if (!productId) return

  const currentQty = getItemQuantity(productId)
  const targetQty = Math.max(0, Number(payload.quantity) || 0)

  if (targetQty > currentQty) {
    await updateQuantity(productId, 'increment')
  } else if (targetQty < currentQty) {
    await updateQuantity(productId, 'decrement')
  }
}


// Build a quick lookup map from fetched vendors (by id and normalized name)
const vendorCodeByKey = computed(() => {
  const res = response.value?.data || response.value || {}
  const allVendors = [
    ...(res.restaurants || []),
    ...(res.e_commerce || []),
    ...(res.other_businesses || [])
  ]

  const map = new Map<string, string>()
  for (const v of allVendors) {
    const code = v?.vendor_code || v?.code || v?.store_code || v?.slug || v?.id
    if (!code) continue
    if (v?.id != null) map.set(`id:${String(v.id)}`, String(code))
    if (v?.company_name) map.set(`name:${String(v.company_name).trim().toLowerCase()}`, String(code))
  }
  return map
})

const normalizeProductItem = (item: any) => {
  const vendorObj = item?.vendor || {}
  const vendorNameKey = String(
    item?.vendor_name || vendorObj?.company_name || vendorObj?.name || ''
  ).trim().toLowerCase()

  const resolvedVendorCode =
    item?.vendor_code ||
    item?.store_code ||
    vendorObj?.vendor_code ||
    vendorObj?.code ||
    vendorObj?.store_code ||
    vendorCodeByKey.value.get(`id:${String(item?.vendor_id ?? vendorObj?.id ?? '')}`) ||
    vendorCodeByKey.value.get(`name:${vendorNameKey}`) ||
    item?.vendor_id ||
    vendorObj?.id ||
    ''

  return {
    ...item,
    vendor_code: resolvedVendorCode,
    store_code: resolvedVendorCode,
    vendor: {
      ...vendorObj,
      vendor_code: vendorObj?.vendor_code || resolvedVendorCode,
      code: vendorObj?.code || resolvedVendorCode
    }
  }
}

type ViewMode = 'vendors' | 'products'
const viewMode = ref<ViewMode>('vendors')

// Products infinite scroll state
const productItems = ref<any[]>([])
const productsPending = ref<boolean>(false)
const loadingMoreProducts = ref<boolean>(false)
const hasMoreProducts = ref<boolean>(true)
const productsError = ref<boolean>(false)

// Vendors infinite scroll state
const VENDOR_BATCH_SIZE = 12
const visibleVendorLimit = ref<number>(VENDOR_BATCH_SIZE)
const loadingMoreVendors = ref<boolean>(false)

// Shared bottom sentinel
const loadMoreSentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let vendorLoadTimer: ReturnType<typeof setTimeout> | null = null

const PAGE_LIMIT = 24

type MarketTab = 'restaurants' | 'ecommerce' | 'others'
type EcommerceCategoryKey = 'gadgets' | 'apparel' | 'appliances' | 'beauty'

const ECOMMERCE_CATEGORY_LABELS: Record<EcommerceCategoryKey, string> = {
  gadgets: 'Gadgets & Tech',
  apparel: 'Clothing & Apparel',
  appliances: 'Home Appliances',
  beauty: 'Beauty & Cosmetics'
}

const activeTab = ref<MarketTab>('restaurants')
const selectedEcommerceCategory = ref<EcommerceCategoryKey | null>(null)
const searchQuery = ref<string>('')
const selectedLocationId = useCookie('customer_location_id')

// Quick filters
const openNowOnly = ref<boolean>(false)
const featuredOnly = ref<boolean>(false)

const applyRouteQuery = () => {
  const categoryParam = String(route.query.category || '').toLowerCase().trim()
  const viewParam = String(route.query.view || '').toLowerCase().trim()
  const qParam = String(route.query.q || '').trim()
  const locParam = String(route.query.location || '').trim()

  selectedEcommerceCategory.value = null

  if (viewParam === 'products' || viewParam === 'items' || viewParam === 'dishes') {
    viewMode.value = 'products'
  }

  if (categoryParam in ECOMMERCE_CATEGORY_LABELS) {
    activeTab.value = 'ecommerce'
    selectedEcommerceCategory.value = categoryParam as EcommerceCategoryKey
  } else if (categoryParam === 'ecommerce' || categoryParam === 'e_commerce') {
    activeTab.value = 'ecommerce'
  } else if (categoryParam === 'restaurants' || categoryParam === 'food') {
    activeTab.value = 'restaurants'
  } else if (categoryParam === 'others' || categoryParam === 'services' || categoryParam === 'other') {
    activeTab.value = 'others'
  }

  if (qParam) {
    searchQuery.value = qParam
  } else if (locParam && !searchQuery.value) {
    searchQuery.value = locParam
  }
}

const switchTab = (tab: MarketTab): void => {
  activeTab.value = tab
  visibleVendorLimit.value = VENDOR_BATCH_SIZE
  if (tab !== 'ecommerce') {
    selectedEcommerceCategory.value = null
  }
}

const switchViewMode = (mode: ViewMode): void => {
  viewMode.value = mode
  if (mode === 'products') {
    fetchProducts({ reset: true })
  } else {
    visibleVendorLimit.value = VENDOR_BATCH_SIZE
  }
}

// Reactive states for vendor data, loading, and error handling
const response = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<boolean>(false)

const fetchProducts = async ({ append = false, reset = false } = {}) => {
  if (append && (loadingMoreProducts.value || productsPending.value || !hasMoreProducts.value)) {
    return
  }

  if (reset || !append) {
    productsPending.value = true
    productsError.value = false
    hasMoreProducts.value = true
  } else {
    loadingMoreProducts.value = true
  }

  const authToken = useCookie('auth_token')

  try {
    const queryParams: Record<string, any> = {
      business_type: activeTab.value,
      limit: PAGE_LIMIT,
      offset: append ? productItems.value.length : 0
    }
    if (selectedLocationId.value) {
      queryParams.customer_location_id = selectedLocationId.value
    }
    if (selectedEcommerceCategory.value && activeTab.value === 'ecommerce') {
      queryParams.category = selectedEcommerceCategory.value
    }
    if (searchQuery.value.trim()) {
      queryParams.q = searchQuery.value.trim()
    }

    const res: any = await $fetch(`${apiBase}/api/v1/marketplace/products`, {
      method: 'GET',
      params: queryParams,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })

    const rawIncoming: any[] = res?.data?.items || res?.items || []
    const incoming: any[] = rawIncoming.map(normalizeProductItem)
    
    if (append) {
      const existingIds = new Set(productItems.value.map(i => String(i.id)))
      const uniqueNew = incoming.filter(i => !existingIds.has(String(i.id)))
      productItems.value = [...productItems.value, ...uniqueNew]
    } else {
      productItems.value = incoming
    }

    hasMoreProducts.value = incoming.length >= PAGE_LIMIT
  } catch (err) {
    console.error('Product discovery error:', err)
    if (!append) {
      productsError.value = true
    } else {
      hasMoreProducts.value = false
    }
  } finally {
    productsPending.value = false
    loadingMoreProducts.value = false
  }
}

const marketplaceProducts = computed<any[]>(() => {
  return productItems.value.filter((item: any) => {
    if (openNowOnly.value && item.vendor?.is_currently_open === false) return false
    return true
  })
})

const fetchVendors = async () => {
  pending.value = true
  error.value = false
  visibleVendorLimit.value = VENDOR_BATCH_SIZE

  const authToken = useCookie('auth_token')

  try {
    const queryParams: Record<string, any> = {}
    if (selectedLocationId.value) {
      queryParams.customer_location_id = selectedLocationId.value
    }
    if (route.query.location) {
      queryParams.location = String(route.query.location).trim()
    }
    if (selectedEcommerceCategory.value) {
      queryParams.category = selectedEcommerceCategory.value
    }

    const res: any = await $fetch(`${apiBase}/api/v1/marketplace/vendors`, {
      method: 'GET',
      params: queryParams,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    response.value = res
  } catch (err) {
    console.error('Telemetry sync error:', err)
    error.value = true
  } finally {
    pending.value = false
  }
}

// Transform or extract vendor data safely
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

const matchesEcommerceCategory = (shop: any, cat: EcommerceCategoryKey): boolean => {
  const direct = String(
    shop.ecommerce_sub_category ||
      shop.ecommerce_category ||
      shop.category ||
      shop.business_category ||
      shop.storefront_category ||
      ''
  )
    .trim()
    .toLowerCase()

  if (direct === cat || direct.includes(cat)) {
    return true
  }

  const list =
    shop.ecommerce_categories ||
    shop.categories ||
    shop.subcategories ||
    shop.product_categories ||
    shop.available_categories ||
    []

  if (Array.isArray(list) && list.length > 0) {
    return list.some((item: any) =>
      String(typeof item === 'string' ? item : item?.slug || item?.value || item?.key || item?.name || '')
        .toLowerCase()
        .includes(cat)
    )
  }

  return false
}

// Client Side Live Filtering Engine for Storefronts
const filteredVendors = computed(() => {
  if (!response.value) return []

  let targetCollection: any[] = []
  if (activeTab.value === 'restaurants') targetCollection = vendorsData.value.restaurants
  else if (activeTab.value === 'ecommerce') targetCollection = vendorsData.value.e_commerce
  else targetCollection = vendorsData.value.other_businesses

  let result = targetCollection

  if (activeTab.value === 'ecommerce' && selectedEcommerceCategory.value) {
    result = result.filter((shop: any) =>
      matchesEcommerceCategory(shop, selectedEcommerceCategory.value!)
    )
  }

  if (openNowOnly.value) result = result.filter((shop: any) => shop.is_currently_open)
  if (featuredOnly.value) result = result.filter((shop: any) => shop.is_featured_recommendation)

  if (!searchQuery.value.trim()) return result

  const query = searchQuery.value.toLowerCase().trim()
  return result.filter((shop: any) =>
    shop.company_name?.toLowerCase().includes(query) ||
    shop.default_pickup_address?.toLowerCase().includes(query) ||
    shop.business_type?.toLowerCase().includes(query) ||
    shop.ecommerce_sub_category?.toLowerCase().includes(query) ||
    shop.ecommerce_category?.toLowerCase().includes(query) ||
    shop.category?.toLowerCase().includes(query)
  )
})

const displayedVendors = computed(() =>
  filteredVendors.value.slice(0, visibleVendorLimit.value)
)

const hasMoreVendors = computed(() =>
  visibleVendorLimit.value < filteredVendors.value.length
)

const loadMoreVendors = () => {
  if (loadingMoreVendors.value || pending.value || !hasMoreVendors.value) return
  loadingMoreVendors.value = true
  if (vendorLoadTimer) clearTimeout(vendorLoadTimer)
  vendorLoadTimer = setTimeout(() => {
    visibleVendorLimit.value += VENDOR_BATCH_SIZE
    loadingMoreVendors.value = false
  }, 250)
}

const setupIntersectionObserver = () => {
  if (!import.meta.client) return
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (!loadMoreSentinel.value) return

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return

      if (viewMode.value === 'products') {
        if (!productsPending.value && !loadingMoreProducts.value && hasMoreProducts.value) {
          fetchProducts({ append: true })
        }
      } else {
        if (!pending.value && !loadingMoreVendors.value && hasMoreVendors.value) {
          loadMoreVendors()
        }
      }
    },
    { rootMargin: '200px' }
  )

  observer.observe(loadMoreSentinel.value)
}

watch(
  () => route.query,
  () => {
    applyRouteQuery()
    fetchVendors()
    if (viewMode.value === 'products') {
      fetchProducts({ reset: true })
    }
  },
  { immediate: true }
)

watch(selectedLocationId, () => {
  fetchVendors()
  if (viewMode.value === 'products') {
    fetchProducts({ reset: true })
  }
})

watch([activeTab, selectedEcommerceCategory], () => {
  visibleVendorLimit.value = VENDOR_BATCH_SIZE
  if (viewMode.value === 'products') {
    fetchProducts({ reset: true })
  }
})

watch([openNowOnly, featuredOnly], () => {
  visibleVendorLimit.value = VENDOR_BATCH_SIZE
})

watch([viewMode, loadMoreSentinel, () => filteredVendors.value.length, () => marketplaceProducts.value.length], async () => {
  await nextTick()
  setupIntersectionObserver()
})

let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  visibleVendorLimit.value = VENDOR_BATCH_SIZE
  if (viewMode.value !== 'products') return
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    fetchProducts({ reset: true })
  }, 250)
})

onMounted(() => {
  applyRouteQuery()
  fetchVendors()
  if (viewMode.value === 'products') {
    fetchProducts({ reset: true })
  }
  nextTick(() => setupIntersectionObserver())
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (vendorLoadTimer) {
    clearTimeout(vendorLoadTimer)
  }
})

const hasActiveFilters = computed(
  () =>
    !!searchQuery.value.trim() ||
    !!selectedEcommerceCategory.value ||
    openNowOnly.value ||
    featuredOnly.value
)

const clearFilters = (): void => {
  searchQuery.value = ''
  selectedEcommerceCategory.value = null
  openNowOnly.value = false
  featuredOnly.value = false
  visibleVendorLimit.value = VENDOR_BATCH_SIZE
  if (viewMode.value === 'products') {
    fetchProducts({ reset: true })
  }
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
    const activeCatLabel = selectedEcommerceCategory.value
      ? ECOMMERCE_CATEGORY_LABELS[selectedEcommerceCategory.value]
      : null
    return {
      badgeIcon: ShoppingBag,
      badge: activeCatLabel ? `E-Commerce · ${activeCatLabel}` : 'Retail storefronts online',
      title: activeCatLabel
        ? `Shop ${activeCatLabel.toLowerCase()} from local stores.`
        : 'Shop top retail brands, straight from store to door.',
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

const isCurrentViewLoading = computed(() =>
  viewMode.value === 'vendors' ? pending.value : productsPending.value
)

const isCurrentViewError = computed(() =>
  viewMode.value === 'vendors' ? error.value : productsError.value
)

const retryCurrentView = () => {
  if (viewMode.value === 'vendors') {
    fetchVendors()
  } else {
    fetchProducts({ reset: true })
  }
}
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
              :placeholder="viewMode === 'vendors' ? 'Search vendor name or address...' : 'Search dishes, products, or vendors...'"
              aria-label="Search marketplace"
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

        <!-- Quick filters + View Mode Switcher -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="activeTab === 'ecommerce' && selectedEcommerceCategory"
              class="inline-flex items-center gap-1.5 rounded-full bg-[#D4F53C] px-3 py-1.5 text-[11px] font-extrabold text-[#0A1128]"
            >
              {{ ECOMMERCE_CATEGORY_LABELS[selectedEcommerceCategory] }}
              <button
                type="button"
                @click="selectedEcommerceCategory = null"
                aria-label="Clear category filter"
                class="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-0 bg-[#0A1128]/15 text-[#0A1128] hover:bg-[#0A1128]/25"
              >
                <X class="h-3 w-3" />
              </button>
            </span>

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
              v-if="viewMode === 'vendors'"
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

          <!-- Storefronts vs Dishes & Items Toggle -->
          <div
            role="group"
            aria-label="Display mode"
            class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 p-0.5"
          >
            <button
              type="button"
              @click="switchViewMode('vendors')"
              :aria-pressed="viewMode === 'vendors'"
              :class="viewMode === 'vendors' ? 'bg-[#0A1128] text-white' : 'bg-transparent text-gray-600 hover:text-[#0A1128]'"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 px-3 py-1.5 text-[11px] font-bold outline-none transition-colors"
            >
              <LayoutGrid class="h-3.5 w-3.5" />
              <span>Storefronts</span>
            </button>
            <button
              type="button"
              @click="switchViewMode('products')"
              :aria-pressed="viewMode === 'products'"
              :class="viewMode === 'products' ? 'bg-[#0A1128] text-white' : 'bg-transparent text-gray-600 hover:text-[#0A1128]'"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 px-3 py-1.5 text-[11px] font-bold outline-none transition-colors"
            >
              <UtensilsCrossed class="h-3.5 w-3.5" />
              <span>{{ activeTab === 'restaurants' ? 'Dishes' : 'Items' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== RESULTS GRID ===================== -->
    <main class="mx-auto max-w-7xl px-5 py-8 sm:px-8 md:py-10">

      <!-- Loading: 8-card shimmer skeleton -->
      <div v-if="isCurrentViewLoading" class="space-y-6" aria-busy="true" aria-label="Loading marketplace">
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
        v-else-if="isCurrentViewError"
        class="mx-auto max-w-md space-y-4 rounded-3xl border border-gray-200 bg-white p-10 text-center"
      >
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertCircle class="h-7 w-7" />
        </div>
        <h3 class="text-base font-extrabold text-[#0A1128]">Connection Timeout</h3>
        <p class="text-xs leading-relaxed text-gray-500">
          Could not fetch {{ viewMode === 'vendors' ? 'vendors' : 'items' }}.
        </p>
        <button
          @click="retryCurrentView"
          class="inline-flex cursor-pointer items-center gap-2 rounded-xl border-0 bg-[#0A1128] px-5 py-3 text-xs font-bold text-white outline-none transition-colors hover:bg-[#16224a] focus-visible:ring-2 focus-visible:ring-[#D4F53C]"
        >
          <RefreshCw class="h-4 w-4" />
          Retry Connection
        </button>
      </div>

      <!-- Storefronts View -->
      <div v-else-if="viewMode === 'vendors'" class="space-y-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="text-xl font-extrabold tracking-tight text-[#0A1128] sm:text-2xl">Available Storefronts</h2>
            <p class="mt-1 text-xs font-medium text-gray-500">Showing active partners sorted by subscription value and reputation.</p>
          </div>
          <span class="shrink-0 rounded-full bg-[#0A1128] px-3.5 py-1.5 text-xs font-extrabold text-[#D4F53C]">
            {{ filteredVendors.length }} active
          </span>
        </div>

        <!-- Vendor Grid -->
        <div
          v-if="displayedVendors.length > 0"
          class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <MarketplaceVendorCard
            v-for="shop in displayedVendors"
            :key="shop.id"
            :shop="shop"
          />
        </div>

        <!-- Bottom Sentinel & Loading Spinner for Storefronts -->
        <div
          v-if="displayedVendors.length > 0"
          ref="loadMoreSentinel"
          class="flex flex-col items-center justify-center py-6 text-center"
        >
          <div
            v-if="loadingMoreVendors"
            class="inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-[#0A1128] shadow-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 class="h-4 w-4 animate-spin text-[#0A1128]" />
            <span>Loading more storefronts...</span>
          </div>
          <p
            v-else-if="!hasMoreVendors && filteredVendors.length > VENDOR_BATCH_SIZE"
            class="text-xs font-medium text-gray-400"
          >
            You've reached the end of available storefronts.
          </p>
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

      <!-- Dishes & Items View -->
      <div v-else class="space-y-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="text-xl font-extrabold tracking-tight text-[#0A1128] sm:text-2xl">
              {{ activeTab === 'restaurants' ? 'Available Dishes & Meals' : 'Available Products' }}
            </h2>
            <p class="mt-1 text-xs font-medium text-gray-500">
              Add items directly to your cart or tap a vendor badge to open the full storefront.
            </p>
          </div>
          <span class="shrink-0 rounded-full bg-[#0A1128] px-3.5 py-1.5 text-xs font-extrabold text-[#D4F53C]">
            {{ marketplaceProducts.length }} {{ activeTab === 'restaurants' ? 'dishes' : 'items' }}
          </span>
        </div>

        <!-- Product Grid -->
        <div
          v-if="marketplaceProducts.length > 0"
          class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <MarketplaceProductCard
            v-for="item in marketplaceProducts"
            :key="item.id"
            :item="item"
            :cart-quantity="getItemQuantity(item.id)"
            @add-to-cart="onAddToCart"
            @update-quantity="onUpdateCartQuantity"
          />
        </div>

        <!-- Bottom Sentinel & Loading Spinner for More Products -->
        <div
          v-if="marketplaceProducts.length > 0"
          ref="loadMoreSentinel"
          class="flex flex-col items-center justify-center py-6 text-center"
        >
          <div
            v-if="loadingMoreProducts"
            class="inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-[#0A1128] shadow-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 class="h-4 w-4 animate-spin text-[#0A1128]" />
            <span>Loading more {{ activeTab === 'restaurants' ? 'dishes' : 'items' }}...</span>
          </div>
          <p
            v-else-if="!hasMoreProducts"
            class="text-xs font-medium text-gray-400"
          >
            You've reached the end of available {{ activeTab === 'restaurants' ? 'dishes' : 'items' }}.
          </p>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="mx-auto max-w-md space-y-4 rounded-3xl border border-gray-200 bg-white px-8 py-16 text-center"
        >
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <ShoppingBag class="h-7 w-7 stroke-[1.5]" />
          </div>
          <div class="space-y-1.5">
            <h4 class="text-base font-extrabold text-[#0A1128]">
              No {{ activeTab === 'restaurants' ? 'Dishes' : 'Items' }} Found
            </h4>
            <p class="mx-auto max-w-xs text-xs font-medium leading-relaxed text-gray-500">
              We couldn't locate any available items matching your filters right now.
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