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
  ArrowRight
} from '@lucide/vue'
import { useCart } from '~/composables/useCart'

definePageMeta({
  layout: 'marketplace'
})

const { cartItems, addToCart, updateQuantity, clearCart } = useCart()

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
    console.error("Product detail resolution error:", err)
    error.value = true
  } finally {
    pending.value = false
  }
}

// Trigger fetch immediately when component mounts
onMounted(() => {
  fetchProductData()
})

// Watch for route changes to dynamically fetch new product data on client-side navigation
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
watch(() => payload.value?.product, (newProduct) => {
  if (newProduct?.image) {
    activeMainImage.value = getMediaUrl(newProduct.image) || ''
  } else {
    activeMainImage.value = ''
  }
}, { immediate: true })

// Pre-select first variant options if present to keep UX clean
watch(() => payload.value?.variant_options, (options) => {
  if (options && options.length > 0) {
    options.forEach((opt: any) => {
      if (opt.values && opt.values.length > 0) {
        selectedOptions.value[opt.name] = opt.values[0].value_text
      }
    })
  }
}, { immediate: true })

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

    const matchedValueObj = option.values.find((v: any) => 
      String(v.value_text).trim().toLowerCase() === String(selectedText).trim().toLowerCase()
    )
    if (matchedValueObj) {
      targetValueIds.push(Number(matchedValueObj.value_id))
    }
  }

  if (targetValueIds.length !== options.length) return null

  const standardMatch = payload.value.sku_matrix.find((sku: any) => {
    if (!sku.value_ids || sku.value_ids.length === 0) return false
    const normalizedMatrixIds = sku.value_ids.map((id: any) => Number(id))
    return targetValueIds.every(id => normalizedMatrixIds.includes(id))
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

// 6. Action Handlers
const adjustQty = (change: number): void => {
  const nextVal = orderQuantity.value + change
  if (nextVal >= 1 && nextVal <= maxAvailableStock.value) {
    orderQuantity.value = nextVal
  }
}

const selectVariantValue = (optionName: string, valueText: string): void => {
  selectedOptions.value[optionName] = valueText
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
  return "₦" + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// SYNC SELECTED PRODUCT, VARIANT & QUANTITY INTO CART AND PROCEED TO CHECKOUT
const handleProceedToCheckoutRoute = async (): Promise<void> => {
  validationErrorMessage.value = null

  const product = payload.value?.product
  if (!product) return

  const rootProductCode = product.id || productId.value
  let selectedVariantId: string | number | null = null
  
  if (payload.value?.variant_options && payload.value.variant_options.length > 0) {
    if (!matchedSkuItem.value) {
      validationErrorMessage.value = "Please select a valid variant option configuration swathe first."
      return
    }
    selectedVariantId = matchedSkuItem.value.id
  }

  const variantLabel = Object.values(selectedOptions.value).filter(Boolean).join(' / ')
  const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name
  const checkoutItemId = selectedVariantId ? String(selectedVariantId) : String(rootProductCode)
  const vendorId = String(product.vendor?.id || '')
  const vendorName = product.vendor?.company_name || 'Vendor'

  // Ensure single-vendor cart consistency before adding direct checkout item
  if (cartItems.value.length > 0 && cartItems.value[0]?.storeId && String(cartItems.value[0].storeId) !== vendorId) {
    await clearCart()
  }

  await addToCart(
    {
      id: checkoutItemId,
      productId: String(rootProductCode),
      variantId: selectedVariantId ? String(selectedVariantId) : undefined,
      name: displayName,
      price: currentUnitPrice.value,
      current_price: currentUnitPrice.value,
      bonanza_mode: false,
      image: activeMainImage.value || product.image || ''
    },
    vendorId,
    vendorName,
    orderQuantity.value,
    true
  )

  router.push({
    path: '/marketplace/checkout',
    query: {
      item_id: String(rootProductCode).trim(), 
      variant_item_id: selectedVariantId ? String(selectedVariantId) : '',
      qty: String(orderQuantity.value),
      vendor_id: vendorId,
      is_variant: payload.value?.variant_options?.length > 0 ? 'true' : 'false'
    }
  })
}

</script>

<template>
  <main class="bg-gray-50/50 min-h-screen py-12 px-4 font-sans text-left selection:bg-[#D4F53C] selection:text-[#0A1128]">
    <div v-if="pending" class="max-w-5xl mx-auto py-24 text-center">
      <Loader2 class="w-10 h-10 animate-spin text-[#0A1128] mx-auto stroke-[2.5]" />
      <p class="text-gray-400 text-xs font-black uppercase tracking-widest mt-4">Assembling product configuration sheets...</p>
    </div>

    <div v-else-if="error || !payload?.product" class="max-w-md mx-auto py-16 text-center">
      <div class="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 flex flex-col items-center">
        <AlertCircle class="w-12 h-12 text-rose-500 mb-4" />
        <h2 class="text-xl font-black text-[#0A1128]">Asset Resolution Error</h2>
        <p class="text-gray-500 text-sm mt-2 font-medium leading-relaxed">The item parameter trace requested cannot be extracted or verified by regional delivery hubs.</p>
        <NuxtLink to="/marketplace" class="mt-6 bg-[#0A1128] text-white font-black px-6 py-2.5 rounded-xl text-xs transition uppercase tracking-wider shadow-sm">Back to Market</NuxtLink>
      </div>
    </div>

    <div v-else class="max-w-5xl mx-auto bg-white rounded-[32px] border border-gray-100 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
      <div class="mb-8 flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-gray-400 pl-1">
        <NuxtLink to="/marketplace" class="hover:text-emerald-700 transition">Market</NuxtLink>
        <ChevronRight class="w-3 h-3 text-gray-300" />
        <span class="hover:text-emerald-700 transition">
          {{ payload.product.vendor?.company_name }}
        </span>
        <ChevronRight class="w-3 h-3 text-gray-300" />
        <span class="text-[#0A1128] max-w-[160px] sm:max-w-xs truncate block font-black">{{ payload.product.name }}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div class="space-y-4">
          <div class="aspect-square w-full rounded-[24px] bg-gray-50 border border-gray-100 overflow-hidden relative shadow-inner">
            <div v-if="payload.product.bonanza_mode && payload.product.discount_percentage > 0" class="absolute top-4 left-4 z-10 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-md flex items-center space-x-1 animate-pulse">
              <Flame class="w-3 h-3 fill-white" />
              <span>-{{ payload.product.discount_percentage }}% Bonanza</span>
            </div>
            
            <img 
              v-if="activeMainImage" 
              :src="activeMainImage" 
              @click="openLightboxPortal(activeMainImage)" 
              :alt="payload.product.name" 
              class="w-full h-full object-cover cursor-zoom-in hover:opacity-95 transition-all duration-300 animate-fade-in"
            >
            <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
              <PackageOpen class="w-12 h-12" />
            </div>
          </div>

          <div v-if="payload.gallery_images.length > 0 || payload.product.image" class="w-full">
            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Product Media Assets Gallery</p>
            <div class="flex items-center space-x-3 overflow-x-auto pb-2 pt-0.5 max-w-full custom-scrollbar scroll-smooth snap-x">
              <button 
                v-if="payload.product.image"
                type="button" 
                @click="updateMainStageViewer(payload.product.image)" 
                :class="[activeMainImage === (getMediaUrl(payload.product.image)) ? 'border-[#84cc16] bg-emerald-50 border-2 shadow-md' : 'border-gray-200']"
                class="w-16 h-16 sm:w-20 sm:h-20 snap-start shrink-0 border rounded-xl overflow-hidden bg-gray-50 transition active:scale-95 cursor-pointer outline-none"
              >
                <img :src="getMediaUrl(payload.product.image) || ''" alt="Cover" class="w-full h-full object-cover">
              </button>

              <button 
                v-for="img in payload.gallery_images" 
                :key="img.id"
                type="button" 
                @click="updateMainStageViewer(img.image)" 
                :class="[activeMainImage === (getMediaUrl(img.image)) ? 'border-[#84cc16] bg-emerald-50 border-2 shadow-md' : 'border-gray-200']"
                class="w-16 h-16 sm:w-20 sm:h-20 snap-start shrink-0 border rounded-xl overflow-hidden bg-gray-50 transition active:scale-95 cursor-pointer outline-none"
              >
                <img :src="getMediaUrl(img.image) || ''" alt="Gallery item" class="w-full h-full object-cover">
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-col justify-between space-y-6">
          <div>
            <span class="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-[#D4F53C]/30 px-3 py-1.5 rounded-md inline-block shadow-2xs">
              {{ payload.product.brand || "Genuine Article" }}
            </span>
            <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight mt-4 leading-tight">
              {{ payload.product.name }}
            </h1>
            
            <div class="mt-4 flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-gray-100">
              <div class="flex items-baseline space-x-3">
                <span class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight leading-none">
                  {{ formatCurrency(currentUnitPrice) }}
                </span>
                
                <span 
                  v-if="isPromoDiscountActive && baseOriginalPrice !== currentUnitPrice" 
                  class="text-xs sm:text-sm text-gray-400 font-bold line-through tracking-tight decoration-rose-500/80 decoration-2"
                >
                  {{ formatCurrency(baseOriginalPrice) }}
                </span>
              </div>
              
              <span 
                v-if="isSkuAvailable"
                class="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg shadow-2xs"
              >
                In Stock
              </span>
            </div>

            <div class="text-xs sm:text-sm text-gray-500 mt-4 leading-relaxed pb-5 border-b border-gray-100 font-medium whitespace-pre-line">
              {{ payload.product.description || "No supplemental item description logs provided." }}
            </div>

            <div v-if="parsedKeyFeatures.length > 0" class="py-5 border-b border-gray-100 space-y-3">
              <h3 class="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center space-x-1.5 mb-1">
                <Layers3 class="w-4 h-4 text-gray-400" />
                <span>Key Specifications</span>
              </h3>
              <div class="space-y-2.5">
                <div 
                  v-for="(feature, fIdx) in parsedKeyFeatures" 
                  :key="fIdx" 
                  class="flex items-start space-x-2.5 text-xs sm:text-sm"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-[#0A1128] mt-1.5 shrink-0"></span>
                  <div class="leading-relaxed text-[#0A1128] font-semibold">
                    <span class="font-black text-gray-900">{{ feature.title }}:</span>
                    <span class="text-gray-600 ml-1">{{ feature.value }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="payload.variant_options.length > 0" class="py-6 space-y-5 border-b border-gray-100">
              <div v-for="option in payload.variant_options" :key="option.option_id">
                <label class="text-[11px] font-black uppercase tracking-wider text-gray-400 block mb-2.5">Select {{ option.name }}</label>
                <div class="flex flex-wrap gap-2">
                  <button 
                    v-for="val in option.values" 
                    :key="val.value_id"
                    type="button" 
                    @click="selectVariantValue(option.name, val.value_text)"
                    :class="[selectedOptions[option.name] === val.value_text ? 'border-[#84cc16] bg-[#D4F53C]/20 text-[#0A1128] font-black' : 'border-gray-200 bg-white text-[#0A1128] hover:border-gray-300 font-bold']"
                    class="min-w-[3.5rem] text-center px-4 py-2.5 border rounded-xl text-xs transition cursor-pointer shadow-2xs outline-none"
                  >
                    {{ val.value_text }}
                  </button>
                </div>
              </div>
              <span v-if="matchedSkuItem" class="text-xs text-emerald-700 font-black block pt-1">
                ({{ matchedSkuItem.stock_qty }} items remaining in local inventory pool)
              </span>
              <span v-else class="text-xs text-rose-600 font-black block pt-1">
                Specified configuration metrics unavailable. Select active swatches.
              </span>
            </div>
          </div>

          <div class="space-y-6 pt-4">
            <div v-if="validationErrorMessage" class="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-semibold text-rose-800 flex items-start space-x-2">
              <AlertCircle class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{{ validationErrorMessage }}</span>
            </div>

            <div v-if="!payload.product.vendor?.is_currently_open" class="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start space-x-3 text-rose-800">
              <AlertCircle class="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <h4 class="font-black text-xs sm:text-sm uppercase tracking-wide">Storefront Currently Closed</h4>
                <p class="text-xs text-rose-600 mt-0.5 leading-relaxed font-semibold">
                  Orders are offline at this time. Please check back during operations.
                </p>
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <div class="w-32 flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-0.5 shadow-inner">
                <button
                  type="button"
                  @click="adjustQty(-1)"
                  :disabled="orderQuantity <= 1"
                  class="w-10 py-2 font-black text-gray-500 hover:bg-white rounded-lg transition select-none cursor-pointer border-0 bg-transparent outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >-</button>
                <input
                  type="number"
                  v-model="orderQuantity"
                  min="1"
                  :max="maxAvailableStock"
                  class="w-12 text-center bg-transparent border-none text-xs sm:text-sm font-black text-[#0A1128] outline-none focus:ring-0 select-none no-spinner"
                  readonly
                >
                <button
                  type="button"
                  @click="adjustQty(1)"
                  :disabled="orderQuantity >= maxAvailableStock"
                  class="w-10 py-2 font-black text-gray-500 hover:bg-white rounded-lg transition select-none cursor-pointer border-0 bg-transparent outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >+</button>
              </div>
              <span class="text-xs font-bold text-gray-400">
                Subtotal: <strong class="text-[#0A1128]">{{ formatCurrency(currentUnitPrice * orderQuantity) }}</strong>
              </span>
            </div>

            <button 
              type="button" 
              @click="handleProceedToCheckoutRoute"
              :disabled="!isSkuAvailable || currentUnitPrice === 0 || (payload.variant_options.length > 0 && !matchedSkuItem)" 
              :class="[isSkuAvailable && currentUnitPrice > 0 && !(payload.variant_options.length > 0 && !matchedSkuItem) ? 'bg-[#0A1128] hover:bg-emerald-800 text-white cursor-pointer transform active:scale-95 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-md']"
              class="w-full font-black py-4 px-8 rounded-xl transition flex items-center justify-center space-x-2 text-sm sm:text-base border-0 outline-none"
            >
              <ShoppingBag class="w-4 h-4" />
              <span>
                <template v-if="!payload.product.vendor?.is_currently_open">Storefront Closed</template>
                <template v-else-if="!payload.product.is_available">Out of Stock</template>
                <template v-else-if="payload.variant_options.length > 0 && !matchedSkuItem">Select Options Combination</template>
                <template v-else>Proceed to Checkout</template>
              </span>
              <ArrowRight class="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div 
      :class="[isLightboxOpen ? 'opacity-100 pointer-events-auto flex' : 'opacity-0 pointer-events-none hidden']"
      class="fixed inset-0 z-50 bg-[#0A1128]/95 backdrop-blur-md items-center justify-center p-4 transition-all duration-300"
    >
      <div @click="closeLightboxPortal" class="absolute inset-0 cursor-zoom-out"></div>
      <button @click="closeLightboxPortal" type="button" class="absolute top-6 right-6 text-white/70 hover:text-[#D4F53C] transition border-0 outline-none p-2 z-10 cursor-pointer">
        <X class="w-6 h-6" />
      </button>
      <div 
        :class="[isLightboxOpen ? 'scale-100' : 'scale-95']"
        class="relative max-w-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl transform transition-transform duration-300 ease-out select-none"
      >
        <img :src="lightboxImage" alt="Enlarged visualization canvas" class="w-full h-full object-contain max-h-[85vh]">
      </div>
    </div>
  </main>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { height: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.no-spinner { -moz-appearance: textfield; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
</style>