<!-- layouts/admin.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useCookie, useRouter } from '#app'
import { Menu, X, MapPin, LogOut, LayoutDashboard, Store, Users, Bike, Bell, Layers, ShieldAlert, Activity, Megaphone, Navigation, MessageSquare, HelpCircle, Mail, ChevronDown, CheckCheck, Settings, Gift } from '@lucide/vue'
import { useAdminSocket } from '~/composables/useAdminSocket'
import { useWebPush } from '~/composables/useWebPush'

const { registerServiceWorker } = useWebPush()

const isSidebarOpen = ref<boolean>(false)
const isNotificationsOpen = ref<boolean>(false)
const router = useRouter()

const authToken = useCookie('auth_token')
const userRole = useCookie('user_role')

const isAuthenticated = computed(() => !!authToken.value)

// Accordion Collapsible Sections State (Expanded by default)
const openSections = ref({
  operations: true,
  content: true,
  system: true
})

const toggleSection = (section: 'operations' | 'content' | 'system') => {
  openSections.value[section] = !openSections.value[section]
}

// Global Toast Notifications System linked to Admin Socket
const activeNotifications = ref<any[]>([])
const allNotificationHistory = ref<any[]>([])
const hasUnreadDisputes = ref<boolean>(false)
const unreadCount = computed(() => allNotificationHistory.value.filter(n => !n.read).length)

const { isConnected, newOrderAlertPayload, orderCompletedPayload, disputeAlertPayload } = useAdminSocket()

// Helper to record notification into history & trigger toast
const registerNotification = (type: string, message: string, extraData = {}) => {
  const notifItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type,
    message,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false,
    ...extraData
  }

  // Push to persistent drop-down history tray
  allNotificationHistory.value.unshift(notifItem)

  // Push to floating toast queue
  activeNotifications.value.push(notifItem)
}

// Watcher 1: Catch incoming new order alerts
watch(newOrderAlertPayload, (newOrder) => {
  if (!newOrder) return
  registerNotification(
    'order', 
    `<b>New Order #${newOrder.order_id}</b> received from <b>${newOrder.restaurant_name}</b>.`
  )
})

// Watcher 2: Catch delivery completion notifications
watch(orderCompletedPayload, (completedOrder) => {
  if (!completedOrder) return
  registerNotification(
    'completion', 
    completedOrder.message || `Order <b>#${completedOrder.order_reference}</b> has been completed.`
  )
})

// Watcher 3: Catch incoming customer dispute / refund claims (Triggers red glow indicator)
watch(disputeAlertPayload, (dispute) => {
  if (!dispute) return
  hasUnreadDisputes.value = true // Activate red glow on Disputes tab
  registerNotification(
    'dispute', 
    dispute.text || `<b>New Dispute Claim</b> logged for Order <b>#${dispute.order_id}</b>.`
  )
})

const removeNotification = (id: string) => {
  activeNotifications.value = activeNotifications.value.filter(n => n.id !== id)
}

const markAllAsRead = () => {
  allNotificationHistory.value.forEach(n => n.read = true)
}

const clearHistory = () => {
  allNotificationHistory.value = []
  hasUnreadDisputes.value = false
}

// Close notification dropdown when clicking outside
const closeDropdownOnClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('#notification-dropdown-container')) {
    isNotificationsOpen.value = false
  }
}

// Automatically close mobile drawer when navigating to a new route
watch(() => router.currentRoute.value.fullPath, () => {
  isSidebarOpen.value = false
})

onMounted(() => {
  registerServiceWorker('admin')
  if (typeof window !== 'undefined') {
    window.addEventListener('click', closeDropdownOnClickOutside)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', closeDropdownOnClickOutside)
  }
})

const handleLogout = async (): Promise<void> => {
  authToken.value = undefined
  userRole.value = undefined
  await router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 flex flex-col font-sans">
    
    <!-- Admin Top Header Navigation Bar -->
    <header class="bg-[#0A1128]/95 backdrop-blur-md text-white shadow-xl sticky top-0 z-40 w-full border-b border-white/10 transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
        
        <!-- Left: Brand Logo & Title -->
        <NuxtLink to="/admin/dashboard" class="flex items-center space-x-3.5 outline-none group">
          <div class="w-20 flex items-center justify-center transition-transform group-hover:scale-105 p-1.5">
            <img src="/images/logo_white.png" alt="Aika Logo" class="w-full h-full object-contain">
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h1 class="text-xs sm:text-sm font-black tracking-wider uppercase text-white">Aika Admin</h1>
              <span class="bg-[#84cc16]/20 text-[#D4F53C] text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest hidden sm:inline-block border border-[#84cc16]/30">Root</span>
            </div>
            <p class="text-[9px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">Command Control Desk</p>
          </div>
        </NuxtLink>
        
        <!-- Right: Status Badges, Bell Notification Hub & Admin Profile Options -->
        <div class="hidden md:flex items-center space-x-3">
          
          <!-- Live Socket Status Pill -->
          <div class="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-2xl">
            <span :class="isConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400'" class="w-2 h-2 rounded-full inline-block"></span>
            <span class="text-[10px] font-black tracking-wider uppercase" :class="isConnected ? 'text-emerald-300' : 'text-rose-300'">
              {{ isConnected ? 'Socket Live' : 'Reconnecting' }}
            </span>
          </div>

          <!-- Notification Bell Dropdown Hub -->
          <div id="notification-dropdown-container" class="relative">
            <button 
              @click="isNotificationsOpen = !isNotificationsOpen"
              type="button"
              class="relative bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 rounded-2xl text-white transition cursor-pointer outline-none flex items-center justify-center"
              title="Notification Center"
            >
              <Bell class="w-4 h-4 text-gray-300" />
              <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {{ unreadCount }}
              </span>
            </button>

            <!-- Dropdown Tray Box -->
            <transition name="fade">
              <div v-if="isNotificationsOpen" class="absolute right-0 mt-3 w-80 sm:w-96 bg-white text-[#0A1128] rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden z-50 text-left">
                
                <div class="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <h3 class="text-xs font-black uppercase tracking-wider text-[#0A1128]">System Notifications</h3>
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
                      <span :class="item.type === 'dispute' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100'" class="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border">
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

          <!-- Administrator Profile Badge Card -->
          <div class="flex items-center space-x-3 bg-white/5 border border-white/10 pl-3 pr-1.5 py-1 rounded-2xl">
            <div class="text-right">
              <p class="text-[11px] font-black tracking-tight text-white">Administrator</p>
              <p class="text-[9px] text-[#D4F53C] font-bold uppercase tracking-wider">Root Access</p>
            </div>
            <div class="w-7 h-7 rounded-xl bg-[#84cc16] text-[#0A1128] font-black text-xs flex items-center justify-center shadow-md">
              A
            </div>
          </div>

          <!-- Logout Action Button -->
          <button 
            @click="handleLogout"
            type="button"
            class="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all duration-200 border border-rose-500/30 outline-none cursor-pointer flex items-center gap-1.5 group shadow-sm"
            title="Terminate Session"
          >
            <LogOut class="w-3.5 h-3.5 transition group-hover:-translate-x-0.5" />
            <span class="text-[11px] uppercase tracking-wider">Logout</span>
          </button>

        </div>

        <!-- Mobile Drawer Toggle Trigger -->
        <button 
          @click="isSidebarOpen = true" 
          type="button"
          class="md:hidden text-white bg-white/5 border border-white/10 p-2.5 rounded-xl hover:bg-white/10 transition outline-none cursor-pointer flex items-center justify-center shadow-sm" 
          aria-label="Open Mobile Menu"
        >
          <Menu class="w-5 h-5 text-[#84cc16]" />
        </button>

      </div>
    </header>

    <!-- Main Workspace Layout with Desktop Collapsible Sidebar -->
    <div class="flex flex-1 w-full relative">

      <!-- Mobile Slide-Over Sidebar Drawer -->
      <Teleport to="body">
        <transition name="fade">
          <div
            v-if="isSidebarOpen"
            class="fixed inset-0 z-50 md:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Admin Navigation Menu"
          >
            <!-- Backdrop -->
            <div
              class="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-xs"
              @click="isSidebarOpen = false"
            ></div>

            <!-- Drawer Panel -->
            <aside class="relative z-10 w-72 max-w-[82vw] bg-white h-full overflow-y-auto shadow-2xl flex flex-col py-5 space-y-5">
              <div class="px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <img src="/images/logo.png" alt="Aika Logo" class="h-7 w-auto object-contain">
                  <span class="text-xs font-black uppercase tracking-wider text-[#0A1128]">Aika Admin</span>
                </div>
                <button
                  @click="isSidebarOpen = false"
                  type="button"
                  class="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#0A1128] transition cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>

              <div class="space-y-4 px-4" @click="($event.target as HTMLElement)?.closest('a') && (isSidebarOpen = false)">
                <!-- Control Desk -->
                <NuxtLink 
                  to="/admin/dashboard" 
                  class="flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition group text-gray-700 hover:bg-gray-100 hover:text-[#0A1128]"
                  active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white shadow-sm"
                >
                  <LayoutDashboard class="w-4 h-4 text-[#84cc16]" /> Control Desk
                </NuxtLink>

                <!-- SECTION 1: OPERATIONS -->
                <div class="space-y-1">
                  <button @click="toggleSection('operations')" type="button" class="w-full flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest px-3 py-2 cursor-pointer hover:text-gray-600 transition">
                    <span>Operations</span>
                    <ChevronDown :class="{ 'rotate-180': openSections.operations }" class="w-3.5 h-3.5 transition-transform" />
                  </button>
                  <div v-if="openSections.operations" class="space-y-1 pl-2 border-l-2 border-gray-100 ml-2">
                    <NuxtLink to="/admin/merchants" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Store class="w-4 h-4 text-gray-400" /> Merchants
                    </NuxtLink>
                    <NuxtLink to="/admin/staff" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Users class="w-4 h-4 text-gray-400" /> Staff
                    </NuxtLink>
                    <NuxtLink to="/admin/agents" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Users class="w-4 h-4 text-gray-400" /> Agents
                    </NuxtLink>
                    <NuxtLink to="/admin/customers" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Users class="w-4 h-4 text-gray-400" /> Customers
                    </NuxtLink>
                    <NuxtLink to="/admin/riders" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Bike class="w-4 h-4 text-gray-400" /> Riders
                    </NuxtLink>
                    <NuxtLink to="/admin/tracking" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Navigation class="w-4 h-4 text-gray-400" /> Track Map
                    </NuxtLink>
                    <NuxtLink to="/admin/locations" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <MapPin class="w-4 h-4 text-gray-400" /> Coverage Areas
                    </NuxtLink>
                  </div>
                </div>

                <!-- SECTION 2: CONTENT & MARKETING -->
                <div class="space-y-1">
                  <button @click="toggleSection('content')" type="button" class="w-full flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest px-3 py-2 cursor-pointer hover:text-gray-600 transition">
                    <span>Content &amp; Marketing</span>
                    <ChevronDown :class="{ 'rotate-180': openSections.content }" class="w-3.5 h-3.5 transition-transform" />
                  </button>
                  <div v-if="openSections.content" class="space-y-1 pl-2 border-l-2 border-gray-100 ml-2">
                    <NuxtLink to="/admin/reviews" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <MessageSquare class="w-4 h-4 text-gray-400" /> Customer Reviews
                    </NuxtLink>
                    <NuxtLink to="/admin/faqs" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <HelpCircle class="w-4 h-4 text-gray-400" /> Manage FAQs
                    </NuxtLink>
                    <NuxtLink to="/admin/newsletter" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Mail class="w-4 h-4 text-gray-400" /> Newsletter
                    </NuxtLink>
                    <NuxtLink to="/admin/marketing" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Megaphone class="w-4 h-4 text-gray-400" /> Marketing &amp; Promos
                    </NuxtLink>
                    <NuxtLink to="/admin/marketing/broadcasts" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Bell class="w-4 h-4 text-gray-400" /> Push Broadcasting
                    </NuxtLink>
                  </div>
                </div>

                <!-- SECTION 3: FINANCE & SYSTEM -->
                <div class="space-y-1">
                  <button @click="toggleSection('system')" type="button" class="w-full flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest px-3 py-2 cursor-pointer hover:text-gray-600 transition">
                    <span>Finance &amp; Audits</span>
                    <ChevronDown :class="{ 'rotate-180': openSections.system }" class="w-3.5 h-3.5 transition-transform" />
                  </button>
                  <div v-if="openSections.system" class="space-y-1 pl-2 border-l-2 border-gray-100 ml-2">
                    <NuxtLink to="/admin/subscriptions" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Layers class="w-4 h-4 text-gray-400" /> Subscriptions
                    </NuxtLink>
                    <NuxtLink to="/admin/transactions" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Layers class="w-4 h-4 text-gray-400" /> Transactions
                    </NuxtLink>
                    <NuxtLink 
                      to="/admin/disputes" 
                      @click="hasUnreadDisputes = false"
                      class="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition relative" 
                      active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white"
                    >
                      <div class="flex items-center gap-2.5">
                        <ShieldAlert class="w-4 h-4 text-gray-400" /> Disputes &amp; Refunds
                      </div>
                      <span v-if="hasUnreadDisputes" class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shadow-[0_0_10px_rgba(244,63,94,0.9)]"></span>
                    </NuxtLink>
                    <NuxtLink to="/admin/settings/referral" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Gift class="w-4 h-4 text-gray-400" /> Referral Settings
                    </NuxtLink>
                    <NuxtLink to="/admin/settings/delivery-config" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Gift class="w-4 h-4 text-gray-400" /> Delivery Config
                    </NuxtLink>
                    <NuxtLink to="/admin/audits" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                      <Activity class="w-4 h-4 text-gray-400" /> System Audit Logs
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <div v-if="isAuthenticated" class="mt-auto px-4 pt-4 border-t border-gray-100">
                <button
                  @click="isSidebarOpen = false; handleLogout()"
                  type="button"
                  class="w-full bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-black px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut class="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </aside>
          </div>
        </transition>
      </Teleport>
      
      <!-- Desktop Sidebar Aside Component -->
      <aside class="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0 py-6 space-y-6 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
        <div class="space-y-4 px-4">
          
          <!-- Control Desk -->
          <NuxtLink 
            to="/admin/dashboard" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition group text-gray-700 hover:bg-gray-100 hover:text-[#0A1128]"
            active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white shadow-sm"
          >
            <LayoutDashboard class="w-4 h-4 text-[#84cc16]" /> Control Desk
          </NuxtLink>

          <!-- SECTION 1: OPERATIONS -->
          <div class="space-y-1">
            <button @click="toggleSection('operations')" class="w-full flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest px-3 py-2 cursor-pointer hover:text-gray-600 transition">
              <span>Operations</span>
              <ChevronDown :class="{ 'rotate-180': openSections.operations }" class="w-3.5 h-3.5 transition-transform" />
            </button>
            <div v-if="openSections.operations" class="space-y-1 pl-2 border-l-2 border-gray-100 ml-2">
              <NuxtLink to="/admin/merchants" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Store class="w-4 h-4 text-gray-400" /> Merchants
              </NuxtLink>
              <NuxtLink to="/admin/staff" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Users class="w-4 h-4 text-gray-400" /> Staff
              </NuxtLink>
              <NuxtLink to="/admin/agents" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Users class="w-4 h-4 text-gray-400" /> Agents
              </NuxtLink>
              <NuxtLink to="/admin/customers" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Users class="w-4 h-4 text-gray-400" /> Customers
              </NuxtLink>
              <NuxtLink to="/admin/riders" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Bike class="w-4 h-4 text-gray-400" /> Riders
              </NuxtLink>
              <NuxtLink to="/admin/tracking" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Navigation class="w-4 h-4 text-gray-400" /> Track Map
              </NuxtLink>
              <NuxtLink to="/admin/locations" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <MapPin class="w-4 h-4 text-gray-400" /> Coverage Areas
              </NuxtLink>
            </div>
          </div>

          <!-- SECTION 2: CONTENT & MARKETING -->
          <div class="space-y-1">
            <button @click="toggleSection('content')" class="w-full flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest px-3 py-2 cursor-pointer hover:text-gray-600 transition">
              <span>Content &amp; Marketing</span>
              <ChevronDown :class="{ 'rotate-180': openSections.content }" class="w-3.5 h-3.5 transition-transform" />
            </button>
            <div v-if="openSections.content" class="space-y-1 pl-2 border-l-2 border-gray-100 ml-2">
              <NuxtLink to="/admin/reviews" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <MessageSquare class="w-4 h-4 text-gray-400" /> Customer Reviews
              </NuxtLink>
              <NuxtLink to="/admin/faqs" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <HelpCircle class="w-4 h-4 text-gray-400" /> Manage FAQs
              </NuxtLink>
              <NuxtLink to="/admin/newsletter" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Mail class="w-4 h-4 text-gray-400" /> Newsletter
              </NuxtLink>
              <NuxtLink to="/admin/marketing" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Megaphone class="w-4 h-4 text-gray-400" /> Marketing &amp; Promos
              </NuxtLink>
              <NuxtLink to="/admin/marketing/broadcasts" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Bell class="w-4 h-4 text-gray-400" /> Push Broadcasting
              </NuxtLink>
            </div>
          </div>

          <!-- SECTION 3: FINANCE & SYSTEM -->
          <div class="space-y-1">
            <button @click="toggleSection('system')" class="w-full flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest px-3 py-2 cursor-pointer hover:text-gray-600 transition">
              <span>Finance &amp; Audits</span>
              <ChevronDown :class="{ 'rotate-180': openSections.system }" class="w-3.5 h-3.5 transition-transform" />
            </button>
            <div v-if="openSections.system" class="space-y-1 pl-2 border-l-2 border-gray-100 ml-2">
              <NuxtLink to="/admin/subscriptions" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Layers class="w-4 h-4 text-gray-400" /> Subscriptions
              </NuxtLink>
              <NuxtLink to="/admin/transactions" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Layers class="w-4 h-4 text-gray-400" /> Transactions
              </NuxtLink>
              
              <!-- Disputes Tab with Glowing Red Pulse Indicator -->
              <NuxtLink 
                to="/admin/disputes" 
                @click="hasUnreadDisputes = false"
                class="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition relative" 
                active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white"
              >
                <div class="flex items-center gap-2.5">
                  <ShieldAlert class="w-4 h-4 text-gray-400" /> Disputes &amp; Refunds
                </div>
                <span v-if="hasUnreadDisputes" class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shadow-[0_0_10px_rgba(244,63,94,0.9)]"></span>
              </NuxtLink>

              <!-- Platform Settings Links -->
              <NuxtLink to="/admin/settings/referral" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Gift class="w-4 h-4 text-gray-400" /> Referral Settings
              </NuxtLink>

              <NuxtLink to="/admin/settings/delivery-config" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Gift class="w-4 h-4 text-gray-400" /> Delivery Config
              </NuxtLink>

              <NuxtLink to="/admin/audits" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] transition" active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white">
                <Activity class="w-4 h-4 text-gray-400" /> System Audit Logs
              </NuxtLink>
            </div>
          </div>

        </div>

        <div class="mt-auto px-6 pt-6 border-t border-gray-100">
          <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
            <p class="text-[9px] font-black uppercase tracking-widest text-gray-400">System Status</p>
            <p class="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mt-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Operational
            </p>
          </div>
        </div>
      </aside>

      <!-- Main Content Area View Slot -->
      <main class="flex-1 min-w-0 bg-gray-50/50 py-8 px-4 sm:px-8">
        <div class="max-w-6xl mx-auto w-full">
          <slot />
        </div>
      </main>

    </div>

    <!-- Live Admin Real-Time Toast Notification Tray -->
    <div id="admin-notification-tray" class="fixed bottom-6 right-6 z-[999999] w-full max-w-sm space-y-4 px-4 pointer-events-none">
      <TransitionGroup name="notification-slide">
        <div 
          v-for="notif in activeNotifications" 
          :key="notif.id"
          class="w-full bg-white border border-gray-100 shadow-2xl rounded-[24px] overflow-hidden pointer-events-auto border-l-4 border-l-[#84cc16] p-4 flex items-start space-x-3 text-left"
        >
          <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
            <Bell class="w-4 h-4 animate-bounce" />
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[9px] font-black tracking-wider uppercase text-gray-400 block">Live Broadcast Feed</span>
            <p class="text-xs text-gray-700 font-semibold mt-0.5 leading-relaxed" v-html="safeNotificationHtml(notif.message)"></p>
          </div>
          <button @click="removeNotification(notif.id)" class="text-gray-300 hover:text-gray-500 bg-transparent border-0 cursor-pointer outline-none self-start">
            <X class="w-4 h-4" />
          </button>
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