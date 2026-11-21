<!-- layouts/marketplace.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRouter, useRoute } from '#app'
import { Menu, ShoppingCart, Plus, Minus, X, ArrowRight, ShieldCheck, UtensilsCrossed } from '@lucide/vue'
import { useCart } from '~/composables/useCart'

const router = useRouter()
const route = useRoute()

const authToken = useCookie('auth_token')
const userRole = useCookie('user_role')

const profileId = useCookie('profile_id')

const isAuthenticated = computed(() => !!authToken.value)

// Cart composable and shared drawer state
const { cartItemCount, cartTotal, cartItems, updateQuantity, removeFromCart, fetchServerCart } = useCart()
const isCartDrawerOpen = useState<boolean>('is-global-cart-open', () => false)

const openCart = () => {
  isCartDrawerOpen.value = true
}

// Dynamic Active Path Helpers
const isMarketplaceActive = computed(() => route.path.startsWith('/marketplace'))
const isDashboardActive = computed(() => route.path.includes('/dashboard'))

// Mobile Drawer Control Visibility Matrices
const isMenuOpen = ref<boolean>(false)

const toggleMenu = (): void => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = (): void => {
  isMenuOpen.value = false
}

const handleLogout = async (): Promise<void> => {
  authToken.value = undefined
  userRole.value = undefined
  profileId.value = undefined
  await router.push('/auth/login')
}

const formatCurrency = (value: any): string => {
  const num = parseFloat(value)
  return isNaN(num) ? '₦0' : `₦${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

onMounted(() => {
  if (authToken.value) {
    fetchServerCart()
  }
})

const userRoleLogin = useCookie<string | null>('user_role', {
  default: () => null
})

const dashboardRoute = computed(() => {
  const raw = String(userRoleLogin.value || '').trim().toLowerCase()
  const role = (() => {
    try {
      return decodeURIComponent(raw).replace(/^"+|"+$/g, '').trim()
    } catch {
      return raw.replace(/^"+|"+$/g, '').trim()
    }
  })()

  if (role === 'admin' || role === 'superuser') {
    return '/admin/dashboard'
  }
  if (role === 'staff') {
    return '/staff/dashboard'
  }
  if (role === 'agent') {
    return '/agent/dashboard'
  }
  if (role === 'rider') {
    return '/rider/dashboard'
  }
  if (role === 'individual' || role === 'customer') {
    return '/customer/dashboard'
  }
  return '/merchant/dashboard'
})
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-800 selection:bg-brand-lime selection:text-brand-navy">
    
    <header class="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          
          <!-- BRAND LOGO LINK -->
          <NuxtLink to="/marketplace" class="flex items-center space-x-2.5 group">
              <div class="w-20 flex items-center justify-center transition-transform group-hover:scale-105 p-1.5">
                 <img src="/images/logo.png" alt="WeGofera Logo" class="w-full h-full object-contain">
              </div>
          </NuxtLink>
          
          <!-- DESKTOP NAVIGATION -->
          <nav class="hidden md:flex space-x-8 font-black text-sm text-[#0A1128]">
              <NuxtLink 
                to="/marketplace" 
                :class="[
                  'hover:text-[#84cc16] transition relative',
                  isMarketplaceActive ? 'text-[#84cc16] after:content-[\'\'] after:absolute after:left-0 after:bottom-[-4px] after:w-full after:h-[2px] after:bg-[#84cc16]' : ''
                ]"
              >
                Marketplace
              </NuxtLink>

              <NuxtLink
                  v-if="isAuthenticated"
                  :to="dashboardRoute"
                  :class="[
                    'hover:text-[#84cc16] transition relative',
                    isDashboardActive
                      ? 'text-[#84cc16] after:content-[\'\'] after:absolute after:left-0 after:bottom-[-4px] after:w-full after:h-[2px] after:bg-[#84cc16]'
                      : ''
                  ]"
                >
                  Dashboard
              </NuxtLink>
          </nav>
          
          <!-- DESKTOP RIGHT ACTIONS (CART + AUTH) -->
          <div class="hidden md:flex items-center space-x-4">
              <!-- Header Cart Button with Badge -->
              <button 
                @click="openCart"
                class="relative p-2.5 bg-gray-100 hover:bg-[#0A1128] hover:text-[#D4F53C] text-[#0A1128] rounded-xl transition cursor-pointer outline-none flex items-center justify-center shadow-xs"
                title="View Cart"
              >
                <ShoppingCart class="w-5 h-5" />
                <span v-if="cartItemCount > 0" class="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md">
                  {{ cartItemCount }}
                </span>
              </button>

              <NuxtLink 
                v-if="isAuthenticated" 
                @click="handleLogout"
                class="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-rose-700 transition shadow-md text-sm cursor-pointer"
              >
                Log Out
              </NuxtLink>
              <NuxtLink 
                v-else 
                to="/auth/login" 
                class="bg-[#0A1128] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#D4F53C] hover:text-[#0A1128] transition shadow-md text-sm cursor-pointer"
              >
                Login
              </NuxtLink>
          </div>

          <!-- MOBILE RIGHT ACTIONS (CART + TOGGLE) -->
          <div class="flex items-center space-x-2 md:hidden">
              <button 
                @click="openCart"
                class="relative p-2.5 bg-gray-100 text-[#0A1128] rounded-xl transition cursor-pointer outline-none flex items-center justify-center"
              >
                <ShoppingCart class="w-5 h-5" />
                <span v-if="cartItemCount > 0" class="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                  {{ cartItemCount }}
                </span>
              </button>

              <button 
                @click="toggleMenu" 
                class="text-[#0A1128] focus:outline-none p-2 rounded-xl hover:bg-gray-50 transition cursor-pointer" 
                aria-label="Toggle Menu"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                  </svg>
              </button>
          </div>
      </div>

      <!-- MOBILE BACKDROP SCREEN OVERLAY -->
      <div 
        @click="closeMenu"
        :class="[isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none']"
        class="fixed inset-0 bg-[#0A1128]/40 backdrop-blur-sm transition-opacity duration-300 z-50 md:hidden"
      ></div>

      <!-- MOBILE DRAWERS SIDE BAR MENU -->
      <div 
        :class="[isMenuOpen ? 'translate-x-0' : '-translate-x-full']"
        class="fixed top-0 left-0 h-screen w-72 bg-white z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:hidden"
      >
          <div class="p-6">
              <div class="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
                  <span class="text-xl font-black italic text-[#0A1128]">Ai<span class="text-[#84cc16]">Ka</span></span>
                  <button @click="closeMenu" class="text-gray-400 hover:text-[#0A1128] p-1 rounded-xl hover:bg-gray-50 transition cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
              </div>

              <nav class="space-y-4 flex flex-col font-bold text-gray-600">
                <NuxtLink 
                  @click="closeMenu" 
                  to="/marketplace" 
                  :class="['hover:text-[#84cc16] py-1 transition text-lg font-black', isMarketplaceActive ? 'text-[#84cc16]' : 'text-[#0A1128]']"
                >
                    Marketplace
                </NuxtLink>

                <NuxtLink
                  v-if="isAuthenticated"
                  :to="dashboardRoute"
                  :class="[
                    'hover:text-[#84cc16] transition relative',
                    isDashboardActive
                      ? 'text-[#84cc16] after:content-[\'\'] after:absolute after:left-0 after:bottom-[-4px] after:w-full after:h-[2px] after:bg-[#84cc16]'
                      : ''
                  ]"
                >
                  Dashboard
                </NuxtLink>
              </nav>
          </div>

          <!-- MOBILE BOTTOM CONTEXT AUTH LOCK GATEWAYS -->
          <div class="p-6 border-t border-gray-100 bg-gray-50/50">            
              <NuxtLink 
                v-if="isAuthenticated" 
                @click="handleLogout"
                class="block text-center bg-rose-600 text-white text-xs font-black py-3.5 rounded-xl hover:bg-rose-700 transition shadow-sm cursor-pointer"
              >
                  Log Out Account
              </NuxtLink>
              <NuxtLink 
                v-else 
                @click="closeMenu" 
                to="/auth/login" 
                class="block text-center bg-[#0A1128] text-white py-3.5 rounded-xl font-black hover:bg-[#D4F53C] hover:text-[#0A1128] transition shadow-md cursor-pointer"
              >
                  Login Portal
              </NuxtLink>
          </div>
      </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <!-- GLOBAL CART SLIDE-OUT DRAWER -->
    <Teleport to="body">
      <Transition name="fade">
        <div 
          v-if="isCartDrawerOpen" 
          @click="isCartDrawerOpen = false"
          class="fixed inset-0 bg-[#0A1128]/50 backdrop-blur-sm z-[100000]"
        ></div>
      </Transition>

      <Transition name="slide-right">
        <div 
          v-if="isCartDrawerOpen" 
          class="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[100001] flex flex-col overflow-hidden"
        >
          <div class="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-[#0A1128] text-[#D4F53C] rounded-2xl flex items-center justify-center shadow-md">
                <ShoppingCart class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-sm font-black text-[#0A1128] tracking-tight">Your Order</h2>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{{ cartItemCount }} items selected</p>
              </div>
            </div>
            <button @click="isCartDrawerOpen = false" class="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition cursor-pointer outline-none shadow-xs">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <div v-if="cartItems.length === 0" class="text-center py-24">
              <ShoppingCart class="w-12 h-12 text-gray-200 mx-auto mb-3 stroke-[1.5]" />
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Your cart is currently empty.</p>
            </div>
            
            <div 
                v-for="item in cartItems" 
                :key="item.id" 
                class="flex gap-4 items-center bg-white border border-gray-100/80 p-4 rounded-2xl shadow-xs"
              >
              <div class="w-16 h-16 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center">
                <img v-if="item.image" :src="item.image" class="w-full h-full object-cover" />
                <UtensilsCrossed v-else class="w-6 h-6 text-gray-300 stroke-[1.5]" />
              </div>
              
              <div class="flex-1 min-w-0">
                <h4 class="text-xs font-black text-[#0A1128] truncate">{{ item.name }}</h4>
                <p class="text-xs font-black text-emerald-700 font-mono mt-1">{{ formatCurrency(item.price * item.quantity) }}</p>
              </div>
              
              <div class="flex items-center gap-2.5">
                <div class="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
                  <button @click="updateQuantity(item.id, 'decrement')" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#0A1128] rounded-lg transition outline-none cursor-pointer">
                    <Minus class="w-3 h-3" />
                  </button>
                  <span class="text-[11px] font-black w-4 text-center text-[#0A1128]">{{ item.quantity }}</span>
                  <button @click="updateQuantity(item.id, 'increment')" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#0A1128] rounded-lg transition outline-none cursor-pointer">
                    <Plus class="w-3 h-3" />
                  </button>
                </div>
                
                <button @click="removeFromCart(item.id)" class="text-rose-400 hover:text-rose-600 p-1.5 cursor-pointer border-0 bg-transparent">
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="p-6 border-t border-gray-100 bg-white space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-xs font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
              <span class="text-xl font-black text-[#0A1128] font-mono">{{ formatCurrency(cartTotal) }}</span>
            </div>
            <NuxtLink 
              to="/marketplace/checkout" 
              @click="isCartDrawerOpen = false"
              class="w-full bg-[#0A1128] text-[#D4F53C] font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 block text-center no-underline cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }
</style>