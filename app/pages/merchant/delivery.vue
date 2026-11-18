<!-- pages/merchant/delivery.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import {
  Truck,
  Loader2,
  RefreshCw,
  MapPin,
  Phone,
  User,
  Package,
  CheckCircle,
  AlertCircle,
  Save
} from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const headers = () => ({
  'ngrok-skip-browser-warning': 'true',
  ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
})

// ---------------------------------------------------------------- shared UI state
const banner = ref<{ type: 'success' | 'error'; text: string } | null>(null)
let bannerTimer: any = null
const showBanner = (type: 'success' | 'error', text: string) => {
  banner.value = { type, text }
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => { banner.value = null }, 5000)
}
const errorText = (err: any, fallback: string) => err?.data?.detail || fallback

// ---------------------------------------------------------------- delivery preference
interface Preference {
  fulfillment_type: 'platform' | 'self' | 'hybrid'
  allow_nationwide: boolean
  self_delivery_fee: number
  can_self_deliver: boolean
}

const preference = ref<Preference>({
  fulfillment_type: 'platform',
  allow_nationwide: false,
  self_delivery_fee: 0,
  can_self_deliver: true
})
const isLoadingPreference = ref(true)
const isSavingPreference = ref(false)

const options = [
  { value: 'platform', title: 'Aika riders', text: 'Aika riders pick up and deliver every order. Fees follow the distance.' },
  { value: 'self', title: 'I deliver myself', text: 'You deliver every order yourself and set your own delivery charge.' },
  { value: 'hybrid', title: 'Both', text: 'Aika riders for customers in your own hub; you deliver to customers in other hubs.' }
] as const

const usesSelfDelivery = computed(() => preference.value.fulfillment_type !== 'platform')

const loadPreference = async () => {
  isLoadingPreference.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/merchant/shipping-preference`, { headers: headers() })
    if (res?.data) preference.value = res.data
  } catch (err: any) {
    showBanner('error', errorText(err, 'Could not load your delivery settings.'))
  } finally {
    isLoadingPreference.value = false
  }
}

const savePreference = async () => {
  if (isSavingPreference.value) return
  const fee = Number(preference.value.self_delivery_fee)
  if (usesSelfDelivery.value && (Number.isNaN(fee) || fee < 0)) {
    showBanner('error', 'Enter a valid delivery charge (0 or more).')
    return
  }
  isSavingPreference.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/merchant/shipping-preference`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: {
        fulfillment_type: preference.value.fulfillment_type,
        allow_nationwide: preference.value.allow_nationwide,
        self_delivery_fee: usesSelfDelivery.value ? fee : 0
      }
    })
    if (res?.data) preference.value = res.data
    showBanner('success', res?.message || 'Delivery preference saved.')
  } catch (err: any) {
    showBanner('error', errorText(err, 'Could not save your delivery settings.'))
  } finally {
    isSavingPreference.value = false
  }
}

// ---------------------------------------------------------------- self-delivery orders
interface SelfDeliveryOrder {
  order_id: string
  status: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  base_location: string
  items: { name: string; quantity: number; price_at_order: number }[]
  subtotal: number
  delivery_fee: number
  total_price: number
  marked_delivered: boolean
  created_at: string
}

const orders = ref<SelfDeliveryOrder[]>([])
const isLoadingOrders = ref(true)
const busyOrderId = ref<string | null>(null)
let refreshTimer: any = null

const loadOrders = async (silent = false) => {
  if (!silent) isLoadingOrders.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/orders/self-delivery/active`, { headers: headers() })
    orders.value = Array.isArray(res?.orders) ? res.orders : []
  } catch (err: any) {
    if (!silent) showBanner('error', errorText(err, 'Could not load your delivery orders.'))
  } finally {
    isLoadingOrders.value = false
  }
}

const stageOf = (order: SelfDeliveryOrder) => {
  if (order.status === 'paid_unassigned') return { label: 'New order', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  if (order.status === 'processing') return { label: 'Being prepared', color: 'bg-sky-50 text-sky-700 border-sky-200' }
  if (order.marked_delivered) return { label: 'Awaiting customer confirmation', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  return { label: 'Out for delivery', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
}

const runAction = async (order: SelfDeliveryOrder, action: 'acknowledge' | 'dispatch' | 'delivered') => {
  if (busyOrderId.value) return
  busyOrderId.value = order.order_id
  const url = action === 'acknowledge'
    ? `${apiBase}/api/v1/orders/acknowledge/${order.order_id}`
    : `${apiBase}/api/v1/orders/self-delivery/${order.order_id}/${action}`
  try {
    const res: any = await $fetch(url, { method: 'POST', headers: headers() })
    showBanner('success', res?.message || 'Order updated.')
    await loadOrders(true)
  } catch (err: any) {
    showBanner('error', errorText(err, 'That action could not be completed.'))
    await loadOrders(true)
  } finally {
    busyOrderId.value = null
  }
}

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(value || 0)

onMounted(() => {
  loadPreference()
  loadOrders()
  refreshTimer = setInterval(() => loadOrders(true), 30000)
})
onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  clearTimeout(bannerTimer)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-8">
    <div class="mx-auto max-w-5xl space-y-8">

      <header class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A1128] text-[#D4F53C]">
          <Truck class="h-5 w-5" />
        </span>
        <div>
          <h1 class="text-xl font-black text-[#0A1128]">Delivery</h1>
          <p class="text-xs font-medium text-gray-500">Choose who delivers your orders and manage the ones you deliver yourself.</p>
        </div>
      </header>

      <div
        v-if="banner"
        class="flex items-center gap-2 rounded-xl border p-3 text-xs font-bold"
        :class="banner.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'"
      >
        <CheckCircle v-if="banner.type === 'success'" class="h-4 w-4" />
        <AlertCircle v-else class="h-4 w-4" />
        {{ banner.text }}
      </div>

      <!-- Delivery preference -->
      <section class="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 class="text-sm font-black uppercase tracking-wider text-[#0A1128]">Who delivers your orders?</h2>

        <div v-if="isLoadingPreference" class="mt-6 flex items-center gap-2 text-xs font-bold text-gray-400">
          <Loader2 class="h-4 w-4 animate-spin" /> Loading...
        </div>

        <template v-else>
          <p v-if="!preference.can_self_deliver" class="mt-3 rounded-xl bg-sky-50 p-3 text-xs font-bold text-sky-800">
            Restaurant orders are always delivered by Aika riders.
          </p>

          <div class="mt-4 grid gap-3 md:grid-cols-3">
            <label
              v-for="option in options"
              :key="option.value"
              class="cursor-pointer rounded-2xl border p-4 transition"
              :class="[
                preference.fulfillment_type === option.value ? 'border-[#0A1128] bg-[#0A1128]/5' : 'border-gray-200 hover:border-gray-300',
                (!preference.can_self_deliver && option.value !== 'platform') ? 'cursor-not-allowed opacity-40' : ''
              ]"
            >
              <input
                v-model="preference.fulfillment_type"
                type="radio"
                name="fulfillment"
                class="sr-only"
                :value="option.value"
                :disabled="!preference.can_self_deliver && option.value !== 'platform'"
              />
              <p class="text-sm font-black text-[#0A1128]">{{ option.title }}</p>
              <p class="mt-1 text-xs font-medium text-gray-500">{{ option.text }}</p>
            </label>
          </div>

          <div v-if="usesSelfDelivery" class="mt-5 max-w-xs space-y-1.5">
            <label class="text-[10px] font-black uppercase tracking-wider text-gray-400">Your delivery charge (₦)</label>
            <input
              v-model.number="preference.self_delivery_fee"
              type="number"
              min="0"
              step="50"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-bold text-[#0A1128] outline-none focus:border-[#0A1128]"
            />
            <p class="text-[10px] font-medium text-gray-400">0 means free delivery. You keep this charge in addition to the order total.</p>
          </div>

          <label v-if="preference.fulfillment_type === 'platform' && preference.can_self_deliver" class="mt-5 flex items-start gap-3 text-xs font-bold text-[#0A1128]">
            <input v-model="preference.allow_nationwide" type="checkbox" class="mt-0.5 h-4 w-4 accent-emerald-600" />
            <span>
              Accept customers outside my hub
              <span class="block text-[10px] font-medium text-gray-400">Off: customers in other hubs cannot order from you while you use Aika riders only.</span>
            </span>
          </label>

          <button
            type="button"
            :disabled="isSavingPreference"
            class="mt-6 flex items-center gap-2 rounded-xl bg-[#0A1128] px-5 py-3 text-xs font-black text-white shadow-md disabled:bg-gray-400"
            @click="savePreference"
          >
            <Loader2 v-if="isSavingPreference" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            Save delivery settings
          </button>
        </template>
      </section>

      <!-- Orders the vendor delivers itself -->
      <section class="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-black uppercase tracking-wider text-[#0A1128]">Orders you deliver</h2>
            <p class="mt-1 text-xs font-medium text-gray-500">You are paid when the customer confirms delivery (or automatically after 48 hours).</p>
          </div>
          <button type="button" class="flex items-center gap-1.5 text-xs font-black text-gray-500 hover:text-[#0A1128]" @click="loadOrders()">
            <RefreshCw class="h-4 w-4" :class="isLoadingOrders ? 'animate-spin' : ''" /> Refresh
          </button>
        </div>

        <div v-if="isLoadingOrders && !orders.length" class="mt-6 flex items-center gap-2 text-xs font-bold text-gray-400">
          <Loader2 class="h-4 w-4 animate-spin" /> Loading orders...
        </div>

        <div v-else-if="!orders.length" class="mt-6 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs font-bold text-gray-400">
          No orders to deliver right now.
        </div>

        <div v-else class="mt-5 space-y-4">
          <article v-for="order in orders" :key="order.order_id" class="rounded-2xl border border-gray-100 p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-mono text-sm font-black text-[#0A1128]">#{{ order.order_id }}</p>
              <span class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide" :class="stageOf(order).color">
                {{ stageOf(order).label }}
              </span>
            </div>

            <div class="mt-3 grid gap-2 text-xs font-medium text-gray-600 md:grid-cols-2">
              <p class="flex items-center gap-2"><User class="h-3.5 w-3.5 text-gray-400" /> {{ order.customer_name }}</p>
              <p class="flex items-center gap-2"><Phone class="h-3.5 w-3.5 text-gray-400" /> {{ order.customer_phone || 'No phone on file' }}</p>
              <p class="flex items-start gap-2 md:col-span-2"><MapPin class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" /> {{ order.delivery_address }}<span v-if="order.base_location"> · {{ order.base_location }}</span></p>
            </div>

            <ul class="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs font-semibold text-[#0A1128]">
              <li v-for="(item, index) in order.items" :key="index" class="flex items-center justify-between">
                <span class="flex items-center gap-2"><Package class="h-3.5 w-3.5 text-gray-400" /> {{ item.quantity }} × {{ item.name }}</span>
                <span class="font-mono">{{ money(item.price_at_order * item.quantity) }}</span>
              </li>
            </ul>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <div class="text-[11px] font-bold text-gray-500">
                Items {{ money(order.subtotal) }} · Delivery {{ money(order.delivery_fee) }}
                <span class="ml-1 font-black text-[#0A1128]">Total {{ money(order.total_price) }}</span>
              </div>

              <button
                v-if="order.status === 'paid_unassigned'"
                type="button"
                :disabled="busyOrderId === order.order_id"
                class="rounded-xl bg-[#0A1128] px-4 py-2.5 text-xs font-black text-white disabled:bg-gray-400"
                @click="runAction(order, 'acknowledge')"
              >Acknowledge order</button>

              <button
                v-else-if="order.status === 'processing'"
                type="button"
                :disabled="busyOrderId === order.order_id"
                class="flex items-center gap-2 rounded-xl bg-[#84cc16] px-4 py-2.5 text-xs font-black text-[#0A1128] disabled:opacity-50"
                @click="runAction(order, 'dispatch')"
              ><Truck class="h-4 w-4" /> Send out for delivery</button>

              <button
                v-else-if="order.status === 'in_transit' && !order.marked_delivered"
                type="button"
                :disabled="busyOrderId === order.order_id"
                class="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                @click="runAction(order, 'delivered')"
              ><CheckCircle class="h-4 w-4" /> Mark as delivered</button>

              <span v-else class="text-[11px] font-black text-emerald-700">Waiting for the customer to confirm</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
