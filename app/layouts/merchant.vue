<!-- layouts/merchant.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useCookie, useRouter, useRuntimeConfig } from '#app'
import { Menu, X, ShoppingBag, User, Phone, MapPin, Coins, CheckCircle, Bell, Loader2, Megaphone, Package } from '@lucide/vue'
import MerchantSidebar from '~/components/MerchantSidebar.vue'
import { useVendorSocket } from '~/composables/useVendorSocket'
import { useWebPush } from '~/composables/useWebPush'

const { registerServiceWorker } = useWebPush()

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', closeDropdownOnClickOutside)
  }
})

const isSidebarMenuDrawerOpen = ref<boolean>(false)
const isNotificationsOpen = ref<boolean>(false)
const router = useRouter()

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')
const userRole = useCookie('user_role')
const profileId = useCookie('profile_id')

const isAuthenticated = computed(() => !!authToken.value)

// =========================================================================
// ⚡ GLOBAL WEBSOCKET & NOTIFICATION SYSTEM INTEGRATION
// =========================================================================
const activeNotifications = ref<any[]>([])
const allNotificationHistory = ref<any[]>([])
const unreadCount = computed(() => allNotificationHistory.value.filter(n => !n.read).length)
const processingOrdersMap = ref<Record<string, boolean>>({})

const { latestOrderPayload, approvalStatusPayload, riderAllocationPayload, subscriptionReminderPayload, orderCompletedPayload, broadcastPayload, isConnected } = useVendorSocket(profileId.value || null)

// Helper to record notification into persistent history tray & active toast queue
const registerNotification = (type: string, message: string, extraData = {}) => {
  const notifItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type,
    message,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false, // Explicitly false so it counts as unread
    ...extraData
  }

  // Force reactivity assignment by creating a new array reference
  allNotificationHistory.value = [notifItem, ...allNotificationHistory.value]
  activeNotifications.value.push(notifItem)
}

// Watcher 1: Catch incoming new checkout dispatches instantly
watch(latestOrderPayload, (newOrder) => {
  if (!newOrder) return
  if (activeNotifications.value.some(n => n.order_id === newOrder.order_id)) return
  
  registerNotification(
    'order',
    `New store order <b>#LB-${newOrder.order_id}</b> received from <b>${newOrder.customer_name}</b>.`,
    { order_id: newOrder.order_id, ...newOrder }
  )
})

// Watcher 2: Catch logistical rider attachments instantly
watch(riderAllocationPayload, (newRider) => {
  if (!newRider) return
  registerNotification(
    'rider',
    `Waybill <b>#LB-${newRider.logistics_ref}</b> status shifted to transit. Dispatch operator <b>${newRider.rider_name}</b> is managing delivery.`
  )
})

// Watcher 3: Catch delivery completion notifications instantly
watch(orderCompletedPayload, (completedOrder) => {
  if (!completedOrder) return
  registerNotification(
    'rider',
    `Order <b>#${completedOrder.order_reference}</b>: ${completedOrder.message}`
  )
})

// Watcher 4: Catch incoming platform broadcasts & announcements
watch(broadcastPayload, (broadcast) => {
  if (!broadcast) return
  const title = broadcast.title || 'System Broadcast'
  const text = broadcast.text || broadcast.message || 'New platform update.'
  
  registerNotification(
    'broadcast',
    `<b>${title}</b><br/><span class="text-gray-600 font-normal">${text}</span>`
  )
})

// Watcher 5: Catch subscription expiration and renewal reminders
watch(subscriptionReminderPayload, (reminder) => {
  if (!reminder) return

  const escapeHtml = (str: string) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const title = escapeHtml(reminder.title || 'Subscription Reminder')
  const text = escapeHtml(reminder.message || 'Your vendor subscription requires attention.')
  const isExpired = reminder.reminder_type === 'expired'

  registerNotification(
    'subscription',
    `<b>${title}</b><br/><span class="text-gray-600 font-normal">${text}</span>`,
    {
      reminder_type: reminder.reminder_type,
      url: reminder.url || '/vendor/subscription',
      isExpired,
    }
  )
})

// Watcher 6: Catch vendor profile / store approval status updates
watch(approvalStatusPayload, (approval) => {
  if (!approval) return

  const escapeHtml = (str: string) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const rawStatus = String(approval.status || approval.approval_status || '').toLowerCase()
  const isApproved = rawStatus === 'approved' || rawStatus === 'active' || approval.is_approved === true
  const isRejected = rawStatus === 'rejected' || rawStatus === 'declined' || rawStatus === 'suspended'

  const title = escapeHtml(
    approval.title ||
      (isApproved
        ? 'Store Account Approved'
        : isRejected
          ? 'Store Verification Update'
          : 'Account Status Updated')
  )
  const text = escapeHtml(
    approval.message ||
      approval.reason ||
      (isApproved
        ? 'Your merchant profile is now approved and live on Aika.'
        : 'Your merchant profile approval status has changed.')
  )

  registerNotification(
    'approval',
    `<b>${title}</b><br/><span class="text-gray-600 font-normal">${text}</span>`,
    {
      status: rawStatus,
      isApproved,
      isRejected,
      url: approval.url || '/vendor/profile',
    }
  )
})

const removeNotification = (id: string) => {
  activeNotifications.value = activeNotifications.value.filter(n => n.id !== id)
}

const markAllAsRead = async () => {
  try {
    const rawToken = useCookie('auth_token').value
    if (!rawToken) return

    // Loop through unread notifications and dispatch read updates
    for (const item of allNotificationHistory.value) {
      if (!item.read && item.id.startsWith('broadcast-')) {
        const broadcastId = item.id.replace('broadcast-', '')
        await $fetch(`${apiBase}/api/v1/merchant/notifications/mark-read/${broadcastId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${rawToken}` }
        })
      }
      item.read = true
    }
  } catch (err) {
    console.error("Failed to sync read status:", err)
    // Fallback client-side update
    allNotificationHistory.value.forEach(n => n.read = true)
  }
}

const clearHistory = () => {
  allNotificationHistory.value = []
}

// Close notification dropdown when clicking outside
const closeDropdownOnClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('#notification-dropdown-container')) {
    isNotificationsOpen.value = false
  }
}

const formatMoney = (value: number) => "₦" + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// =========================================================================
// LIVE DJANGO NINJA ACKNOWLEDGMENT INTERACTION
// =========================================================================
const acknowledgeOrderViaAPI = async (orderId: string, notificationId: string) => {
  if (processingOrdersMap.value[orderId]) return
  
  processingOrdersMap.value[orderId] = true
  
  try {
    const rawToken = useCookie('auth_token').value
    if (!rawToken) throw new Error("Authentication credential token missing.")

    const response: any = await $fetch(`${apiBase}/api/v1/orders/acknowledge/${orderId}`, {
      method: 'POST',
      headers: {
         'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}),
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 'success') {
      removeNotification(notificationId)
    }
  } catch (err: any) {
    const fallbackErr = err?.data?.detail || "Could not dispatch state mutation frame."
    alert(`Acknowledge Error: ${fallbackErr}`)
  } finally {
    processingOrdersMap.value[orderId] = false
  }
}

const fetchMerchantNotifications = async () => {
  try {
    const rawToken = useCookie('auth_token').value
    if (!rawToken) return

    const res: any = await $fetch(`${apiBase}/api/v1/merchant/notifications`, {
      method: 'GET',
      headers: {
          'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
        }
    })
    
    if (Array.isArray(res)) {
      allNotificationHistory.value = res
    }
  } catch (err) {
    console.error("Failed to load notifications history:", err)
  }
}

onMounted(() => {
  registerServiceWorker('merchants')
  fetchMerchantNotifications()
  if (typeof window !== 'undefined') {
    window.addEventListener('click', closeDropdownOnClickOutside)
  }
})

const handleLogout = async (): Promise<void> => {
  authToken.value = undefined
  userRole.value = undefined
  profileId.value = undefined
  await router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 flex flex-col font-sans text-left">
    
    <header class="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100/80 sticky top-0 z-40 transition-all duration-300 w-full">
        <div class="w-full px-6 py-4 flex justify-between items-center">
            
            <NuxtLink to="/" class="flex items-center space-x-2.5 outline-none group">
                <div class="w-20 flex items-center justify-center transition-transform group-hover:scale-105 p-1.5">
                    <img src="/images/logo.png" alt="Aika Logo" class="w-full h-full object-contain">
                </div>
            </NuxtLink>
            
            <div class="flex items-center space-x-4">
                <template v-if="isAuthenticated">
                    <div class="hidden md:flex items-center space-x-3">
                        <span 
                          :class="isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'"
                          class="text-[10px] font-black px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider"
                        >
                          <span :class="isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'" class="w-1.5 h-1.5 rounded-full inline-block"></span>
                          {{ isConnected ? 'Live Connection' : 'Offline Engine' }}
                        </span>

                        <!-- Notification Bell Dropdown Hub -->
                        <div id="notification-dropdown-container" class="relative">
                          <button 
                            @click="isNotificationsOpen = !isNotificationsOpen"
                            type="button"
                            class="relative bg-gray-50 hover:bg-gray-100 border border-gray-200 p-2.5 rounded-2xl text-gray-700 transition cursor-pointer outline-none flex items-center justify-center shadow-xs"
                            title="Notification Center"
                          >
                            <Bell class="w-4 h-4 text-gray-600" />
                            <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                              {{ unreadCount }}
                            </span>
                          </button>

                          <!-- Dropdown Tray Box -->
                          <transition name="fade">
                            <div v-if="isNotificationsOpen" class="absolute right-0 mt-3 w-80 sm:w-96 bg-white text-[#0A1128] rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden z-50 text-left">
                              <div class="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                  <h3 class="text-xs font-black uppercase tracking-wider text-[#0A1128]">Notifications</h3>
                                  <span v-if="unreadCount > 0" class="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full">
                                    {{ unreadCount }} new
                                  </span>
                                </div>
                                <div class="flex items-center space-x-2">
                                  <button @click="markAllAsRead" class="text-[10px] font-bold text-indigo-600 hover:underline bg-transparent border-0 cursor-pointer">
                                    Mark read
                                  </button>
                                  <span class="text-gray-300">|</span>
                                  <button @click="clearHistory" class="text-[10px] font-bold text-gray-400 hover:text-rose-600 bg-transparent border-0 cursor-pointer">
                                    Clear
                                  </button>
                                </div>
                              </div>

                              <div class="max-h-80 overflow-y-auto divide-y divide-gray-50">
                                <div v-if="allNotificationHistory.length === 0" class="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                                  No notifications recorded.
                                </div>
                                <div 
                                  v-for="item in allNotificationHistory" 
                                  :key="item.id" 
                                  :class="{ 'bg-gray-50/60': item.read }"
                                  class="p-4 hover:bg-gray-50 transition space-y-1"
                                >
                                  <div class="flex justify-between items-start">
                                    <span class="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-100">
                                      {{ item.type }}
                                    </span>
                                    <span class="text-[10px] text-gray-400 font-mono">{{ item.timestamp }}</span>
                                  </div>
                                  <p class="text-xs text-gray-700 font-semibold leading-relaxed pt-1" v-html="safeNotificationHtml(item.message)"></p>
                                </div>
                              </div>
                            </div>
                          </transition>
                        </div>

                        <span class="text-[11px] bg-gray-50 text-gray-500 font-extrabold px-3 py-2 rounded-xl border border-gray-100 tracking-wider font-mono">
                            ID: {{ profileId || "WF-PENDING" }}
                        </span>
                        <button 
                          @click="handleLogout"
                          type="button"
                          class="bg-[#0A1128] hover:bg-[#84cc16] text-white hover:text-[#0A1128] text-xs font-black px-5 py-2.5 rounded-xl transition duration-200 shadow-md border-0 outline-none cursor-pointer"
                        >
                            Log Out
                        </button>
                    </div>
                </template>
                <template v-else>
                    <div class="hidden md:flex items-center space-x-2">
                        <NuxtLink to="/auth/login" class="text-gray-500 hover:text-[#0A1128] text-xs font-black px-4 py-2.5 transition">
                            Sign In
                        </NuxtLink>
                        <NuxtLink to="/auth/register" class="bg-[#84cc16] text-[#0A1128] text-xs font-black px-5 py-2.5 rounded-xl transition shadow-md">
                            Register Account
                        </NuxtLink>
                    </div>
                </template>

                <button 
                  @click="isSidebarMenuDrawerOpen = true" 
                  type="button"
                  class="md:hidden text-[#0A1128] p-2 rounded-xl hover:bg-gray-50 transition border-0 outline-none cursor-pointer flex items-center justify-center" 
                  aria-label="Toggle Menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                </button>
            </div>
            
        </div>
    </header>

    <div class="flex flex-1 w-full relative">
      
      <MerchantSidebar v-model:isOpen="isSidebarMenuDrawerOpen" />
      
      <main class="flex-1 min-w-0 bg-gray-50/50">
        <div class="max-w-7xl mx-auto w-full">
          <slot />
        </div>
      </main>
    </div>

    <!-- Live Toast Alert Tray -->
    <div id="vendor-notification-tray" class="fixed bottom-6 right-6 z-[999999] w-full max-w-sm space-y-4 px-4 pointer-events-none">
      <TransitionGroup name="notification-slide">
        <div 
          v-for="notif in activeNotifications" 
          :key="notif.id"
          class="w-full bg-white border border-gray-100 shadow-2xl rounded-[24px] overflow-hidden pointer-events-auto border-l-4 border-l-[#84cc16] transition-all duration-300 text-left"
        >
          <!-- Order Toast Template (Enhanced with Itemized Consignment Details) -->
          <div v-if="notif.type === 'order'" class="p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-gray-50 pb-3">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <h3 class="text-xs font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag class="w-4 h-4 text-emerald-600" />
                  <span>New Store Order</span>
                </h3>
              </div>
              <button @click="removeNotification(notif.id)" :disabled="processingOrdersMap[notif.order_id]" class="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer outline-none disabled:opacity-30">
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-3 text-xs">
              <div class="flex justify-between items-baseline bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span class="font-bold uppercase text-gray-400 tracking-wider text-[9px]">Waybill Ref:</span>
                <span class="font-mono font-black text-[#0A1128] text-sm">#LB-{{ notif.order_id }}</span>
              </div>

              <!-- Customer Details -->
              <div class="space-y-2 px-0.5 font-semibold text-gray-600">
                <div class="flex items-start space-x-2">
                  <User class="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span class="text-[9px] text-gray-400 block uppercase tracking-wider">Recipient Name</span>
                    <p class="text-gray-900 mt-0.5 font-bold">{{ notif.customer_name }}</p>
                  </div>
                </div>

                <div class="flex items-start space-x-2">
                  <Phone class="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span class="text-[9px] text-gray-400 block uppercase tracking-wider">Contact Number</span>
                    <p class="text-gray-900 mt-0.5 font-mono font-bold">{{ notif.customer_phone }}</p>
                  </div>
                </div>

                <div class="flex items-start space-x-2">
                  <MapPin class="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span class="text-[9px] text-gray-400 block uppercase tracking-wider">Delivery Destination</span>
                    <p class="text-gray-600 mt-0.5 leading-relaxed text-[11px] font-medium">{{ notif.delivery_address }}</p>
                  </div>
                </div>
              </div>

              <!-- Itemized Consignment Summary Box -->
              <div v-if="notif.items_summary && notif.items_summary.length > 0" class="bg-gray-50/80 border border-gray-100 p-3 rounded-xl space-y-1.5">
                <span class="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Package class="w-3 h-3 text-[#84cc16]" /> Consignment Items:
                </span>
                <ul class="space-y-1 pl-4 list-disc text-gray-800 font-bold text-xs">
                  <li v-for="(itemStr, idx) in notif.items_summary" :key="idx">
                    {{ itemStr }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-50 flex items-center justify-between">
              <div>
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Merchant Subtotal</span>
                <p class="text-base font-black text-emerald-600 font-mono">{{ formatMoney(notif.total_price) }}</p>
              </div>
              
              <button 
                @click="acknowledgeOrderViaAPI(notif.order_id, notif.id)"
                :disabled="processingOrdersMap[notif.order_id]"
                class="bg-[#0A1128] hover:bg-opacity-95 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-sm transition transform active:scale-95 cursor-pointer border-0 outline-none flex items-center gap-1.5"
              >
                <Loader2 v-if="processingOrdersMap[notif.order_id]" class="w-3.5 h-3.5 animate-spin" />
                <span>{{ processingOrdersMap[notif.order_id] ? 'Saving...' : 'Acknowledge Order' }}</span>
              </button>
            </div>
          </div>

          <!-- Broadcast / Announcement Toast Template -->
          <div v-else-if="notif.type === 'broadcast'" class="p-4 flex items-start space-x-3">
            <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
              <Megaphone class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-[9px] font-black tracking-wider uppercase text-indigo-600 block">Platform Announcement</span>
              <p class="text-xs text-gray-800 font-semibold mt-0.5 leading-relaxed" v-html="safeNotificationHtml(notif.message)"></p>
            </div>
            <button @click="removeNotification(notif.id)" class="text-gray-300 hover:text-gray-500 bg-transparent border-0 cursor-pointer outline-none self-start">
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Subscription Reminder Toast Template -->
          <div v-else-if="notif.type === 'subscription'" class="p-4 flex items-start space-x-3">
            <div
              :class="notif.isExpired ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'"
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            >
              <Bell class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0 space-y-2">
              <span
                :class="notif.isExpired ? 'text-rose-600' : 'text-amber-600'"
                class="text-[9px] font-black tracking-wider uppercase block"
              >
                {{ notif.isExpired ? 'Subscription Expired' : 'Subscription Alert' }}
              </span>
              <p class="text-xs text-gray-800 font-semibold leading-relaxed" v-html="safeNotificationHtml(notif.message)"></p>
              <NuxtLink
                :to="notif.url || '/vendor/subscription'"
                @click="removeNotification(notif.id)"
                class="inline-block bg-[#0A1128] hover:bg-[#84cc16] text-white hover:text-[#0A1128] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition"
              >
                Renew / Manage Plan
              </NuxtLink>
            </div>
            <button @click="removeNotification(notif.id)" class="text-gray-300 hover:text-gray-500 bg-transparent border-0 cursor-pointer outline-none self-start">
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Vendor Approval Status Toast Template -->
          <div v-else-if="notif.type === 'approval'" class="p-4 flex items-start space-x-3">
            <div
              :class="
                notif.isApproved
                  ? 'bg-emerald-50 text-emerald-600'
                  : notif.isRejected
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-600'
              "
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            >
              <CheckCircle class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0 space-y-2">
              <span
                :class="
                  notif.isApproved
                    ? 'text-emerald-600'
                    : notif.isRejected
                      ? 'text-rose-600'
                      : 'text-amber-600'
                "
                class="text-[9px] font-black tracking-wider uppercase block"
              >
                {{ notif.isApproved ? 'Account Approved' : notif.isRejected ? 'Verification Notice' : 'Approval Update' }}
              </span>
              <p class="text-xs text-gray-800 font-semibold leading-relaxed" v-html="safeNotificationHtml(notif.message)"></p>
              <NuxtLink
                v-if="notif.url"
                :to="notif.url"
                @click="removeNotification(notif.id)"
                class="inline-block bg-[#0A1128] hover:bg-[#84cc16] text-white hover:text-[#0A1128] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition"
              >
                View Details
              </NuxtLink>
            </div>
            <button @click="removeNotification(notif.id)" class="text-gray-300 hover:text-gray-500 bg-transparent border-0 cursor-pointer outline-none self-start">
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Standard Logistics / Completion Toast Template -->
          <div v-else class="p-4 flex items-start space-x-3">
            <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
              <Bell class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-[9px] font-black tracking-wider uppercase text-gray-400 block">Fleet Routing Update</span>
              <p class="text-xs text-gray-700 font-semibold mt-0.5 leading-relaxed" v-html="safeNotificationHtml(notif.message)"></p>
            </div>
            <button @click="removeNotification(notif.id)" class="text-gray-300 hover:text-gray-500 bg-transparent border-0 cursor-pointer outline-none self-start">
              <X class="w-4 h-4" />
            </button>
          </div>

        </div>
      </TransitionGroup>
    </div>

  </div>
</template>

<style scoped>
.notification-slide-enter-active,
.notification-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.notification-slide-enter-from {
  transform: translateY(24px) scale(0.95);
  opacity: 0;
}
.notification-slide-leave-to {
  transform: translateX(40px);
  opacity: 0;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>