<!-- layouts/agent.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCookie, useRouter } from '#app'
import { Menu, X, ShieldCheck, LogOut, LayoutDashboard, Store, Users, Bike, Bell, Layers, MessageSquare, HelpCircle, Mail } from '@lucide/vue'
import { useWebPush } from '~/composables/useWebPush'

const { registerServiceWorker } = useWebPush()
onMounted(() => {
  registerServiceWorker('riders') // or 'merchants', 'customers', etc.
})
const isSidebarOpen = ref<boolean>(false)
const router = useRouter()

const authToken = useCookie('auth_token')
const userRole = useCookie('user_role')

const isAuthenticated = computed(() => !!authToken.value)

const handleLogout = async (): Promise<void> => {
  authToken.value = undefined
  userRole.value = undefined
  await router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 flex flex-col font-sans">
    
    <!-- Agent Top Header Navigation Bar -->
    <header class="bg-[#0A1128]/95 backdrop-blur-md text-white shadow-xl sticky top-0 z-40 w-full border-b border-white/10 transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
        
        <!-- Left: Brand Logo & Title -->
        <NuxtLink to="/agent/dashboard" class="flex items-center space-x-3.5 outline-none group">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center text-white shadow-inner border border-white/10 overflow-hidden p-2 group-hover:scale-105 transition duration-300">
            <img src="/images/logo.png" alt="Aika Logo" class="w-full h-full object-contain">
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h1 class="text-xs sm:text-sm font-black tracking-wider uppercase text-white">Aika Agent</h1>
              <span class="bg-[#84cc16]/20 text-[#D4F53C] text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest hidden sm:inline-block border border-[#84cc16]/30">Staff</span>
            </div>
            <p class="text-[9px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">Assigned Operations Desk</p>
          </div>
        </NuxtLink>
        
        <!-- Right: Status Badges & Profile Options -->
        <div class="hidden md:flex items-center space-x-3">
          
          <!-- Static Green Status Pill -->
          <div class="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-2xl">
            <span class="w-2 h-2 rounded-full inline-block bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
            <span class="text-[10px] font-black tracking-wider uppercase text-emerald-300">
              Online
            </span>
          </div>

          <!-- Agent Profile Badge Card -->
          <div class="flex items-center space-x-3 bg-white/5 border border-white/10 pl-3 pr-1.5 py-1 rounded-2xl">
            <div class="text-right">
              <p class="text-[11px] font-black tracking-tight text-white">Support Agent</p>
              <p class="text-[9px] text-[#D4F53C] font-bold uppercase tracking-wider">Scoped Access</p>
            </div>
            <div class="w-7 h-7 rounded-xl bg-[#84cc16] text-[#0A1128] font-black text-xs flex items-center justify-center shadow-md">
              S
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
          class="md:hidden text-white bg-white/5 border border-white/10 p-2.5 rounded-xl hover:bg-white/10 transition border-0 outline-none cursor-pointer flex items-center justify-center shadow-sm" 
          aria-label="Open Mobile Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 text-[#84cc16]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </button>

      </div>
    </header>

    <!-- Mobile Drawer Sidebar Overlay -->
    <div v-if="isSidebarOpen" class="fixed inset-0 z-50 bg-[#0A1128]/80 backdrop-blur-sm md:hidden flex justify-end">
      <div class="w-72 bg-white h-full p-6 space-y-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
        <div class="space-y-6">
          <div class="flex justify-between items-center border-b border-gray-100 pb-4">
            <h2 class="font-black uppercase text-xs tracking-widest text-[#0A1128]">Agent Navigation</h2>
            <button @click="isSidebarOpen = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Mobile Nav Links -->
          <nav class="space-y-1">
            <NuxtLink to="/staff/dashboard" @click="isSidebarOpen = false" class="flex items-center gap-3 px-3 py-3 rounded-none bg-gray-100 text-[#0A1128] font-black text-xs uppercase tracking-wider border-l-4 border-[#84cc16]">
              <LayoutDashboard class="w-4 h-4 text-[#84cc16]" /> Control Desk
            </NuxtLink>
            <NuxtLink to="/staff/merchants" @click="isSidebarOpen = false" class="flex items-center gap-3 px-3 py-3 rounded-none hover:bg-gray-100 text-gray-700 font-black text-xs uppercase tracking-wider transition border-l-4 border-transparent">
              <Store class="w-4 h-4 text-gray-400" /> My Vendors
            </NuxtLink>
            <NuxtLink to="/staff/reviews" @click="isSidebarOpen = false" class="flex items-center gap-3 px-3 py-3 rounded-none hover:bg-gray-100 text-gray-700 font-black text-xs uppercase tracking-wider transition border-l-4 border-transparent">
              <MessageSquare class="w-4 h-4 text-gray-400" /> Customer Reviews
            </NuxtLink>
            <NuxtLink to="/staff/faqs" @click="isSidebarOpen = false" class="flex items-center gap-3 px-3 py-3 rounded-none hover:bg-gray-100 text-gray-700 font-black text-xs uppercase tracking-wider transition border-l-4 border-transparent">
              <HelpCircle class="w-4 h-4 text-gray-400" /> Manage FAQs
            </NuxtLink>
            <NuxtLink to="/staff/newsletter" @click="isSidebarOpen = false" class="flex items-center gap-3 px-3 py-3 rounded-none hover:bg-gray-100 text-gray-700 font-black text-xs uppercase tracking-wider transition border-l-4 border-transparent">
              <Mail class="w-4 h-4 text-gray-400" /> Newsletter
            </NuxtLink>
          </nav>
        </div>

        <div class="pt-4 border-t border-gray-100">
          <button 
            @click="handleLogout(); isSidebarOpen = false"
            class="w-full py-3 bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut class="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>
    </div>

    <!-- Main Workspace Layout with Desktop Sidebar -->
    <div class="flex flex-1 w-full relative">
      
      <!-- Desktop Sidebar Aside Component -->
      <aside class="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0 py-6 space-y-6 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
        <div class="space-y-1">
          <p class="text-[10px] font-black uppercase text-gray-400 tracking-widest px-6 mb-3">Agent Portal</p>
          
          <NuxtLink 
            to="/staff/dashboard" 
            class="flex items-center gap-3 px-6 py-3.5 font-black text-xs uppercase tracking-wider transition group text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] border-l-4 border-transparent"
            active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white border-l-[#84cc16] shadow-sm"
          >
            <LayoutDashboard class="w-4 h-4 text-[#84cc16]" /> Control Desk
          </NuxtLink>

          <NuxtLink 
            to="/staff/merchants" 
            class="flex items-center gap-3 px-6 py-3.5 font-black text-xs uppercase tracking-wider transition group text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] border-l-4 border-transparent"
            active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white border-l-[#84cc16] shadow-sm"
          >
            <Store class="w-4 h-4 text-gray-400 group-hover:text-[#84cc16]" /> My Vendors
          </NuxtLink>

          <NuxtLink 
            to="/staff/reviews" 
            class="flex items-center gap-3 px-6 py-3.5 font-black text-xs uppercase tracking-wider transition group text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] border-l-4 border-transparent"
            active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white border-l-[#84cc16] shadow-sm"
          >
            <MessageSquare class="w-4 h-4 text-gray-400 group-hover:text-[#84cc16]" /> Customer Reviews
          </NuxtLink>

          <NuxtLink 
            to="/staff/faqs" 
            class="flex items-center gap-3 px-6 py-3.5 font-black text-xs uppercase tracking-wider transition group text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] border-l-4 border-transparent"
            active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white border-l-[#84cc16] shadow-sm"
          >
            <HelpCircle class="w-4 h-4 text-gray-400 group-hover:text-[#84cc16]" /> Manage FAQs
          </NuxtLink>

          <NuxtLink 
            to="/staff/newsletter" 
            class="flex items-center gap-3 px-6 py-3.5 font-black text-xs uppercase tracking-wider transition group text-gray-600 hover:bg-gray-100 hover:text-[#0A1128] border-l-4 border-transparent"
            active-class="bg-[#0A1128] text-white hover:bg-[#0A1128] hover:text-white border-l-[#84cc16] shadow-sm"
          >
            <Mail class="w-4 h-4 text-gray-400 group-hover:text-[#84cc16]" /> Newsletter
          </NuxtLink>
        </div>

        <div class="mt-auto px-6 pt-6 border-t border-gray-100">
          <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
            <p class="text-[9px] font-black uppercase tracking-widest text-gray-400">Assigned Node</p>
            <p class="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mt-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Scope
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
</style>