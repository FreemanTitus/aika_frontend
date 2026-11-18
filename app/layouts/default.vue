<!-- layouts/default.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle2, AlertCircle } from '@lucide/vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const isMenuOpen = ref<boolean>(false)

const toggleMenu = (): void => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = (): void => {
  isMenuOpen.value = false
}

const isAuthenticated = ref<boolean>(false) 
const newsletterEmail = ref('')

// Custom Feedback Modal State
const feedbackModal = ref({
  isOpen: false,
  title: '',
  message: '',
  type: 'success' as 'success' | 'error'
})

const showFeedback = (title: string, message: string, type: 'success' | 'error' = 'success') => {
  feedbackModal.value = { isOpen: true, title, message, type }
}

const handleNewsletterSubscribe = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/public/newsletter/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: { email: newsletterEmail.value }
    })
    showFeedback("Subscribed!", res?.message || "Thank you for subscribing to our newsletter!")
    newsletterEmail.value = ''
  } catch (err: any) {
    showFeedback("Subscription Failed", err?.data?.detail || "Could not subscribe. Please try again.", "error")
  }
}

// Dynamic year computation
const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-800 selection:bg-brand-lime selection:text-brand-navy">
    
    <header class="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          
          <NuxtLink to="/" class="flex items-center space-x-2.5 group">
              <div class="w-20 flex items-center justify-center transition-transform group-hover:scale-105 p-1.5">
                 <img src="/images/logo.png" alt="Aika Logo" class="w-full h-full object-contain">
              </div>
          </NuxtLink>
          
          <nav class="hidden md:flex space-x-8 font-black text-sm text-gray-500">
              <NuxtLink to="/#how-it-works" class="hover:text-[#0A1128] transition">How it Works</NuxtLink>
              <NuxtLink to="/marketplace" class="hover:text-[#0A1128] transition">Marketplace</NuxtLink>
              <NuxtLink to="/#services" class="hover:text-[#0A1128] transition">Our Services</NuxtLink>
              <NuxtLink to="/#pricing" class="hover:text-[#0A1128] transition">Pricing</NuxtLink>
          </nav>
          
          <div class="hidden md:block">
              <NuxtLink 
                v-if="isAuthenticated" 
                to="/dashboard" 
                class="bg-[#0A1128] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-opacity-90 transition shadow-md text-sm"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink 
                v-else 
                to="/auth/login" 
                class="bg-[#0A1128] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#D4F53C] hover:text-[#0A1128] transition shadow-md text-sm cursor-pointer"
              >
                Portal Login
              </NuxtLink>
          </div>

          <button 
            @click="toggleMenu" 
            class="md:hidden text-[#0A1128] focus:outline-none p-2 rounded-xl hover:bg-gray-50 transition cursor-pointer" 
            aria-label="Toggle Menu"
          >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
          </button>
      </div>

      <div 
        @click="closeMenu"
        :class="[isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none']"
        class="fixed inset-0 bg-[#0A1128]/40 backdrop-blur-sm transition-opacity duration-300 z-50 md:hidden"
      ></div>

      <div 
        :class="[isMenuOpen ? 'translate-x-0' : '-translate-x-full']"
        class="fixed top-0 left-0 h-screen w-72 bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:hidden overflow-y-auto"
      >
          <div class="p-6 space-y-6">
              <div class="flex items-center justify-between pb-5 border-b border-gray-100">
                  <div class="w-16">
                    <img src="/images/logo.png" alt="Aika Logo" class="w-full object-contain">
                  </div>
                  <button @click="closeMenu" class="text-gray-400 hover:text-[#0A1128] p-1 rounded-xl hover:bg-gray-50 transition cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
              </div>

              <nav class="space-y-4 flex flex-col font-bold text-gray-600">
                  <NuxtLink @click="closeMenu" to="/#how-it-works" class="hover:text-[#0A1128] py-1 transition">How it Works</NuxtLink>
                  <NuxtLink @click="closeMenu" to="/marketplace" class="hover:text-[#0A1128] py-1 transition">Marketplace</NuxtLink>
                  <NuxtLink @click="closeMenu" to="/#services" class="hover:text-[#0A1128] py-1 transition">Our Services</NuxtLink>
                  <NuxtLink @click="closeMenu" to="/#pricing" class="hover:text-[#0A1128] py-1 transition">Pricing</NuxtLink>

                  <NuxtLink 
                    v-if="isAuthenticated" 
                    @click="closeMenu" 
                    to="/dashboard" 
                    class="bg-[#0A1128] text-white px-5 py-2.5 rounded-xl font-bold text-center hover:bg-opacity-90 transition shadow-md text-sm mt-2"
                  >
                    Dashboard
                  </NuxtLink>
              </nav>

              <div class="pt-4 border-t border-gray-100">
                  <NuxtLink 
                    v-if="isAuthenticated" 
                    to="/logout" 
                    class="block text-center bg-rose-600 text-white text-xs font-black py-3.5 rounded-xl hover:bg-rose-700 transition shadow-sm"
                  >
                      Log Out Account
                  </NuxtLink>
                  <NuxtLink 
                    v-else 
                    @click="closeMenu" 
                    to="/auth/login" 
                    class="block text-center bg-[#0A1128] text-white py-3.5 rounded-xl font-black hover:bg-[#D4F53C] hover:text-[#0A1128] transition shadow-md"
                  >
                      Login Portal
                  </NuxtLink>
              </div>
          </div>
      </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="bg-gray-950 text-gray-400 py-16 border-t border-gray-900 mt-auto w-full font-sans">
        <div class="max-w-6xl mx-auto px-4">
            
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-12 mb-12 border-b border-gray-800 gap-8">
                <div class="space-y-1.5 text-left">
                    <h3 class="text-2xl font-black text-white tracking-tight">Subscribe to our newsletter</h3>
                    <p class="text-xs sm:text-sm text-gray-400 font-medium">Get a summary of what we've been working on and platform updates.</p>
                </div>
                
                <form @submit.prevent="handleNewsletterSubscribe" class="w-full max-w-md bg-white/5 border border-white/10 p-2 rounded-2xl flex items-center shadow-xl backdrop-blur-md">
                    <div class="pl-3 pr-2 text-gray-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0l-7.5-4.615m19.5 0v3c0 .621-.504 1.125-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-3m-12 0v3c0 .621.504 1.125 1.125 1.125h1.5a1.125 1.125 0 001.125-1.125v-3" />
                        </svg>
                    </div>
                    <input 
                        v-model="newsletterEmail"
                        type="email" 
                        required 
                        placeholder="Enter your email" 
                        class="w-full bg-transparent border-0 outline-none focus:outline-none focus:border-0 focus:ring-0 text-white font-semibold text-base sm:text-xs px-2 placeholder-gray-500"
                    >
                    <button type="submit" class="bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black text-xs sm:text-sm px-6 py-3 rounded-xl transition transform active:scale-95 shadow-lg cursor-pointer whitespace-nowrap">
                        Subscribe
                    </button>
                </form>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 text-left">
                <div class="space-y-4">
                    <div class="w-24">
                        <img src="/images/logo_white.png" alt="Aika Logo" class="w-full object-contain">
                    </div>
                    <p class="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm font-medium">
                        Connecting individuals and localized commercial hubs to trusted, swift courier assets across Nigeria.
                    </p>
                </div>

                <div>
                    <h4 class="text-white font-black text-xs uppercase tracking-widest mb-4">Quick Links</h4>
                    <ul class="space-y-2.5 text-xs sm:text-sm font-bold">
                        <li><NuxtLink to="/#how-it-works" class="hover:text-[#D4F53C] transition">How it Works</NuxtLink></li>
                        <li><NuxtLink to="/marketplace" class="hover:text-[#D4F53C] transition">Marketplace Hub</NuxtLink></li>
                        <li><NuxtLink to="/#services" class="hover:text-[#D4F53C] transition">Our Services</NuxtLink></li>
                        <li><NuxtLink to="/#faq" class="hover:text-[#D4F53C] transition">FAQ</NuxtLink></li>
                    </ul>
                </div>

                <div class="sm:col-span-2 md:col-span-1 pt-6 sm:pt-0 border-t sm:border-t-0 border-gray-800 border-dashed flex flex-col justify-between">
                    <div>
                        <h4 class="text-white font-black text-xs uppercase tracking-widest mb-3">Support &amp; Contact</h4>
                        <p class="text-xs sm:text-sm text-gray-400 leading-relaxed mb-4 font-medium">Have inquiries or operating as a vendor? Get in touch with our admin command center.</p>
                    </div>
                    <div class="flex items-center justify-between gap-4 mt-2">
                        <span class="inline-block bg-white/5 text-[#D4F53C] font-bold text-xs px-3.5 py-2 rounded-xl border border-white/10">
                            Central Hotline Active
                        </span>
                        
                        <div class="flex items-center space-x-4 text-gray-400 text-xs font-black">
                            <a href="#" class="hover:text-white transition" aria-label="Instagram">IG</a>
                            <a href="#" class="hover:text-white transition" aria-label="Twitter">X</a>
                            <a href="#" class="hover:text-white transition" aria-label="Facebook">FB</a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-16 pt-8 border-t border-gray-900 text-center text-xs text-gray-500 font-medium flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    &copy; {{ currentYear }} Aika. Powered by <span class="text-gray-300 font-semibold">
                      <NuxtLink to="https://techforgetechnologies.com" target="_blank" rel="noopener noreferrer" class="hover:underline">TechForge Technologies</NuxtLink>
                    </span>. All rights reserved.
                </div>
                <div class="flex space-x-6 text-gray-500 font-bold">
                    <NuxtLink to="/terms" class="hover:underline hover:text-gray-300">Terms of Service</NuxtLink>
                    <NuxtLink to="/privacy" class="hover:underline hover:text-gray-300">Privacy Policy</NuxtLink>
                </div>
            </div>
            
        </div>
    </footer>

    <!-- Custom Feedback Modal -->
    <div v-if="feedbackModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/70 backdrop-blur-xs p-4">
      <div class="w-full max-w-sm bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-2xl relative space-y-6 text-[#0A1128] text-center animate-in fade-in zoom-in duration-200">
        
        <div :class="feedbackModal.type === 'success' ? 'bg-[#D4F53C]/20 text-[#0A1128]' : 'bg-rose-100 text-rose-600'" class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 v-if="feedbackModal.type === 'success'" class="w-8 h-8" />
          <AlertCircle v-else class="w-8 h-8" />
        </div>

        <div class="space-y-2">
          <h3 class="text-xl font-black tracking-tight text-[#0A1128]">{{ feedbackModal.title }}</h3>
          <p class="text-xs text-gray-500 font-medium leading-relaxed">
            {{ feedbackModal.message }}
          </p>
        </div>

        <button 
          type="button" 
          @click="feedbackModal.isOpen = false" 
          class="w-full py-4 bg-[#0A1128] hover:bg-[#151f42] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg cursor-pointer border-0 outline-none active:scale-95"
        >
          Okay
        </button>

      </div>
    </div>

  </div>
</template>