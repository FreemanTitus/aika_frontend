<!-- pages/merchant/inventory/edit/[id].vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute, useCookie, useRuntimeConfig } from '#app'
import {
  ArrowLeft,
  UploadCloud,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Save,
  Loader2,
  X,
  FileText,
  Tag,
  AlertCircle,
  Layers3,
  Coins,
  Image as ImageIcon,
  Utensils,
  ShoppingBag,
  Flame,
  Sparkles
} from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const router = useRouter()
const route = useRoute()
const authToken = useCookie('auth_token')
const product_id = route.params.id as string

// Image Upload Validation Constraints (Aligned with backend validate_uploaded_image)
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

const validateImageFile = (file: File): string | null => {
  const lowerName = file.name.toLowerCase()
  const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some(ext => lowerName.endsWith(ext))
  const hasValidMime = ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())

  if (!hasValidExt || !hasValidMime) {
    return 'Only JPG, JPEG, PNG, or WEBP image files are allowed.'
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image file must be less than 5MB.'
  }

  return null
}

const isBlobUrl = (url?: string | null) => typeof url === 'string' && url.startsWith('blob:')

// Safe media URL helper fallback if not provided by an auto-imported composable
const resolveMediaUrl = (path?: string | null): string => {
  if (!path) return ''
  if (typeof (globalThis as any).getMediaUrl === 'function') {
    return (globalThis as any).getMediaUrl(path)
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const cleanBase = String(apiBase || '').replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

// 1. Core Profile Multi-Tenant Configurations
const businessTypeCookie = useCookie('business_type', { default: () => 'e_commerce' })
const ecommerceSubCategory = useCookie('ecommerce_sub_category')

const detectedBusinessType = ref<string>(
  String(businessTypeCookie.value || 'e_commerce').trim().toLowerCase()
)

const isRestaurant = computed(() => {
  const type = detectedBusinessType.value
  return type === 'restaurant' || type === 'fast_food' || type === 'kitchen'
})

// 2. Reactive UI Control Anchors
const isPageLoading = ref(true)
const dropdownsLoading = ref(false)
const isSubmitting = ref(false)
const primaryImageFile = ref<File | null>(null)
const primaryImagePreview = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

// Dropdown Content Storage Containers
const subCategoryDropdown = ref<Array<{ id: any; name: string }>>([])
const restaurantCategoryDropdown = ref<Array<{ id: any; name: string }>>([])
const brandDropdown = ref<Array<{ id: number; name: string }>>([])

interface GalleryImageItem {
  id?: number
  file: File | null
  preview: string
  caption: string
  file_key: string
  is_existing: boolean
}
const galleryImages = ref<GalleryImageItem[]>([])

// 3. Clean Master Form State Tracking (Category is derived on backend from MerchantProfile)
const form = ref({
  name: '',
  description: '',
  key_features: [] as Array<{ title: string; value: string }>,
  price: 0,
  sub_category_id: '',
  new_sub_category_name: '',
  brand_selection: '',
  new_brand_name: '',
  bonanza_mode: false,
  discount_price: 0,
  is_available: true
})

// =========================================================================
// RESTAURANT MENU OPTIONS STATE (Portions & Custom Pricing Tiers)
// =========================================================================
interface UI_MenuOption {
  id?: number
  name: string
  price: number
  is_available: boolean
}
const menuOptions = ref<UI_MenuOption[]>([])

const addMenuOptionRow = () => {
  menuOptions.value.push({ name: '', price: 0, is_available: true })
}

const removeMenuOptionRow = (index: number) => {
  menuOptions.value.splice(index, 1)
}

// =========================================================================
// 4. PROGRAMMATIC METADATA FETCH ENGINE WITH EXPLICIT HEADERS
// =========================================================================
const loadDropdownMetadata = async (subId: string = '') => {
  dropdownsLoading.value = true
  try {
    const targetUrl = `${apiBase}/api/v1/merchant/inventory/add`
    const res: any = await $fetch(targetUrl, {
      method: 'GET',
      query: subId && subId !== 'CUSTOM' ? { sub_category_id: subId } : {},
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })

    if (isRestaurant.value) {
      restaurantCategoryDropdown.value = res?.sub_categories || res?.categories || res?.menu_categories || []
    } else {
      if (!subId) {
        subCategoryDropdown.value = res?.sub_categories || []
      }
      brandDropdown.value = res?.brands || []
    }
  } catch (err) {
    console.error('Dropdown stream resolution operational fault:', err)
  } finally {
    dropdownsLoading.value = false
  }
}

// 5. Advanced SKU Variation Types
interface UI_VariantOption { name: string; valInput: string; values: string[] }
interface UI_SKUItem {
  id?: number
  value_names: string[]
  stock_qty: number
  price_override: number | null
  bonanza_mode: boolean
  discount_price: number | null
  is_active: boolean
}

const variantOptions = ref<UI_VariantOption[]>([])
const skuItems = ref<UI_SKUItem[]>([])

const addFeatureRow = () => { form.value.key_features.push({ title: '', value: '' }) }
const removeFeatureRow = (index: number) => { form.value.key_features.splice(index, 1) }

// =========================================================================
// IDENTITY HYDRATION PARSING CONSOLE WITH EXPLICIT HEADERS
// =========================================================================
onMounted(async () => {
  try {
    const fetchUrl = `${apiBase}/api/v1/merchant/inventory/detail/${product_id}`
    const response: any = await $fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })

    const targetProduct = response?.data || response
    if (!targetProduct) {
      alert('Requested operational inventory trace not found.')
      router.push('/merchant/inventory')
      return
    }

    const vendorBusinessType = targetProduct.vendor_business_type
      || targetProduct.business_type
      || targetProduct.vendor?.business_type

    if (vendorBusinessType) {
      detectedBusinessType.value = String(vendorBusinessType).trim().toLowerCase()
    }

    await loadDropdownMetadata()

    form.value.name = targetProduct.name || ''
    form.value.description = targetProduct.description || ''
    form.value.price = targetProduct.price || 0

    let resolvedSubId = ''
    if (targetProduct.sub_category) {
      resolvedSubId = typeof targetProduct.sub_category === 'object'
        ? String(targetProduct.sub_category.id)
        : String(targetProduct.sub_category)
    } else {
      resolvedSubId = targetProduct.sub_category_id ? String(targetProduct.sub_category_id) : ''
    }
    form.value.sub_category_id = resolvedSubId

    if (!isRestaurant.value && resolvedSubId && resolvedSubId !== 'CUSTOM') {
      await loadDropdownMetadata(resolvedSubId)
    }

    const dynamicBrandId = targetProduct.brand
      ? (typeof targetProduct.brand === 'object' ? String(targetProduct.brand.id) : String(targetProduct.brand))
      : (targetProduct.brand_id ? String(targetProduct.brand_id) : '')

    form.value.brand_selection = dynamicBrandId
    form.value.bonanza_mode = !!targetProduct.bonanza_mode
    form.value.discount_price = targetProduct.discount_price || 0
    form.value.is_available = targetProduct.is_available !== false

    if (targetProduct.image) {
      primaryImagePreview.value = resolveMediaUrl(targetProduct.image)
    }

    if (targetProduct.menu_options) {
      menuOptions.value = targetProduct.menu_options.map((opt: any) => ({
        id: opt.id,
        name: opt.name || '',
        price: opt.price || 0,
        is_available: opt.is_available !== false
      }))
    }

    if (targetProduct.gallery_images) {
      galleryImages.value = targetProduct.gallery_images.map((img: any, idx: number) => {
        const rawUrl = img.image || img.url || ''
        return {
          id: img.id,
          file: null,
          preview: resolveMediaUrl(rawUrl) || '',
          caption: img.caption || '',
          file_key: `gallery_existing_${idx}`,
          is_existing: true
        }
      })
    }

    if (targetProduct.key_features) {
      form.value.key_features = typeof targetProduct.key_features === 'string'
        ? JSON.parse(targetProduct.key_features)
        : targetProduct.key_features
    }

    if (targetProduct.variant_options) {
      variantOptions.value = targetProduct.variant_options.map((o: any) => ({
        name: o.name,
        valInput: '',
        values: o.values || []
      }))
    }

    if (targetProduct.sku_items) {
      skuItems.value = targetProduct.sku_items.map((s: any) => ({
        id: s.id,
        value_names: s.value_names || [],
        stock_qty: s.stock_qty || 0,
        price_override: s.price_override || null,
        bonanza_mode: !!s.bonanza_mode,
        discount_price: s.discount_price || null,
        is_active: s.is_active !== false
      }))
    }
  } catch (err: any) {
    alert(`Handshake error loading product details: ${err?.message || err}`)
  } finally {
    isPageLoading.value = false
  }
})

onBeforeUnmount(() => {
  if (isBlobUrl(primaryImagePreview.value)) {
    URL.revokeObjectURL(primaryImagePreview.value!)
  }
  galleryImages.value.forEach(img => {
    if (isBlobUrl(img.preview)) {
      URL.revokeObjectURL(img.preview)
    }
  })
})

watch(() => form.value.sub_category_id, async (newSubId) => {
  if (isPageLoading.value) return
  const cleanId = String(newSubId || '').trim()
  if (!isRestaurant.value && cleanId && cleanId !== 'CUSTOM') {
    await loadDropdownMetadata(cleanId)
  } else {
    brandDropdown.value = []
  }
  form.value.brand_selection = ''
})

const addGalleryRowSlot = () => {
  galleryImages.value.push({
    file: null,
    preview: '',
    caption: '',
    file_key: `gallery_new_${Date.now()}_${galleryImages.value.length}`,
    is_existing: false
  })
}

const handleGalleryFileSelection = (event: Event, index: number) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0] || null
  const slot = galleryImages.value[index]

  if (!slot) return

  if (!file) {
    if (isBlobUrl(slot.preview)) URL.revokeObjectURL(slot.preview)
    slot.file = null
    slot.preview = ''
    return
  }

  const validationError = validateImageFile(file)
  if (validationError) {
    errorMessage.value = validationError
    if (isBlobUrl(slot.preview)) URL.revokeObjectURL(slot.preview)
    slot.file = null
    slot.preview = ''
    if (target) target.value = ''
    return
  }

  if (isBlobUrl(slot.preview)) {
    URL.revokeObjectURL(slot.preview)
  }

  errorMessage.value = null
  slot.file = file
  slot.preview = URL.createObjectURL(file)
}

const removeGalleryItemRow = (index: number) => {
  const slot = galleryImages.value[index]
  if (isBlobUrl(slot?.preview)) {
    URL.revokeObjectURL(slot!.preview)
  }
  galleryImages.value.splice(index, 1)
}

const addVariantOption = () => {
  if (variantOptions.value.length >= 2) return
  variantOptions.value.push({ name: '', valInput: '', values: [] })
}
const addTagValue = (index: number) => {
  const option = variantOptions.value[index]
  if (option && option.valInput.trim()) {
    if (!option.values.includes(option.valInput.trim())) option.values.push(option.valInput.trim())
    option.valInput = ''
    computeSKUMatrixGrid()
  }
}
const removeTagValue = (optIndex: number, tagIndex: number) => {
  const option = variantOptions.value[optIndex]
  if (option?.values) { option.values.splice(tagIndex, 1); computeSKUMatrixGrid() }
}
const removeVariantOption = (index: number) => { variantOptions.value.splice(index, 1); computeSKUMatrixGrid() }

const computeSKUMatrixGrid = () => {
  const activeOptions = variantOptions.value.filter(o => o.name.trim() && o.values.length > 0)
  if (activeOptions.length === 0) {
    skuItems.value = []
    return
  }
  const cartesianCombinations = (arrays: string[][]): string[][] => {
    return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]] as string[][])
  }
  const matrixPool = cartesianCombinations(activeOptions.map(o => o.values))
  skuItems.value = matrixPool.map(combination => {
    const matchingExistingRow = skuItems.value.find(s => s.value_names.join('-') === combination.join('-'))
    return {
      id: matchingExistingRow ? matchingExistingRow.id : undefined,
      value_names: combination,
      stock_qty: matchingExistingRow ? matchingExistingRow.stock_qty : 0,
      price_override: matchingExistingRow ? matchingExistingRow.price_override : null,
      bonanza_mode: matchingExistingRow ? matchingExistingRow.bonanza_mode : false,
      discount_price: matchingExistingRow ? matchingExistingRow.discount_price : null,
      is_active: matchingExistingRow ? matchingExistingRow.is_active : true
    }
  })
}

const clearPrimaryImage = (input?: HTMLInputElement | null) => {
  if (isBlobUrl(primaryImagePreview.value)) {
    URL.revokeObjectURL(primaryImagePreview.value!)
  }
  primaryImagePreview.value = null
  primaryImageFile.value = null
  if (input) {
    input.value = ''
  }
}

const handlePrimaryImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0] || null

  if (!file) {
    clearPrimaryImage(target)
    return
  }

  const validationError = validateImageFile(file)
  if (validationError) {
    clearPrimaryImage(target)
    errorMessage.value = validationError
    return
  }

  if (isBlobUrl(primaryImagePreview.value)) {
    URL.revokeObjectURL(primaryImagePreview.value!)
  }

  errorMessage.value = null
  primaryImageFile.value = file
  primaryImagePreview.value = URL.createObjectURL(file)
}

const handleUpdateProductSubmit = async () => {
  if (!form.value.name || form.value.price <= 0) {
    errorMessage.value = 'Please confirm name and price before saving.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null
  const formData = new FormData()

  formData.append('name', form.value.name.trim())
  formData.append('description', form.value.description.trim())
  formData.append('price', String(form.value.price))
  formData.append('key_features', JSON.stringify(isRestaurant.value ? [] : form.value.key_features))
  formData.append('bonanza_mode', String(form.value.bonanza_mode))
  formData.append('is_available', String(form.value.is_available))
  formData.append('image_key', 'image')

  if (form.value.bonanza_mode && form.value.discount_price) {
    formData.append('discount_price', String(form.value.discount_price))
  }

  const targetSubCat = form.value.sub_category_id && form.value.sub_category_id.trim() !== ''
    ? form.value.sub_category_id
    : 'NONE'
  formData.append('sub_category_id', targetSubCat)

  if (targetSubCat === 'CUSTOM' && form.value.new_sub_category_name) {
    formData.append('new_sub_category_name', form.value.new_sub_category_name.trim())
  }

  if (isRestaurant.value) {
    formData.append('menu_options', JSON.stringify(menuOptions.value))
    formData.append('sku_items', JSON.stringify([]))
    formData.append('variant_options', JSON.stringify([]))
    formData.append('gallery_images', JSON.stringify([]))
  } else {
    const targetBrand = form.value.brand_selection && form.value.brand_selection.trim() !== ''
      ? form.value.brand_selection
      : 'NONE'
    formData.append('brand_selection', targetBrand)

    if (targetBrand === 'CUSTOM' && form.value.new_brand_name) {
      formData.append('new_brand_name', form.value.new_brand_name.trim())
    }

    if (variantOptions.value.length > 0) {
      const parsedOptions = variantOptions.value.map(vo => ({ name: vo.name, values: vo.values }))
      formData.append('variant_options', JSON.stringify(parsedOptions))

      const parsedSKUs = skuItems.value.map(sk => ({
        id: sk.id ? Number(sk.id) : null,
        item_id: sk.id ? Number(sk.id) : null,
        stock_qty: Number(sk.stock_qty || 0),
        price_override: sk.price_override ? Number(sk.price_override) : null,
        bonanza_mode: Boolean(sk.bonanza_mode),
        discount_price: sk.bonanza_mode && sk.discount_price ? Number(sk.discount_price) : null,
        value_ids: [],
        is_active: Boolean(sk.is_active),
        value_names: sk.value_names
      }))
      formData.append('sku_items', JSON.stringify(parsedSKUs))
    } else {
      formData.append('variant_options', JSON.stringify([]))
      formData.append('sku_items', JSON.stringify([]))
    }

    if (galleryImages.value && galleryImages.value.length > 0) {
      const metadataPayload = galleryImages.value.map(img => ({
        id: img.id || null,
        file_key: img.file_key,
        caption: img.caption.trim()
      }))
      formData.append('gallery_images', JSON.stringify(metadataPayload))
      galleryImages.value.forEach(img => {
        if (img.file) formData.append(img.file_key, img.file)
      })
    } else {
      formData.append('gallery_images', JSON.stringify([]))
    }
  }

  if (primaryImageFile.value) {
    formData.append('image', primaryImageFile.value)
  }

  try {
    const response: any = await $fetch(`${apiBase}/api/v1/merchant/inventory/edit/${product_id}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: formData
    })
    if (response.status === 'success') {
      router.push('/merchant/inventory')
    }
  } catch (err: any) {
    const serverErrorText = err?.data?.detail || err?.message || 'An unresolved mutation fault occurred.'
    console.error('Validation breakdown details:', err?.data)
    errorMessage.value = typeof serverErrorText === 'string' ? serverErrorText : JSON.stringify(serverErrorText)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="py-10 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-gray-50 via-white to-gray-50/40 min-h-screen text-left selection:bg-[#D4F53C] selection:text-[#0A1128] relative">

    <!-- GLOBAL PROCESSING BACKDROP MODAL -->
    <Transition name="fade">
      <div v-if="isSubmitting" class="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-md z-[9999] flex flex-col items-center justify-center space-y-4 select-none pointer-events-auto">
        <div class="p-6 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center max-w-xs text-center border border-gray-100 animate-scale-up">
          <div class="relative flex items-center justify-center w-16 h-16 bg-[#D4F53C]/20 rounded-2xl mb-4">
            <Loader2 class="w-8 h-8 text-[#0A1128] animate-spin stroke-[2.5]" />
            <Sparkles class="w-4 h-4 text-[#84cc16] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h3 class="text-sm font-black text-[#0A1128] tracking-tight">Updating Catalog Item</h3>
          <p class="text-[11px] text-gray-400 font-medium mt-1 leading-relaxed">Committing inventory mutations, rebuilding SKU matrix nodes, and saving secondary assets...</p>
        </div>
      </div>
    </Transition>

    <div v-if="isPageLoading" class="py-32 text-center space-y-4">
      <Loader2 class="w-10 h-10 animate-spin text-[#0A1128] mx-auto stroke-[2.5]" />
      <p class="text-xs text-gray-400 font-black uppercase tracking-widest animate-pulse">Hydrating Specifications Schema...</p>
    </div>

    <div v-else class="max-w-5xl mx-auto space-y-8 animate-fade-in" :class="{ 'opacity-40 pointer-events-none': isSubmitting }">

      <div class="flex items-center space-x-2">
        <NuxtLink to="/merchant/inventory" class="p-2.5 bg-white border border-gray-200/60 rounded-xl shadow-2xs hover:bg-gray-50 transition text-gray-400 hover:text-[#0A1128] flex items-center justify-center cursor-pointer">
          <ArrowLeft class="w-4 h-4" />
        </NuxtLink>
        <span class="text-xs font-black text-gray-400 uppercase tracking-widest">Cancel Modifications</span>
      </div>

      <div class="space-y-1">
        <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">Modify Product Specification</h1>
        <p class="text-sm text-gray-400">Adjust core attributes parameters, register variants variations tables, and commit catalog updates.</p>
      </div>

      <!-- ERROR MESSAGE BANNER -->
      <div v-if="errorMessage" class="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-3 animate-fade-in shadow-sm">
        <AlertCircle class="w-5 h-5 text-rose-600 shrink-0" />
        <div class="flex-1">
          <span class="font-black uppercase tracking-wider block text-[10px] text-rose-600 mb-0.5">Catalog Update Rejected</span>
          <span>{{ errorMessage }}</span>
        </div>
        <button @click="errorMessage = null" class="text-rose-400 hover:text-rose-700 bg-transparent border-0 cursor-pointer p-1">✕</button>
      </div>

      <form @submit.prevent="handleUpdateProductSubmit" class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div class="lg:col-span-2 space-y-6">

          <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4 relative group">
            <div class="absolute top-0 left-0 w-full h-[4px] bg-[#84cc16] rounded-t-full opacity-60"></div>
            <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2 border-b border-gray-50 pb-2.5">
              <FileText class="w-4 h-4 text-[#84cc16]" />
              <span>Core Specifications Identity</span>
            </h2>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase text-gray-400 tracking-wide">Product Item Title Label</label>
              <input v-model="form.name" type="text" placeholder="e.g., iPhone 15 Pro Max" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs" required />
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase text-gray-400 tracking-wide">Item Specifications Description</label>
              <textarea v-model="form.description" rows="4" placeholder="Brief high-level summary overview notes safely..." class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"></textarea>
            </div>
          </div>

          <!-- TECHNICAL SPECIFICATIONS PARAMETERS MATRIX (Hidden for Restaurants) -->
          <div v-if="!isRestaurant" class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-50 pb-2.5">
              <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2">
                <Layers3 class="w-4 h-4 text-[#84cc16]" />
                <span>Technical Key Specifications</span>
              </h2>
              <button @click="addFeatureRow" type="button" class="text-xs bg-gray-50 border border-gray-200/60 hover:bg-[#D4F53C] hover:text-[#0A1128] text-[#0A1128] font-black px-3 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer">
                <Plus class="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Specification</span>
              </button>
            </div>

            <div v-if="form.key_features.length === 0" class="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium text-xs bg-gray-50/20">
              No technical key specifications mapped yet. Click "Add Specification" to create bullet parameter sheets.
            </div>

            <div v-else class="space-y-3 animate-fade-in">
              <div v-for="(feature, idx) in form.key_features" :key="idx" class="flex items-center space-x-3 bg-gray-50/40 p-3 rounded-xl border border-gray-100/70">
                <span class="w-1.5 h-1.5 rounded-full bg-[#0A1128] shrink-0"></span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                  <input v-model="feature.title" type="text" placeholder="e.g., Processor, Memory" class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-black text-[#0A1128] focus:outline-none shadow-2xs" />
                  <input v-model="feature.value" type="text" placeholder="Specification value description payload..." class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600 sm:col-span-2 focus:outline-none shadow-2xs" />
                </div>
                <button @click="removeFeatureRow(idx)" type="button" class="text-gray-400 hover:text-rose-600 p-1.5 bg-white border border-gray-200 rounded-xl shadow-2xs transition shrink-0"><Trash2 class="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          <!-- CATEGORIZATION & BRAND SELECTIONS -->
          <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2 border-b border-gray-50 pb-2.5">
              <Tag class="w-4 h-4 text-[#84cc16]" />
              <span>Categorization & Brand Logs</span>
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[11px] font-black uppercase text-gray-400 tracking-wide">Primary Store Department</label>
                <div class="w-full bg-gray-100/70 border border-gray-200/40 rounded-xl px-4 py-3.5 text-xs font-black text-gray-500 capitalize select-none flex items-center space-x-2">
                  <template v-if="isRestaurant">
                    <Utensils class="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    <span>Restaurant Kitchen</span>
                  </template>
                  <template v-else>
                    <ShoppingBag class="w-4 h-4 text-blue-600 stroke-[2.5]" />
                    <span>
                      E-Commerce Retail
                      <span v-if="ecommerceSubCategory" class="text-[#0A1128]">• {{ ecommerceSubCategory }}</span>
                    </span>
                  </template>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-black uppercase text-gray-500 tracking-wide flex items-center justify-between">
                  <span>{{ isRestaurant ? 'Menu Type Category *' : 'Niche Storefront Subcategory' }}</span>
                  <Loader2 v-if="dropdownsLoading" class="w-3 h-3 animate-spin text-gray-400" />
                </label>
                <select v-model="form.sub_category_id" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer shadow-2xs">
                  <option value="">Select Category Tier</option>
                  <template v-if="isRestaurant">
                    <option v-for="cat in restaurantCategoryDropdown" :key="cat.id" :value="String(cat.id)">
                      {{ cat.name }}
                    </option>
                  </template>
                  <template v-else>
                    <option v-for="sc in (subCategoryDropdown as any[])" :key="sc?.id" :value="String(sc?.id)">{{ sc?.name }}</option>
                  </template>
                  <option value="CUSTOM">Add Custom Subcategory...</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-if="form.sub_category_id === 'CUSTOM'" class="space-y-1.5 animate-slide-in" :class="{'sm:col-span-2': isRestaurant}">
                <label class="text-[11px] font-black uppercase text-amber-600 tracking-wide">New Custom {{ isRestaurant ? 'Menu Category' : 'Subcategory' }} Label</label>
                <input v-model="form.new_sub_category_name" type="text" :placeholder="isRestaurant ? 'e.g., Burgers, Pastries, Grills' : 'e.g., Laptops, Gadgets'" class="w-full bg-white border border-amber-200 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-amber-400 bg-amber-50/10 shadow-2xs" required />
              </div>

              <div v-if="!isRestaurant" class="space-y-1.5">
                <label class="text-[11px] font-black uppercase text-gray-500 tracking-wide">Brand Authorization Track</label>
                <select v-model="form.brand_selection" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer shadow-2xs">
                  <option value="">Select Global Brand Line</option>
                  <option v-for="br in (brandDropdown as any[])" :key="br.id" :value="String(br.id)">{{ br.name }}</option>
                  <option value="CUSTOM">Add Custom Brand...</option>
                </select>
              </div>

              <div v-if="!isRestaurant && form.brand_selection === 'CUSTOM'" class="space-y-1.5 animate-slide-in">
                <label class="text-[11px] font-black uppercase text-amber-600 tracking-wide">New Brand Unique Name</label>
                <input v-model="form.new_brand_name" type="text" placeholder="e.g., Apple, Dell, Lenovo" class="w-full bg-white border border-amber-200 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-amber-400 bg-amber-50/10 shadow-2xs" required />
              </div>
            </div>
          </div>

          <!-- RESTAURANT MENU OPTIONS (PORTIONS / PRICING TIERS) -->
          <div v-if="isRestaurant" class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-50 pb-2.5">
              <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2">
                <Utensils class="w-4 h-4 text-[#84cc16]" />
                <span>Menu Item Pricing Tiers / Sizes</span>
              </h2>
              <button @click="addMenuOptionRow" type="button" class="text-xs bg-gray-50 border border-gray-200/60 hover:bg-[#D4F53C] hover:text-[#0A1128] text-[#0A1128] font-black px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer">
                <Plus class="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Portion Option</span>
              </button>
            </div>

            <div v-if="menuOptions.length === 0" class="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium text-xs bg-gray-50/20">
              Optional: Add different portions or sizes with specific prices (e.g., "Big Piece", "Small Piece", "Full Portion").
            </div>

            <div v-else class="space-y-3 animate-fade-in">
              <div v-for="(opt, idx) in menuOptions" :key="idx" class="flex items-center space-x-3 bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  <input v-model="opt.name" type="text" placeholder="Option Name (e.g., Big Piece)" class="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-[#0A1128] focus:outline-none focus:border-[#0A1128]" />
                  <input v-model.number="opt.price" type="number" step="0.01" placeholder="Price (₦)" class="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-emerald-700 focus:outline-none focus:border-[#0A1128]" />
                </div>
                <button @click="removeMenuOptionRow(idx)" type="button" class="text-gray-400 hover:text-rose-600 p-2 bg-white border border-gray-200 rounded-xl transition shadow-xs shrink-0 cursor-pointer">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- SHOWCASE SECONDARY IMAGES GALLERY (E-Commerce Only) -->
          <div v-if="!isRestaurant" class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-50 pb-2.5">
              <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2">
                <ImageIcon class="w-4 h-4 text-[#84cc16]" />
                <span>Secondary Image Showcase Gallery</span>
              </h2>
              <button @click="addGalleryRowSlot" type="button" class="text-xs bg-gray-50 border border-gray-200/60 hover:bg-[#D4F53C] hover:text-[#0A1128] text-[#0A1128] font-black px-3 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer">
                <Plus class="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Photo Slot</span>
              </button>
            </div>

            <div v-if="galleryImages.length === 0" class="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium text-xs bg-gray-50/10">No secondary gallery assets uploaded yet.</div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in" v-else>
              <div v-for="(img, idx) in galleryImages" :key="img.file_key" class="p-4 border border-gray-200/60 bg-gray-50/30 rounded-2xl flex flex-col space-y-3 relative group transition hover:shadow-xs bg-white">
                <button @click="removeGalleryItemRow(idx)" type="button" class="absolute top-2 right-2 p-1.5 bg-white/90 border border-gray-100 rounded-lg text-gray-400 hover:text-rose-600 shadow-2xs transition z-10"><X class="w-3.5 h-3.5" /></button>
                <div class="w-full h-36 border-2 border-dashed border-gray-200 bg-white rounded-xl relative overflow-hidden flex flex-col items-center justify-center transition group-hover:border-gray-300">
                  <img v-if="img.preview" :src="img.preview" class="w-full h-full object-cover" />
                  <template v-else>
                    <UploadCloud class="w-7 h-7 text-gray-400 mb-1" />
                    <span class="text-[10px] font-black text-gray-500">Upload Gallery Image</span>
                    <span class="text-[9px] text-gray-400 font-medium mt-0.5">JPG, PNG, WEBP up to 5MB</span>
                    <input
                      @change="handleGalleryFileSelection($event, idx)"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </template>
                </div>
                <input v-model="img.caption" type="text" placeholder="Caption label (e.g., Side View)..." class="w-full bg-white border border-gray-200/80 rounded-xl px-3 py-2 text-[11px] font-semibold text-[#0A1128] focus:outline-none shadow-2xs" />
              </div>
            </div>
          </div>

          <!-- ADVANCED SKU MATRIX CONTROLS (E-Commerce Only) -->
          <div v-if="!isRestaurant" class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-6">
            <div class="flex items-center justify-between border-b border-gray-50 pb-2.5">
              <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2">
                <Layers3 class="w-4 h-4 text-[#84cc16]" />
                <span>Product Options Track Configurations</span>
              </h2>
              <button @click="addVariantOption" type="button" class="text-xs bg-gray-50 border border-gray-200/60 hover:bg-[#D4F53C] hover:text-[#0A1128] text-[#0A1128] font-black px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer">
                <Plus class="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Option Track</span>
              </button>
            </div>

            <div v-for="(opt, oIdx) in variantOptions" :key="oIdx" class="p-5 border border-gray-200/60 bg-gray-50/40 rounded-2xl space-y-4 relative animate-slide-in bg-white">
              <button @click="removeVariantOption(oIdx)" type="button" class="absolute top-4 right-4 text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-gray-50"><Trash2 class="w-4 h-4" /></button>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div class="space-y-1.5">
                  <input v-model="opt.name" @input="computeSKUMatrixGrid" type="text" placeholder="e.g., Memory, Color" class="w-full bg-white border border-gray-200/80 rounded-xl px-3 py-2.5 text-xs font-bold text-[#0A1128] focus:outline-none shadow-2xs" />
                </div>
                <div class="space-y-1.5 sm:col-span-2">
                  <input v-model="opt.valInput" @keydown.enter.prevent="addTagValue(oIdx)" type="text" placeholder="Type property term and hit enter..." class="w-full bg-white border border-gray-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#0A1128] focus:outline-none shadow-2xs" />
                </div>
              </div>
              <div v-if="opt.values.length > 0" class="flex flex-wrap gap-1.5 pt-1">
                <span v-for="(tag, tIdx) in opt.values" :key="tIdx" class="inline-flex items-center space-x-1 text-xs font-black px-2.5 py-1.5 bg-white border border-gray-200/60 text-[#0A1128] rounded-xl shadow-2xs">
                  <span>{{ tag }}</span>
                  <button @click="removeTagValue(oIdx, tIdx)" type="button" class="text-gray-400 hover:text-rose-600 font-bold ml-1.5 text-[10px] bg-transparent border-0">✕</button>
                </span>
              </div>
            </div>

            <div v-if="skuItems.length > 0" class="space-y-3 pt-2 animate-fade-in">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 block pl-0.5">Generated Variant SKU Target Allocations Matrix</span>
              <div class="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm bg-white">
                <div v-for="(sku, sIdx) in skuItems" :key="sIdx" class="p-5 flex flex-col space-y-4 text-xs font-semibold hover:bg-gray-50/30 transition">

                  <div class="flex flex-wrap items-center justify-between border-b border-gray-100/60 pb-2.5 gap-2">
                    <span class="bg-[#0A1128] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase font-mono tracking-wider shadow-2xs">{{ sku.value_names.join(' / ') }}</span>

                    <div class="flex items-center space-x-2">
                      <span class="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1"><Flame class="w-3 h-3 text-rose-500" /> Variant Discount Drop</span>
                      <button @click="sku.bonanza_mode = !sku.bonanza_mode" type="button" class="focus:outline-none cursor-pointer transition active:scale-95 border-0 bg-transparent">
                        <ToggleRight v-if="sku.bonanza_mode" class="w-7 h-7 text-rose-600" />
                        <ToggleLeft v-else class="w-7 h-7 text-gray-300" />
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div class="space-y-1">
                      <label class="text-[9px] uppercase font-black text-gray-400 tracking-wider">Available Stock Volume</label>
                      <input type="number" v-model="sku.stock_qty" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-3 py-2.5 text-center text-xs font-black text-[#0A1128] focus:outline-none focus:bg-white focus:border-[#0A1128]" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-[9px] uppercase font-black text-gray-400 tracking-wider">Base Price Override (₦)</label>
                      <input type="number" v-model="sku.price_override" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-3 py-2.5 text-center text-xs font-black text-[#0A1128] focus:outline-none focus:bg-white focus:border-[#0A1128]" />
                    </div>

                    <div v-if="sku.bonanza_mode" class="space-y-1 sm:col-span-2 animate-slide-in">
                      <label class="text-[9px] uppercase font-black text-rose-600 tracking-wider flex items-center gap-1"><AlertCircle class="w-3 h-3 text-rose-600" /> Variant Promotional Price (₦)</label>
                      <input type="number" v-model="sku.discount_price" placeholder="Promo Override Rate" class="w-full bg-rose-50/10 border border-rose-200 rounded-xl px-3 py-2.5 text-center text-xs font-black text-rose-700 focus:outline-none" />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT BAR COLUMN PANELS -->
        <div class="space-y-6">
          <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2 border-b border-gray-50 pb-2.5"><Coins class="w-4 h-4 text-[#84cc16]" /><span>Global Parent Pricing</span></h2>
            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase text-gray-400 tracking-wide">Base Retail Markdown Price (₦)</label>
              <input v-model="form.price" type="number" step="0.01" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3 text-sm font-black text-[#0A1128] focus:outline-none focus:border-[#0A1128] shadow-2xs" required />
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
              <div class="text-left space-y-0.5">
                <span class="text-[11px] font-black uppercase text-gray-400 tracking-wide block">Global Bonanza Clearance</span>
                <span class="text-[10px] text-gray-400 font-medium block">Markdown un-overridden values.</span>
              </div>
              <button @click="form.bonanza_mode = !form.bonanza_mode" type="button" class="focus:outline-none cursor-pointer transition active:scale-95 border-0 bg-transparent">
                <ToggleRight v-if="form.bonanza_mode" class="w-8 h-8 text-[#84cc16]" />
                <ToggleLeft v-else class="w-8 h-8 text-gray-300" />
              </button>
            </div>

            <div v-if="form.bonanza_mode" class="space-y-1.5 pt-2 border-t border-dashed border-gray-100 animate-slide-in">
              <label class="text-[11px] font-black uppercase text-amber-600 tracking-wide flex items-center space-x-1"><AlertCircle class="w-3.5 h-3.5" /><span>Global Discount Rate (₦)</span></label>
              <input v-model="form.discount_price" type="number" step="0.01" class="w-full bg-amber-50/20 border border-amber-200 rounded-xl px-4 py-3 text-sm font-black text-amber-700 focus:outline-none shadow-2xs" />
            </div>
          </div>

          <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider border-b border-gray-50 pb-2.5">Primary Showcase Image</h2>
            <div class="relative group border-2 border-dashed border-gray-200 hover:border-[#0A1128] rounded-2xl p-4 min-h-[180px] bg-gray-50/40 overflow-hidden flex flex-col items-center justify-center transition">
              <template v-if="primaryImagePreview">
                <img :src="primaryImagePreview" class="absolute inset-0 w-full h-full object-cover animate-fade-in" />
                <button @click="clearPrimaryImage()" type="button" class="absolute top-3 right-3 p-1.5 bg-black/70 rounded-xl text-white hover:bg-black transition z-10 shadow-sm border-0 outline-none cursor-pointer"><X class="w-4 h-4" /></button>
              </template>
              <template v-else>
                <UploadCloud class="w-8 h-8 text-gray-400 mb-2" />
                <span class="text-xs font-black text-gray-600 text-center">Upload Primary Image Binary</span>
                <span class="text-[10px] text-gray-400 font-medium mt-0.5">JPG, PNG, WEBP up to 5MB</span>
                <input
                  @change="handlePrimaryImageUpload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </template>
            </div>
          </div>

          <div class="space-y-3">
            <button :disabled="isSubmitting" type="submit" class="w-full bg-[#0A1128] text-white font-black text-xs py-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer border-0">
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin text-white" />
              <Save v-else class="w-4 h-4 text-white" />
              <span>Save Changes</span>
            </button>
            <NuxtLink to="/merchant/inventory" class="w-full bg-white border border-gray-200 text-gray-400 font-black text-xs py-4 rounded-xl text-center block shadow-2xs transition">Cancel Configuration</NuxtLink>
          </div>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
@keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

.animate-slide-in { animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>