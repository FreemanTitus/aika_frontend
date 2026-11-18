<!-- pages/merchant/inventory/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, useCookie, useRuntimeConfig } from '#app'
import { 
  Boxes, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  ToggleLeft, 
  ToggleRight, 
  Edit3, 
  Layers, 
  Save, 
  X,
  Loader2,
  CheckCircle2,
  Tag,
  Package,
  AlertCircle,
  Trash2
} from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const router = useRouter()

// 1. Session State Tokens
const authToken = useCookie('auth_token')
const backendHost = apiBase

const resolveProductImage = (imagePath: string | null) => {
  if (!imagePath) return '/images/placeholder.png'
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  return `${backendHost}${imagePath}`
}

// 2. Reactive View States
const searchQuery = ref('')
const selectedCategory = ref('all')
const isBatchUpdating = ref(false)
const notificationMessage = ref<string | null>(null)

// 3. Variant Pricing Matrix Drawer States
const activeMatrixProduct = ref<any | null>(null)
const matrixSkuItems = ref<any[]>([])

// ASYNCHRONOUS DELETION DIALOG METRICS
const isDeletingId = ref<string | null>(null)
const productAwaitingDeletion = ref<{ id: string; name: string } | null>(null)

// Reactive states for inventory catalog data, loading, and error handling
const catalogData = ref<any[]>([])
const pending = ref<boolean>(true)
const error = ref<any>(null)

// 4. Fetch Core Product Catalog with Explicit Headers on Mount
const fetchInventoryCatalog = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/merchant/inventory`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    catalogData.value = res?.data || res || []
  } catch (err: any) {
    console.error("Merchant inventory catalog resolution error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

// Trigger fetch immediately when component mounts
onMounted(() => {
  fetchInventoryCatalog()
})

// Case-insensitive filtering logic matching data properties
const filteredProducts = computed(() => {
  if (!catalogData.value || !Array.isArray(catalogData.value)) return []
  
  return catalogData.value.filter((prod: any) => {
    const nameStr = (prod?.name || '').toLowerCase()
    const idStr = (prod?.id || '').toUpperCase()
    const matchesSearch = nameStr.includes(searchQuery.value.toLowerCase()) || idStr.includes(searchQuery.value.toUpperCase())
                          
    const rawCategory = prod?.category || prod?.sub_category?.category || 'ecommerce'
    const productCategoryNorm = String(rawCategory).toLowerCase()
    
    if (selectedCategory.value === 'all') return matchesSearch
    return matchesSearch && productCategoryNorm.includes(selectedCategory.value.toLowerCase())
  })
})

const showToast = (msg: string) => {
  notificationMessage.value = msg
  setTimeout(() => { notificationMessage.value = null }, 4000)
}

// =========================================================================
// PREMIUM DELETION ENGINE CORE LOGIC
// =========================================================================
const triggerDeleteConfirmationPrompt = (productId: string, productName: string) => {
  productAwaitingDeletion.value = { id: productId, name: productName }
}

const executePermanentCatalogItemPurge = async () => {
  if (!productAwaitingDeletion.value) return
  
  const targetId = productAwaitingDeletion.value.id
  isDeletingId.value = targetId
  
  try {
    const response: any = await $fetch(`${apiBase}/api/v1/merchant/inventory/delete/${targetId}`, {
      method: 'DELETE',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: authToken.value ? `Bearer ${authToken.value}` : ''
      }
    })

    if (response.status === 'success') {
      showToast(response.message || "Product listing removed from catalog.")
      productAwaitingDeletion.value = null
      await fetchInventoryCatalog()
    }
  } catch (err: any) {
    const errorDetail = err?.data?.detail || err?.message || "Operational delete restriction faulted."
    alert(`Deletion Blocked by Database Layer: ${JSON.stringify(errorDetail)}`)
  } finally {
    isDeletingId.value = null
  }
}

// TOGGLE AVAILABILITY
const handleToggleAvailability = async (product: any) => {
  const originalState = product.is_available
  product.is_available = !originalState 

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/merchant/inventory/toggle-status/${product.id}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    showToast(res.message || "Stock status adjusted successfully.")
  } catch (err) {
    product.is_available = originalState 
    showToast("Failed to communicate stock status changes.")
  }
}

// OPEN VARIANT MATRICES DRAWERS
const openPricingMatrixDrawer = (product: any) => {
  activeMatrixProduct.value = product
  matrixSkuItems.value = JSON.parse(JSON.stringify(product.sku_items || []))
}

// BATCH SKU PRICING MATRIX COMMITS
const handleSavePricingMatrix = async () => {
  isBatchUpdating.value = true
  const payload = matrixSkuItems.value.map((sku: any) => ({
    item_id: sku.id,
    stock_qty: parseInt(sku.stock_qty as any) || 0,
    price_override: sku.price_override ? parseFloat(sku.price_override as any) : null,
    is_active: sku.is_active
  }))

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/merchant/inventory/variant-pricing/update`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: payload
    })
    showToast(res.message || "SKU variant pricing saved.")
    activeMatrixProduct.value = null
    fetchInventoryCatalog() 
  } catch (err: any) {
    alert(err?.data?.detail || "Matrix change rejected by database kernel.")
  } finally {
    isBatchUpdating.value = false
  }
}

const formatMoney = (val: number) => "₦" + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })
</script>

<template>
  <div class="py-10 px-6 lg:px-12 relative min-h-screen bg-gray-50/30">
    
    <!-- SYSTEM LEVEL STATUS TOAST MESSAGES -->
    <Transition name="fade">
      <div v-if="notificationMessage" class="fixed bottom-8 right-8 z-[100] bg-[#0A1128] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 border border-gray-800">
        <CheckCircle2 class="w-5 h-5 text-[#D4F53C]" />
        <span class="text-xs font-black tracking-tight">{{ notificationMessage }}</span>
      </div>
    </Transition>

    <!-- HIGH FIDELITY POPUP DELETE CONFIRMATION MODAL -->
    <Transition name="fade">
      <div v-if="productAwaitingDeletion" class="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div class="bg-white rounded-[28px] border border-gray-100 p-6 max-w-sm w-full text-center shadow-2xl animate-scale-up space-y-5">
          <div class="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
            <Trash2 class="w-6 h-6 stroke-[2.5]" />
          </div>
          
          <div class="space-y-1.5">
            <h3 class="text-base font-black text-[#0A1128] tracking-tight">Confirm Catalog Removal</h3>
            <p class="text-xs text-gray-400 font-medium leading-relaxed">
              Are you completely sure you want to permanently delete <span class="text-gray-700 font-bold">"{{ productAwaitingDeletion.name }}"</span>? This will wipe out all mapped child SKU variants.
            </p>
          </div>

          <div class="flex items-center space-x-3 pt-1">
            <button 
              :disabled="isDeletingId !== null"
              @click="productAwaitingDeletion = null" 
              type="button"
              class="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-black py-3.5 rounded-xl transition cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button 
              :disabled="isDeletingId !== null"
              @click="executePermanentCatalogItemPurge" 
              type="button"
              class="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black py-3.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer disabled:bg-rose-400"
            >
              <Loader2 v-if="isDeletingId !== null" class="w-3.5 h-3.5 animate-spin" />
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div class="max-w-6xl mx-auto space-y-10">
      
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div class="text-left space-y-1">
          <h1 class="text-3xl font-black text-[#0A1128] tracking-tight sm:text-4xl">Inventory Catalog</h1>
          <p class="text-sm text-gray-500 font-medium">Create products, manage structural variants, and configure live stock statuses.</p>
        </div>
        
        <NuxtLink to="/merchant/products/create" class="bg-[#D4F53C] hover:bg-opacity-90 text-[#0A1128] font-black text-sm px-5 py-3.5 rounded-xl shadow-md transition-all flex items-center space-x-2 shrink-0 self-start md:self-auto hover:-translate-y-0.5">
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Add New Product</span>
        </NuxtLink>
      </div>

      <!-- Responsive Search & Filter Toolbar -->
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        
        <!-- Search Input -->
        <div class="relative flex-1 w-full">
          <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search catalog by keyword or ID..." 
            class="w-full bg-gray-50/60 border border-gray-200/80 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition-all"
          />
        </div>
        
        <!-- Category Filter Select -->
        <div class="relative w-full sm:w-72 shrink-0">
          <SlidersHorizontal class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select 
            v-model="selectedCategory"
            class="w-full bg-gray-50/60 border border-gray-200/80 rounded-xl pl-10 pr-8 py-3 text-xs font-black text-gray-600 focus:outline-none focus:border-[#0A1128] focus:bg-white transition-all appearance-none cursor-pointer truncate"
          >
            <option value="all">All Storefront Subcategories</option>
            <option value="ecommerce">E-Commerce Retail</option>
            <option value="restaurant">Restaurant Menu Items</option>
          </select>
          <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400 text-[10px]">▼</div>
        </div>

      </div>

      <div v-if="pending" class="py-32 bg-white rounded-3xl border border-gray-100 shadow-xs text-center space-y-4">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0A1128] mx-auto"></div>
        <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">Hydrating Product Master Records...</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="product in filteredProducts" 
          :key="product.id"
          :class="[!product.is_available ? 'opacity-70 bg-gray-50/50' : 'bg-white']"
          class="p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-200 hover:shadow-sm group text-left"
        >
          <div class="flex items-start space-x-4 min-w-0 flex-1">
            <div class="w-16 h-16 bg-gray-100 rounded-xl border border-gray-200/60 overflow-hidden shrink-0 relative shadow-inner">
              <img :src="getMediaUrl(product.image)" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div v-if="product.bonanza_mode" class="absolute top-1 left-1 bg-amber-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider">Promo</div>
            </div>
            
            <div class="space-y-1.5 min-w-0">
              <div class="flex items-center space-x-2">
                <h3 class="text-sm font-black text-[#0A1128] truncate group-hover:text-[#84cc16] transition-colors duration-200">{{ product.name }}</h3>
              </div>
              
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-400 font-semibold">
                <span class="font-mono font-bold text-gray-400 bg-gray-100/80 px-1.5 py-0.5 rounded text-[10px]">{{ product.id }}</span>
                <span class="flex items-center space-x-1">
                  <Tag class="w-3 h-3 shrink-0" />
                  <span class="capitalize">{{ product.category || 'Retail' }}</span>
                </span>
                <span v-if="product.sku_items?.length" class="flex items-center space-x-1 text-emerald-700">
                  <Package class="w-3 h-3 shrink-0" />
                  <span>{{ product.sku_items.length }} Variants Mapping</span>
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-row md:flex-col items-baseline md:items-start justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 shrink-0">
            <span class="text-[10px] font-black uppercase text-gray-400 tracking-wider md:hidden">Base Value</span>
            <div class="text-right md:text-left">
              <p :class="[product.bonanza_mode ? 'line-through text-xs text-gray-400 font-bold' : 'text-base font-black text-[#0A1128]']">
                {{ formatMoney(product.price) }}
              </p>
              <p v-if="product.bonanza_mode && product.discount_price" class="text-base font-black text-amber-600">
                {{ formatMoney(product.discount_price) }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 shrink-0">
            <div class="flex items-center space-x-3">
              <span class="text-[11px] font-black uppercase tracking-wider text-gray-400 hidden lg:inline">Availability</span>
              <button 
                @click="handleToggleAvailability(product)"
                type="button" 
                class="focus:outline-none transition-transform active:scale-95 cursor-pointer flex items-center"
              >
                <ToggleRight v-if="product.is_available" class="w-8 h-8 text-[#84cc16]" />
                <ToggleLeft v-else class="w-8 h-8 text-gray-300" />
              </button>
            </div>

            <div class="flex items-center space-x-2">
              <button 
                v-if="String(product.category).toLowerCase() !== 'restaurant'"
                @click="openPricingMatrixDrawer(product)"
                type="button"
                title="Configure SKU Matrices"
                class="p-2.5 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-[#0A1128] hover:border-gray-300 shadow-inner transition-all flex items-center justify-center cursor-pointer"
              >
                <Layers class="w-4 h-4" />
              </button>
              
              <NuxtLink 
                :to="`/merchant/products/edit/${product.id}`"
                class="p-2.5 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-[#0A1128] hover:border-gray-300 shadow-inner transition-all flex items-center justify-center cursor-pointer"
              >
                <Edit3 class="w-4 h-4" />
              </NuxtLink>

              <button 
                @click="triggerDeleteConfirmationPrompt(product.id, product.name)"
                type="button"
                class="p-2.5 border border-gray-200 text-gray-400 hover:text-rose-600 rounded-xl transition hover:bg-rose-50/40 bg-white cursor-pointer shadow-inner"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        <div v-if="filteredProducts.length === 0" class="py-24 bg-white rounded-2xl border border-gray-100 text-center p-6 shadow-xs max-w-md mx-auto">
          <AlertCircle class="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p class="text-sm font-black text-[#0A1128] uppercase tracking-tight">No Products Localized</p>
          <p class="text-xs text-gray-400 font-medium mt-1">No operational inventory lines match your active query filters.</p>
        </div>
      </div>

    </div>

    <!-- SKU MATRIX OVERRIDE DRAWER CANVAS -->
    <div 
      v-if="activeMatrixProduct"
      class="fixed inset-0 z-50 flex justify-end bg-[#0A1128]/40 backdrop-blur-xs transition-all"
      @click.self="activeMatrixProduct = null"
    >
      <div class="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col p-6 text-left animate-slide-left border-l border-gray-100">
        
        <div class="flex items-center justify-between border-b border-gray-100 pb-5">
          <div class="space-y-0.5">
            <h3 class="text-lg font-black text-[#0A1128] tracking-tight">Variant Override Studio</h3>
            <p class="text-xs text-gray-400 font-semibold truncate max-w-[380px]">Core Batch Index: {{ activeMatrixProduct.name }}</p>
          </div>
          <button @click="activeMatrixProduct = null" class="p-2 hover:bg-gray-100 rounded-xl transition cursor-pointer">
            <X class="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto py-5 space-y-4 custom-scrollbar">
          <div 
            v-for="(sku, index) in matrixSkuItems" 
            :key="sku.id" 
            :class="[!sku.is_active ? 'opacity-60 bg-gray-100/40' : 'bg-gray-50/60']"
            class="p-5 border border-gray-200/60 rounded-2xl space-y-4 flex flex-col transition-all duration-200"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-1.5 h-1.5 rounded-full" :class="[sku.is_active ? 'bg-emerald-500' : 'bg-gray-300']"></span>
                <span class="text-xs font-mono font-black text-[#0A1128]">SKU ID: {{ sku.sku_code || `Row #${index + 1}` }}</span>
              </div>
              
              <label class="flex items-center space-x-2 cursor-pointer select-none">
                <input type="checkbox" v-model="sku.is_active" class="w-4 h-4 rounded border-gray-300 text-[#0A1128] focus:ring-0 cursor-pointer" />
                <span class="text-[11px] font-black uppercase text-gray-500 tracking-wider">Line Active</span>
              </label>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Stock Allocation Volume</label>
                <input type="number" v-model="sku.stock_qty" :disabled="!sku.is_active" class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#0A1128] disabled:bg-gray-100/50 disabled:text-gray-400 transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Pricing Override (₦)</label>
                <input type="number" v-model="sku.price_override" :disabled="!sku.is_active" placeholder="Fallback Base Unit" class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#0A1128] disabled:bg-gray-100/50 disabled:text-gray-400 transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-100 pt-5 flex items-center space-x-4">
          <button @click="activeMatrixProduct = null" class="flex-1 bg-gray-100 hover:bg-gray-200/80 text-gray-500 font-black text-xs py-3.5 rounded-xl transition cursor-pointer">Cancel</button>
          <button @click="handleSavePricingMatrix" :disabled="isBatchUpdating" class="flex-1 bg-[#0A1128] hover:bg-opacity-95 text-white font-black text-xs py-3.5 rounded-xl transition flex items-center justify-center space-x-2 disabled:bg-gray-400 cursor-pointer">
            <Loader2 v-if="isBatchUpdating" class="w-4 h-4 animate-spin" />
            <Save v-else class="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }

@keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

.animate-slide-left { animation: slideLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-scale-up { animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>