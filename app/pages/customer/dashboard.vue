<script setup lang="ts">
// pages/customer/dashboard.vue
// Customer dashboard — refreshed UI, with vendor-fulfilled & dispatch confirmation support.

import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import {
  Bike, Package, Plus, X, CheckCircle2, Loader2, ShoppingBag, Compass,
  Sparkles, AlertTriangle, ArrowUpRight, Rocket, Box, RefreshCw, XCircle,
  History, Wallet, Copy, Check, Gift, Users, Store
} from '@lucide/vue'

definePageMeta({
  layout: 'customer',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

// -----------------------------------------------------------------------------
// Types and dashboard state
// -----------------------------------------------------------------------------
interface RiderInfo {
  id: string | number
  full_name: string
  bike_plate_number?: string
}

interface Booking {
  booking_reference: string
  booking_type: string
  status: string
  fare_amount: number
}

interface Order {
  id: string | number
  total_price: number | string
  status: string
  created_at: string
  logistics_dispatch__status?: string
  rider?: RiderInfo
  fulfillment_mode?: string
  vendor_marked_delivered?: boolean
}

interface DashboardData {
  name: string
  phone_number?: string
  wallet_balance: number
  referral: {
    referral_code: string
    total_referrals: number
    successful_rewards: number
    earned_bonus: number
  }
  active_bookings: Booking[]
  order_history: Order[]
}

const activeTab = ref<'orders' | 'transit' | 'history'>('orders')
const isBookingModalOpen = ref(false)
const bookingTypeTab = ref<'ride' | 'delivery'>('ride')
const isBookingSubmitting = ref(false)
const bookingError = ref<string | null>(null)
const copiedCode = ref(false)

const showRiderReviewModal = ref(false)
const selectedRider = ref<RiderInfo | null>(null)
const isSubmittingRiderReview = ref(false)
const riderReviewForm = ref({ rating: 5, comment: '' })

const alertModal = ref<{ title: string; message: string; type: 'error' | 'success' } | null>(null)

const createDefaultBookingForm = () => ({
  customer_name: dashboard.value?.name || '',
  customer_phone: dashboard.value?.phone_number || '',
  pickup_address: '',
  dropoff_address: '',
  fare_amount: 1500,
  receiver_name: '',
  receiver_phone: '',
  package_description: '',
  is_cash_on_delivery: false,
  cod_amount: 0.00
})

const dashboard = ref<DashboardData>({
  name: '',
  phone_number: '',
  wallet_balance: 0.00,
  referral: { referral_code: '', total_referrals: 0, successful_rewards: 0, earned_bonus: 0 },
  active_bookings: [],
  order_history: []
})

const bookingForm = ref(createDefaultBookingForm())
const pending = ref<boolean>(true)
const error = ref<any>(null)

const triggerAlert = (
  title: string,
  message: string,
  type: 'error' | 'success' = 'error'
) => {
  alertModal.value = { title, message, type }
}

const openBookingModal = () => {
  bookingError.value = null
  if (!bookingForm.value.customer_name && dashboard.value?.name) {
    bookingForm.value.customer_name = dashboard.value.name
  }
  if (!bookingForm.value.customer_phone && dashboard.value?.phone_number) {
    bookingForm.value.customer_phone = dashboard.value.phone_number
  }
  isBookingModalOpen.value = true
}

// -----------------------------------------------------------------------------
// Existing API operations — endpoints, methods, headers and payloads unchanged
// -----------------------------------------------------------------------------
const autoSyncBackgroundGps = () => {
  if (typeof window === 'undefined' || !navigator.geolocation || !authToken.value) return

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const latitude = Number(position.coords.latitude.toFixed(6))
      const longitude = Number(position.coords.longitude.toFixed(6))

      await $fetch(`${apiBase}/api/v1/customer/profile/update-coordinates`, {
        method: 'POST',
        body: {
          latitude,
          longitude
        },
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${authToken.value}`
        }
      })
    } catch (err) {
      console.error('Background GPS auto-sync failed:', err)
    }
  }, (err) => {
    console.warn('User declined or GPS unavailable:', err)
  }, { timeout: 10000, enableHighAccuracy: true })
}

const fetchDashboardData = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/customer/dashboard`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    dashboard.value = res?.data || res || dashboard.value
  } catch (err: any) {
    console.error('Customer dashboard fetch error:', err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
  autoSyncBackgroundGps()
})

// -----------------------------------------------------------------------------
// Derived dashboard collections (fully filtering out delivered items from processing)
// -----------------------------------------------------------------------------
const processingOrders = computed(() => {
  const history = dashboard.value?.order_history
  if (!Array.isArray(history)) return []
  return history.filter(order =>
    ['pending', 'paid_unassigned', 'processing', 'in_transit'].includes(order.status)
    && order.status !== 'delivered'
    && order.logistics_dispatch__status !== 'delivered'
    && !order.vendor_marked_delivered
  )
})

const dispatchedOrders = computed(() => {
  const history = dashboard.value?.order_history
  if (!Array.isArray(history)) return []
  return history.filter(order =>
    order.logistics_dispatch__status === 'delivered'
      || order.vendor_marked_delivered
      || (order.status === 'completed' && order.logistics_dispatch__status && order.logistics_dispatch__status !== 'completed')
  )
})

const orderHistoryList = computed(() => {
  const history = dashboard.value?.order_history
  if (!Array.isArray(history)) return []
  const awaitingReceiptIds = new Set(dispatchedOrders.value.map(o => o.id))
  return history.filter(order =>
    !awaitingReceiptIds.has(order.id)
    && (order.logistics_dispatch__status === 'completed' || order.status === 'completed' || order.status === 'delivered')
  )
})

// -----------------------------------------------------------------------------
// Customer actions
// -----------------------------------------------------------------------------
const handleAddFundsClick = () => {
  triggerAlert(
    'Wallet Top-up',
    'Online wallet top-up gateway integration is coming soon! Referral rewards will accumulate in your balance automatically.',
    'success'
  )
}

const copyReferralCode = async () => {
  const code = dashboard.value?.referral?.referral_code
  if (!code || typeof navigator === 'undefined') return
  await navigator.clipboard.writeText(code)
  copiedCode.value = true
  setTimeout(() => { copiedCode.value = false }, 2500)
}

const handleInstantBooking = async () => {
  bookingError.value = null
  isBookingSubmitting.value = true

  const endpoint = bookingTypeTab.value === 'ride'
    ? `${apiBase}/api/v1/bookings/ride/create`
    : `${apiBase}/api/v1/bookings/delivery/create`

  const payload = bookingTypeTab.value === 'ride' ? {
    customer_name: bookingForm.value.customer_name,
    customer_phone: bookingForm.value.customer_phone,
    pickup_address: bookingForm.value.pickup_address,
    dropoff_address: bookingForm.value.dropoff_address,
    fare_amount: Number(bookingForm.value.fare_amount)
  } : {
    customer_name: bookingForm.value.customer_name,
    customer_phone: bookingForm.value.customer_phone,
    pickup_address: bookingForm.value.pickup_address,
    dropoff_address: bookingForm.value.dropoff_address,
    fare_amount: Number(bookingForm.value.fare_amount),
    receiver_name: bookingForm.value.receiver_name,
    receiver_phone: bookingForm.value.receiver_phone,
    package_description: bookingForm.value.package_description,
    is_cash_on_delivery: bookingForm.value.is_cash_on_delivery,
    cod_amount: bookingForm.value.is_cash_on_delivery ? Number(bookingForm.value.cod_amount) : 0
  }

  try {
    const res: any = await $fetch(endpoint, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: payload
    })

    if (res?.status === 'success' || res) {
      bookingForm.value = createDefaultBookingForm()
      isBookingModalOpen.value = false
      activeTab.value = 'transit'
      await fetchDashboardData()
      triggerAlert('Success', 'Dispatch booking created successfully!', 'success')
    }
  } catch (err: any) {
    console.error('Booking failed', err)
    bookingError.value =
      err?.data?.message ||
      err?.data?.detail ||
      err?.message ||
      'Failed to process booking request.'
  } finally {
    isBookingSubmitting.value = false
  }
}

const completingOrderIds = ref<Set<string | number>>(new Set())

const markAsCompleted = async (orderId: string | number) => {
  if (completingOrderIds.value.has(orderId)) return
  completingOrderIds.value.add(orderId)

  try {
    await $fetch(`${apiBase}/api/v1/customer/orders/${orderId}/complete`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    await fetchDashboardData()
    triggerAlert(
      'Delivery Confirmed',
      'Order has been successfully marked as received and moved to history.',
      'success'
    )
  } catch (err: any) {
    console.error('Failed to complete order', err)
    triggerAlert('Update Failed', err?.data?.detail || 'Failed to update order status.')
  } finally {
    completingOrderIds.value.delete(orderId)
  }
}

const openRiderReviewModal = (rider?: RiderInfo) => {
  if (!rider?.id) return
  selectedRider.value = rider
  riderReviewForm.value = { rating: 5, comment: '' }
  showRiderReviewModal.value = true
}

const submitRiderReview = async () => {
  if (!selectedRider.value) return
  isSubmittingRiderReview.value = true

  try {
    const res: any = await $fetch(
      `${apiBase}/api/v1/customer/rider/${selectedRider.value.id}/review`,
      {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${authToken.value}`
        },
        body: riderReviewForm.value
      }
    )
    triggerAlert('Success', res?.message || 'Rider review submitted successfully.', 'success')
    showRiderReviewModal.value = false
  } catch (err: any) {
    console.error('Failed to submit rider review', err)
    triggerAlert('Error', err?.data?.detail || 'Could not submit rider review.', 'error')
  } finally {
    isSubmittingRiderReview.value = false
  }
}

// -----------------------------------------------------------------------------
// Presentation helpers
// -----------------------------------------------------------------------------
const formatMoney = (amount: number | string | null | undefined) =>
  Number(amount || 0).toLocaleString()

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

const statusClass = (status: string) => {
  const value = status?.toLowerCase()
  if (['delivered', 'completed', 'success'].includes(value)) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  }
  if (['processing', 'pending', 'preparing', 'paid_unassigned', 'in_transit'].includes(value)) {
    return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  }
  return 'bg-slate-100 text-slate-600 ring-slate-500/10'
}
</script>

<template>
  <main class="dashboard-shell min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl space-y-6 lg:space-y-8">

      <!-- Header / customer overview -->
      <section class="hero-panel relative isolate overflow-hidden rounded-3xl p-5 text-white shadow-xl sm:p-8 lg:p-9">
        <div class="hero-orb hero-orb-one" />
        <div class="hero-orb hero-orb-two" />

        <div class="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-2xl space-y-5">
            <div class="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-lime-200">
              <Sparkles class="h-3.5 w-3.5" />
              Customer overview
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium text-slate-300">Your activity, all in one place</p>
              <h1 class="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Welcome back, {{ dashboard?.name || 'Customer' }}
              </h1>
              <p class="max-w-xl text-sm leading-6 text-slate-300">
                Keep an eye on your orders, follow active deliveries and book your next ride or dispatch.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="hero-widget">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-slate-950">
                  <Wallet class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Wallet balance</p>
                  <p class="mt-1 text-xl font-bold tracking-tight text-lime-200">
                    ₦{{ formatMoney(dashboard?.wallet_balance) }}
                  </p>
                </div>
                <button type="button" class="hero-light-button" @click="handleAddFundsClick">
                  <Plus class="h-4 w-4" />
                  Add
                </button>
              </div>

              <div class="hero-widget">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                  <Gift class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Referral code</p>
                  <p class="mt-1 truncate font-mono text-base font-bold text-white">
                    {{ dashboard?.referral?.referral_code || 'AIKA-XXXX' }}
                  </p>
                </div>
                <button
                  type="button"
                  class="hero-accent-button"
                  title="Copy referral code"
                  @click="copyReferralCode"
                >
                  <Check v-if="copiedCode" class="h-4 w-4" />
                  <Copy v-else class="h-4 w-4" />
                  {{ copiedCode ? 'Copied' : 'Copy' }}
                </button>
              </div>
            </div>
          </div>

          <div class="relative z-10 flex w-full gap-3 sm:w-auto xl:flex-col">
            <button type="button" class="primary-action flex-1 xl:flex-none" @click="openBookingModal">
              <Plus class="h-5 w-5" />
              New booking
            </button>
            <button
              type="button"
              class="refresh-action"
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
              :disabled="pending"
              @click="fetchDashboardData"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': pending }" />
            </button>
          </div>
        </div>
      </section>

      <!-- Error state -->
      <section
        v-if="error && !pending"
        class="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        role="alert"
      >
        <div class="flex items-start gap-3">
          <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p class="text-sm font-semibold text-rose-900">We couldn't refresh your dashboard.</p>
            <p class="mt-1 text-xs text-rose-700">Please check your connection and try again.</p>
          </div>
        </div>
        <button type="button" class="secondary-button" @click="fetchDashboardData">Try again</button>
      </section>

      <!-- KPI cards -->
      <section aria-label="Account activity" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <template v-if="pending && !dashboard.name && !dashboard.order_history.length">
          <div v-for="n in 3" :key="n" class="stat-card animate-pulse">
            <div class="h-3 w-28 rounded bg-slate-100" />
            <div class="mt-5 h-8 w-16 rounded-lg bg-slate-100" />
            <div class="mt-3 h-3 w-36 rounded bg-slate-100" />
          </div>
        </template>
        <template v-else>
          <article class="stat-card">
            <div class="flex items-start justify-between">
              <div>
                <p class="stat-label">Active orders</p>
                <p class="stat-value">{{ processingOrders.length + dispatchedOrders.length }}</p>
              </div>
              <span class="stat-icon bg-blue-50 text-blue-700"><ShoppingBag class="h-5 w-5" /></span>
            </div>
            <p class="stat-footnote"><span class="status-dot bg-amber-500" />{{ processingOrders.length }} currently processing</p>
          </article>

          <article class="stat-card">
            <div class="flex items-start justify-between">
              <div>
                <p class="stat-label">Active transit bookings</p>
                <p class="stat-value">{{ dashboard?.active_bookings?.length || 0 }}</p>
              </div>
              <span class="stat-icon bg-emerald-50 text-emerald-700"><Compass class="h-5 w-5" /></span>
            </div>
            <p class="stat-footnote"><span class="status-dot bg-emerald-500" />Your active ride and dispatch requests</p>
          </article>

          <article class="stat-card sm:col-span-2 xl:col-span-1">
            <div class="flex items-start justify-between">
              <div>
                <p class="stat-label">Referral network</p>
                <p class="stat-value">{{ dashboard?.referral?.total_referrals || 0 }}</p>
              </div>
              <span class="stat-icon bg-violet-50 text-violet-700"><Users class="h-5 w-5" /></span>
            </div>
            <p class="stat-footnote"><span class="status-dot bg-violet-500" />{{ dashboard?.referral?.successful_rewards || 0 }} successful rewards</p>
          </article>
        </template>
      </section>

      <!-- Main dashboard tabs -->
      <section class="space-y-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="section-eyebrow">Your workspace</p>
            <h2 class="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Manage your activity</h2>
          </div>
          <div class="tab-list" role="tablist" aria-label="Dashboard sections">
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'orders'"
              :class="{ 'tab-active': activeTab === 'orders' }"
              class="tab-button"
              @click="activeTab = 'orders'"
            >
              <ShoppingBag class="h-4 w-4" />
              <span>Orders</span>
              <span class="tab-count">{{ processingOrders.length + dispatchedOrders.length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'transit'"
              :class="{ 'tab-active': activeTab === 'transit' }"
              class="tab-button"
              @click="activeTab = 'transit'"
            >
              <Compass class="h-4 w-4" />
              <span>Transit</span>
              <span class="tab-count">{{ dashboard?.active_bookings?.length || 0 }}</span>
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'history'"
              :class="{ 'tab-active': activeTab === 'history' }"
              class="tab-button"
              @click="activeTab = 'history'"
            >
              <History class="h-4 w-4" />
              <span>History</span>
            </button>
          </div>
        </div>

        <!-- Orders tab -->
        <div v-if="activeTab === 'orders'" class="space-y-5">
          <section class="content-card">
            <div class="card-heading">
              <div class="flex items-center gap-3">
                <span class="section-icon bg-amber-50 text-amber-700"><Box class="h-5 w-5" /></span>
                <div>
                  <h3 class="font-bold text-slate-900">Processing &amp; preparing</h3>
                  <p class="mt-0.5 text-xs text-slate-500">Orders being prepared by the store</p>
                </div>
              </div>
              <NuxtLink to="/customer/orders" class="text-link">
                View all <ArrowUpRight class="h-4 w-4" />
              </NuxtLink>
            </div>

            <div v-if="pending && !dashboard?.order_history?.length" class="space-y-3 py-2">
              <div v-for="n in 2" :key="n" class="skeleton-row" />
            </div>
            <div v-else-if="processingOrders.length === 0" class="empty-state">
              <span class="empty-icon bg-amber-50 text-amber-700"><Box class="h-6 w-6" /></span>
              <h4>No orders processing</h4>
              <p>Your recent store purchases will appear here while being prepared.</p>
            </div>

            <div v-else class="divide-y divide-slate-100">
              <article v-for="order in processingOrders" :key="order.id" class="order-row">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-semibold text-slate-900">Order #{{ order.id }}</p>
                    <span class="status-badge" :class="statusClass(order.status)">{{ order.status }}</span>
                    <span v-if="order.fulfillment_mode === 'vendor'" class="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <Store class="w-3 h-3" /> Vendor delivery
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500">Placed {{ formatDate(order.created_at) }}</p>
                </div>
                <p class="price-pill">₦{{ formatMoney(order.total_price) }}</p>
              </article>
            </div>
          </section>

          <section class="content-card">
            <div class="card-heading">
              <div class="flex items-center gap-3">
                <span class="section-icon bg-emerald-50 text-emerald-700"><Rocket class="h-5 w-5" /></span>
                <div>
                  <h3 class="font-bold text-slate-900">Active dispatches &amp; deliveries</h3>
                  <p class="mt-0.5 text-xs text-slate-500">Orders delivered awaiting your confirmation</p>
                </div>
              </div>
              <NuxtLink to="/customer/orders" class="text-link">
                View all <ArrowUpRight class="h-4 w-4" />
              </NuxtLink>
            </div>

            <div v-if="dispatchedOrders.length === 0" class="empty-state">
              <span class="empty-icon bg-emerald-50 text-emerald-700"><Rocket class="h-6 w-6" /></span>
              <h4>No active dispatches</h4>
              <p>Orders delivered by riders or vendors will appear here for your final confirmation.</p>
            </div>

            <div v-else class="divide-y divide-slate-100">
              <article v-for="order in dispatchedOrders" :key="order.id" class="order-row">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-semibold text-slate-900">Order #{{ order.id }}</p>
                    <span class="status-badge bg-emerald-50 text-emerald-700 ring-emerald-600/20">Delivered</span>
                    <span v-if="order.fulfillment_mode === 'vendor'" class="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <Store class="w-3 h-3" /> Vendor delivery
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500">Please confirm once you have received your items.</p>
                </div>
                <div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <p class="price-pill">₦{{ formatMoney(order.total_price) }}</p>
                  <button 
                      type="button" 
                      class="complete-button" 
                      :disabled="completingOrderIds.has(order.id)"
                      :class="{ 'opacity-50 cursor-not-allowed': completingOrderIds.has(order.id) }"
                      @click="markAsCompleted(order.id)"
                    >
                      <Loader2 v-if="completingOrderIds.has(order.id)" class="h-4 w-4 animate-spin" />
                      <CheckCircle2 v-else class="h-4 w-4" />
                      <span>{{ completingOrderIds.has(order.id) ? 'Confirming...' : 'Mark as received' }}</span>
                    </button>
                  </div>
              </article>
            </div>
          </section>
        </div>

        <!-- Transit tab -->
        <section v-else-if="activeTab === 'transit'" class="content-card">
          <div class="card-heading">
            <div class="flex items-center gap-3">
              <span class="section-icon bg-emerald-50 text-emerald-700"><Compass class="h-5 w-5" /></span>
              <div>
                <h3 class="font-bold text-slate-900">Active transit bookings</h3>
                <p class="mt-0.5 text-xs text-slate-500">Your ride and package dispatch requests</p>
              </div>
            </div>
            <NuxtLink to="/customer/bookings" class="text-link">
              View all <ArrowUpRight class="h-4 w-4" />
            </NuxtLink>
          </div>

          <div v-if="!dashboard?.active_bookings?.length" class="empty-state py-14">
            <span class="empty-icon bg-slate-100 text-slate-500"><Bike class="h-7 w-7" /></span>
            <h4>No active transit bookings</h4>
            <p>Request a ride or send a package to see your active bookings here.</p>
            <button type="button" class="secondary-button mt-2" @click="openBookingModal">
              <Plus class="h-4 w-4" /> Create a booking
            </button>
          </div>

          <div v-else class="divide-y divide-slate-100">
            <article
              v-for="booking in dashboard.active_bookings"
              :key="booking.booking_reference"
              class="order-row"
            >
              <div class="min-w-0 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="type-badge">{{ booking.booking_type }}</span>
                  <span class="font-mono text-xs text-slate-500">Ref: {{ booking.booking_reference }}</span>
                </div>
                <span class="status-badge" :class="statusClass(booking.status)">
                  <span class="status-dot mr-1.5 bg-current" />
                  {{ booking.status }}
                </span>
              </div>
              <p class="price-pill">₦{{ formatMoney(booking.fare_amount) }}</p>
            </article>
          </div>
        </section>

        <!-- History tab -->
        <section v-else class="content-card">
          <div class="card-heading">
            <div class="flex items-center gap-3">
              <span class="section-icon bg-slate-100 text-slate-700"><History class="h-5 w-5" /></span>
              <div>
                <h3 class="font-bold text-slate-900">Completed delivery history</h3>
                <p class="mt-0.5 text-xs text-slate-500">Your delivered and archived orders</p>
              </div>
            </div>
          </div>

          <div v-if="orderHistoryList.length === 0" class="empty-state py-14">
            <span class="empty-icon bg-slate-100 text-slate-500"><History class="h-7 w-7" /></span>
            <h4>No order history yet</h4>
            <p>Successfully delivered and completed orders will be archived here.</p>
          </div>

          <div v-else class="divide-y divide-slate-100">
            <article v-for="order in orderHistoryList" :key="order.id" class="order-row">
              <div class="min-w-0 space-y-1.5">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-slate-900">Order #{{ order.id }}</p>
                  <span class="status-badge" :class="statusClass(order.status)">{{ order.status }}</span>
                  <span v-if="order.fulfillment_mode === 'vendor'" class="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    <Store class="w-3 h-3" /> Vendor delivery
                  </span>
                </div>
                <p v-if="order.rider?.full_name" class="text-xs font-medium text-slate-700">
                  Rider: {{ order.rider.full_name }}
                </p>
                <p class="text-xs text-slate-500">Completed {{ formatDate(order.created_at) }}</p>
              </div>

              <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <p class="price-pill">₦{{ formatMoney(order.total_price) }}</p>
                <button
                  v-if="order.rider?.id"
                  type="button"
                  class="rate-button"
                  @click="openRiderReviewModal(order.rider)"
                >
                  <span aria-hidden="true">★</span> Rate rider
                </button>
                <NuxtLink :to="`/marketplace/order-summary/${order.id}`" class="receipt-button">
                  View receipt
                </NuxtLink>
              </div>
            </article>
          </div>
        </section>
      </section>
    </div>

    <!-- Booking modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="isBookingModalOpen"
          class="modal-backdrop"
          @click.self="isBookingModalOpen = false"
          @keydown.esc="isBookingModalOpen = false"
        >
          <section class="modal-panel max-w-xl" role="dialog" aria-modal="true" aria-labelledby="booking-title">
            <div class="modal-heading">
              <div>
                <span class="modal-kicker">Dispatch hub</span>
                <h2 id="booking-title" class="mt-2 text-xl font-bold text-slate-950">Request a ride or delivery</h2>
                <p class="mt-1 text-sm text-slate-500">Enter the trip details to create your booking.</p>
              </div>
              <button type="button" class="icon-button" aria-label="Close booking modal" @click="isBookingModalOpen = false">
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
              <button
                type="button"
                class="booking-type-button"
                :class="{ 'booking-type-active': bookingTypeTab === 'ride' }"
                @click="bookingTypeTab = 'ride'"
              >
                <Bike class="h-4 w-4" /> Ride
              </button>
              <button
                type="button"
                class="booking-type-button"
                :class="{ 'booking-type-active': bookingTypeTab === 'delivery' }"
                @click="bookingTypeTab = 'delivery'"
              >
                <Package class="h-4 w-4" /> Package
              </button>
            </div>

            <form class="space-y-4" @submit.prevent="handleInstantBooking">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="field-label">
                  Your full name
                  <input v-model="bookingForm.customer_name" type="text" placeholder="John Doe" required class="form-input" />
                </label>
                <label class="field-label">
                  Your phone number
                  <input v-model="bookingForm.customer_phone" type="tel" placeholder="08012345678" required class="form-input" />
                </label>
                <label class="field-label">
                  Pickup address
                  <input v-model="bookingForm.pickup_address" type="text" placeholder="Pickup location" required class="form-input" />
                </label>
                <label class="field-label">
                  Dropoff destination
                  <input v-model="bookingForm.dropoff_address" type="text" placeholder="Destination point" required class="form-input" />
                </label>
              </div>

              <div v-if="bookingTypeTab === 'delivery'" class="space-y-4 border-t border-dashed border-slate-200 pt-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Recipient details</p>
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="field-label">
                    Receiver name
                    <input v-model="bookingForm.receiver_name" type="text" placeholder="Receiver full name" required class="form-input" />
                  </label>
                  <label class="field-label">
                    Receiver phone
                    <input v-model="bookingForm.receiver_phone" type="tel" placeholder="Receiver phone" required class="form-input" />
                  </label>
                </div>
                <label class="field-label">
                  Package description
                  <input v-model="bookingForm.package_description" type="text" placeholder="e.g. Documents envelope, food parcel" required class="form-input" />
                </label>

                <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <label class="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-slate-700">
                    <input
                      v-model="bookingForm.is_cash_on_delivery"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-lime-400"
                    />
                    <span>Collect Cash on Delivery (COD) from receiver</span>
                  </label>
                  <label v-if="bookingForm.is_cash_on_delivery" class="field-label">
                    COD amount to collect (₦)
                    <input
                      v-model.number="bookingForm.cod_amount"
                      type="number"
                      min="100"
                      step="50"
                      required
                      class="form-input bg-white"
                    />
                  </label>
                </div>
              </div>

              <label class="field-label">
                Estimated fare (₦)
                <input v-model.number="bookingForm.fare_amount" type="number" min="500" required class="form-input" />
              </label>

              <div v-if="bookingError" class="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700" role="alert">
                <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
                <span>{{ bookingError }}</span>
              </div>

              <button type="submit" class="primary-submit" :disabled="isBookingSubmitting">
                <Loader2 v-if="isBookingSubmitting" class="h-4 w-4 animate-spin" />
                <span>{{ isBookingSubmitting ? 'Processing dispatch…' : (bookingTypeTab === 'ride' ? 'Request ride now' : 'Dispatch package now') }}</span>
              </button>
            </form>
          </section>
        </div>
      </Transition>
    </Teleport>

    <!-- Global alert modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="alertModal" class="modal-backdrop modal-backdrop-top" @click.self="alertModal = null">
          <section class="modal-panel max-w-sm text-center" role="alertdialog" aria-modal="true">
            <span
              class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
              :class="alertModal.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
            >
              <CheckCircle2 v-if="alertModal.type === 'success'" class="h-7 w-7" />
              <XCircle v-else class="h-7 w-7" />
            </span>
            <div class="space-y-2">
              <h2 class="text-lg font-bold text-slate-950">{{ alertModal.title }}</h2>
              <p class="text-sm leading-6 text-slate-600">{{ alertModal.message }}</p>
            </div>
            <button type="button" class="primary-submit" @click="alertModal = null">Acknowledge</button>
          </section>
        </div>
      </Transition>
    </Teleport>

    <!-- Rider review modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showRiderReviewModal" class="modal-backdrop modal-backdrop-top" @click.self="showRiderReviewModal = false">
          <form class="modal-panel max-w-md" @submit.prevent="submitRiderReview">
            <div class="modal-heading">
              <div>
                <span class="modal-kicker">Courier feedback</span>
                <h2 class="mt-2 text-xl font-bold text-slate-950">Rate your rider</h2>
                <p class="mt-1 truncate text-sm text-slate-500">{{ selectedRider?.full_name }}</p>
              </div>
              <button type="button" class="icon-button" aria-label="Close review modal" @click="showRiderReviewModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>

            <label class="field-label">
              Star rating (1–5)
              <select v-model="riderReviewForm.rating" class="form-input">
                <option :value="5">★★★★★ (5 — Excellent)</option>
                <option :value="4">★★★★ (4 — Very good)</option>
                <option :value="3">★★★ (3 — Good)</option>
                <option :value="2">★★ (2 — Fair)</option>
                <option :value="1">★ (1 — Poor)</option>
              </select>
            </label>

            <label class="field-label">
              Review comment <span class="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
              <textarea
                v-model="riderReviewForm.comment"
                rows="4"
                placeholder="How was the delivery speed and professionalism?"
                class="form-input resize-none"
              />
            </label>

            <button type="submit" class="primary-submit" :disabled="isSubmittingRiderReview">
              <Loader2 v-if="isSubmittingRiderReview" class="h-4 w-4 animate-spin" />
              Submit rider review
            </button>
          </form>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<style scoped>
.dashboard-shell {
  --ink: #101a32;
  --muted: #64748b;
  --line: #e8edf4;
  --lime: #d4f53c;
  background:
    radial-gradient(ellipse at 92% 0%, rgba(212, 245, 60, .10), transparent 28rem),
    #f5f7fb;
}
.hero-panel {
  background: linear-gradient(120deg, #0a1128 0%, #142344 58%, #0c1730 100%);
}
.hero-orb {
  position: absolute;
  z-index: -1;
  border-radius: 9999px;
  filter: blur(1px);
  pointer-events: none;
}
.hero-orb-one {
  width: 22rem;
  height: 22rem;
  right: -7rem;
  top: -12rem;
  background: rgba(212, 245, 60, .12);
}
.hero-orb-two {
  width: 18rem;
  height: 18rem;
  right: 28%;
  bottom: -15rem;
  background: rgba(59, 130, 246, .12);
}
.hero-widget {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: .75rem;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 1rem;
  background: rgba(255,255,255,.07);
  padding: .9rem;
  backdrop-filter: blur(12px);
}
.hero-light-button, .hero-accent-button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  border-radius: .7rem;
  padding: .6rem .75rem;
  font-size: .7rem;
  font-weight: 800;
  transition: background .2s, transform .2s;
}
.hero-light-button { background: white; color: #101a32; }
.hero-light-button:hover { background: #e9edf3; }
.hero-accent-button { background: var(--lime); color: #101a32; }
.hero-accent-button:hover { background: #c6e52e; }
.primary-action, .primary-submit {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  border: 0;
  border-radius: .9rem;
  background: var(--lime);
  padding: .85rem 1.2rem;
  color: #101a32;
  font-size: .78rem;
  font-weight: 800;
  transition: transform .2s, background .2s, box-shadow .2s;
}
.primary-action:hover, .primary-submit:hover { background: #c6e52e; box-shadow: 0 8px 20px rgba(0,0,0,.12); }
.primary-action:active, .primary-submit:active { transform: scale(.98); }
.refresh-action {
  display: inline-flex;
  min-height: 3rem;
  min-width: 3rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,.15);
  border-radius: .9rem;
  background: rgba(255,255,255,.09);
  color: white;
  transition: background .2s;
}
.refresh-action:hover { background: rgba(255,255,255,.17); }
.refresh-action:disabled { cursor: not-allowed; opacity: .55; }
.stat-card, .content-card {
  border: 1px solid var(--line);
  border-radius: 1.25rem;
  background: white;
  box-shadow: 0 2px 10px rgba(15, 23, 42, .025);
}
.stat-card { padding: 1.25rem; transition: box-shadow .2s, transform .2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(15, 23, 42, .07); }
.stat-label, .section-eyebrow {
  color: #77849a;
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
}
.stat-value { margin-top: .65rem; color: #101a32; font-size: 2rem; font-weight: 800; letter-spacing: -.05em; line-height: 1; }
.stat-icon, .section-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: .85rem;
}
.stat-icon { height: 2.65rem; width: 2.65rem; }
.stat-footnote { display: flex; align-items: center; gap: .45rem; margin-top: 1rem; color: #64748b; font-size: .72rem; font-weight: 600; }
.status-dot { display: inline-block; height: .42rem; width: .42rem; flex-shrink: 0; border-radius: 9999px; }
.tab-list {
  display: flex;
  width: 100%;
  gap: .25rem;
  overflow-x: auto;
  border: 1px solid #e8edf4;
  border-radius: .95rem;
  background: #edf1f6;
  padding: .3rem;
}
.tab-button {
  display: inline-flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: .45rem;
  white-space: nowrap;
  border: 0;
  border-radius: .7rem;
  background: transparent;
  padding: .7rem .8rem;
  color: #64748b;
  font-size: .75rem;
  font-weight: 700;
  transition: background .2s, color .2s, box-shadow .2s;
}
.tab-button:hover { color: #101a32; }
.tab-active { background: white; color: #101a32; box-shadow: 0 1px 4px rgba(15,23,42,.08); }
.tab-count { border-radius: 9999px; background: #f1f5f9; padding: .1rem .4rem; color: #64748b; font-size: .65rem; }
.content-card { overflow: hidden; padding: 1.1rem; }
.card-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #edf1f5;
  padding-bottom: 1rem;
}
.section-icon { height: 2.6rem; width: 2.6rem; }
.text-link { display: inline-flex; align-items: center; gap: .3rem; color: #64748b; font-size: .72rem; font-weight: 800; transition: color .2s; }
.text-link:hover { color: #101a32; }
.order-row { display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.1rem .15rem; }
.price-pill {
  flex-shrink: 0;
  border: 1px solid #e8edf4;
  border-radius: .7rem;
  background: #f8fafc;
  padding: .55rem .75rem;
  color: #101a32;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .8rem;
  font-weight: 800;
}
.status-badge, .type-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: .3rem .6rem;
  font-size: .64rem;
  font-weight: 800;
  line-height: 1;
  text-transform: capitalize;
}
.status-badge { box-shadow: inset 0 0 0 1px; }
.type-badge { background: #101a32; color: var(--lime); }
.complete-button, .rate-button, .receipt-button, .secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .4rem;
  border-radius: .7rem;
  padding: .65rem .8rem;
  font-size: .7rem;
  font-weight: 800;
  transition: background .2s, color .2s, transform .2s;
}
.complete-button { background: #e9f9d0; color: #365b08; }
.complete-button:hover { background: #d9f3b1; }
.rate-button { background: #eff8dd; color: #496c12; }
.rate-button:hover { background: #e0f1c0; }
.receipt-button { background: #101a32; color: white; text-decoration: none; }
.receipt-button:hover { background: #1c2c4c; }
.secondary-button { border: 1px solid #dce3ec; background: white; color: #334155; }
.secondary-button:hover { background: #f8fafc; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem 1rem; text-align: center; }
.empty-icon { display: inline-flex; height: 3.5rem; width: 3.5rem; align-items: center; justify-content: center; border-radius: 1.1rem; }
.empty-state h4 { margin-top: 1rem; color: #17233b; font-size: .9rem; font-weight: 800; }
.empty-state p { max-width: 22rem; margin-top: .35rem; color: #8793a5; font-size: .75rem; line-height: 1.5rem; }
.skeleton-row { height: 4.25rem; border-radius: .85rem; background: linear-gradient(90deg,#f1f5f9 25%,#e8edf4 50%,#f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  background: rgba(8, 15, 32, .68);
  padding: 1rem;
  backdrop-filter: blur(6px);
}
.modal-backdrop-top { z-index: 1100; }
.modal-panel {
  display: flex;
  width: 100%;
  max-height: min(90vh, 850px);
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
  border: 1px solid #e8edf4;
  border-radius: 1.5rem;
  background: white;
  padding: 1.25rem;
  box-shadow: 0 25px 80px rgba(0,0,0,.22);
}
.modal-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; border-bottom: 1px solid #edf1f5; padding-bottom: 1rem; }
.modal-kicker { display: inline-flex; border-radius: 9999px; background: #f1f8d9; padding: .35rem .65rem; color: #536c14; font-size: .65rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.icon-button { display: inline-flex; height: 2.4rem; width: 2.4rem; flex-shrink: 0; align-items: center; justify-content: center; border: 0; border-radius: .8rem; background: #f1f5f9; color: #64748b; transition: background .2s; }
.icon-button:hover { background: #e2e8f0; }
.booking-type-button { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border: 0; border-radius: .7rem; background: transparent; padding: .8rem; color: #64748b; font-size: .8rem; font-weight: 800; transition: all .2s; }
.booking-type-active { background: #101a32; color: white; box-shadow: 0 2px 8px rgba(15,23,42,.15); }
.booking-type-active svg { color: var(--lime); }
.field-label { display: flex; flex-direction: column; gap: .5rem; color: #475569; font-size: .7rem; font-weight: 800; }
.form-input { width: 100%; min-height: 2.85rem; border: 1px solid #dfe6ef; border-radius: .8rem; background: #f8fafc; padding: .75rem .9rem; color: #101a32; font-size: .8rem; font-weight: 600; outline: none; transition: border .2s, background .2s, box-shadow .2s; }
.form-input::placeholder { color: #a0aaba; font-weight: 500; }
.form-input:focus { border-color: #829b22; background: white; box-shadow: 0 0 0 3px rgba(212,245,60,.2); }
.primary-submit { width: 100%; min-height: 3.15rem; background: #101a32; color: var(--lime); }
.primary-submit:hover { background: #1c2c4c; }
.primary-submit:disabled { cursor: not-allowed; opacity: .55; box-shadow: none; }
.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-active .modal-panel, .modal-leave-active .modal-panel { transition: transform .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: translateY(10px) scale(.98); }
button:focus-visible, a:focus-visible { outline: 3px solid rgba(132, 204, 22, .55); outline-offset: 3px; }

@media (min-width: 640px) {
  .content-card { padding: 1.5rem; }
  .order-row { flex-direction: row; align-items: center; }
  .modal-panel { padding: 1.75rem; }
}
@media (min-width: 1024px) {
  .content-card { padding: 1.75rem; }
}
@media (max-width: 420px) {
  .tab-button { gap: .3rem; padding: .65rem .45rem; font-size: .68rem; }
  .tab-count { display: none; }
  .hero-widget { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>