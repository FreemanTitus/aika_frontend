<!-- components/MerchantSidebar.vue -->
<script setup lang="ts">
import { useRoute, useRouter, useCookie } from '#app'
import { 
  PieChart, 
  Boxes, 
  Truck, 
  PlusCircle, 
  Wallet, 
  Briefcase, 
  UserCog, 
  X, 
  LogOut 
} from '@lucide/vue'

// 1. Reactive State Layer tracking mobile side drawer visibility
const isMenuOpen = defineModel<boolean>('isOpen', { default: false })

const route = useRoute()
const router = useRouter()

// 2. Read cookie properties to identify the active user profile role context
const userRole = useCookie<string | null>('user_role', { default: () => 'business' })
const authToken = useCookie('auth_token')

// Helper validation checker to compute active states matching Nuxt Links
const isRouteActive = (path: string): boolean => {
  return route.path === path
}

// 3. Clear authorization cookies and redirect on Log Out click
const handleLogout = async (): Promise<void> => {
  authToken.value = undefined // Triggers cookie deletion inside the client jar
  userRole.value = null       // Safely clears the active application viewpoint permission boundary
  isMenuOpen.value = false    // Force closes the overlay drawer container element
  await router.push('/login') // Dispatches user back onto credentials gate page
}
</script>

<template>
  <div>
    <!-- Background Overlay Dimmer Shade Component for Mobile viewports -->
    <div 
      @click="isMenuOpen = false"
      :class="[isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none']"
      class="fixed inset-0 bg-[#0A1128]/30 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden"
    ></div>

    <!-- RECONFIGURED VIEWPORT PINNING: Sleek left navigation rail matrix matching platform themes -->
    <aside 
      :class="[isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0']"
      class="fixed top-0 left-0 bottom-0 z-50 w-[80vw] max-w-[280px] bg-white p-5 flex flex-col justify-between shrink-0 h-full border-r border-gray-100/80 transform transition-transform duration-300 ease-out md:sticky md:top-[73px] md:w-64 md:z-10 md:h-[calc(100vh-73px)] md:overflow-y-auto md:border-b-0 md:transition-none"
    >
        <div class="space-y-6">
            <!-- Mobile Drawer Brand Header Close Row -->
            <div class="flex items-center justify-between pb-3 border-b border-gray-50 md:hidden">
                <span class="text-sm font-black uppercase tracking-wider text-[#0A1128]">Control Menu</span>
                <button 
                  @click="isMenuOpen = false" 
                  class="text-gray-400 p-2 hover:bg-gray-50 rounded-xl transition border-0 outline-none focus:outline-none focus:ring-0 cursor-pointer flex items-center justify-center"
                >
                    <X class="w-4 h-4" />
                </button>
            </div>

            <!-- Navigation Context Section Links Matrix -->
            <div class="space-y-1 text-left">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 mb-3">Core Workspace</p>
                
                <!-- Overview Dashboard Node -->
                <NuxtLink 
                  to="/merchant/dashboard" 
                  @click="isMenuOpen = false"
                  :class="[isRouteActive('/merchant/dashboard') ? 'bg-[#D4F53C]/10 text-emerald-800 border-[#D4F53C]/20 font-black' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128] border-transparent font-bold group']"
                  class="flex items-center space-x-3 text-xs p-3 rounded-xl transition border"
                >
                    <PieChart 
                      :class="[isRouteActive('/merchant/dashboard') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-700']" 
                      class="w-4 h-4 transition" 
                    />
                    <span>Overview Dashboard</span>
                </NuxtLink>
                
                <!-- Business Structural Link Options -->
                <template v-if="userRole === 'merchant' || userRole === 'business'">
                    <!-- Inventory Dashboard Node -->
                    <NuxtLink 
                      to="/merchant/inventory" 
                      @click="isMenuOpen = false"
                      :class="[isRouteActive('/merchant/inventory') ? 'bg-[#D4F53C]/10 text-emerald-800 border-[#D4F53C]/20 font-black' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128] border-transparent font-bold group']"
                      class="flex items-center space-x-3 text-xs p-3 rounded-xl transition border"
                    >
                        <Boxes 
                          :class="[isRouteActive('/merchant/inventory') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-700']" 
                          class="w-4 h-4 transition" 
                        />
                        <span>Manage Inventory</span>
                    </NuxtLink>

                    <!-- Active Logistics Waybills Dispatch Node -->
                    <NuxtLink 
                      to="/merchant/orders" 
                      @click="isMenuOpen = false"
                      :class="[isRouteActive('/merchant/orders') ? 'bg-[#D4F53C]/10 text-emerald-800 border-[#D4F53C]/20 font-black' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128] border-transparent font-bold group']"
                      class="flex items-center space-x-3 text-xs p-3 rounded-xl transition border"
                    >
                        <Truck 
                          :class="[isRouteActive('/merchant/orders') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-700']" 
                          class="w-4 h-4 transition" 
                        />
                        <span>Active Orders</span>
                    </NuxtLink>

                    <!-- Catalogue Addition Control Node -->
                    <NuxtLink 
                      to="/merchant/products/create" 
                      @click="isMenuOpen = false"
                      :class="[isRouteActive('/merchant/products/create') ? 'bg-[#D4F53C]/10 text-emerald-800 border-[#D4F53C]/20 font-black' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128] border-transparent font-bold group']"
                      class="flex items-center space-x-3 text-xs p-3 rounded-xl transition border"
                    >
                        <PlusCircle 
                          :class="[isRouteActive('/merchant/products/create') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-700']" 
                          class="w-4 h-4 transition" 
                        />
                        <span>Upload Product</span>
                    </NuxtLink>

                    <!-- Wallet Ledger Node -->
                    <NuxtLink 
                      to="/merchant/wallet" 
                      @click="isMenuOpen = false"
                      :class="[isRouteActive('/merchant/wallet') ? 'bg-[#D4F53C]/10 text-emerald-800 border-[#D4F53C]/20 font-black' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128] border-transparent font-bold group']"
                      class="flex items-center space-x-3 text-xs p-3 rounded-xl transition border"
                    >
                        <Wallet 
                          :class="[isRouteActive('/merchant/wallet') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-700']" 
                          class="w-4 h-4 transition" 
                        />
                        <span>Wallet Settlement</span>
                    </NuxtLink>

                    <!-- Business Identity Update Profile Node -->
                    <NuxtLink 
                      to="/merchant/profile/settings" 
                      @click="isMenuOpen = false"
                      :class="[isRouteActive('/merchant/profile/settings') ? 'bg-[#D4F53C]/10 text-emerald-800 border-[#D4F53C]/20 font-black' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128] border-transparent font-bold group']"
                      class="flex items-center space-x-3 text-xs p-3 rounded-xl transition border"
                    >
                        <Briefcase 
                          :class="[isRouteActive('/merchant/profile/settings') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-700']" 
                          class="w-4 h-4 transition" 
                        />
                        <span>Update Business Profile</span>
                    </NuxtLink>
                </template>

                <!-- Individual Profile Link Node Fallback -->
                <template v-else>
                    <NuxtLink 
                      to="/customer/profile" 
                      @click="isMenuOpen = false"
                      :class="[isRouteActive('/customer/profile') ? 'bg-[#D4F53C]/10 text-emerald-800 border-[#D4F53C]/20 font-black' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0A1128] border-transparent font-bold group']"
                      class="flex items-center space-x-3 text-xs p-3 rounded-xl transition border"
                    >
                        <UserCog 
                          :class="[isRouteActive('/customer/profile') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-700']" 
                          class="w-4 h-4 transition" 
                        />
                        <span>Update Profile</span>
                    </NuxtLink>
                </template>
            </div>
        </div>

        <!-- Communications System Frame / Channels Sync Status Indicator -->
        <div class="space-y-4">
            <div class="p-4 bg-gray-50/70 rounded-2xl border border-gray-100/80 text-left">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Terminal Context</p>
                <div class="flex items-center space-x-2 mt-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse"></span>
                    <span class="text-[11px] font-extrabold text-[#0A1128] tracking-tight">WS Channels Online</span>
                </div>
            </div>

             <!-- Quick Session Actions footer section -->
            <div class="pt-4 border-t border-gray-100 w-full">
                <button 
                  @click="handleLogout" 
                  class="flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-black text-rose-600 hover:bg-rose-50/60 transition w-full group border-0 outline-none focus:outline-none focus:ring-0 cursor-pointer text-left"
                >
                    <LogOut class="w-4 h-4 text-rose-400 group-hover:text-rose-600 transition" />
                    <span>Log Out Account</span>
                </button>
            </div>
        </div>
    </aside>
  </div>
</template>

<style scoped>
/* Hidden default context track styles */
</style>