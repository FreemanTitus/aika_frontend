<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import {
  Loader2,
  RefreshCw,
  Star,
  X,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  CalendarDays,
  Store,
  MessageSquareText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from '@lucide/vue'

definePageMeta({
  layout: 'customer',
  middleware: 'auth',
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')

interface VendorInfo {
  id: string
  company_name: string
}

interface OrderItem {
  id: string | number
  total_price: number
  status: string
  created_at: string
  logistics_dispatch__status?: string
  vendor?: VendorInfo
}

interface PaginatedResponse {
  items: OrderItem[]
  count: number
}

const currentPage = ref(1)
const activeTab = ref<'completed' | 'processing'>('completed')

const orderData = ref<PaginatedResponse>({ items: [], count: 0 })
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Vendor review modal state
const showReviewModal = ref(false)
const selectedVendor = ref<VendorInfo | null>(null)
const isSubmittingReview = ref(false)
const reviewForm = ref({
  rating: 5,
  comment: '',
})

// Per-order action state and feedback notification
const completingIds = ref<Record<string, boolean>>({})
const notification = ref<{ message: string; type: 'success' | 'error' } | null>(null)

const showPopup = (message: string, type: 'success' | 'error' = 'success') => {
  notification.value = { message, type }

  setTimeout(() => {
    if (notification.value?.message === message) {
      notification.value = null
    }
  }, 4000)
}

const fetchOrders = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/customer/orders`, {
      method: 'GET',
      query: { page: currentPage.value },
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}),
      },
    })

    orderData.value = res?.data || res || { items: [], count: 0 }
  } catch (err: any) {
    console.error('Orders list fetch error:', err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchOrders()
})

const changePage = (newPage: number) => {
  if (newPage < 1) return
  currentPage.value = newPage
  fetchOrders()
}

const filteredOrders = computed(() => {
  const items = orderData.value?.items || []
  if (!Array.isArray(items)) return []

  if (activeTab.value === 'completed') {
    return items.filter(
      (order) => order.status === 'completed' || order.logistics_dispatch__status,
    )
  }

  return items.filter(
    (order) => order.status === 'processing' || order.status === 'pending',
  )
})

const markAsReceived = async (orderId: string | number) => {
  const stringId = String(orderId)
  completingIds.value[stringId] = true

  try {
    const res: any = await $fetch(
      `${apiBase}/api/v1/customer/orders/${stringId}/complete`,
      {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${authToken.value}`,
        },
      },
    )

    showPopup(res?.message || 'Order successfully marked as completed.', 'success')
    await fetchOrders()
  } catch (err: any) {
    console.error('Failed to complete order', err)
    showPopup(
      err?.data?.detail || err?.data?.message || 'Could not mark order as received.',
      'error',
    )
  } finally {
    completingIds.value[stringId] = false
  }
}

const openReviewModal = (vendor?: VendorInfo) => {
  if (!vendor) return
  selectedVendor.value = vendor
  reviewForm.value = { rating: 5, comment: '' }
  showReviewModal.value = true
}

const submitReview = async () => {
  if (!selectedVendor.value) return
  isSubmittingReview.value = true

  try {
    const res: any = await $fetch(
      `${apiBase}/api/v1/customer/merchant/${selectedVendor.value.id}/review`,
      {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${authToken.value}`,
        },
        body: reviewForm.value,
      },
    )

    showPopup(res?.message || 'Review submitted successfully.', 'success')
    showReviewModal.value = false
  } catch (err: any) {
    console.error('Failed to submit review', err)
    showPopup(err?.data?.detail || 'Could not submit review.', 'error')
  } finally {
    isSubmittingReview.value = false
  }
}

const isOrderCompleted = (order: OrderItem) =>
  order.status === 'completed' || order.logistics_dispatch__status === 'completed'

const orderStatusLabel = (order: OrderItem) => {
  if (activeTab.value === 'processing') return 'Preparing'
  return isOrderCompleted(order) ? 'Completed' : 'In transit'
}

const formatOrderDate = (date: string) => {
  if (!date) return 'Date unavailable'
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : parsed.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

const formatCurrency = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
</script>

<template>
  <div class="orders-page mx-auto w-full max-w-5xl space-y-6 text-left">
    <!-- Feedback banner -->
    <Transition
      enter-active-class="transform transition duration-300 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="notification"
        class="flex items-start justify-between gap-4 rounded-2xl px-4 py-3.5 text-xs font-bold shadow-lg"
        :class="
          notification.type === 'success'
            ? 'border border-emerald-200 bg-emerald-600 text-white'
            : 'border border-rose-200 bg-rose-600 text-white'
        "
        role="status"
        aria-live="polite"
      >
        <span>{{ notification.message }}</span>
        <button
          type="button"
          @click="notification = null"
          class="shrink-0 rounded-lg p-0.5 text-white/80 transition hover:text-white"
          aria-label="Dismiss notification"
        >
          <X :size="16" />
        </button>
      </div>
    </Transition>

    <!-- Page heading -->
    <section class="orders-hero relative overflow-hidden rounded-[28px] bg-[#0A1128] p-6 text-white shadow-xl sm:rounded-[32px] sm:p-8">
      <div class="hero-orb hero-orb-one" />
      <div class="hero-orb hero-orb-two" />

      <div class="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="max-w-xl">
          <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
            <span class="h-1.5 w-1.5 rounded-full bg-[#D4F53C]" />
            <span class="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#D4F53C]">Your activity</span>
          </div>
          <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Orders &amp; purchases</h1>
          <p class="mt-2 max-w-md text-xs leading-relaxed text-slate-300 sm:text-sm">
            Keep track of your marketplace purchases, delivery progress and store experiences.
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            @click="fetchOrders"
            :disabled="pending"
            class="hero-action-button"
            title="Refresh orders"
            aria-label="Refresh orders"
          >
            <RefreshCw :size="16" :class="{ 'animate-spin': pending }" />
          </button>
          <NuxtLink to="/customer/dashboard" class="hero-dashboard-link">
            <ArrowLeft :size="14" />
            Dashboard
          </NuxtLink>
        </div>
      </div>

      <div class="relative z-10 mt-7 grid max-w-[440px] grid-cols-2 gap-3 border-t border-white/10 pt-5">
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Orders on this page</p>
          <p class="mt-1 text-xl font-extrabold tabular-nums text-white">{{ orderData.items.length }}</p>
        </div>
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Total records</p>
          <p class="mt-1 text-xl font-extrabold tabular-nums text-[#D4F53C]">{{ orderData.count }}</p>
        </div>
      </div>
    </section>

    <!-- Category tabs -->
    <section class="rounded-[22px] border border-slate-200/80 bg-white p-1.5 shadow-sm">
      <div class="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          @click="activeTab = 'completed'"
          :aria-pressed="activeTab === 'completed'"
          class="orders-tab"
          :class="{ 'orders-tab-active': activeTab === 'completed' }"
        >
          <span class="tab-icon tab-icon-green">
            <Truck :size="16" />
          </span>
          <span class="min-w-0 text-left">
            <span class="block text-[10px] font-extrabold uppercase tracking-wide sm:text-xs">Dispatched / Active</span>
            <span class="mt-0.5 hidden text-[10px] font-medium opacity-60 sm:block">Orders in delivery or completed</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeTab = 'processing'"
          :aria-pressed="activeTab === 'processing'"
          class="orders-tab"
          :class="{ 'orders-tab-active': activeTab === 'processing' }"
        >
          <span class="tab-icon tab-icon-amber">
            <Clock :size="16" />
          </span>
          <span class="min-w-0 text-left">
            <span class="block text-[10px] font-extrabold uppercase tracking-wide sm:text-xs">Processing</span>
            <span class="mt-0.5 hidden text-[10px] font-medium opacity-60 sm:block">Orders being prepared</span>
          </span>
        </button>
      </div>
    </section>

    <!-- Orders content -->
    <section class="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm sm:rounded-[30px]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
        <div>
          <p class="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Order registry</p>
          <h2 class="mt-1 text-base font-extrabold text-[#0A1128]">
            {{ activeTab === 'completed' ? 'Dispatched orders' : 'Processing orders' }}
          </h2>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold tabular-nums text-slate-600">
          {{ filteredOrders.length }} {{ filteredOrders.length === 1 ? 'order' : 'orders' }}
        </span>
      </div>

      <div class="p-4 sm:p-6">
        <!-- Initial loading -->
        <div
          v-if="pending && !orderData.items.length"
          class="flex min-h-[270px] flex-col items-center justify-center text-center"
        >
          <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[#0A1128]">
            <Loader2 :size="25" class="animate-spin" />
          </span>
          <p class="mt-4 text-xs font-extrabold text-slate-700">Loading your orders</p>
          <p class="mt-1 text-[10px] text-slate-400">Fetching your latest marketplace activity...</p>
        </div>

        <!-- Fetch error -->
        <div
          v-else-if="error && !orderData.items.length"
          class="flex min-h-[270px] flex-col items-center justify-center px-4 text-center"
        >
          <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertCircle :size="25" />
          </span>
          <h3 class="mt-4 text-sm font-extrabold text-[#0A1128]">We couldn't load your orders</h3>
          <p class="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            There was a problem retrieving your order history. Please try again.
          </p>
          <button type="button" @click="fetchOrders" class="retry-button" :disabled="pending">
            <RefreshCw :size="14" :class="{ 'animate-spin': pending }" />
            Try again
          </button>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="filteredOrders.length === 0"
          class="flex min-h-[270px] flex-col items-center justify-center px-4 text-center"
        >
          <span class="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-400">
            <Package :size="28" />
          </span>
          <h3 class="mt-4 text-sm font-extrabold text-[#0A1128]">No orders in this section</h3>
          <p class="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
            No marketplace purchases match this category right now. Your orders will appear here when available.
          </p>
          <NuxtLink to="/marketplace" class="browse-link">
            Explore marketplace <ArrowLeft :size="13" class="rotate-180" />
          </NuxtLink>
        </div>

        <!-- Order cards -->
        <div v-else class="space-y-3">
          <article
            v-for="order in filteredOrders"
            :key="order.id"
            class="order-card"
            :class="activeTab === 'completed' ? 'order-card-dispatched' : 'order-card-processing'"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-extrabold tracking-tight text-[#0A1128]">
                    Order #{{ order.id }}
                  </span>
                  <span
                    class="status-pill"
                    :class="activeTab === 'completed' ? 'status-pill-green' : 'status-pill-amber'"
                  >
                    <span class="status-dot" />
                    {{ orderStatusLabel(order) }}
                  </span>
                </div>

                <div v-if="order.vendor" class="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Store :size="14" class="shrink-0 text-slate-400" />
                  <span class="truncate">{{ order.vendor.company_name }}</span>
                </div>

                <div class="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                  <CalendarDays :size="13" />
                  Placed {{ formatOrderDate(order.created_at) }}
                </div>
              </div>

              <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 sm:min-w-[150px] sm:flex-col sm:items-end sm:gap-1">
                <span class="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Order total</span>
                <span class="text-base font-extrabold tracking-tight text-[#0A1128]">{{ formatCurrency(order.total_price) }}</span>
              </div>
            </div>

            <div class="mt-4 flex flex-col gap-2 border-t border-slate-200/70 pt-4 sm:flex-row">
              <button
                v-if="activeTab === 'completed'"
                type="button"
                @click="markAsReceived(order.id)"
                :disabled="
                  completingIds[order.id] ||
                  order.status === 'completed' ||
                  order.logistics_dispatch__status === 'completed'
                "
                class="receive-button"
                :class="
                  isOrderCompleted(order)
                    ? 'receive-button-done'
                    : 'receive-button-ready'
                "
              >
                <Loader2 v-if="completingIds[order.id]" :size="16" class="animate-spin" />
                <CheckCircle2 v-else :size="16" />
                <span>
                  {{
                    isOrderCompleted(order)
                      ? 'Completed & received'
                      : completingIds[order.id]
                        ? 'Processing...'
                        : 'Mark as received & complete'
                  }}
                </span>
              </button>

              <button
                v-if="activeTab === 'completed' && order.vendor"
                type="button"
                @click="openReviewModal(order.vendor)"
                class="review-button"
                title="Rate vendor"
              >
                <Star :size="15" class="fill-current" />
                Rate vendor
              </button>
            </div>
          </article>
        </div>

        <!-- Pagination -->
        <div
          v-if="orderData && orderData.count > 10"
          class="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-[10px] font-medium text-slate-400">
            Page <span class="font-extrabold text-slate-700">{{ currentPage }}</span>
            <span class="mx-1">·</span>
            {{ orderData.count }} total records
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="changePage(currentPage - 1)"
              :disabled="currentPage === 1 || pending"
              class="pagination-button pagination-previous"
            >
              <ChevronLeft :size="15" />
              Previous
            </button>
            <span class="min-w-9 rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs font-extrabold tabular-nums text-[#0A1128]">
              {{ currentPage }}
            </span>
            <button
              type="button"
              @click="changePage(currentPage + 1)"
              :disabled="pending || orderData.items.length === 0"
              class="pagination-button pagination-next"
            >
              Next
              <ChevronRight :size="15" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <NuxtLink to="/customer/dashboard" class="back-dashboard-link">
      <ArrowLeft :size="15" />
      Back to dashboard
    </NuxtLink>

    <!-- Vendor review modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showReviewModal"
          class="review-modal-backdrop"
          @click.self="showReviewModal = false"
        >
          <form
            @submit.prevent="submitReview"
            class="review-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
          >
            <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div class="min-w-0">
                <span class="inline-flex rounded-full bg-[#F0F7D8] px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#587509]">
                  Your feedback
                </span>
                <h3 id="review-modal-title" class="mt-2 truncate text-lg font-extrabold tracking-tight text-[#0A1128]">
                  Rate this vendor
                </h3>
                <p class="mt-1 truncate text-xs text-slate-500">{{ selectedVendor?.company_name }}</p>
              </div>
              <button
                type="button"
                @click="showReviewModal = false"
                class="modal-close-button"
                aria-label="Close review form"
              >
                <X :size="18" />
              </button>
            </div>

            <div class="space-y-2">
              <label for="vendor-rating" class="field-label">Star rating</label>
              <select
                id="vendor-rating"
                v-model="reviewForm.rating"
                class="review-field"
              >
                <option :value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                <option :value="4">⭐⭐⭐⭐ (4 - Very Good)</option>
                <option :value="3">⭐⭐⭐ (3 - Good)</option>
                <option :value="2">⭐⭐ (2 - Fair)</option>
                <option :value="1">⭐ (1 - Poor)</option>
              </select>
            </div>

            <div class="space-y-2">
              <label for="vendor-comment" class="field-label">
                Review comment <span class="font-medium normal-case tracking-normal text-slate-400">(Optional)</span>
              </label>
              <textarea
                id="vendor-comment"
                v-model="reviewForm.comment"
                rows="4"
                placeholder="Share your experience with this vendor..."
                class="review-field resize-none"
              />
            </div>

            <button
              :disabled="isSubmittingReview"
              type="submit"
              class="submit-review-button"
            >
              <Loader2 v-if="isSubmittingReview" :size="16" class="animate-spin" />
              <MessageSquareText v-else :size="16" />
              {{ isSubmittingReview ? 'Submitting review...' : 'Submit review' }}
            </button>
          </form>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.orders-page {
  --aika-ink: #0a1128;
  --aika-lime: #d4f53c;
}
.orders-hero {
  isolation: isolate;
}
.hero-orb {
  position: absolute;
  z-index: -1;
  border-radius: 999px;
  background: rgb(212 245 60 / 10%);
  filter: blur(2px);
  pointer-events: none;
}
.hero-orb-one {
  top: -95px;
  right: 8%;
  height: 230px;
  width: 230px;
}
.hero-orb-two {
  right: 35%;
  bottom: -145px;
  height: 220px;
  width: 220px;
  background: rgb(59 130 246 / 10%);
}
.hero-action-button {
  display: inline-flex;
  height: 44px;
  width: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 14px;
  background: rgb(255 255 255 / 9%);
  color: white;
  transition: background 160ms ease, transform 160ms ease;
}
.hero-action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgb(255 255 255 / 17%);
}
.hero-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.hero-dashboard-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 14px;
  background: rgb(255 255 255 / 9%);
  padding: 0 15px;
  color: white;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: background 160ms ease;
}
.hero-dashboard-link:hover {
  background: rgb(255 255 255 / 17%);
}
.orders-tab {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  border-radius: 17px;
  padding: 10px 12px;
  color: #64748b;
  transition: all 180ms ease;
}
.orders-tab:hover {
  background: #f8fafc;
  color: var(--aika-ink);
}
.orders-tab-active {
  border-color: #e7ebef;
  background: #fff;
  color: var(--aika-ink);
  box-shadow: 0 4px 12px rgb(15 23 42 / 6%);
}
.tab-icon {
  display: flex;
  height: 36px;
  width: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}
.tab-icon-green {
  background: #ecfdf5;
  color: #059669;
}
.tab-icon-amber {
  background: #fffbeb;
  color: #d97706;
}
.order-card {
  border: 1px solid;
  border-radius: 20px;
  padding: 17px;
  transition: box-shadow 180ms ease, transform 180ms ease;
}
.order-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 9px 22px rgb(15 23 42 / 5%);
}
.order-card-dispatched {
  border-color: #d9eee3;
  background: linear-gradient(125deg, #f2fbf6 0%, #fff 78%);
}
.order-card-processing {
  border-color: #f4e8c9;
  background: linear-gradient(125deg, #fffbf1 0%, #fff 78%);
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.status-pill-green {
  background: #dcfce7;
  color: #166534;
}
.status-pill-amber {
  background: #fef3c7;
  color: #92400e;
}
.status-dot {
  height: 5px;
  width: 5px;
  border-radius: 999px;
  background: currentColor;
}
.receive-button,
.review-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 13px;
  padding: 0 15px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  transition: all 160ms ease;
}
.receive-button {
  flex: 1 1 auto;
}
.receive-button-ready {
  background: #84cc16;
  color: white;
  box-shadow: 0 5px 12px rgb(132 204 22 / 18%);
}
.receive-button-ready:hover:not(:disabled) {
  background: #70b20e;
  transform: translateY(-1px);
}
.receive-button-done {
  background: #e2e8f0;
  color: #64748b;
  cursor: not-allowed;
}
.review-button {
  flex: 0 0 auto;
  background: var(--aika-ink);
  color: var(--aika-lime);
}
.review-button:hover {
  background: #1a2a50;
  transform: translateY(-1px);
}
.pagination-button {
  display: inline-flex;
  min-height: 39px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: 11px;
  padding: 0 11px;
  font-size: 10px;
  font-weight: 800;
  transition: all 160ms ease;
}
.pagination-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.pagination-previous {
  background: #f1f5f9;
  color: #334155;
}
.pagination-previous:hover:not(:disabled) {
  background: #e2e8f0;
}
.pagination-next {
  background: var(--aika-ink);
  color: white;
}
.pagination-next:hover:not(:disabled) {
  background: #1a2a50;
}
.retry-button,
.browse-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 17px;
  border-radius: 12px;
  padding: 11px 15px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  transition: all 160ms ease;
}
.retry-button {
  background: var(--aika-ink);
  color: white;
}
.retry-button:hover:not(:disabled) {
  background: #1a2a50;
}
.retry-button:disabled {
  opacity: 0.5;
}
.browse-link {
  background: #f1f5f9;
  color: var(--aika-ink);
}
.browse-link:hover {
  background: #e2e8f0;
}
.back-dashboard-link {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid #e5eaf0;
  border-radius: 17px;
  background: white;
  color: #475569;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 160ms ease;
}
.back-dashboard-link:hover {
  border-color: var(--aika-ink);
  background: var(--aika-ink);
  color: white;
}
.review-modal-backdrop {
  position: fixed;
  z-index: 9999;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  background: rgb(10 17 40 / 70%);
  padding: 18px;
  backdrop-filter: blur(5px);
}
.review-modal-card {
  width: 100%;
  max-width: 430px;
  border: 1px solid #edf1f5;
  border-radius: 26px;
  background: white;
  padding: 22px;
  text-align: left;
  box-shadow: 0 25px 80px rgb(0 0 0 / 25%);
}
.modal-close-button {
  display: flex;
  height: 37px;
  width: 37px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8edf2;
  border-radius: 12px;
  color: #64748b;
  transition: all 160ms ease;
}
.modal-close-button:hover {
  background: #f1f5f9;
  color: var(--aika-ink);
}
.field-label {
  display: block;
  color: #64748b;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.review-field {
  display: block;
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  background: #f8fafc;
  padding: 12px 13px;
  color: var(--aika-ink);
  font-size: 12px;
  font-weight: 600;
  outline: none;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}
.review-field:focus {
  border-color: #9bbd24;
  background: white;
  box-shadow: 0 0 0 3px rgb(212 245 60 / 20%);
}
.submit-review-button {
  display: flex;
  min-height: 48px;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 14px;
  background: var(--aika-ink);
  color: var(--aika-lime);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 160ms ease;
}
.submit-review-button:hover:not(:disabled) {
  background: #1a2a50;
}
.submit-review-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}
.modal-enter-active .review-modal-card,
.modal-leave-active .review-modal-card {
  transition: transform 200ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .review-modal-card,
.modal-leave-to .review-modal-card {
  transform: translateY(10px) scale(0.98);
}
@media (max-width: 480px) {
  .orders-tab {
    min-height: 60px;
    gap: 7px;
    padding: 8px;
  }
  .tab-icon {
    height: 31px;
    width: 31px;
  }
  .order-card {
    border-radius: 17px;
    padding: 14px;
  }
  .receive-button,
  .review-button {
    width: 100%;
  }
  .review-modal-card {
    border-radius: 22px;
    padding: 19px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
