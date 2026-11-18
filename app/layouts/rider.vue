<!-- layouts/rider.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useCookie, useRouter } from '#app'
import { LogOut, User, Settings, ShieldCheck, Map } from '@lucide/vue'
import { useWebPush } from '~/composables/useWebPush'

const { registerServiceWorker } = useWebPush()
onMounted(() => {
  registerServiceWorker('riders') // or 'merchants', 'customers', etc.
})

const router = useRouter()
const authToken = useCookie('auth_token')
const isDropdownOpen = ref(false)

const handleLogout = async (): Promise<void> => {
  authToken.value = undefined
  await router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans bg-gray-50/50 text-[#0A1128]">
    
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-xl mx-auto px-4 py-3 flex justify-between items-center">
          
          <NuxtLink to="/rider/dashboard" class="flex items-center space-x-2">
             <div class="w-20 p-1">
                 <img src="/images/logo.png" alt="Logo" class="w-full h-full object-contain">
              </div>
          </NuxtLink>

          <!-- Dropdown Container -->
          <div class="relative">
              <button @click="isDropdownOpen = !isDropdownOpen" class="flex items-center space-x-3 p-1 rounded-full hover:bg-gray-100 transition cursor-pointer outline-none">
                  <div class="w-9 h-9 bg-[#0A1128] rounded-full flex items-center justify-center text-white shadow-sm">
                      <User class="w-4 h-4" />
                  </div>
              </button>

              <!-- Dropdown Menu -->
              <div v-if="isDropdownOpen" 
                   class="absolute right-0 mt-2 w-52 bg-white rounded-[24px] shadow-2xl border border-gray-100 py-2.5 z-50 animate-in fade-in zoom-in duration-200">
                  <div class="px-4 py-2 border-b border-gray-100">
                      <p class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Rider Command</p>
                  </div>
                  
                  <!-- <NuxtLink to="/rider/map" @click="isDropdownOpen = false" class="flex items-center px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition">
                      <Map class="w-4 h-4 mr-3 text-[#0A1128]" /> Delivery Map
                  </NuxtLink> -->
                  <NuxtLink to="/rider/settings" @click="isDropdownOpen = false" class="flex items-center px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition">
                      <Settings class="w-4 h-4 mr-3 text-gray-400" /> Settings
                  </NuxtLink>
                  <NuxtLink to="/rider/verification" @click="isDropdownOpen = false" class="flex items-center px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition">
                      <ShieldCheck class="w-4 h-4 mr-3 text-gray-400" /> Vetting Status
                  </NuxtLink>
                  
                  <div class="pt-1 mt-1 border-t border-gray-100">
                      <button @click="handleLogout" class="flex w-full items-center px-4 py-3 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 transition cursor-pointer border-0 bg-transparent">
                          <LogOut class="w-4 h-4 mr-3" /> Log Out
                      </button>
                  </div>
              </div>

              <!-- Backdrop for clicking outside -->
              <div v-if="isDropdownOpen" @click="isDropdownOpen = false" class="fixed inset-0 z-40"></div>
          </div>
      </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>
    
  </div>
</template>