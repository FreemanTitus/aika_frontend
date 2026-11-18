<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCookie, useRouter, useRoute } from '#app'
import {
  LayoutDashboard,
  LifeBuoy,
  Store,
  LogOut,
  X,
  Menu,
  ShoppingBag,
  Bike,
  User,
  Gift,
  ArrowRight,
  ShoppingCart,
  Plus,
  Minus,
  UtensilsCrossed,
  Bell,
} from '@lucide/vue'
import { useWebPush } from '~/composables/useWebPush'
import { useCart } from '~/composables/useCart'
import { useCustomerSocket } from '~/composables/useCustomerSocket'
import { safeNotificationHtml } from '~/utils/safeHtml'
import SupportChatWidget from '~/components/SupportChatWidget.vue'


const { registerServiceWorker } = useWebPush()

const isMenuOpen = ref<boolean>(false)
const isNotificationsOpen = ref<boolean>(false)
const desktopNotifRef = ref<HTMLElement | null>(null)
const mobileNotifRef = ref<HTMLElement | null>(null)

const router = useRouter()
const route = useRoute()

const authToken = useCookie('auth_token')
const userRole = useCookie('user_role')
const profileId = useCookie('profile_id')

const isAuthenticated = computed(() => !!authToken.value)

const { connect, disconnect, notifications, unreadCount, markAllRead, clearNotifications } = useCustomerSocket()

const {
  cartItemCount,
  cartTotal,
  cartItems,
  updateQuantity,
  removeFromCart,
  fetchServerCart,
} = useCart()

const isCartDrawerOpen = useState<boolean>('is-global-cart-open', () => false)

const handleOutsideClick = (event: MouseEvent) => {
  if (!isNotificationsOpen.value) return
  const target = event.target as Node
  const insideDesktop = desktopNotifRef.value?.contains(target)
  const insideMobile = mobileNotifRef.value?.contains(target)
  if (!insideDesktop && !insideMobile) {
    isNotificationsOpen.value = false
  }
}

onMounted(() => {
  registerServiceWorker('customers')
  document.addEventListener('click', handleOutsideClick)

  if (authToken.value) {
    fetchServerCart()
    connect()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  disconnect()
})

const toggleNotifications = () => {
  isNotificationsOpen.value = !isNotificationsOpen.value
}

const formatNotifTime = (ts?: string): string => {
  if (!ts) return ''
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

const openCart = () => {
  isNotificationsOpen.value = false
  isCartDrawerOpen.value = true
}

const failedCartImages = ref<Record<string, boolean>>({})

const resolveCartItemImage = (item: any): string => {
  if (!item || failedCartImages.value[String(item.id)]) return ''
  const rawImg =
    item.image ||
    item.image_url ||
    item.product_image ||
    item.food_image ||
    item.thumbnail ||
    ''
  if (!rawImg) return ''
  return typeof getMediaUrl === 'function' ? (getMediaUrl(rawImg) || '') : rawImg
}

const handleCartImageError = (itemId: string | number) => {
  failedCartImages.value[String(itemId)] = true
}

const isMarketplaceActive = computed(() => route.path.startsWith('/marketplace'))
const isDashboardActive = computed(() => route.path.includes('/customer/dashboard'))

const toggleMenu = (): void => {
  isNotificationsOpen.value = false
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = (): void => {
  isMenuOpen.value = false
}

const handleLogout = async (): Promise<void> => {
  disconnect()
  isNotificationsOpen.value = false
  authToken.value = undefined
  userRole.value = undefined
  profileId.value = undefined
  await router.push('/auth/login')
}

const formatCurrency = (value: any): string => {
  const num = parseFloat(value)
  return isNaN(num)
    ? '₦0'
    : `₦${num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
}

const customerNavigation = [
  {
    label: 'All Orders',
    to: '/customer/orders',
    icon: ShoppingBag,
    tone: 'emerald',
  },
  {
    label: 'All Bookings',
    to: '/customer/bookings',
    icon: Bike,
    tone: 'lime',
  },
  {
    label: 'Support & Disputes',
    to: '/customer/support',
    icon: LifeBuoy,
    tone: 'amber',
  },
  {
    label: 'Referrals',
    to: '/customer/referrals',
    icon: Gift,
    tone: 'purple',
  },
  {
    label: 'Profile Settings',
    to: '/customer/profile',
    icon: User,
    tone: 'slate',
  },
]
</script>

<template>
  <div class="customer-shell min-h-screen flex flex-col bg-[#F5F7FA] text-[#0A1128]">
    <!-- Global header -->
    <header class="customer-header sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div class="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/marketplace" class="brand-link group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#B8DC2F]">
          <span class="flex h-11 w-[112px] items-center justify-center">
            <img src="/images/logo.png" alt="Aika Logo" class="max-h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]">
          </span>
        </NuxtLink>

        <nav class="hidden h-full items-center gap-8 md:flex" aria-label="Main navigation">
          <NuxtLink
            to="/marketplace"
            class="top-nav-link"
            :class="{ 'top-nav-link-active': isMarketplaceActive }"
          >
            Marketplace
          </NuxtLink>
          <NuxtLink
            v-if="isAuthenticated"
            to="/customer/dashboard"
            class="top-nav-link"
            :class="{ 'top-nav-link-active': isDashboardActive }"
          >
            My Dashboard
          </NuxtLink>
        </nav>

        <div class="hidden items-center gap-3 md:flex">
          <!-- Desktop Notifications Bell -->
          <div v-if="isAuthenticated" ref="desktopNotifRef" class="relative">
            <button
              type="button"
              @click.stop="toggleNotifications"
              class="cart-trigger"
              title="Notifications"
              aria-label="View notifications"
              :aria-expanded="isNotificationsOpen"
            >
              <Bell :size="19" />
              <span v-if="unreadCount > 0" class="cart-count">{{ unreadCount }}</span>
            </button>

            <Transition name="mobile-menu">
              <div
                v-if="isNotificationsOpen"
                class="notif-popover absolute right-0 mt-3 w-[360px] overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-2xl"
              >
                <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <div class="flex items-center gap-2.5">
                    <span class="text-[11px] font-black uppercase tracking-[0.12em] text-[#0A1128]">
                      Notifications
                    </span>
                    <span
                      v-if="unreadCount > 0"
                      class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700"
                    >
                      {{ unreadCount }} new
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      v-if="unreadCount > 0"
                      type="button"
                      @click="markAllRead"
                      class="cursor-pointer border-0 bg-transparent text-indigo-600 transition hover:text-indigo-800"
                    >
                      Mark read
                    </button>
                    <span v-if="unreadCount > 0 && notifications.length > 0" class="text-slate-200">|</span>
                    <button
                      v-if="notifications.length > 0"
                      type="button"
                      @click="clearNotifications"
                      class="cursor-pointer border-0 bg-transparent text-slate-400 transition hover:text-rose-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div class="max-h-[340px] divide-y divide-slate-100 overflow-y-auto">
                  <div v-if="notifications.length === 0" class="px-5 py-10 text-center">
                    <Bell :size="24" class="mx-auto mb-2 text-slate-300" />
                    <p class="text-xs font-extrabold text-slate-600">No notifications yet</p>
                    <p class="mt-0.5 text-[11px] text-slate-400">
                      Order updates and announcements will appear here.
                    </p>
                  </div>

                  <div
                    v-for="notif in notifications"
                    :key="notif.id"
                    @click="notif.read = true"
                    :class="[!notif.read ? 'bg-emerald-50/30' : 'bg-white']"
                    class="cursor-pointer px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div class="mb-2 flex items-center justify-between gap-2">
                      <span class="rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                        {{ notif.type.replace(/_/g, ' ') }}
                      </span>
                      <span class="font-mono text-[11px] font-medium text-slate-400">
                        {{ formatNotifTime(notif.timestamp) }}
                      </span>
                    </div>
                    <div
                      class="text-xs font-semibold leading-relaxed text-[#0A1128]"
                      v-html="safeNotificationHtml(notif.message)"
                    />
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            @click="openCart"
            class="cart-trigger"
            title="View Cart"
            aria-label="View shopping cart"
          >
            <ShoppingCart :size="19" />
            <span v-if="cartItemCount > 0" class="cart-count">{{ cartItemCount }}</span>
          </button>

          <button
            v-if="isAuthenticated"
            type="button"
            @click="handleLogout"
            class="logout-button"
          >
            <LogOut :size="15" />
            <span>Logout</span>
          </button>
          <NuxtLink v-else to="/auth/login" class="login-button">
            Portal Login
          </NuxtLink>
        </div>

        <div class="flex items-center gap-2 md:hidden">
          <!-- Mobile Notifications Bell -->
          <div v-if="isAuthenticated" ref="mobileNotifRef" class="relative">
            <button
              type="button"
              @click.stop="toggleNotifications"
              class="cart-trigger cart-trigger-mobile"
              title="Notifications"
              aria-label="View notifications"
              :aria-expanded="isNotificationsOpen"
            >
              <Bell :size="19" />
              <span v-if="unreadCount > 0" class="cart-count">{{ unreadCount }}</span>
            </button>

            <Transition name="mobile-menu">
              <div
                v-if="isNotificationsOpen"
                class="notif-popover fixed left-3 right-3 top-[84px] z-[70] overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-2xl"
              >
                <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-black uppercase tracking-[0.12em] text-[#0A1128]">
                      Notifications
                    </span>
                    <span
                      v-if="unreadCount > 0"
                      class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700"
                    >
                      {{ unreadCount }} new
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      v-if="unreadCount > 0"
                      type="button"
                      @click="markAllRead"
                      class="cursor-pointer border-0 bg-transparent text-indigo-600"
                    >
                      Mark read
                    </button>
                    <span v-if="unreadCount > 0 && notifications.length > 0" class="text-slate-200">|</span>
                    <button
                      v-if="notifications.length > 0"
                      type="button"
                      @click="clearNotifications"
                      class="cursor-pointer border-0 bg-transparent text-slate-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div class="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
                  <div v-if="notifications.length === 0" class="px-4 py-10 text-center">
                    <Bell :size="24" class="mx-auto mb-2 text-slate-300" />
                    <p class="text-xs font-extrabold text-slate-600">No notifications yet</p>
                    <p class="mt-0.5 text-[11px] text-slate-400">
                      Order updates and announcements will appear here.
                    </p>
                  </div>

                  <div
                    v-for="notif in notifications"
                    :key="notif.id"
                    @click="notif.read = true"
                    :class="[!notif.read ? 'bg-emerald-50/30' : 'bg-white']"
                    class="cursor-pointer px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div class="mb-2 flex items-center justify-between gap-2">
                      <span class="rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                        {{ notif.type.replace(/_/g, ' ') }}
                      </span>
                      <span class="font-mono text-[11px] font-medium text-slate-400">
                        {{ formatNotifTime(notif.timestamp) }}
                      </span>
                    </div>
                    <div
                      class="text-xs font-semibold leading-relaxed text-[#0A1128]"
                      v-html="safeNotificationHtml(notif.message)"
                    />
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            @click="openCart"
            class="cart-trigger cart-trigger-mobile"
            title="View Cart"
            aria-label="View shopping cart"
          >
            <ShoppingCart :size="19" />
            <span v-if="cartItemCount > 0" class="cart-count">{{ cartItemCount }}</span>
          </button>
          <button
            type="button"
            @click="toggleMenu"
            class="mobile-menu-trigger"
            :aria-expanded="isMenuOpen"
            aria-label="Toggle Menu"
          >
            <X v-if="isMenuOpen" :size="21" />
            <Menu v-else :size="21" />
          </button>
        </div>
      </div>

      <!-- Mobile navigation -->
      <Transition name="mobile-menu">
        <div v-if="isMenuOpen" class="mobile-menu-panel md:hidden">
          <div class="mobile-menu-inner">
            <div class="mb-5 flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Navigation</span>
              <button type="button" @click="closeMenu" class="icon-button" aria-label="Close menu">
                <X :size="18" />
              </button>
            </div>

            <div class="mb-5">
              <button
                v-if="isAuthenticated"
                type="button"
                @click="handleLogout(); closeMenu()"
                class="mobile-logout"
              >
                <LogOut :size="16" />
                Log Out Account
              </button>
              <NuxtLink
                v-else
                to="/auth/login"
                @click="closeMenu"
                class="mobile-login"
              >
                Login Portal
              </NuxtLink>
            </div>

            <nav class="space-y-1" aria-label="Mobile main navigation">
              <NuxtLink
                to="/marketplace"
                @click="closeMenu"
                class="mobile-nav-link"
                :class="{ 'mobile-nav-link-active': isMarketplaceActive }"
              >
                <Store :size="17" />
                Marketplace
                <ArrowRight :size="15" class="ml-auto opacity-40" />
              </NuxtLink>
              <NuxtLink
                v-if="isAuthenticated"
                to="/customer/dashboard"
                @click="closeMenu"
                class="mobile-nav-link"
                :class="{ 'mobile-nav-link-active': isDashboardActive }"
              >
                <LayoutDashboard :size="17" />
                My Dashboard
                <ArrowRight :size="15" class="ml-auto opacity-40" />
              </NuxtLink>
            </nav>

            <div
              v-if="isAuthenticated && route.path.startsWith('/customer')"
              class="mt-6 border-t border-slate-100 pt-5"
            >
              <p class="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                Customer hub
              </p>
              <nav class="space-y-1" aria-label="Customer navigation">
                <NuxtLink
                  v-for="item in customerNavigation"
                  :key="item.to"
                  :to="item.to"
                  @click="closeMenu"
                  class="mobile-nav-link"
                  :class="{ 'mobile-nav-link-active': route.path.includes(item.to) }"
                >
                  <component :is="item.icon" :size="17" />
                  {{ item.label }}
                  <ArrowRight :size="15" class="ml-auto opacity-40" />
                </NuxtLink>
              </nav>
            </div>
          </div>
        </div>
      </Transition>
      <Transition name="fade">
        <button
          v-if="isMenuOpen"
          type="button"
          @click="closeMenu"
          class="mobile-menu-backdrop md:hidden"
          aria-label="Close navigation menu"
        />
      </Transition>
    </header>

    <!-- Page content -->
    <main class="mx-auto w-full max-w-[1440px] flex-1 px-3 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div
        v-if="isAuthenticated && route.path.startsWith('/customer')"
        class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8"
      >
        <!-- Desktop customer navigation -->
        <aside class="hidden lg:sticky lg:top-[100px] lg:block">
          <div class="sidebar-card">
            <div class="mb-4 flex items-center justify-between px-2">
              <div>
                <p class="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Your account</p>
                <h2 class="mt-1 text-sm font-extrabold text-[#0A1128]">Customer hub</h2>
              </div>
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F7D8] text-[#66880A]">
                <LayoutDashboard :size="17" />
              </span>
            </div>

            <nav class="space-y-1.5" aria-label="Customer sidebar">
              <NuxtLink
                v-for="item in customerNavigation"
                :key="item.to"
                :to="item.to"
                class="sidebar-link"
                :class="{ 'sidebar-link-active': route.path.includes(item.to) }"
              >
                <span class="sidebar-icon" :class="`tone-${item.tone}`">
                  <component :is="item.icon" :size="17" />
                </span>
                <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <ArrowRight :size="15" class="sidebar-arrow" />
              </NuxtLink>
            </nav>

            <div class="mt-5 rounded-2xl bg-[#0A1128] p-4 text-white">
              <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4F53C] text-[#0A1128]">
                <LifeBuoy :size="17" />
              </div>
              <p class="text-xs font-bold">Need a hand?</p>
              <p class="mt-1 text-[11px] leading-relaxed text-slate-300">
                Our support team is here to help with your orders and bookings.
              </p>
              <NuxtLink
                to="/customer/support"
                class="mt-3 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#D4F53C] hover:gap-3"
              >
                Get support <ArrowRight :size="13" />
              </NuxtLink>
            </div>
          </div>
        </aside>

        <section class="min-w-0">
          <slot />
        </section>
      </div>

      <div v-else>
        <slot />
      </div>
    </main>

    <!-- Global cart drawer -->
    <Teleport to="body">
      <Transition name="fade">
        <button
          v-if="isCartDrawerOpen"
          type="button"
          @click="isCartDrawerOpen = false"
          class="cart-backdrop"
          aria-label="Close shopping cart"
        />
      </Transition>

      <Transition name="slide-right">
        <aside
          v-if="isCartDrawerOpen"
          class="cart-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart"
        >
          <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-6">
            <div class="flex items-center gap-3">
              <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A1128] text-[#D4F53C] shadow-sm">
                <ShoppingCart :size="20" />
              </span>
              <div>
                <h2 class="text-base font-extrabold tracking-tight text-[#0A1128]">Your order</h2>
                <p class="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {{ cartItemCount }} {{ cartItemCount === 1 ? 'item' : 'items' }} selected
                </p>
              </div>
            </div>
            <button
              type="button"
              @click="isCartDrawerOpen = false"
              class="icon-button"
              aria-label="Close cart"
            >
              <X :size="18" />
            </button>
          </div>

          <div class="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
            <div v-if="cartItems.length === 0" class="flex min-h-[300px] flex-col items-center justify-center text-center">
              <span class="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-300">
                <ShoppingCart :size="27" />
              </span>
              <p class="text-sm font-extrabold text-slate-700">Your cart is empty</p>
              <p class="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-400">
                Explore the marketplace and add something you love.
              </p>
              <NuxtLink
                to="/marketplace"
                @click="isCartDrawerOpen = false"
                class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0A1128] px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white transition hover:bg-[#1B2B50]"
              >
                Browse marketplace <ArrowRight :size="14" />
              </NuxtLink>
            </div>

            <article
              v-for="item in cartItems"
              :key="item.id"
              class="cart-item"
            >
              <div class="flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                <img
                  v-if="resolveCartItemImage(item)"
                  :src="resolveCartItemImage(item)"
                  :alt="item.name"
                  @error="handleCartImageError(item.id)"
                  class="h-full w-full object-cover"
                >
                <UtensilsCrossed v-else class="h-6 w-6 text-slate-300" />
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="truncate text-xs font-extrabold text-[#0A1128]">{{ item.name }}</h3>
                <p class="mt-1.5 text-xs font-extrabold text-emerald-700">
                  {{ formatCurrency(item.price * item.quantity) }}
                </p>
                <p class="mt-0.5 text-[10px] text-slate-400">
                  {{ formatCurrency(item.price) }} each
                </p>
              </div>

              <div class="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  @click="removeFromCart(item.id)"
                  class="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Remove item"
                >
                  <X :size="15" />
                </button>
                <div class="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    @click="updateQuantity(item.id, 'decrement')"
                    class="quantity-button"
                    aria-label="Decrease quantity"
                  >
                    <Minus :size="12" />
                  </button>
                  <span class="w-5 text-center text-[11px] font-extrabold tabular-nums text-[#0A1128]">
                    {{ item.quantity }}
                  </span>
                  <button
                    type="button"
                    @click="updateQuantity(item.id, 'increment')"
                    class="quantity-button"
                    aria-label="Increase quantity"
                  >
                    <Plus :size="12" />
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div class="space-y-4 border-t border-slate-100 bg-white p-5 sm:p-6">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Subtotal</span>
              <span class="text-xl font-extrabold tracking-tight text-[#0A1128]">{{ formatCurrency(cartTotal) }}</span>
            </div>
            <NuxtLink
              to="/marketplace/checkout"
              @click="isCartDrawerOpen = false"
              class="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0A1128] px-5 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[#D4F53C] shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-[#17264A]"
            >
              Proceed to checkout <ArrowRight :size="16" />
            </NuxtLink>
          </div>
        </aside>
      </Transition>
    </Teleport>

    <SupportChatWidget />

  </div>
</template>

<style scoped>
.customer-shell {
  --aika-ink: #0a1128;
  --aika-lime: #d4f53c;
}

.top-nav-link {
  position: relative;
  display: inline-flex;
  height: 100%;
  align-items: center;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 180ms ease;
}
.top-nav-link:hover,
.top-nav-link-active {
  color: var(--aika-ink);
}
.top-nav-link-active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--aika-lime);
  content: '';
}

.cart-trigger,
.mobile-menu-trigger {
  position: relative;
  display: inline-flex;
  height: 42px;
  width: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8edf2;
  border-radius: 14px;
  background: #f8fafc;
  color: var(--aika-ink);
  cursor: pointer;
  transition: all 180ms ease;
}
.cart-trigger:hover {
  border-color: var(--aika-ink);
  background: var(--aika-ink);
  color: var(--aika-lime);
}
.cart-count {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  height: 19px;
  min-width: 19px;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  border-radius: 999px;
  background: #e11d48;
  padding: 0 4px;
  color: white;
  font-size: 9px;
  font-weight: 900;
}
.logout-button,
.login-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 13px;
  padding: 0 17px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 180ms ease;
}
.logout-button {
  border: 1px solid #ffe4e6;
  background: #fff1f2;
  color: #e11d48;
  cursor: pointer;
}
.logout-button:hover {
  border-color: #e11d48;
  background: #e11d48;
  color: white;
}
.login-button {
  background: var(--aika-ink);
  color: white;
}
.login-button:hover {
  background: var(--aika-lime);
  color: var(--aika-ink);
}
.mobile-menu-trigger:hover {
  background: #eef2f7;
}
.mobile-menu-panel {
  position: absolute;
  z-index: 60;
  top: 100%;
  right: 0;
  left: 0;
  border-top: 1px solid #eef2f7;
  background: white;
  box-shadow: 0 18px 35px rgb(10 17 40 / 12%);
}
.mobile-menu-inner {
  max-height: calc(100dvh - 76px);
  overflow-y: auto;
  padding: 22px 20px 28px;
}
.mobile-menu-backdrop {
  position: fixed;
  z-index: -1;
  inset: 76px 0 0;
  width: 100%;
  border: 0;
  background: rgb(10 17 40 / 35%);
  backdrop-filter: blur(3px);
}
.mobile-nav-link {
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 12px;
  border-radius: 13px;
  padding: 0 13px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  transition: all 160ms ease;
}
.mobile-nav-link:hover,
.mobile-nav-link-active {
  background: #f1f5f9;
  color: var(--aika-ink);
}
.mobile-nav-link-active {
  box-shadow: inset 3px 0 #b8dc2f;
}
.mobile-logout,
.mobile-login {
  display: flex;
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 13px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.mobile-logout {
  background: #e11d48;
  color: white;
}
.mobile-login {
  background: var(--aika-ink);
  color: white;
}
.sidebar-card {
  border: 1px solid #e8edf2;
  border-radius: 25px;
  background: white;
  padding: 19px 15px 15px;
  box-shadow: 0 8px 25px rgb(15 23 42 / 3%);
}
.sidebar-link {
  display: flex;
  min-height: 54px;
  align-items: center;
  gap: 11px;
  border: 1px solid transparent;
  border-radius: 15px;
  padding: 7px 10px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  transition: all 180ms ease;
}
.sidebar-link:hover {
  border-color: #e8edf2;
  background: #f8fafc;
  color: var(--aika-ink);
}
.sidebar-link-active {
  border-color: var(--aika-ink);
  background: var(--aika-ink);
  color: white;
  box-shadow: 0 7px 16px rgb(10 17 40 / 12%);
}
.sidebar-icon {
  display: flex;
  height: 35px;
  width: 35px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #f1f5f9;
  color: #64748b;
  transition: all 180ms ease;
}
.tone-emerald { background: #ecfdf5; color: #059669; }
.tone-lime { background: #f4fbdc; color: #719b0b; }
.tone-amber { background: #fffbeb; color: #d97706; }
.tone-purple { background: #faf5ff; color: #9333ea; }
.tone-slate { background: #f1f5f9; color: #475569; }
.sidebar-link-active .sidebar-icon {
  background: rgb(255 255 255 / 10%);
  color: var(--aika-lime);
}
.sidebar-arrow {
  flex: 0 0 auto;
  color: #94a3b8;
  transition: transform 180ms ease;
}
.sidebar-link:hover .sidebar-arrow {
  transform: translateX(3px);
}
.sidebar-link-active .sidebar-arrow {
  color: var(--aika-lime);
}
.icon-button {
  display: inline-flex;
  height: 36px;
  width: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8edf2;
  border-radius: 12px;
  background: white;
  color: #64748b;
  transition: all 160ms ease;
}
.icon-button:hover {
  background: #f1f5f9;
  color: var(--aika-ink);
}
.cart-backdrop {
  position: fixed;
  z-index: 100000;
  inset: 0;
  width: 100%;
  border: 0;
  background: rgb(10 17 40 / 55%);
  backdrop-filter: blur(4px);
}
.cart-drawer {
  position: fixed;
  z-index: 100001;
  top: 0;
  right: 0;
  display: flex;
  height: 100%;
  height: 100dvh;
  width: 100%;
  max-width: 440px;
  flex-direction: column;
  overflow: hidden;
  background: white;
  text-align: left;
  box-shadow: -20px 0 60px rgb(10 17 40 / 16%);
}
.cart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #edf1f5;
  border-radius: 18px;
  background: white;
  padding: 12px;
  box-shadow: 0 4px 14px rgb(15 23 42 / 3%);
}
.quantity-button {
  display: flex;
  height: 25px;
  width: 25px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #64748b;
  transition: all 150ms ease;
}
.quantity-button:hover {
  background: var(--aika-ink);
  color: white;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 220ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  transform: translateY(-8px);
  opacity: 0;
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