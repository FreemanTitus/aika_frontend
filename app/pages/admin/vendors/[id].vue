<!-- pages/admin/vendors/[id].vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, useCookie, useRuntimeConfig } from '#app'
import { ArrowLeft, ShieldCheck, AlertCircle, User, Save, Loader2, RefreshCw, Edit3, X, Ban, Layers, Percent, CheckCircle2, AlertTriangle, Image as ImageIcon } from '@lucide/vue'

definePageMeta({ 
  layout: 'admin', 
  middleware: 'auth' 
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const route = useRoute()
const router = useRouter()
const authToken = useCookie('auth_token')

const vendorId = computed(() => route.params.vendor_id || route.params.id)

const activeTab = ref<'overview' | 'products' | 'orders'>('overview')
const saving = ref(false)
const actionLoading = ref(false)
const selectedAgentId = ref<number | null>(null)
const staffAgents = ref<any[]>([])
const productsList = ref<any[]>([])
const ordersList = ref<any[]>([])
const availableRiders = ref<any[]>([])

// Reactive states for vendor detail payload, loading, and error handling
const vendorPayload = ref<any>(null)
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Product Editing Modal State
const showEditModal = ref(false)
const editingProduct = ref<any>(null)
const isSavingProduct = ref(false)
const selectedImageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)

// Order Reassignment Modal State (Updated to string for alphanumeric rider IDs like RP-A26U69Z6)
const showReassignModal = ref(false)
const selectedOrder = ref<any>(null)
const targetRiderId = ref<string | null>(null)
const isReassigning = ref(false)

// Confirmation Modal State (Replaces confirm())
const showConfirmModal = ref(false)
const confirmModalConfig = ref<{
  title: string
  message: string
  actionLabel: string
  actionType: 'danger' | 'primary'
  onConfirm: () => Promise<void>
}>({
  title: '',
  message: '',
  actionLabel: '',
  actionType: 'primary',
  onConfirm: async () => {}
})

// Feedback Toast Modal State (Replaces alert())
const showFeedbackModal = ref(false)
const feedbackModalConfig = ref<{
  title: string
  message: string
  type: 'success' | 'error'
}>({
  title: '',
  message: '',
  type: 'success'
})

const triggerFeedback = (title: string, message: string, type: 'success' | 'error' = 'success') => {
  feedbackModalConfig.value = { title, message, type }
  showFeedbackModal.value = true
}

const categoryChoices = [
  { label: 'Gadgets & Tech', value: 'gadgets' },
  { label: 'Clothing & Apparel', value: 'apparel' },
  { label: 'Home Appliances', value: 'appliances' },
  { label: 'Beauty & Cosmetics', value: 'beauty' },
  { label: 'Main Dishes (Meals)', value: 'meals' },
  { label: 'Beverages & Drinks', value: 'drinks' },
  { label: 'Sides & Snacks', value: 'sides' },
  { label: 'General Items', value: 'general' }
]

// Fetch individual vendor details, staff agents pool, and products catalog on mount
const fetchVendorDetail = async () => {
  if (!vendorId.value) return
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/vendors/${vendorId.value}`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    
    vendorPayload.value = res?.data || res || {}
    staffAgents.value = vendorPayload.value?.staff_agents || []
    selectedAgentId.value = vendorPayload.value?.vendor?.assigned_agent?.id || null

    // Fetch vendor catalog products list
    const prodRes: any = await $fetch(`${apiBase}/api/v1/admin/vendor/${vendorId.value}/products`, {
      headers: { Authorization: `Bearer ${authToken.value}`, 'ngrok-skip-browser-warning': 'true' }
    })
    productsList.value = prodRes?.products || []
  } catch (err: any) {
    console.error("Vendor detail fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

const fetchVendorOrders = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/staff/vendor/${vendorId.value}/orders`, {
      headers: { Authorization: `Bearer ${authToken.value}`, 'ngrok-skip-browser-warning': 'true' }
    })
    ordersList.value = res?.orders || res?.data || []
    availableRiders.value = res?.riders || []
  } catch (err) {
    console.error("Failed to load orders stream", err)
  }
}

onMounted(() => {
  fetchVendorDetail()
})

watch(activeTab, (newTab) => {
  if (newTab === 'orders' && ordersList.value.length === 0) {
    fetchVendorOrders()
  }
})

const vendor = computed(() => vendorPayload.value?.vendor || null)

// Prompt Store Suspension Modal
const promptToggleStoreSuspension = () => {
  const isCurrentlyActive = vendor.value?.is_active_store !== false
  confirmModalConfig.value = {
    title: isCurrentlyActive ? 'Confirm Store Suspension' : 'Confirm Store Reactivation',
    message: `Are you sure you want to change the operational store status for "${vendor.value?.company_name}"? ${isCurrentlyActive ? 'This will hide the store from customer checkout endpoints.' : 'This will make the store visible again.'}`,
    actionLabel: isCurrentlyActive ? 'Suspend Store' : 'Reactivate Store',
    actionType: isCurrentlyActive ? 'danger' : 'primary',
    onConfirm: executeStoreSuspension
  }
  showConfirmModal.value = true
}

const executeStoreSuspension = async () => {
  showConfirmModal.value = false
  actionLoading.value = true
  try {
    await $fetch(`${apiBase}/api/v1/admin/vendors/${vendorId.value}/toggle-suspension`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    triggerFeedback('Operational Status Updated', 'Store status has been updated successfully.', 'success')
    await fetchVendorDetail()
  } catch (err: any) {
    triggerFeedback('Update Failed', err?.data?.detail || 'Failed to update store operational status.', 'error')
  } finally {
    actionLoading.value = false
  }
}

// Save assignment updates back to backend
const saveChanges = async () => {
  saving.value = true
  try {
    await $fetch(`${apiBase}/api/v1/admin/vendors/${vendorId.value}/assign`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: {
        assigned_agent_id: selectedAgentId.value
      }
    })
    triggerFeedback('Assignment Updated', 'Vendor assignment updated successfully.', 'success')
    await fetchVendorDetail()
  } catch (err: any) {
    triggerFeedback('Update Failed', err?.data?.detail || 'Failed to update vendor assignment.', 'error')
  } finally {
    saving.value = false
  }
}

// Open Product Edit Modal
const openEditProduct = (prod: any) => {
  editingProduct.value = { ...prod }
  selectedImageFile.value = null
  imagePreviewUrl.value = prod.image || null
  showEditModal.value = true
}

const handleImageSelection = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    selectedImageFile.value = file
    imagePreviewUrl.value = URL.createObjectURL(file)
  }
}

// Save Product Edits with Multipart FormData
const saveProductChanges = async () => {
  if (!editingProduct.value) return
  isSavingProduct.value = true

  const formData = new FormData()
  formData.append('name', editingProduct.value.name)
  formData.append('price', editingProduct.value.price)
  formData.append('description', editingProduct.value.description || '')
  formData.append('category', editingProduct.value.category || 'general')
  formData.append('is_available', String(editingProduct.value.is_available))
  formData.append('bonanza_mode', String(editingProduct.value.bonanza_mode))
  
  if (editingProduct.value.bonanza_mode && editingProduct.value.discount_price !== null) {
    formData.append('discount_price', editingProduct.value.discount_price)
  }

  if (selectedImageFile.value) {
    formData.append('image', selectedImageFile.value)
  }

  try {
    await $fetch(`${apiBase}/api/v1/admin/vendor/${vendorId.value}/products/${editingProduct.value.id}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${authToken.value}`,
        'ngrok-skip-browser-warning': 'true'
      },
      body: formData
    })
    showEditModal.value = false
    selectedImageFile.value = null
    triggerFeedback('Product Updated', `Successfully updated attributes for ${editingProduct.value.name}.`, 'success')
    await fetchVendorDetail()
  } catch (err: any) {
    triggerFeedback('Save Failed', err?.data?.detail || 'Failed to update product details.', 'error')
  } finally {
    isSavingProduct.value = false
  }
}

// Order Reassignment & Cancellation Actions
const openReassignModal = (order: any) => {
  selectedOrder.value = order
  targetRiderId.value = order.assigned_rider?.id ? String(order.assigned_rider.id) : null
  showReassignModal.value = true
}

const executeOrderReassignment = async () => {
  if (!selectedOrder.value || !targetRiderId.value) return
  isReassigning.value = true
  try {
    await $fetch(`${apiBase}/api/v1/admin/order/${selectedOrder.value.id}/reassign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}`, 'ngrok-skip-browser-warning': 'true' },
      body: { rider_id: targetRiderId.value }
    })
    showReassignModal.value = false
    triggerFeedback('Order Reassigned', `Successfully dispatched order #${selectedOrder.value.id} to new rider.`, 'success')
    await fetchVendorOrders()
  } catch (err: any) {
    triggerFeedback('Reassignment Failed', err?.data?.detail || 'Unable to reassign delivery rider.', 'error')
  } finally {
    isReassigning.value = false
  }
}

const promptCancelOrder = (order: any) => {
  confirmModalConfig.value = {
    title: 'Cancel Order & Issue Refund',
    message: `Are you sure you want to cancel order #${order.id} (₦${Number(order.total_amount || 0).toLocaleString()})? This will abort fulfillment and log an automated refund workflow.`,
    actionLabel: 'Cancel & Refund',
    actionType: 'danger',
    onConfirm: async () => {
      showConfirmModal.value = false
      try {
        await $fetch(`${apiBase}/api/v1/staff/order/${order.id}/cancel-refund`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken.value}`, 'ngrok-skip-browser-warning': 'true' },
          body: { reason: 'Cancelled by admin intervention', issue_refund: true }
        })
        triggerFeedback('Order Cancelled', `Order #${order.id} has been aborted and refund logged.`, 'success')
        await fetchVendorOrders()
      } catch (err: any) {
        triggerFeedback('Action Failed', err?.data?.detail || 'Failed to cancel order.', 'error')
      }
    }
  }
  showConfirmModal.value = true
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left space-y-8">
    <div class="max-w-4xl mx-auto space-y-8">
      
      <!-- Navigation / Back Button & Refresh / Suspension Toolbar -->
      <div class="flex items-center justify-between">
        <NuxtLink 
          to="/admin/merchants" 
          class="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-xs"
        >
          <ArrowLeft :size="16" />
          Back to Merchant Dashboard
        </NuxtLink>

        <div class="flex items-center gap-3">
          <!-- Suspension Control Trigger -->
          <button 
            v-if="vendor"
            @click="promptToggleStoreSuspension"
            :disabled="actionLoading"
            class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border outline-none flex items-center gap-1.5"
            :class="vendor.is_active_store !== false ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'"
          >
            <Ban :size="14" />
            {{ vendor.is_active_store !== false ? 'Suspend Store Temporarily' : 'Reactivate Store' }}
          </button>

          <button 
            @click="fetchVendorDetail" 
            :disabled="pending"
            type="button" 
            class="bg-white border border-gray-200 shadow-xs text-gray-700 text-xs font-bold p-2.5 rounded-xl transition flex items-center justify-center hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
            title="Refresh Vendor Details"
          >
            <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !vendorPayload" class="py-20 text-center space-y-3">
        <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Fetching Vendor Profile...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !vendorPayload" class="py-16 text-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-md mx-auto space-y-2">
        <div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="24" />
        </div>
        <p class="text-rose-600 font-black text-sm uppercase tracking-wider">Audit Profile Error</p>
        <p class="text-xs text-gray-400 font-semibold">
          {{ error?.data?.detail || error?.message || "Unable to retrieve vendor entity details." }}
        </p>
      </div>

      <!-- Vendor Detail Card -->
      <div v-else-if="vendor" class="space-y-6">
        
        <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          
          <!-- Header Info -->
          <div class="p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black shadow-inner shrink-0">
                {{ vendor.company_name?.charAt(0).toUpperCase() || 'V' }}
              </div>
              <div>
                <h1 class="text-2xl font-black text-gray-900 tracking-tight">{{ vendor.company_name }}</h1>
                <p class="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-1">
                  {{ vendor.business_type || 'General Enterprise' }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button 
                type="button"
                @click="saveChanges" 
                :disabled="saving"
                class="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer outline-none border-0"
              >
                <Loader2 v-if="saving" class="w-4 h-4 animate-spin text-white" />
                <Save v-else :size="16" />
                {{ saving ? 'Saving...' : 'Save Assignment' }}
              </button>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="px-8 pt-4 flex items-center space-x-2 border-b border-gray-100 bg-gray-50/50">
            <button @click="activeTab = 'overview'" :class="activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer mb-3">
              Overview &amp; Assignment
            </button>
            <button @click="activeTab = 'products'" :class="activeTab === 'products' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer mb-3">
              Catalog &amp; Menu Audit ({{ productsList.length }})
            </button>
            <button @click="activeTab = 'orders'" :class="activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer mb-3">
              Orders &amp; Dispatch ({{ ordersList.length }})
            </button>
          </div>

          <!-- TAB 1: OVERVIEW -->
          <div v-if="activeTab === 'overview'" class="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Owner Information -->
            <div class="bg-gray-50/75 p-6 rounded-2xl border border-gray-100 space-y-4">
              <h2 class="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <User :size="16" /> Owner Credentials
              </h2>
              <div class="space-y-2 text-sm">
                <div>
                  <span class="text-xs text-gray-400 block font-semibold">Full Name</span>
                  <span class="font-bold text-gray-900">{{ vendor.user?.first_name }} {{ vendor.user?.last_name }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-400 block font-semibold">Email Address</span>
                  <span class="font-medium text-gray-700">{{ vendor.user?.email }}</span>
                </div>
              </div>
            </div>

            <!-- Assignment & Operations -->
            <div class="bg-gray-50/75 p-6 rounded-2xl border border-gray-100 space-y-4">
              <h2 class="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck :size="16" /> Operational Assignment
              </h2>
              <div class="space-y-3 text-sm">
                <div>
                  <label class="text-xs text-gray-400 block font-semibold mb-1">Assigned Support Agent</label>
                  <select 
                    v-model="selectedAgentId" 
                    class="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
                  >
                    <option :value="null">Unassigned</option>
                    <option v-for="agent in staffAgents" :key="agent.id" :value="agent.id">
                      {{ agent.first_name }} {{ agent.last_name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          <!-- TAB 2: PRODUCTS / MENU AUDIT -->
          <div v-if="activeTab === 'products'" class="p-8 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-black text-gray-400 uppercase tracking-wider">Vendor Catalog Items &amp; Menu</h3>
              <p class="text-[11px] text-gray-400 font-semibold">Click any product to audit or edit attributes</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                v-for="product in productsList" 
                :key="product.id" 
                @click="openEditProduct(product)"
                class="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3 hover:border-indigo-600 transition cursor-pointer flex flex-col justify-between"
              >
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                      <img v-if="product.image" :src="product.image" :alt="product.name" class="w-full h-full object-cover" />
                      <ImageIcon v-else class="w-5 h-5 text-gray-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <span class="text-[10px] font-mono text-gray-400 uppercase block truncate">{{ product.id }}</span>
                      <h4 class="text-xs font-bold text-gray-900 truncate">{{ product.name }}</h4>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span v-if="product.bonanza_mode" class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1">
                      <Percent :size="10" /> Promo
                    </span>
                    <span v-if="product.has_variants" class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1">
                      <Layers :size="10" /> Variants
                    </span>
                    <span :class="product.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'" class="px-2 py-0.5 rounded text-[9px] font-black uppercase">
                      {{ product.is_available ? 'In Stock' : 'Out of Stock' }}
                    </span>
                  </div>

                  <p class="text-[11px] text-gray-500 line-clamp-2">{{ product.description || 'No description provided.' }}</p>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div>
                    <span class="text-xs font-mono font-black text-indigo-600">₦{{ Number(product.bonanza_mode && product.discount_price ? product.discount_price : product.price).toLocaleString() }}</span>
                    <span v-if="product.bonanza_mode && product.discount_price" class="text-[10px] text-gray-400 line-through ml-1.5">₦{{ Number(product.price).toLocaleString() }}</span>
                  </div>
                  <span class="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                    <Edit3 :size="12" /> Audit Item
                  </span>
                </div>
              </div>

              <div v-if="productsList.length === 0" class="col-span-full py-12 text-center text-gray-400 text-xs font-bold uppercase">
                No products listed under this merchant yet.
              </div>
            </div>
          </div>

          <!-- TAB 3: ORDERS & DISPATCH OPERATIONS -->
          <div v-if="activeTab === 'orders'" class="p-8 space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-black text-gray-400 uppercase tracking-wider">Active Fulfillment &amp; Orders Queue</h3>
                <p class="text-[11px] text-gray-500 font-medium">Monitor live orders, reassign delayed riders, or authorize cancellations.</p>
              </div>
              <button @click="fetchVendorOrders" type="button" class="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition flex items-center gap-1.5 cursor-pointer">
                <RefreshCw :size="14" /> Refresh Queue
              </button>
            </div>

            <div class="space-y-3">
              <div v-for="order in ordersList" :key="order.id" class="border border-gray-100 rounded-2xl p-5 bg-gray-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-black text-indigo-600">#{{ order.id }}</span>
                    <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase" :class="{
                      'bg-amber-50 text-amber-700': ['pending', 'paid_unassigned'].includes(order.status),
                      'bg-sky-50 text-sky-700': ['acknowledged', 'processing'].includes(order.status),
                      'bg-indigo-50 text-indigo-700': ['assigned', 'in_transit'].includes(order.status),
                      'bg-emerald-50 text-emerald-700': ['delivered', 'completed'].includes(order.status),
                      'bg-rose-50 text-rose-700': order.status === 'cancelled'
                    }">
                      {{ order.status }}
                    </span>
                    <span v-if="order.kind === 'vendor_delivery'" class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-sky-100 text-sky-800">Vendor delivery</span>
                  </div>
                  <p class="text-xs font-bold text-gray-800">Customer: {{ order.customer_name || 'Guest User' }}</p>
                  <p v-if="order.kind === 'vendor_delivery'" class="text-[11px] text-gray-500">Delivered by the <strong class="text-gray-900">vendor</strong> (no rider)</p>
                  <p v-else class="text-[11px] text-gray-500">Rider Assigned: <strong class="text-gray-900">{{ order.assigned_rider?.name || 'Unassigned' }}</strong></p>
                </div>

                <div class="flex items-center gap-4">
                  <span class="text-sm font-mono font-black text-indigo-600">₦{{ Number(order.total_amount || 0).toLocaleString() }}</span>
                  <div class="flex items-center gap-2">
                    <button v-if="order.kind !== 'vendor_delivery'" @click="openReassignModal(order)" type="button" class="px-3.5 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition rounded-xl text-xs font-bold cursor-pointer border-0">
                      Reassign Rider
                    </button>
                    <button v-if="order.can_cancel ?? ['pending', 'acknowledged', 'assigned'].includes(order.status)" @click="promptCancelOrder(order)" type="button" class="px-3.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 transition rounded-xl text-xs font-bold cursor-pointer border-0">
                      Cancel &amp; Refund
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="ordersList.length === 0" class="py-16 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                No live orders recorded for this merchant node.
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>

    <!-- Edit Product Modal Drawer -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white border border-gray-100 rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
        <button @click="showEditModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0">
          <X :size="20" />
        </button>

        <div class="space-y-1">
          <h2 class="text-lg font-black text-gray-900">Audit &amp; Edit Product</h2>
          <p class="text-xs text-gray-500 font-medium">Modify inventory specs or availability for {{ editingProduct?.name }}</p>
        </div>

        <div v-if="editingProduct" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Product Image Asset</label>
            <div class="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
              <div class="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center border border-gray-300">
                <img v-if="imagePreviewUrl" :src="imagePreviewUrl" class="w-full h-full object-cover" />
                <ImageIcon v-else class="w-6 h-6 text-gray-400" />
              </div>
              <div class="flex-1">
                <input type="file" @change="handleImageSelection" accept="image/*" class="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[11px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-opacity-95 cursor-pointer" />
                <p class="text-[10px] text-gray-400 mt-1">Upload PNG, JPG or WEBP image asset.</p>
              </div>
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Product Name</label>
            <input v-model="editingProduct.name" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-gray-900 outline-none focus:border-indigo-600" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Category Department</label>
              <select v-model="editingProduct.category" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-gray-900 outline-none focus:border-indigo-600 cursor-pointer">
                <option v-for="cat in categoryChoices" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Stock Status</label>
              <select v-model="editingProduct.is_available" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-gray-900 outline-none focus:border-indigo-600 cursor-pointer">
                <option :value="true">Available (In Stock)</option>
                <option :value="false">Unavailable (Out of Stock)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Base Price (₦)</label>
              <input v-model.number="editingProduct.price" type="number" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-gray-900 outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Bonanza Promo Mode</label>
              <div class="flex items-center h-[42px] px-3 bg-gray-50 border border-gray-200 rounded-xl">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="editingProduct.bonanza_mode" class="sr-only peer">
                  <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span class="ml-2 text-xs font-bold text-gray-700">{{ editingProduct.bonanza_mode ? 'Active' : 'Disabled' }}</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="editingProduct.bonanza_mode">
            <label class="block font-bold text-amber-700 mb-1 uppercase tracking-wider text-[10px]">Promotional Discount Price (₦)</label>
            <input v-model.number="editingProduct.discount_price" type="number" class="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3.5 py-2.5 font-semibold text-gray-900 outline-none focus:border-amber-600" placeholder="Enter discounted markdown price" />
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Description / Specs / Menu details</label>
            <textarea v-model="editingProduct.description" rows="3" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-gray-900 outline-none focus:border-indigo-600"></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button @click="showEditModal = false" type="button" class="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer border-0">
            Cancel
          </button>
          <button @click="saveProductChanges" :disabled="isSavingProduct" type="button" class="px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:bg-indigo-700 transition flex items-center gap-2 cursor-pointer border-0">
            <Loader2 v-if="isSavingProduct" class="w-3.5 h-3.5 animate-spin text-white" />
            <Save v-else :size="14" />
            {{ isSavingProduct ? 'Saving Updates...' : 'Save Product Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Rider Reassignment Modal (Updated for String IDs) -->
    <div v-if="showReassignModal" class="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white border border-gray-100 rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6 relative">
        <button @click="showReassignModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0">
          <X :size="20" />
        </button>

        <div class="space-y-1">
          <h2 class="text-lg font-black text-gray-900">Reassign Delivery Rider</h2>
          <p class="text-xs text-gray-500 font-medium">Select an available operational rider for order #{{ selectedOrder?.id }}</p>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1.5 uppercase tracking-wider text-[10px]">Available Riders Pool</label>
           
            <select v-model="targetRiderId" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-gray-900 outline-none focus:border-indigo-600 cursor-pointer">
              <option :value="null">Select a rider...</option>
              <option v-for="rider in availableRiders" :key="rider.id" :value="String(rider.id)">
                {{ rider.name }} ({{ rider.phone || 'Active' }})
              </option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button @click="showReassignModal = false" type="button" class="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer border-0">
            Cancel
          </button>
          <button @click="executeOrderReassignment" :disabled="isReassigning || !targetRiderId" type="button" class="px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:bg-indigo-700 transition flex items-center gap-2 cursor-pointer border-0 disabled:opacity-50">
            <Loader2 v-if="isReassigning" class="w-3.5 h-3.5 animate-spin text-white" />
            {{ isReassigning ? 'Reassigning...' : 'Confirm Reassignment' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white border border-gray-100 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-6 relative animate-in fade-in zoom-in duration-200">
        <div class="flex items-center gap-4">
          <div :class="confirmModalConfig.actionType === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'" class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle :size="24" />
          </div>
          <div>
            <h3 class="text-base font-black text-gray-900 tracking-tight">{{ confirmModalConfig.title }}</h3>
            <p class="text-xs text-gray-500 font-medium">Confirmation Required</p>
          </div>
        </div>

        <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-semibold text-gray-700 leading-relaxed">
          {{ confirmModalConfig.message }}
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button type="button" @click="showConfirmModal = false" class="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer border-0 outline-none">
            Cancel
          </button>
          <button type="button" @click="confirmModalConfig.onConfirm" :class="confirmModalConfig.actionType === 'danger' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'" class="px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border-0 outline-none">
            {{ confirmModalConfig.actionLabel }}
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Feedback Toast Modal -->
    <div v-if="showFeedbackModal" class="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white border border-gray-100 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-6 relative animate-in fade-in zoom-in duration-200">
        <div class="flex items-center gap-4">
          <div :class="feedbackModalConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'" class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 v-if="feedbackModalConfig.type === 'success'" :size="24" />
            <AlertCircle v-else :size="24" />
          </div>
          <div>
            <h3 class="text-base font-black text-gray-900 tracking-tight">{{ feedbackModalConfig.title }}</h3>
            <p class="text-xs text-gray-500 font-medium">System Notification</p>
          </div>
        </div>

        <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-semibold text-gray-700 leading-relaxed">
          {{ feedbackModalConfig.message }}
        </div>

        <div class="flex items-center justify-end pt-2">
          <button type="button" @click="showFeedbackModal = false" class="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all cursor-pointer border-0 outline-none">
            Acknowledge &amp; Dismiss
          </button>
        </div>
      </div>
    </div>

  </div>
</template>