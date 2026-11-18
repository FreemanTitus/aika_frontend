<!-- pages/merchant/inventory/add.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue' 
import { useRouter, useCookie, useRuntimeConfig } from '#app'
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
const authToken = useCookie('auth_token')

// 1. Core Profile Multi-Tenant Configurations
const businessType = useCookie('business_type', { default: () => 'e_commerce' })
const ecommerceSubCategory = useCookie('ecommerce_sub_category')
const isRestaurant = computed(() => businessType.value === 'restaurant')

// 2. Reactive UI Control Anchors
const isSubmitting = ref(false)
const dropdownsLoading = ref(false)
const primaryImageFile = ref<File | null>(null)
const primaryImagePreview = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

// Dropdown Content Storage Containers (Backend-driven for both)
const subCategoryDropdown = ref<Array<{ id: any; name: string }>>([])
const restaurantCategoryDropdown = ref<Array<{ id: any; name: string }>>([])
const brandDropdown = ref<Array<{ id: number; name: string }>>([])

interface GalleryImageItem {
  file: File | null;
  preview: string;
  caption: string;
  file_key: string;
}
const galleryImages = ref<GalleryImageItem[]>([])

// 3. Clean Master Input Form Payload State Tracking
const form = ref({
  name: '',
  description: '',
  key_features: [] as Array<{ title: string; value: string }>,
  price: 0,
  category: '',
  sub_category_id: '',
  new_sub_category_name: '',
  brand_selection: '',
  new_brand_name: '',
  bonanza_mode: false,
  discount_price: 0,
  is_available: true
})

// =========================================================================
// RESTAURANT MENU PRICING OPTIONS STATE (e.g. Small / Big chicken portions)
// =========================================================================
interface UI_MenuOption {
  name: string;
  price: number;
  is_available: boolean;
}
const menuOptions = ref<UI_MenuOption[]>([])

const addMenuOptionRow = () => {
  menuOptions.value.push({ name: '', price: 0, is_available: true })
}

const removeMenuOptionRow = (index: number) => {
  menuOptions.value.splice(index, 1)
}

// =========================================================================
// DETERMINISTIC METADATA INITIALIZATION ENGINE (BACKEND FETCH FOR ALL)
// =========================================================================
const loadProductCreationMetadata = async (subId: string = '') => {
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
      // Pull restaurant categories/subcategories directly from backend response keys
      restaurantCategoryDropdown.value = res?.sub_categories || res?.categories || res?.menu_categories || []
      
      // Safely check if the first item exists before extracting its id
      if (restaurantCategoryDropdown.value.length > 0 && !form.value.sub_category_id) {
        const firstCat = restaurantCategoryDropdown.value[0]
        form.value.sub_category_id = String(firstCat?.id ?? '')
      }
    } else {
      if (!subId) {
        subCategoryDropdown.value = res?.sub_categories || res?.data || []
      }
      brandDropdown.value = res?.brands || res?.data || []
    }
  } catch (err) {
    console.error("Critical Page Metadata Initialization Exception:", err)
  } finally {
    dropdownsLoading.value = false
  }
}

watch(() => form.value.sub_category_id, async (newSubId) => {
  const cleanId = String(newSubId || '').trim()
  if (cleanId && cleanId !== 'CUSTOM' && !isRestaurant.value) {
    await loadProductCreationMetadata(cleanId)
  } else {
    brandDropdown.value = []
  }
  form.value.brand_selection = ''
})

onMounted(async () => {
  await loadProductCreationMetadata()
})

// 5. Advanced E-Commerce Variation Matrix Engine Arrays
interface UI_VariantOption { name: string; valInput: string; values: string[] }
interface UI_SKUItem { 
  value_names: string[]; 
  stock_qty: number; 
  price_override: number | null; 
  bonanza_mode: boolean; 
  discount_price: number | null; 
  is_active: boolean; 
}

const variantOptions = ref<UI_VariantOption[]>([])
const skuItems = ref<UI_SKUItem[]>([])

const addGalleryRowSlot = () => {
  galleryImages.value.push({
    file: null, preview: '', caption: '',
    file_key: `gallery_new_${Date.now()}_${galleryImages.value.length}`
  })
}

const handleGalleryFileSelection = (event: Event, index: number) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0] && galleryImages.value[index]) {
    const targetFile = target.files[0]
    galleryImages.value[index].file = targetFile
    galleryImages.value[index].preview = URL.createObjectURL(targetFile)
  }
}

const removeGalleryItemRow = (index: number) => {
  galleryImages.value.splice(index, 1)
}

const addFeatureRow = () => {
  form.value.key_features.push({ title: '', value: '' })
}

const removeFeatureRow = (index: number) => {
  form.value.key_features.splice(index, 1)
}

const addVariantOption = () => {
  if (variantOptions.value.length >= 2) return
  variantOptions.value.push({ name: '', valInput: '', values: [] })
}

const addTagValue = (index: number) => {
  const option = variantOptions.value[index]
  if (option && option.valInput.trim()) {
    if (!option.values.includes(option.valInput.trim())) {
      option.values.push(option.valInput.trim())
    }
    option.valInput = ''
    computeSKUMatrixGrid()
  }
}

const removeTagValue = (optIndex: number, tagIndex: number) => {
  const option = variantOptions.value[optIndex]
  if (option?.values) {
    option.values.splice(tagIndex, 1)
    computeSKUMatrixGrid()
  }
}

const removeVariantOption = (index: number) => {
  variantOptions.value.splice(index, 1)
  computeSKUMatrixGrid()
}

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
      value_names: combination,
      stock_qty: matchingExistingRow ? matchingExistingRow.stock_qty : 0,
      price_override: matchingExistingRow ? matchingExistingRow.price_override : null,
      bonanza_mode: matchingExistingRow ? matchingExistingRow.bonanza_mode : false,
      discount_price: matchingExistingRow ? matchingExistingRow.discount_price : null,
      is_active: matchingExistingRow ? matchingExistingRow.is_active : true
    }
  })
}

const handlePrimaryImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    primaryImageFile.value = target.files[0]
    primaryImagePreview.value = URL.createObjectURL(target.files[0])
  }
}

const handlePublishProductSubmit = async () => {
  if (!form.value.name || form.value.price <= 0) {
    errorMessage.value = "Please confirm name and price before publishing."
    return
  }
  
  isSubmitting.value = true
  errorMessage.value = null
  const formData = new FormData()

  formData.append('name', form.value.name.trim())
  formData.append('description', form.value.description.trim())
  formData.append('price', String(form.value.price))
  formData.append('category', form.value.category)
  formData.append('bonanza_mode', String(form.value.bonanza_mode))
  formData.append('is_available', String(form.value.is_available))
  formData.append('image_key', 'image')

  if (form.value.bonanza_mode && form.value.discount_price) {
    formData.append('discount_price', String(form.value.discount_price))
  }

  const targetSubCat = form.value.sub_category_id && form.value.sub_category_id.trim() !== "" ? form.value.sub_category_id : "NONE"
  formData.append('sub_category_id', targetSubCat)

  if (targetSubCat === 'CUSTOM' && form.value.new_sub_category_name) {
    formData.append('new_sub_category_name', form.value.new_sub_category_name.trim())
  }

  if (isRestaurant.value) {
    formData.append('key_features', JSON.stringify([]))
    formData.append('menu_options', JSON.stringify(menuOptions.value))
  } else {
    formData.append('key_features', JSON.stringify(form.value.key_features))
    
    const targetBrand = form.value.brand_selection && form.value.brand_selection.trim() !== "" ? form.value.brand_selection : "NONE"
    formData.append('brand_selection', targetBrand)
    
    if (targetBrand === 'CUSTOM' && form.value.new_brand_name) {
      formData.append('new_brand_name', form.value.new_brand_name.trim())
    }

    if (variantOptions.value.length > 0) {
      const parsedOptions = variantOptions.value.map(vo => ({ name: vo.name, values: vo.values }))
      formData.append('variant_options', JSON.stringify(parsedOptions))
      
      const parsedSKUs = skuItems.value.map(sk => ({
        sku: `${form.value.name.trim()}-${sk.value_names.join('-')}`, 
        value_names: sk.value_names,
        stock_qty: Number(sk.stock_qty || 0),
        price_override: sk.price_override ? Number(sk.price_override) : null,
        bonanza_mode: Boolean(sk.bonanza_mode),
        discount_price: sk.bonanza_mode && sk.discount_price ? Number(sk.discount_price) : null,
        value_ids: [], 
        is_active: Boolean(sk.is_active)
      }))
      formData.append('sku_items', JSON.stringify(parsedSKUs))
    }

    if (galleryImages.value.length > 0) {
      const metadata = galleryImages.value.filter(img => img.file).map(img => ({
        file_key: img.file_key, caption: img.caption.trim()
      }))
      formData.append('gallery_images', JSON.stringify(metadata))
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
    const response: any = await $fetch(`${apiBase}/api/v1/merchant/inventory/add`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: formData
    })
    if (response.status === 'success' || response.product_id) {
      router.push('/merchant/inventory')
    }
  } catch (err: any) {
    console.error("Form transmission diagnostic:", err?.data)
    const errorDetail = err?.data?.detail || err?.data?.message || err?.message || "Product creation rejected."
    errorMessage.value = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="py-10 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-gray-50 via-white to-gray-50/40 min-h-screen text-left selection:bg-[#D4F53C] selection:text-[#0A1128] relative">
    
    <!-- ENHANCED GLOBAL BACKDROP BLUR PROCESSING SPINNER OVERLAY -->
    <Transition name="fade">
      <div v-if="isSubmitting" class="fixed inset-0 bg-[#0A1128]/70 backdrop-blur-md z-[9999] flex flex-col items-center justify-center space-y-4 select-none pointer-events-auto">
        <div class="p-8 bg-white rounded-[32px] shadow-2xl flex flex-col items-center justify-center max-w-sm text-center border border-gray-100 animate-scale-up space-y-3">
          <div class="relative flex items-center justify-center w-20 h-20 bg-[#D4F53C]/20 rounded-2xl">
            <Loader2 class="w-10 h-10 text-[#0A1128] animate-spin stroke-[2.5]" />
            <Sparkles class="w-5 h-5 text-[#84cc16] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-black text-[#0A1128] tracking-tight">Publishing Catalog Item...</h3>
            <p class="text-xs text-gray-400 font-medium leading-relaxed">Please wait while we stream specifications and assets to your secure database ledger.</p>
          </div>
        </div>
      </div>
    </Transition>

    <div class="max-w-5xl mx-auto space-y-8 animate-fade-in" :class="{ 'opacity-40 pointer-events-none': isSubmitting }">
      
      <!-- TOP INTERACTION CONSOLE ROUTING ACTION -->
      <div class="flex items-center space-x-2">
        <NuxtLink to="/merchant/inventory" class="p-2.5 bg-white border border-gray-200/60 rounded-xl shadow-2xs hover:bg-gray-50 transition text-gray-400 hover:text-[#0A1128] flex items-center justify-center cursor-pointer">
          <ArrowLeft class="w-4 h-4" />
        </NuxtLink>
        <span class="text-xs font-black text-gray-400 uppercase tracking-widest">Back to Catalog Inventory</span>
      </div>

      <div class="space-y-1">
        <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">Upload Product Specification</h1>
        <p class="text-sm text-gray-400">Publish new products, adjust localized prices, and map global product variations.</p>
      </div>

      <!-- ERROR MESSAGE BANNER -->
      <div v-if="errorMessage" class="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-3 animate-fade-in shadow-sm">
        <AlertCircle class="w-5 h-5 text-rose-600 shrink-0" />
        <div class="flex-1">
          <span class="font-black uppercase tracking-wider block text-[10px] text-rose-600 mb-0.5">Catalog Submission Rejected</span>
          <span>{{ errorMessage }}</span>
        </div>
        <button @click="errorMessage = null" class="text-rose-400 hover:text-rose-700 bg-transparent border-0 cursor-pointer p-1">✕</button>
      </div>

      <form @submit.prevent="handlePublishProductSubmit" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- LEFT COLUMNS MAIN FORM ELEMENTS -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- SECTION 1: CORE IDENTITY SPECIFICATION SHEET -->
          <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4 relative group">
            <div class="absolute top-0 left-0 w-full h-[4px] bg-[#84cc16] rounded-t-full opacity-60"></div>
            <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2 border-b border-gray-50 pb-2.5">
              <FileText class="w-4 h-4 text-[#84cc16]" />
              <span>Core Specifications Identity</span>
            </h2>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase text-gray-400 tracking-wide">Product Item Title Label</label>
              <input v-model="form.name" type="text" placeholder="e.g., HP EliteBook Core i7, Gourmet Fried Rice..." class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs" required />
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase text-gray-400 tracking-wide">Item Specifications Description</label>
              <textarea v-model="form.description" rows="4" placeholder="Brief high-level summary overview notes safely..." class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"></textarea>
            </div>
          </div>

          <!-- SECTION 2: TECHNICAL SPECIFICATIONS (E-Commerce Only) -->
          <div v-if="!isRestaurant" class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-50 pb-2.5">
              <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2">
                <Layers3 class="w-4 h-4 text-[#84cc16]" />
                <span>Technical Key Specifications</span>
              </h2>
              <button 
                @click="addFeatureRow" 
                type="button" 
                class="text-xs bg-gray-50 border border-gray-200/60 hover:bg-[#D4F53C] hover:text-[#0A1128] text-[#0A1128] font-black px-3 py-1.5 rounded-lg flex items-center space-x-1 transition cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Specification</span>
              </button>
            </div>

            <div v-if="form.key_features.length === 0" class="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium text-xs bg-gray-50/20">
              No technical key specifications mapped yet. Click "Add Specification" to populate bullet values.
            </div>

            <div v-else class="space-y-3 animate-fade-in">
              <div 
                v-for="(feature, idx) in form.key_features" 
                :key="idx" 
                class="flex items-center space-x-3 bg-gray-50/40 p-3 rounded-xl border border-gray-100/70"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-[#0A1128] shrink-0"></span>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                  <input 
                    v-model="feature.title" 
                    type="text" 
                    placeholder="e.g., Processor, RAM, Storage" 
                    class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-black text-[#0A1128] focus:outline-none focus:border-[#0A1128] shadow-2xs" 
                  />
                  <input 
                    v-model="feature.value" 
                    type="text" 
                    placeholder="Specification value description payload..." 
                    class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600 sm:col-span-2 focus:outline-none focus:border-[#0A1128] shadow-2xs" 
                  />
                </div>

                <button 
                  @click="removeFeatureRow(idx)" 
                  type="button" 
                  class="text-gray-400 hover:text-rose-600 p-1.5 bg-white border border-gray-200 rounded-xl shadow-2xs transition shrink-0"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- SECTION 3: CATEGORIZATION AND BRANDS LOGS MAPS -->
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
                    <span>Restaurant</span>
                  </template>
                  <template v-else>
                    <ShoppingBag class="w-4 h-4 text-blue-600 stroke-[2.5]" />
                    <span>E-Commerce Retail</span>
                  </template>
                </div>
              </div>

              <!-- RESTAURANT CATEGORY SELECTOR (Driven by Backend API) -->
              <div v-if="isRestaurant" class="space-y-1.5">
                <label class="text-[11px] font-black uppercase text-gray-500 tracking-wide flex items-center justify-between">
                  <span>Menu Type Category *</span>
                  <Loader2 v-if="dropdownsLoading" class="w-3 h-3 animate-spin text-gray-400" />
                </label>
                <select v-model="form.sub_category_id" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer shadow-2xs">
                  <option value="" disabled>Select Menu Category</option>
                  <option v-for="cat in restaurantCategoryDropdown" :key="cat.id" :value="String(cat.id)">
                    {{ cat.name }}
                  </option>
                  <option value="CUSTOM">Add Custom Subcategory...</option>
                </select>
              </div>

              <!-- E-COMMERCE SUBCATEGORY DROPDOWN -->
              <div v-else class="space-y-1.5">
                <label class="text-[11px] font-black uppercase text-gray-500 tracking-wide flex items-center justify-between">
                  <span>Niche Storefront Subcategory</span>
                  <Loader2 v-if="dropdownsLoading" class="w-3 h-3 animate-spin text-gray-400" />
                </label>
                <select v-model="form.sub_category_id" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer shadow-2xs">
                  <option value="">Select Subcategory Tier</option>
                  <option v-for="sc in subCategoryDropdown" :key="sc?.id" :value="String(sc?.id)">{{ sc?.name }}</option>
                  <option value="CUSTOM">Add Custom Subcategory...</option>
                </select>
              </div>
            </div>

            <!-- Custom Subcategory / Brand selections -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-if="form.sub_category_id === 'CUSTOM'" class="space-y-1.5 animate-slide-in" :class="{'sm:col-span-2': isRestaurant}">
                <label class="text-[11px] font-black uppercase text-amber-600 tracking-wide">New Custom {{ isRestaurant ? 'Menu Category' : 'Subcategory' }} Label</label>
                <input v-model="form.new_sub_category_name" type="text" :placeholder="isRestaurant ? 'e.g., Burgers, Pastries, Grills' : 'e.g., Laptops, Gadgets'" class="w-full bg-white border border-amber-200 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none bg-amber-50/10 shadow-2xs" required />
              </div>

              <div v-if="!isRestaurant" class="space-y-1.5">
                <label class="text-[11px] font-black uppercase text-gray-500 tracking-wide">Brand Authorization Track</label>
                <select v-model="form.brand_selection" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer shadow-2xs">
                  <option value="">Select Global Brand Line</option>
                  <option v-for="br in brandDropdown" :key="br.id" :value="String(br.id)">{{ br.name }}</option>
                  <option value="CUSTOM">Add Custom Brand...</option>
                </select>
              </div>

              <div v-if="!isRestaurant && form.brand_selection === 'CUSTOM'" class="space-y-1.5 animate-slide-in">
                <label class="text-[11px] font-black uppercase text-amber-600 tracking-wide">New Brand Unique Name</label>
                <input v-model="form.new_brand_name" type="text" placeholder="e.g., Apple, Dell" class="w-full bg-white border border-amber-200 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none bg-amber-50/10 shadow-2xs" required />
              </div>
            </div>
          </div>

          <!-- SECTION 4: RESTAURANT MENU OPTIONS (SIZES / PORTIONS) -->
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

          <!-- SECTION 5: PHOTO GALLERY (E-Commerce Only) -->
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

            <div v-if="galleryImages.length === 0" class="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-medium text-xs bg-gray-50/10">
              No secondary gallery assets mapped yet. Click "Add Photo Slot" to populate media listings.
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in" v-else>
              <div v-for="(img, idx) in galleryImages" :key="img.file_key" class="p-4 border border-gray-200/60 bg-gray-50/30 rounded-2xl flex flex-col space-y-3 relative group transition hover:shadow-xs bg-white">
                <button @click="removeGalleryItemRow(idx)" type="button" class="absolute top-2 right-2 p-1.5 bg-white/90 border border-gray-100 rounded-lg text-gray-400 hover:text-rose-600 shadow-2xs transition z-10"><X class="w-3.5 h-3.5" /></button>
                
                <div class="w-full h-36 border-2 border-dashed border-gray-200 bg-white rounded-xl relative overflow-hidden flex flex-col items-center justify-center transition group-hover:border-gray-300">
                  <img v-if="img.preview" :src="img.preview" class="w-full h-full object-cover" />
                  <template v-else>
                    <UploadCloud class="w-7 h-7 text-gray-400 mb-1" />
                    <span class="text-[10px] font-black text-gray-500">Upload Gallery Image</span>
                    <input @change="handleGalleryFileSelection($event, idx)" type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </template>
                </div>
                
                <input v-model="img.caption" type="text" placeholder="Caption label (e.g., Back Panel Profile)..." class="w-full bg-white border border-gray-200/80 rounded-xl px-3 py-2 text-[11px] font-semibold text-[#0A1128] focus:outline-none shadow-2xs" />
              </div>
            </div>
          </div>

          <!-- SECTION 6: ADVANCED VARIATION SKU MATRIX (E-Commerce Only) -->
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

            <!-- OPTIONS CONTROL PANELS LOOP -->
            <div v-for="(opt, oIdx) in variantOptions" :key="oIdx" class="p-5 border border-gray-200/60 bg-gray-50/40 rounded-2xl space-y-4 relative animate-slide-in bg-white">
              <button @click="removeVariantOption(oIdx)" type="button" class="absolute top-4 right-4 text-gray-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-gray-50"><Trash2 class="w-4 h-4" /></button>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase text-gray-400">Option Track Context</label>
                  <input v-model="opt.name" @input="computeSKUMatrixGrid" type="text" placeholder="e.g., Memory, Color, Size" class="w-full bg-white border border-gray-200/80 rounded-xl px-3 py-2.5 text-xs font-bold text-[#0A1128] focus:outline-none shadow-2xs" />
                </div>
                <div class="space-y-1.5 sm:col-span-2">
                  <label class="text-[10px] font-black uppercase text-gray-400">Inject Value Attributes Tags (Hit Enter Key)</label>
                  <input v-model="opt.valInput" @keydown.enter.prevent="addTagValue(oIdx)" type="text" placeholder="Type property specification term and hit enter..." class="w-full bg-white border border-gray-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#0A1128] focus:outline-none shadow-2xs" />
                </div>
              </div>
              <div v-if="opt.values.length > 0" class="flex flex-wrap gap-1.5 pt-1">
                <span v-for="(tag, tIdx) in opt.values" :key="tIdx" class="inline-flex items-center space-x-1 text-xs font-black px-2.5 py-1.5 bg-white border border-gray-200/60 text-[#0A1128] rounded-xl shadow-2xs">
                  <span>{{ tag }}</span>
                  <button @click="removeTagValue(oIdx, tIdx)" type="button" class="text-gray-400 hover:text-rose-600 font-bold ml-1.5 text-[10px] border-0 bg-transparent outline-none">✕</button>
                </span>
              </div>
            </div>

            <!-- INDIVIDUAL SKU GENERATED VARIANT MATRIX HUB BOARD -->
            <div v-if="skuItems.length > 0" class="space-y-3 pt-2 animate-fade-in">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 block pl-0.5">Generated Variant SKU Target Allocations Matrix</span>
              <div class="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm bg-white">
                <div v-for="(sku, sIdx) in skuItems" :key="sIdx" class="p-5 flex flex-col space-y-4 text-xs font-semibold hover:bg-gray-50/30 transition">
                  
                  <div class="flex flex-wrap items-center justify-between border-b border-gray-100/60 pb-2.5 gap-2">
                    <span class="bg-[#0A1128] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase font-mono tracking-wider shadow-2xs">
                      {{ sku.value_names.join(' / ') }}
                    </span>
                    
                    <div class="flex items-center space-x-2">
                      <span class="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Flame class="w-3 h-3 text-rose-500" /> Variant Discount Drop
                      </span>
                      <button @click="sku.bonanza_mode = !sku.bonanza_mode" type="button" class="focus:outline-none cursor-pointer transition active:scale-95 border-0 bg-transparent">
                        <ToggleRight v-if="sku.bonanza_mode" class="w-7 h-7 text-rose-600" />
                        <ToggleLeft v-else class="w-7 h-7 text-gray-300" />
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div class="space-y-1">
                      <label class="text-[9px] uppercase font-black text-gray-400 tracking-wider">Available Stock Volume</label>
                      <input type="number" v-model="sku.stock_qty" placeholder="Units Volume" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-3 py-2.5 text-center text-xs font-black text-[#0A1128] focus:outline-none focus:bg-white focus:border-[#0A1128]" />
                    </div>

                    <div class="space-y-1">
                      <label class="text-[9px] uppercase font-black text-gray-400 tracking-wider">Base Specification Price Override (₦)</label>
                      <input type="number" v-model="sku.price_override" placeholder="Base Specification Cost" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-3 py-2.5 text-center text-xs font-black text-[#0A1128] focus:outline-none focus:bg-white focus:border-[#0A1128]" />
                    </div>

                    <div v-if="sku.bonanza_mode" class="space-y-1 sm:col-span-2 animate-slide-in">
                      <label class="text-[9px] uppercase font-black text-rose-600 tracking-wider flex items-center gap-1">
                        <AlertCircle class="w-3 h-3 text-rose-600" /> Variant Promotional Price (₦)
                      </label>
                      <input type="number" v-model="sku.discount_price" placeholder="Promo Rate" class="w-full bg-rose-50/10 border border-rose-200 rounded-xl px-3 py-2.5 text-center text-xs font-black text-rose-700 focus:outline-none focus:border-rose-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT SIDEBAR COLUMN CONTROLS PANELS -->
        <div class="space-y-6">
          
          <!-- SECTION 7: GLOBAL PRODUCT PRICE HUB SETTINGS -->
          <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider flex items-center space-x-2 border-b border-gray-50 pb-2.5">
              <Coins class="w-4 h-4 text-[#84cc16]" />
              <span>Global Parent Pricing</span>
            </h2>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase text-gray-400 tracking-wide">Base Retail Markdown Price (₦)</label>
              <input v-model="form.price" type="number" step="0.01" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3 text-sm font-black text-[#0A1128] focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs" required />
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
              <div class="text-left space-y-0.5">
                <span class="text-[11px] font-black uppercase text-gray-400 tracking-wide block">Global Bonanza Clearance</span>
                <span class="text-[10px] text-gray-400 font-medium block">Markdown all un-overridden options.</span>
              </div>
              <button @click="form.bonanza_mode = !form.bonanza_mode" type="button" class="focus:outline-none cursor-pointer transition-transform active:scale-95 border-0 bg-transparent">
                <ToggleRight v-if="form.bonanza_mode" class="w-8 h-8 text-[#84cc16]" />
                <ToggleLeft v-else class="w-8 h-8 text-gray-300" />
              </button>
            </div>

            <div v-if="form.bonanza_mode" class="space-y-1.5 pt-2 border-t border-dashed border-gray-100 animate-slide-in">
              <label class="text-[11px] font-black uppercase text-amber-600 tracking-wide flex items-center space-x-1">
                <AlertCircle class="w-3.5 h-3.5" />
                <span>Global Discount Rate (₦)</span>
              </label>
              <input v-model="form.discount_price" type="number" step="0.01" class="w-full bg-amber-50/20 border border-amber-200 rounded-xl px-4 py-3 text-sm font-black text-amber-700 focus:outline-none shadow-2xs" />
            </div>
          </div>

          <!-- SECTION 8: PRIMARY HERO BRAND SHOWCASE DISPLAY FILE UPLOAD GRID -->
          <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs space-y-4">
            <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider border-b border-gray-50 pb-2.5">Primary Showcase Image</h2>
            
            <div class="relative group border-2 border-dashed border-gray-200 hover:border-[#0A1128] rounded-2xl p-4 min-h-[180px] bg-gray-50/40 overflow-hidden flex flex-col items-center justify-center transition">
              <template v-if="primaryImagePreview">
                <img :src="primaryImagePreview" class="absolute inset-0 w-full h-full object-cover animate-fade-in" />
                <button @click="primaryImagePreview = null; primaryImageFile = null" type="button" class="absolute top-3 right-3 p-1.5 bg-black/70 rounded-xl text-white hover:bg-black transition z-10 shadow-sm border-0 outline-none cursor-pointer"><X class="w-4 h-4" /></button>
              </template>
              <template v-else>
                <UploadCloud class="w-8 h-8 text-gray-400 mb-2 transition group-hover:text-[#0A1128]" />
                <span class="text-xs font-black text-gray-600 text-center">Upload Primary Image Binary</span>
                <span class="text-[10px] text-gray-400 font-medium mt-0.5">JPEG, PNG source files up to 4MB</span>
                <input @change="handlePrimaryImageUpload" type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </template>
            </div>
          </div>

          <!-- SYSTEM INTERACTIVE CORE CONSOLE FIRING ACTIONS SUBMIT BUTTON BOARDS -->
          <div class="space-y-3">
            <button :disabled="isSubmitting" type="submit" class="w-full bg-[#0A1128] hover:bg-opacity-95 text-white font-black text-xs py-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer border-0 outline-none">
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin text-white" />
              <Save v-else class="w-4 h-4 text-white" />
              <span>{{ isSubmitting ? 'Publishing Product...' : 'Publish Inventory Specification' }}</span>
            </button>
            
            <NuxtLink to="/merchant/inventory" class="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-400 font-black text-xs py-4 rounded-xl shadow-2xs transition flex items-center justify-center cursor-pointer">
              Cancel Configuration
            </NuxtLink>
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