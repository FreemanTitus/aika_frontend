<!-- pages/marketplace/checkout.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useCookie, useRuntimeConfig } from '#app'
import {
  MapPin, Navigation, Loader2, XCircle,
  ArrowLeft, Building2, ShoppingBag, Wallet, ExternalLink
} from '@lucide/vue'
import { useCart } from '~/composables/useCart'

definePageMeta({ layout: 'marketplace' })

interface CoverageAreaOption {
  id: number
  name: string
  state_name: string
  latitude?: number | null
  longitude?: number | null
}

interface SavedCheckoutSession {
  fingerprint: string
  key: string
  orderId?: string | null
  paymentReference?: string | null
  checkoutUrl?: string | null
}

const CHECKOUT_SESSION_KEY = 'aika_checkout_session'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const router = useRouter()
const authToken = useCookie('auth_token')
const userRole = useCookie('user_role')
const { cartItems, cartTotal, clearCart } = useCart()

const useSavedAddress = ref(true)
const deliveryAddress = ref('')
const customStreetDetails = ref('')
const savedBaseLocation = ref('')
const savedBaseLocationId = ref('')

const coverageAreas = ref<CoverageAreaOption[]>([])
const deliveredBy = ref<'platform' | 'vendor' | null>(null)
const quoteNotice = ref('')
const needsArea = ref(false)

const primaryVendorId = computed(() => cartItems.value?.[0]?.storeId || null)

// The area the checkout will send: saved hub (by id when known) or the one picked manually.
const activeBaseLocation = computed(() => {
  const raw = useSavedAddress.value
    ? (savedBaseLocationId.value || savedBaseLocation.value)
    : customStreetDetails.value
  return raw !== null && raw !== undefined ? String(raw).trim() : ''
})

const cartFingerprint = computed(() =>
  `${primaryVendorId.value}|${(deliveryAddress.value || '').trim()}|${activeBaseLocation.value}|` +
  cartItems.value.map(i => `${i.id}:${i.quantity}`).sort().join(',')
)

const readCheckoutSession = (): SavedCheckoutSession | null => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CHECKOUT_SESSION_KEY) || 'null')
    if (saved?.fingerprint === cartFingerprint.value && saved?.key) return saved
  } catch { /* fall through and make a new one */ }
  return null
}

const writeCheckoutSession = (patch: Partial<SavedCheckoutSession> & { key: string }) => {
  const current = readCheckoutSession()
  const next: SavedCheckoutSession = {
    fingerprint: cartFingerprint.value,
    key: patch.key,
    orderId: patch.orderId !== undefined ? patch.orderId : current?.orderId ?? null,
    paymentReference: patch.paymentReference !== undefined ? patch.paymentReference : current?.paymentReference ?? null,
    checkoutUrl: patch.checkoutUrl !== undefined ? patch.checkoutUrl : current?.checkoutUrl ?? null,
  }
  sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(next))
}

// One key per checkout attempt, kept in sessionStorage so a page refresh or retry reuses it.
const getCheckoutKey = (): string => {
  const existing = readCheckoutSession()
  if (existing?.key) return existing.key

  const key = (globalThis.crypto?.randomUUID?.()
    ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    }))
  writeCheckoutSession({ key })
  return key
}

const resetCheckoutKey = () => sessionStorage.removeItem(CHECKOUT_SESSION_KEY)

const pendingSession = ref<SavedCheckoutSession | null>(null)

const syncPendingSessionState = () => {
  pendingSession.value = readCheckoutSession()
}

const customerLatitude = ref<number | null>(null)
const customerLongitude = ref<number | null>(null)
const savedLatitude = ref<number | null>(null)
const savedLongitude = ref<number | null>(null)

const rawFetchedStreet = ref('')
const rawFetchedBase = ref('')

const isLocatingGps = ref(false)
const isSubmittingOrder = ref(false)

const errorMessageTitle = ref<string | null>(null)
const errorMessageDetail = ref<string | null>(null)

// Quote & Wallet data tracking
const deliveryQuoteData = ref({
  delivery_fee: 1000.00,
  wallet_balance: 0.00,
  wallet_applied_to_delivery: 0.00,
  net_delivery_fee: 1000.00
})

const estimatedFinalTotal = computed(() => cartTotal.value + deliveryQuoteData.value.net_delivery_fee)
const backendHost = `${apiBase}`

const getHubCoordinates = (areaIdentifier: string | number | null | undefined) => {
  if (!areaIdentifier || coverageAreas.value.length === 0) return null
  const needle = String(areaIdentifier).trim().toLowerCase()
  const matched = coverageAreas.value.find(
    a => String(a.id) === needle || a.name.trim().toLowerCase() === needle
  )
  if (!matched || matched.latitude == null || matched.longitude == null) return null
  const lat = Number(matched.latitude)
  const lng = Number(matched.longitude)
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) return null
  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6))
  }
}

onMounted(async () => {
  if (cartItems.value.length === 0) {
    router.push('/marketplace')
    return
  }

  if (!authToken.value && userRole.value !== 'admin' && userRole.value !== 'business') {
    router.push({ path: '/auth/login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }

  syncPendingSessionState()

  try {
    // 1. Load delivery coverage areas first so coordinates can fall back to hub geometry
    try {
      const areasRes: any = await $fetch(`${backendHost}/api/v1/auth/locations`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      const list = areasRes?.data || areasRes
      if (Array.isArray(list)) coverageAreas.value = list
    } catch (e) {
      console.warn('Could not load delivery areas', e)
    }

    // 2. Fetch customer coordinates & saved address
    const customerCoordRes: any = await $fetch(`${backendHost}/api/v1/customer/coordinates`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    const cData = customerCoordRes?.data || {}
    if (cData) {
      rawFetchedStreet.value = cData.street_address || ''
      rawFetchedBase.value = cData.base_location || ''
      deliveryAddress.value = rawFetchedStreet.value
      savedBaseLocation.value = rawFetchedBase.value
      savedBaseLocationId.value = cData.base_location_id ? String(cData.base_location_id) : ''

      let lat = cData.latitude ?? null
      let lng = cData.longitude ?? null

      // Fallback to selected CoverageArea coordinates if user coordinates are unset
      if (lat == null || lng == null) {
        const hubCoords = getHubCoordinates(savedBaseLocationId.value || savedBaseLocation.value)
        if (hubCoords) {
          lat = hubCoords.latitude
          lng = hubCoords.longitude
        }
      }

      savedLatitude.value = lat
      savedLongitude.value = lng
      customerLatitude.value = lat
      customerLongitude.value = lng
    }

    syncPendingSessionState()

    // 3. Fetch initial distance-based delivery quote & wallet balance
    await fetchDeliveryQuote()
  } catch (e) {
    console.error('Initialization load failed', e)
  }
})

// Sync coordinates automatically when switching between default address and manual hub selection
watch(useSavedAddress, (isDefault) => {
  if (isDefault) {
    deliveryAddress.value = rawFetchedStreet.value
    customerLatitude.value = savedLatitude.value
    customerLongitude.value = savedLongitude.value
  } else {
    if (!deliveryAddress.value) deliveryAddress.value = rawFetchedStreet.value
    if (!customStreetDetails.value && savedBaseLocationId.value) {
      customStreetDetails.value = savedBaseLocationId.value
    }
    const hubCoords = getHubCoordinates(customStreetDetails.value || rawFetchedBase.value)
    if (hubCoords) {
      customerLatitude.value = hubCoords.latitude
      customerLongitude.value = hubCoords.longitude
    }
  }
})

// Update customer coordinates from selected CoverageArea when manual area changes
watch(customStreetDetails, (newAreaId) => {
  if (!useSavedAddress.value && newAreaId) {
    const hubCoords = getHubCoordinates(newAreaId)
    if (hubCoords) {
      customerLatitude.value = hubCoords.latitude
      customerLongitude.value = hubCoords.longitude
    }
  }
})

// Re-quote whenever active delivery area or coordinates change
watch([activeBaseLocation, customerLatitude, customerLongitude], () => {
  fetchDeliveryQuote()
})

watch(cartFingerprint, () => {
  syncPendingSessionState()
})

const syncSelectedHubGps = () => {
  const targetArea = useSavedAddress.value
    ? (savedBaseLocationId.value || savedBaseLocation.value)
    : customStreetDetails.value

  if (!targetArea) {
    triggerErrorPopup('Location Required', 'Please select a delivery hub area first.')
    return
  }

  isLocatingGps.value = true
  const hubCoords = getHubCoordinates(targetArea)

  if (hubCoords) {
    customerLatitude.value = hubCoords.latitude
    customerLongitude.value = hubCoords.longitude
    isLocatingGps.value = false
  } else {
    isLocatingGps.value = false
    triggerErrorPopup('Coordinates Unavailable', 'No hub coordinates configured for the selected area.')
  }
}

const fetchDeliveryQuote = async () => {
  // Coordinates are optional: vendor-delivered orders are priced by area, not distance.
  if (!primaryVendorId.value) return

  try {
    const res: any = await $fetch(`${backendHost}/api/v1/marketplace/quote-delivery/${primaryVendorId.value}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      },
      body: {
        latitude: customerLatitude.value,
        longitude: customerLongitude.value,
        base_location: activeBaseLocation.value,
        items: cartItems.value.map(i => ({ product_id: String(i.id), quantity: i.quantity, price_at_order: i.price }))
      }
    })
    needsArea.value = res?.status === 'needs_area'
    deliveredBy.value = res?.delivered_by ?? null
    quoteNotice.value = res?.message || ''
    if (res && !needsArea.value) {
      deliveryQuoteData.value = {
        delivery_fee: res.delivery_fee ?? 1000.00,
        wallet_balance: res.wallet_balance ?? 0.00,
        wallet_applied_to_delivery: res.wallet_applied_to_delivery ?? 0.00,
        net_delivery_fee: res.net_delivery_fee ?? (res.delivery_fee ?? 1000.00)
      }
    }
  } catch (e: any) {
    console.error('Failed to fetch live delivery quote', e)
    const detail = e?.data?.detail
    if (detail) triggerErrorPopup('Delivery unavailable', detail)
  }
}

const handleFinalCheckoutSubmit = async () => {
  if (isSubmittingOrder.value || !primaryVendorId.value) return
  isSubmittingOrder.value = true

  const checkoutKey = getCheckoutKey()
  const resolvedBaseLocation = activeBaseLocation.value

  const payload = {
    delivery_address: (deliveryAddress.value || '').trim(),
    base_location: resolvedBaseLocation,
    latitude: customerLatitude.value,
    longitude: customerLongitude.value,
    items: cartItems.value.map(i => ({ product_id: String(i.id), quantity: i.quantity, price_at_order: i.price }))
  }

  try {
    const res: any = await $fetch(
      `${backendHost}/api/v1/marketplace/checkout/${primaryVendorId.value}`,
      {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Idempotency-Key': checkoutKey,
          ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}),
          'Content-Type': 'application/json'
        },
        body: payload
      }
    )

    const checkoutUrl = res?.checkout_url || res?.data?.link || res?.data?.checkout_url || res?.data?.redirect_url
    const orderId = res?.order_id || res?.data?.order_id || null
    const paymentReference = res?.payment_reference || res?.data?.reference || null

    if (res?.status === 'success' && checkoutUrl) {
      // Persist checkout session metadata before clearing cart or leaving the page
      writeCheckoutSession({
        key: checkoutKey,
        orderId,
        paymentReference,
        checkoutUrl,
      })
      syncPendingSessionState()
      clearCart()
      window.location.href = checkoutUrl
    } else {
      triggerErrorPopup('Payment Failed', res?.message || 'Could not initialize payment session.')
      isSubmittingOrder.value = false
    }
  } catch (err: any) {
    isSubmittingOrder.value = false
    if (err?.statusCode === 409 || err?.status === 409) {
      resetCheckoutKey()
      syncPendingSessionState()
    }
    triggerErrorPopup(
      'Checkout Interruption',
      err?.data?.detail || err?.message || 'Payment gateway connection failed. If your network dropped, retry with the same checkout session or check your orders.'
    )
  }
}

const resumeSavedPaymentSession = () => {
  if (pendingSession.value?.checkoutUrl) {
    window.location.href = pendingSession.value.checkoutUrl
  }
}

const formatMoney = (v: number) => '₦' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const triggerErrorPopup = (t: string, d: string) => { errorMessageTitle.value = t; errorMessageDetail.value = d }
</script>

<template>
  <main class="bg-[#F8FAFC] min-h-screen py-10 px-4 sm:px-6 lg:px-12 font-sans text-left text-[#0A1128]">
    <div class="max-w-6xl mx-auto space-y-8">

      <div class="flex items-center space-x-4">
        <button @click="router.back()" class="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition shadow-sm cursor-pointer">
          <ArrowLeft class="w-4 h-4 text-gray-700" />
        </button>
        <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">Checkout Order Hub</h1>
      </div>

      <div v-if="pendingSession?.checkoutUrl" class="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1 text-xs text-amber-900">
          <p class="font-black uppercase tracking-wider text-amber-800">Payment Link Ready</p>
          <p class="font-semibold">
            An existing checkout link was already generated for this order
            <span v-if="pendingSession.paymentReference" class="font-mono">({{ pendingSession.paymentReference }})</span>.
          </p>
        </div>
        <button
          type="button"
          @click="resumeSavedPaymentSession"
          class="bg-amber-900 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-amber-950 transition cursor-pointer border-0 shrink-0"
        >
          <span>Open Payment Page</span>
          <ExternalLink class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        <div class="lg:col-span-2 space-y-6">

          <div class="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                <MapPin class="w-3.5 h-3.5" /> Delivery Logistics &amp; Hub
              </h2>
              <label class="flex items-center gap-2 text-xs font-black cursor-pointer select-none">
                <input type="checkbox" v-model="useSavedAddress" class="accent-emerald-600 w-4 h-4 rounded" />
                Use Default Address
              </label>
            </div>

            <div v-if="useSavedAddress" class="bg-[#EFFFF6] border border-[#A7F3D0] rounded-2xl p-5 transition-all space-y-2">
              <p class="text-sm font-bold text-[#047857] flex items-center gap-2">
                <span class="text-rose-600 text-lg leading-none mt-[-2px]">
                  <MapPin class="w-3.5 h-3.5" />
                </span>
                {{ deliveryAddress || 'No address saved. Please update profile.' }}
              </p>
              <div class="flex items-center justify-between pl-6 text-[11px] text-[#10B981] font-medium">
                <span>Base: {{ savedBaseLocation || 'Unknown' }}</span>
                <span v-if="customerLatitude" class="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Hub GPS Locked</span>
              </div>
            </div>

            <!-- Manual Entry Form -->
            <div v-else class="space-y-4 animate-fade-in">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase tracking-wider text-gray-400">Operational Hub Base *</label>
                <select v-model="customStreetDetails" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-black text-[#0A1128] focus:border-emerald-500 outline-none transition cursor-pointer">
                  <option value="" disabled>Select your delivery area</option>
                  <template v-if="coverageAreas.length">
                    <option v-for="area in coverageAreas" :key="area.id" :value="String(area.id)">{{ area.name }}, {{ area.state_name }}</option>
                  </template>
                  <template v-else>
                    <option value="akwanga">Akwanga</option>
                    <option value="keffi">Keffi</option>
                    <option value="lafia">Lafia</option>
                  </template>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase tracking-wider text-gray-400">Specific Street Details or Landmark *</label>
                <input v-model="deliveryAddress" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-semibold focus:border-emerald-500 outline-none transition" placeholder="e.g., Opposite Blue Gate, House 4..." />
              </div>

              <div class="flex items-center justify-between pt-1">
                <button type="button" @click="syncSelectedHubGps" :disabled="isLocatingGps || !customStreetDetails" class="text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 flex items-center gap-2 cursor-pointer border-0 bg-transparent transition disabled:opacity-50">
                  <Loader2 v-if="isLocatingGps" class="w-3.5 h-3.5 animate-spin" />
                  <Navigation v-else class="w-3.5 h-3.5" />
                  {{ isLocatingGps ? 'Syncing Hub...' : 'Sync Selected Hub Coordinates' }}
                </button>
                <span v-if="customerLatitude" class="text-[10px] font-mono text-emerald-700 font-bold">✓ Hub Coordinates Locked</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
            <h2 class="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-2 mb-6">
              <ShoppingBag class="w-3.5 h-3.5" /> Order Contents
            </h2>

            <div class="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              <div
                v-for="item in cartItems"
                :key="item.id"
                class="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/80"
              >
                <div class="space-y-1 max-w-[70%]">
                  <p class="text-sm font-black text-[#0A1128] truncate">{{ item.name }}</p>
                  <p class="text-[10px] text-gray-500 flex items-center gap-1.5 uppercase tracking-wider font-bold">
                    <Building2 class="w-3 h-3 text-emerald-500" /> {{ item.vendorName }}
                  </p>
                  <span class="text-[10px] bg-white border border-gray-200 px-2.5 py-1 rounded-md text-gray-600 inline-block font-black shadow-xs">
                    Qty: {{ item.quantity }}
                  </span>
                </div>
                <p class="font-mono font-bold text-sm text-[#0A1128]">{{ formatMoney(item.price * item.quantity) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-8 shadow-sm lg:sticky lg:top-8 space-y-6">
          <h3 class="text-sm font-black uppercase tracking-wider text-[#0A1128]">Invoice</h3>

          <div class="space-y-4 text-sm font-bold text-[#333]">
            <div class="flex justify-between items-center">
              <span>Subtotal</span>
              <span class="font-mono text-[#0A1128]">{{ formatMoney(cartTotal) }}</span>
            </div>

            <div v-if="needsArea" class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-bold">
              {{ quoteNotice || 'Select your delivery area to see the delivery option and fee.' }}
            </div>
            <div v-else-if="deliveredBy === 'vendor'" class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-800 font-bold">
              {{ quoteNotice || 'The seller will deliver this order themselves.' }}
            </div>

            <div class="flex justify-between items-center">
              <span>Delivery Fee</span>
              <div class="flex items-center gap-2 font-mono">
                <span
                  v-if="deliveryQuoteData.delivery_fee > deliveryQuoteData.net_delivery_fee"
                  class="text-xs text-gray-400 line-through"
                >
                  {{ formatMoney(deliveryQuoteData.delivery_fee) }}
                </span>
                <span class="text-[#0A1128]">{{ formatMoney(deliveryQuoteData.net_delivery_fee) }}</span>
              </div>
            </div>

            <!-- Wallet / Referral Discount Banner (if active) -->
            <div v-if="deliveryQuoteData.wallet_applied_to_delivery > 0" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800">
              <span class="flex items-center gap-1.5 font-bold">
                <Wallet class="w-3.5 h-3.5 text-emerald-600" /> Wallet/Referral Credit applied:
              </span>
              <span class="font-mono font-black">-{{ formatMoney(deliveryQuoteData.wallet_applied_to_delivery) }}</span>
            </div>

            <div class="pt-6 border-t border-gray-100 flex justify-between items-center">
              <span class="text-lg font-black text-[#059669]">Total</span>
              <span class="text-xl font-black font-mono text-[#059669]">{{ formatMoney(estimatedFinalTotal) }}</span>
            </div>
          </div>

          <button
            @click="handleFinalCheckoutSubmit"
            :disabled="isSubmittingOrder"
            class="w-full bg-[#0A1128] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#111827] transition shadow-md flex items-center justify-center gap-2 cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isSubmittingOrder" class="w-4 h-4 animate-spin text-white" />
            <span>{{ isSubmittingOrder ? 'Processing...' : 'Pay Securely Now' }}</span>
          </button>
        </div>

      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="errorMessageTitle" class="fixed inset-0 bg-[#0A1128]/40 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div class="bg-white rounded-[24px] border border-gray-100 p-6 max-w-sm w-full text-center shadow-2xl animate-scale-up space-y-4">
            <div class="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mx-auto">
              <XCircle class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div class="space-y-1">
              <h3 class="text-xs font-black tracking-wider uppercase text-gray-400">{{ errorMessageTitle }}</h3>
              <p class="text-xs text-gray-600 font-semibold leading-relaxed">{{ errorMessageDetail }}</p>
            </div>
            <button @click="errorMessageTitle = null" class="w-full bg-[#0A1128] text-white text-xs font-black py-3.5 rounded-xl cursor-pointer border-0 outline-none">
              Accept Notice
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
</style>