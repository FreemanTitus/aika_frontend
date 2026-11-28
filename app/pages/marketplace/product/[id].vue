<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter, useRuntimeConfig, useCookie } from '#app'
import {
  ChevronRight,
  Flame,
  PackageOpen,
  AlertCircle,
  ShoppingBag,
  Loader2,
  X,
  Layers3,
  ArrowRight,
  ArrowLeft,
  Store,
  CheckCircle2,
  Minus,
  Plus,
  ZoomIn
} from '@lucide/vue'
import { useCart } from '~/composables/useCart'

definePageMeta({
  layout: 'marketplace'
})

const { cartItems, addToCart, clearCart } = useCart()

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const route = useRoute()
const router = useRouter()

const getProductId = (): string => {
  const paramId = route.params.id
  return Array.isArray(paramId) ? (paramId[0] || '') : (paramId || '')
}

const productId = ref<string>(getProductId())

// 1. Reactive Input State Containers
const orderQuantity = ref<number>(1)
const activeMainImage = ref<string>('')
const selectedOptions = ref<Record<string, string>>({})
const validationErrorMessage = ref<string | null>(null)
const addedFeedback = ref<boolean>(false)

// Lightbox modal toggle state management
const isLightboxOpen = ref<boolean>(false)
const lightboxImage = ref<string>('')

// Reactive states for payload data, loading, and error handling
const payload = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<boolean>(false)

// 2. Asynchronous Data Fetching Layer with Explicit Headers
const fetchProductData = async () => {
  pending.value = true
  error.value = false
  orderQuantity.value = 1
  selectedOptions.value = {}
  validationErrorMessage.value = null

  const currentId = getProductId()
  productId.value = currentId
  const authToken = useCookie('auth_token')

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/marketplace/product/${currentId}`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })

    const rawData = res?.data || res || {}
    payload.value = {
      product: rawData.product || (rawData.name ? rawData : null),
      gallery_images: rawData.gallery_images || [],
      variant_options: rawData.variant_options || [],
      sku_matrix: rawData.sku_matrix || []
    }
  } catch (err) {
    console.error('Product detail resolution error:', err)
    error.value = true
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchProductData()
})

watch(
  () => route.params.id,
  () => {
    fetchProductData()
  }
)

// DYNAMIC BULLET LIST PARSER ENGINE FOR INDIVIDUAL PROPERTIES KEYS
const parsedKeyFeatures = computed(() => {
  const rawFeatures = payload.value?.product?.key_features
  if (!rawFeatures) return []

  if (typeof rawFeatures === 'string') {
    try {
      return JSON.parse(rawFeatures) as Array<{ title: string; value: string }>
    } catch {
      return []
    }
  }
  return rawFeatures as Array<{ title: string; value: string }>
})

// Initialize values on payload lifecycle arrival
watch(
  () => payload.value?.product,
  (newProduct) => {
    if (newProduct?.image) {
      activeMainImage.value = getMediaUrl(newProduct.image) || ''
    } else {
      activeMainImage.value = ''
    }
  },
  { immediate: true }
)

// Pre-select first variant options if present to keep UX clean
watch(
  () => payload.value?.variant_options,
  (options) => {
    if (options && options.length > 0) {
      const nextSelected: Record<string, string> = {}
      options.forEach((opt: any) => {
        if (opt.values && opt.values.length > 0) {
          nextSelected[opt.name] = opt.values[0].value_text
        }
      })
      selectedOptions.value = nextSelected
    }
  },
  { immediate: true }
)

// TYPE-AGNOSTIC MULTI-DIMENSIONAL MATRICES LOOKUP ENGINE
const matchedSkuItem = computed(() => {
  if (!payload.value || !payload.value.sku_matrix || payload.value.sku_matrix.length === 0) return null

  const options = payload.value.variant_options
  if (!options || options.length === 0) return null

  if (Object.keys(selectedOptions.value).length !== options.length) return null

  const targetValueIds: number[] = []
  for (const option of options) {
    const selectedText = selectedOptions.value[option.name]
    if (!selectedText) continue

    const matchedValueObj = option.values.find(
      (v: any) => String(v.value_text).trim().toLowerCase() === String(selectedText).trim().toLowerCase()
    )
    if (matchedValueObj) {
      targetValueIds.push(Number(matchedValueObj.value_id))
    }
  }

  if (targetValueIds.length !== options.length) return null

  const standardMatch = payload.value.sku_matrix.find((sku: any) => {
    if (!sku.value_ids || sku.value_ids.length === 0) return false
    const normalizedMatrixIds = sku.value_ids.map((id: any) => Number(id))
    return targetValueIds.every((id) => normalizedMatrixIds.includes(id))
  })

  if (standardMatch) return standardMatch

  const stringFallbackMatch = payload.value.sku_matrix.find((sku: any) => {
    if (!sku.sku) return false
    const skuTokens = sku.sku.split('-')
    const trailingIdFlag = Number(skuTokens[skuTokens.length - 1])
    return targetValueIds.includes(trailingIdFlag)
  })

  return stringFallbackMatch || null
})

// Enforce available SKU stock bounds on quantity selector
const maxAvailableStock = computed(() => {
  if (payload.value?.variant_options?.length > 0 && matchedSkuItem.value) {
    const stock = parseInt(matchedSkuItem.value.stock_qty)
    return Number.isNaN(stock) ? 99 : Math.max(1, stock)
  }
  const productStock = parseInt(payload.value?.product?.stock_qty)
  return Number.isNaN(productStock) ? 99 : Math.max(1, productStock)
})

watch(matchedSkuItem, () => {
  if (orderQuantity.value > maxAvailableStock.value) {
    orderQuantity.value = maxAvailableStock.value
  }
})

// Pricing Variables State
const baseOriginalPrice = computed(() => {
  if (payload.value && payload.value.variant_options?.length > 0 && matchedSkuItem.value) {
    return parseFloat(matchedSkuItem.value.base_price || payload.value.product?.base_price || 0)
  }
  return parseFloat(payload.value?.product?.base_price || 0)
})

const currentUnitPrice = computed(() => {
  if (payload.value && payload.value.variant_options?.length > 0) {
    if (matchedSkuItem.value) {
      return parseFloat(matchedSkuItem.value.current_price || matchedSkuItem.value.base_price || 0)
    }
    return parseFloat(payload.value.product?.current_price || payload.value.product?.base_price || 0)
  }

  if (payload.value?.product) {
    return parseFloat(payload.value.product.current_price || payload.value.product.base_price || 0)
  }
  return 0
})

const isPromoDiscountActive = computed(() => {
  if (payload.value?.product?.bonanza_mode) return true
  if (matchedSkuItem.value && matchedSkuItem.value.bonanza_mode) return true
  return baseOriginalPrice.value > currentUnitPrice.value
})

const isSkuAvailable = computed(() => {
  if (!payload.value?.product?.is_available || !payload.value?.product?.vendor?.is_currently_open) {
    return false
  }
  if (payload.value.variant_options.length > 0) {
    return matchedSkuItem.value ? parseInt(matchedSkuItem.value.stock_qty) > 0 : false
  }
  return true
})

const canPurchase = computed(() => {
  return (
    isSkuAvailable.value &&
    currentUnitPrice.value > 0 &&
    !(payload.value?.variant_options?.length > 0 && !matchedSkuItem.value)
  )
})

const vendorStoreUrl = computed(() => {
  const vendor = payload.value?.product?.vendor
  const target = vendor?.id || payload.value?.product?.vendor_id
  return target ? `/marketplace/store/${encodeURIComponent(String(target))}` : '/marketplace'
})

// 6. Action Handlers
const adjustQty = (change: number): void => {
  const nextVal = orderQuantity.value + change
  if (nextVal >= 1 && nextVal <= maxAvailableStock.value) {
    orderQuantity.value = nextVal
  }
}

const selectVariantValue = (optionName: string, valueText: string): void => {
  selectedOptions.value = {
    ...selectedOptions.value,
    [optionName]: valueText
  }
  validationErrorMessage.value = null
}

const updateMainStageViewer = (imageUrl: string): void => {
  activeMainImage.value = getMediaUrl(imageUrl) || ''
}

const openLightboxPortal = (imgUrl: string): void => {
  if (!imgUrl) return
  lightboxImage.value = imgUrl
  isLightboxOpen.value = true
}

const closeLightboxPortal = (): void => {
  isLightboxOpen.value = false
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeLightboxPortal()
}
onMounted(() => window.addEventListener('keydown', handleKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyDown))

const formatCurrency = (value: number): string => {
  return '₦' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const prepareCartItem = async () => {
  validationErrorMessage.value = null

  const product = payload.value?.product
  if (!product) return null

  const rootProductCode = product.id || productId.value
  let selectedVariantId: string | number | null = null

  if (payload.value?.variant_options && payload.value.variant_options.length > 0) {
    if (!matchedSkuItem.value) {
      validationErrorMessage.value = 'Please select a valid variant option combination first.'
      return null
    }
    selectedVariantId = matchedSkuItem.value.id
  }

  const variantLabel = Object.values(selectedOptions.value).filter(Boolean).join(' / ')
  const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name
  const checkoutItemId = selectedVariantId ? String(selectedVariantId) : String(rootProductCode)
  const vendorId = String(product.vendor?.id || product.vendor_id || '')
  const vendorName = product.vendor?.company_name || 'Vendor'

  if (cartItems.value.length > 0 && cartItems.value[0]?.storeId && String(cartItems.value[0].storeId) !== vendorId) {
    await clearCart()
  }

  return {
    rootProductCode,
    selectedVariantId,
    checkoutItemId,
    displayName,
    vendorId,
    vendorName,
    cartPayload: {
      id: checkoutItemId,
      productId: String(rootProductCode),
      variantId: selectedVariantId ? String(selectedVariantId) : undefined,
      name: displayName,
      price: currentUnitPrice.value,
      current_price: currentUnitPrice.value,
      bonanza_mode: false,
      image: activeMainImage.value || product.image || ''
    }
  }
}

const handleAddToCartOnly = async (): Promise<void> => {
  if (!canPurchase.value) return
  const prepared = await prepareCartItem()
  if (!prepared) return

  await addToCart(
    prepared.cartPayload,
    prepared.vendorId,
    prepared.vendorName,
    orderQuantity.value,
    false
  )

  addedFeedback.value = true
  setTimeout(() => {
    addedFeedback.value = false
  }, 1800)
}

// SYNC SELECTED PRODUCT, VARIANT & QUANTITY INTO CART AND PROCEED TO CHECKOUT
const handleProceedToCheckoutRoute = async (): Promise<void> => {
  if (!canPurchase.value) return
  const prepared = await prepareCartItem()
  if (!prepared) return

  await addToCart(
    prepared.cartPayload,
    prepared.vendorId,
    prepared.vendorName,
    orderQuantity.value,
    true
  )

  router.push({
    path: '/marketplace/checkout',
    query: {
      item_id: String(prepared.rootProductCode).trim(),
      variant_item_id: prepared.selectedVariantId ? String(prepared.selectedVariantId) : '',
      qty: String(orderQuantity.value),
      vendor_id: prepared.vendorId,
      is_variant: payload.value?.variant_options?.length > 0 ? 'true' : 'false'
    }
  })
}
</script>

<template>
  <main class="min-h-screen bg-[#F8FAFC] px-3.5 py-6 text-left font-sans text-[#0A1128] selection:bg-[#D4F53C] selection:text-[#0A1128] sm:px-6 sm:py-10">
    <!-- Loading State -->
    <div v-if="pending" class="mx-auto max-w-6xl py-24 text-center" aria-busy="true">
      <div class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
        <Loader2 class="h-7 w-7 animate-spin stroke-[2.5] text-[#0A1128]" />
      </div>
      <p class="mt-4 text-xs font-extrabold uppercase tracking-widest text-gray-400">
        Loading product details...
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !payload?.product" class="mx-auto max-w-md py-16 text-center">
      <div class="flex flex-col items-center rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertCircle class="h-7 w-7" />
        </div>
        <h2 class="text-lg font-black text-[#0A1128]">Product Not Found</h2>
        <p class="mt-2 text-xs font-medium leading-relaxed text-gray-500">
          We couldn't load this product right now. It may have been removed or is temporarily unavailable.
        </p>
        <NuxtLink
          to="/marketplace"
          class="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0A1128] px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-[#D4F53C] no-underline transition hover:bg-[#16224a]"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          Back to Marketplace
        </NuxtLink>
      </div>
    </div>

    <!-- Product Detail Container -->
    <div v-else class="mx-auto max-w-6xl space-y-5">
      <!-- Top Breadcrumb & Back Link -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-1.5 text-xs font-bold text-gray-400">
          <NuxtLink to="/marketplace" class="text-gray-500 no-underline transition hover:text-[#0A1128]">
            Marketplace
          </NuxtLink>
          <ChevronRight class="h-3.5 w-3.5 text-gray-300" />
          <NuxtLink
            v-if="payload.product.vendor?.company_name"
            :to="vendorStoreUrl"
            class="max-w-[140px] truncate text-gray-500 no-underline transition hover:text-[#0A1128] sm:max-w-[200px]"
          >
            {{ payload.product.vendor.company_name }}
          </NuxtLink>
          <ChevronRight v-if="payload.product.vendor?.company_name" class="h-3.5 w-3.5 text-gray-300" />
          <span class="max-w-[180px] truncate font-extrabold text-[#0A1128] sm:max-w-xs">
            {{ payload.product.name }}
          </span>
        </nav>

        <NuxtLink
          :to="vendorStoreUrl"
          class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#0A1128] no-underline transition hover:border-[#0A1128]/30 hover:bg-gray-50"
        >
          <Store class="h-3.5 w-3.5 text-emerald-700" />
          <span>Visit Store</span>
        </NuxtLink>
      </div>

      <!-- Main Product Card -->
      <div class="grid grid-cols-1 gap-8 rounded border border-gray-200/90 bg-white p-4 shadow-sm sm:p-8 lg:grid-cols-12 lg:gap-10">
        <!-- Left: Media Stage & Thumbnails -->
        <div class="space-y-3.5 lg:col-span-6">
          <div class="group relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 sm:rounded-3xl">
            <div
              v-if="payload.product.bonanza_mode && payload.product.discount_percentage > 0"
              class="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm"
            >
              <Flame class="h-3 w-3 fill-white" />
              <span>-{{ payload.product.discount_percentage }}% Off</span>
            </div>

            <button
              v-if="activeMainImage"
              type="button"
              @click="openLightboxPortal(activeMainImage)"
              aria-label="Zoom product image"
              class="absolute bottom-3 right-3 z-10 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-200/80 bg-white/90 text-[#0A1128] backdrop-blur-xs transition hover:bg-white"
            >
              <ZoomIn class="h-4 w-4" />
            </button>

            <img
              v-if="activeMainImage"
              :src="activeMainImage"
              @click="openLightboxPortal(activeMainImage)"
              :alt="payload.product.name"
              class="animate-fade-in h-full w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
              <PackageOpen class="h-14 w-14 stroke-[1.5]" />
            </div>
          </div>

          <!-- Thumbnail Strip -->
          <div v-if="payload.gallery_images.length > 0 || payload.product.image" class="space-y-1.5">
            <div class="custom-scrollbar flex items-center space-x-2.5 overflow-x-auto pb-1">
              <button
                v-if="payload.product.image"
                type="button"
                @click="updateMainStageViewer(payload.product.image)"
                :class="[
                  activeMainImage === getMediaUrl(payload.product.image)
                    ? 'border-[#0A1128] ring-2 ring-[#D4F53C]'
                    : 'border-gray-200 opacity-75 hover:opacity-100'
                ]"
                class="h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-gray-50 transition sm:h-20 sm:w-20"
              >
                <img :src="getMediaUrl(payload.product.image) || ''" alt="Cover thumbnail" class="h-full w-full object-cover" />
              </button>

              <button
                v-for="img in payload.gallery_images"
                :key="img.id"
                type="button"
                @click="updateMainStageViewer(img.image)"
                :class="[
                  activeMainImage === getMediaUrl(img.image)
                    ? 'border-[#0A1128] ring-2 ring-[#D4F53C]'
                    : 'border-gray-200 opacity-75 hover:opacity-100'
                ]"
                class="h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-gray-50 transition sm:h-20 sm:w-20"
              >
                <img :src="getMediaUrl(img.image) || ''" alt="Gallery thumbnail" class="h-full w-full object-cover" />
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Details, Variants, Quantity & Checkout -->
        <div class="flex flex-col justify-between space-y-6 lg:col-span-6">
          <div class="space-y-5">
            <!-- Brand + Stock Pill -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="inline-block rounded-full bg-[#D4F53C]/40 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#0A1128]">
                {{ payload.product.brand || 'Verified Item' }}
              </span>

              <span
                v-if="isSkuAvailable"
                class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                In Stock
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-700"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                Unavailable
              </span>
            </div>

            <!-- Title -->
            <h1 class="text-2xl font-black leading-tight tracking-tight text-[#0A1128] sm:text-3xl">
              {{ payload.product.name }}
            </h1>

            <!-- Price Row -->
            <div class="flex flex-wrap items-baseline gap-3 border-b border-gray-100 pb-4">
              <span class="text-2xl font-black tracking-tight text-[#0A1128] sm:text-3xl">
                {{ formatCurrency(currentUnitPrice) }}
              </span>
              <span
                v-if="isPromoDiscountActive && baseOriginalPrice !== currentUnitPrice"
                class="text-sm font-bold text-gray-400 line-through"
              >
                {{ formatCurrency(baseOriginalPrice) }}
              </span>
            </div>

            <!-- Description -->
            <p class="whitespace-pre-line text-xs font-medium leading-relaxed text-gray-600 sm:text-sm">
              {{ payload.product.description || 'No additional description provided for this item.' }}
            </p>

            <!-- Variant Options -->
            <div v-if="payload.variant_options.length > 0" class="space-y-4 border-t border-gray-100 pt-4">
              <div v-for="option in payload.variant_options" :key="option.option_id" class="space-y-2">
                <label class="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  {{ option.name }}: <span class="text-[#0A1128]">{{ selectedOptions[option.name] || 'Choose' }}</span>
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="val in option.values"
                    :key="val.value_id"
                    type="button"
                    @click="selectVariantValue(option.name, val.value_text)"
                    :class="[
                      selectedOptions[option.name] === val.value_text
                        ? 'border-[#0A1128] bg-[#0A1128] text-[#D4F53C]'
                        : 'border-gray-200 bg-white text-[#0A1128] hover:border-gray-300'
                    ]"
                    class="cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-extrabold transition outline-none"
                  >
                    {{ val.value_text }}
                  </button>
                </div>
              </div>

              <p v-if="matchedSkuItem" class="text-xs font-bold text-emerald-700">
                {{ matchedSkuItem.stock_qty }} available for this selection
              </p>
              <p v-else class="text-xs font-bold text-rose-600">
                This option combination is currently unavailable. Try another selection.
              </p>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="space-y-4 border-t border-gray-100 pt-5">
            <div
              v-if="validationErrorMessage"
              class="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700"
            >
              <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{{ validationErrorMessage }}</span>
            </div>

            <div
              v-if="!payload.product.vendor?.is_currently_open"
              class="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800"
            >
              <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <h4 class="text-xs font-black uppercase tracking-wide">Storefront Currently Closed</h4>
                <p class="mt-0.5 text-xs font-semibold text-rose-600">
                  This store isn't accepting orders right now. Please check back later.
                </p>
              </div>
            </div>

            <!-- Quantity Stepper + Subtotal -->
            <div class="flex items-center justify-between gap-4">
              <div class="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  @click="adjustQty(-1)"
                  :disabled="orderQuantity <= 1"
                  aria-label="Decrease quantity"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-white text-[#0A1128] shadow-2xs transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus class="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
                <input
                  type="number"
                  v-model="orderQuantity"
                  min="1"
                  :max="maxAvailableStock"
                  readonly
                  aria-label="Quantity"
                  class="no-spinner w-11 border-0 bg-transparent text-center text-xs font-black text-[#0A1128] outline-none sm:text-sm"
                />
                <button
                  type="button"
                  @click="adjustQty(1)"
                  :disabled="orderQuantity >= maxAvailableStock"
                  aria-label="Increase quantity"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-white text-[#0A1128] shadow-2xs transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus class="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>

              <div class="text-right">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Subtotal</span>
                <span class="text-base font-black text-[#0A1128] sm:text-lg">
                  {{ formatCurrency(currentUnitPrice * orderQuantity) }}
                </span>
              </div>
            </div>

            <!-- CTA Buttons -->
            <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
              <button
                type="button"
                @click="handleAddToCartOnly"
                :disabled="!canPurchase"
                :class="[
                  canPurchase
                    ? addedFeedback
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-[#D4F53C] hover:bg-[#c5e632] text-[#0A1128] cursor-pointer active:scale-[0.99]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                ]"
                class="flex items-center justify-center gap-2 rounded-xl border-0 px-4 py-3.5 text-xs font-black uppercase tracking-wider transition outline-none sm:col-span-5 sm:py-4"
              >
                <CheckCircle2 v-if="addedFeedback" class="h-4 w-4" />
                <ShoppingBag v-else class="h-4 w-4" />
                <span>{{ addedFeedback ? 'Added to Cart' : 'Add to Cart' }}</span>
              </button>

              <button
                type="button"
                @click="handleProceedToCheckoutRoute"
                :disabled="!canPurchase"
                :class="[
                  canPurchase
                    ? 'bg-[#0A1128] hover:bg-[#16224a] text-white cursor-pointer active:scale-[0.99] shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                ]"
                class="flex items-center justify-center gap-2 rounded-xl border-0 px-5 py-3.5 text-xs font-black uppercase tracking-wider transition outline-none sm:col-span-7 sm:py-4 sm:text-sm"
              >
                <span>
                  <template v-if="!payload.product.vendor?.is_currently_open">Storefront Closed</template>
                  <template v-else-if="!payload.product.is_available">Out of Stock</template>
                  <template v-else-if="payload.variant_options.length > 0 && !matchedSkuItem">Select Options</template>
                  <template v-else>BUY NOW</template>
                </span>
                <ArrowRight v-if="canPurchase" class="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Separate Key Specifications Card at the Bottom -->
      <section
        v-if="parsedKeyFeatures.length > 0"
        aria-label="Key Specifications"
        class="border border-gray-200/90 bg-white p-5 shadow-sm sm:p-8"
      >
        <div class="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4F53C]/40 text-[#0A1128]">
            <Layers3 class="h-4 w-4" />
          </div>
          <h2 class="text-sm font-black uppercase tracking-wider text-[#0A1128]">
            Product Description
          </h2>
        </div>

        <ul class="divide-y divide-gray-100">
          <li
            v-for="(feature, fIdx) in parsedKeyFeatures"
            :key="fIdx"
            class="flex flex-col gap-1 py-3 first:pt-1 last:pb-1 sm:flex-row sm:items-baseline sm:gap-3"
          >
            <span class="shrink-0 text-xs font-black uppercase tracking-wider text-gray-500 sm:min-w-[180px]">
              {{ feature.title }}:
            </span>
            <span class="text-xs font-bold leading-relaxed text-[#0A1128] sm:text-sm">
              {{ feature.value }}
            </span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Lightbox Modal -->
    <div
      :class="[isLightboxOpen ? 'opacity-100 pointer-events-auto flex' : 'opacity-0 pointer-events-none hidden']"
      class="fixed inset-0 z-50 items-center justify-center bg-[#0A1128]/95 p-4 backdrop-blur-md transition-all duration-300"
    >
      <div @click="closeLightboxPortal" class="absolute inset-0 cursor-zoom-out"></div>
      <button
        @click="closeLightboxPortal"
        type="button"
        aria-label="Close image preview"
        class="fixed right-5 top-5 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-white/10 text-white transition hover:bg-white/20 hover:text-[#D4F53C]"
      >
        <X class="h-5 w-5" />
      </button>
      <div
        :class="[isLightboxOpen ? 'scale-100' : 'scale-95']"
        class="relative max-h-[85vh] max-w-full transform select-none overflow-hidden rounded-2xl shadow-2xl transition-transform duration-300 ease-out"
      >
        <img :src="lightboxImage" alt="Enlarged product preview" class="max-h-[85vh] w-full object-contain" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
</style>