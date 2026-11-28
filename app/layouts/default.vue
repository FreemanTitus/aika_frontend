<!-- layouts/default.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
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

// Reactive auth state linked to cookie presence
const authToken = useCookie('auth_token')
const isAuthenticated = computed(() => !!authToken.value)

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

// Role-based dashboard routing
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
  <div class="min-h-screen flex flex-col font-sans bg-slate-50 text-gray-800 selection:bg-[#D4F53C] selection:text-[#0A1128]">
    
    <!-- Native Nuxt Top Page Transition Loader Bar -->
    <NuxtLoadingIndicator color="#D4F53C" :height="3" />

    <!-- =========================================================================
         GLOBAL HEADER NAVIGATION (Glassmorphic)
         ========================================================================= -->
    <header class="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/45 shadow-xs transition-all">
      <div class="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
          
          <NuxtLink to="/" class="flex items-center space-x-2.5 group">
              <div class="w-20 flex items-center justify-center transition-transform group-hover:scale-105 p-1">
                 <img src="/images/logo.png" alt="Aika Logo" class="w-full h-full object-contain">
              </div>
          </NuxtLink>
          
          <nav class="hidden md:flex space-x-8 font-black text-xs uppercase tracking-wider text-gray-600">
              <NuxtLink to="/#how-it-works" class="hover:text-[#0A1128] transition">How it Works</NuxtLink>
              <NuxtLink to="/marketplace" class="hover:text-[#0A1128] transition">Marketplace</NuxtLink>
              <NuxtLink to="/#services" class="hover:text-[#0A1128] transition">Our Services</NuxtLink>
              <NuxtLink to="/#pricing" class="hover:text-[#0A1128] transition">Pricing</NuxtLink>
          </nav>
          
          <div class="hidden md:block">
            <NuxtLink 
              v-if="isAuthenticated"
              :to="dashboardRoute" 
              class="bg-[#0A1128] text-[#D4F53C] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#D4F53C] hover:text-[#0A1128] transition shadow-lg shadow-[#0A1128]/10 cursor-pointer"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink 
              v-else
              to="/auth/login" 
              class="bg-[#0A1128] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#D4F53C] hover:text-[#0A1128] transition shadow-lg shadow-[#0A1128]/10 cursor-pointer"
            >
              Login
            </NuxtLink>
          </div>

          <button 
            @click="toggleMenu" 
            class="md:hidden text-[#0A1128] focus:outline-none p-2 rounded-xl bg-white/50 border border-white/60 hover:bg-white transition cursor-pointer shadow-xs" 
            aria-label="Toggle Menu"
          >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
          </button>
      </div>

      <!-- Mobile Menu Backdrop -->
      <div 
        @click="closeMenu"
        :class="[isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none']"
        class="fixed inset-0 bg-[#0A1128]/30 backdrop-blur-md transition-opacity duration-300 z-50 md:hidden"
      ></div>

      <!-- Mobile Glass Slide-out Menu Drawer -->
      <div 
        :class="[isMenuOpen ? 'translate-x-0' : '-translate-x-full']"
        class="fixed top-0 left-0 h-screen w-72 bg-white/85 backdrop-blur-2xl z-50 flex flex-col shadow-2xl border-r border-white/40 transition-transform duration-300 ease-in-out md:hidden overflow-y-auto"
      >
          <div class="p-6 space-y-6">
              <div class="flex items-center justify-between pb-5 border-b border-gray-100/80">
                  <div class="w-16">
                    <img src="/images/logo.png" alt="Aika Logo" class="w-full object-contain">
                  </div>
                  <button @click="closeMenu" class="text-gray-400 hover:text-[#0A1128] p-1 rounded-xl bg-gray-100/50 hover:bg-gray-100 transition cursor-pointer" aria-label="Close Menu">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
              </div>

              <nav class="space-y-4 flex flex-col font-extrabold text-xs uppercase tracking-wider text-gray-700">
                  <NuxtLink @click="closeMenu" to="/#how-it-works" class="hover:text-[#0A1128] py-1 transition">How it Works</NuxtLink>
                  <NuxtLink @click="closeMenu" to="/marketplace" class="hover:text-[#0A1128] py-1 transition">Marketplace</NuxtLink>
                  <NuxtLink @click="closeMenu" to="/#services" class="hover:text-[#0A1128] py-1 transition">Our Services</NuxtLink>
                  <NuxtLink @click="closeMenu" to="/#pricing" class="hover:text-[#0A1128] py-1 transition">Pricing</NuxtLink>
              </nav>

              <div class="pt-4 border-t border-gray-100/80 space-y-3">
                  <NuxtLink 
                    v-if="isAuthenticated"
                    @click="closeMenu" 
                    :to="dashboardRoute" 
                    class="block text-center bg-[#0A1128] text-[#D4F53C] py-3.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#D4F53C] hover:text-[#0A1128] transition shadow-lg shadow-[#0A1128]/10"
                  >
                      Dashboard
                  </NuxtLink>
                  <NuxtLink 
                    v-else
                    @click="closeMenu" 
                    to="/auth/login" 
                    class="block text-center bg-[#0A1128] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#D4F53C] hover:text-[#0A1128] transition shadow-lg shadow-[#0A1128]/10"
                  >
                      Login
                  </NuxtLink>
              </div>
          </div>
      </div>
    </header>

    <!-- =========================================================================
         MAIN VIEWPORT SLOT
         ========================================================================= -->
    <main class="flex-grow">
      <slot />
    </main>

    <!-- =========================================================================
         GLOBAL GLASS FOOTER
         ========================================================================= -->
    <footer class="relative bg-gradient-to-b from-[#0A1128] to-[#050814] text-gray-400 py-16 border-t border-white/10 mt-auto w-full font-sans overflow-hidden">
        
        <!-- Decorative Ambient Glow Circles -->
        <div class="absolute -top-32 -left-32 w-96 h-96 bg-[#D4F53C]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative max-w-6xl mx-auto px-4">
            
            <!-- Glass Newsletter Subscription Card -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-12 mb-12 border-b border-white/10 gap-8 bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[32px] shadow-2xl">
                <div class="space-y-1.5 text-left">
                    <h3 class="text-2xl font-black text-white tracking-tight">Subscribe to our newsletter</h3>
                    <p class="text-xs sm:text-sm text-gray-300 font-medium">Get a summary of what we've been working on and platform updates.</p>
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
                        class="w-full bg-transparent border-0 outline-none focus:outline-none focus:border-0 focus:ring-0 text-white font-semibold text-xs px-2 placeholder-gray-500"
                    >
                    <button type="submit" class="bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black text-xs sm:text-sm px-6 py-3 rounded-xl transition transform active:scale-95 shadow-lg shadow-[#D4F53C]/10 cursor-pointer whitespace-nowrap">
                        Subscribe
                    </button>
                </form>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 text-left">
                <div class="space-y-4">
                    <div class="w-24">
                        <img src="/images/logo_white.png" alt="Aika Logo" class="w-full object-contain">
                    </div>
                    <p class="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-sm font-medium">
                        Connecting individuals and localized commercial hubs to trusted, swift courier assets across Nigeria.
                    </p>
                </div>

                <div>
                    <h4 class="text-white font-black text-xs uppercase tracking-widest mb-4">Quick Links</h4>
                    <ul class="space-y-2.5 text-xs sm:text-sm font-bold text-gray-300">
                        <li><NuxtLink to="/#how-it-works" class="hover:text-[#D4F53C] transition">How it Works</NuxtLink></li>
                        <li><NuxtLink to="/marketplace" class="hover:text-[#D4F53C] transition">Marketplace Hub</NuxtLink></li>
                        <li><NuxtLink to="/#services" class="hover:text-[#D4F53C] transition">Our Services</NuxtLink></li>
                        <li><NuxtLink to="/#faq" class="hover:text-[#D4F53C] transition">FAQ</NuxtLink></li>
                    </ul>
                </div>

                <div class="sm:col-span-2 md:col-span-1 pt-6 sm:pt-0 border-t sm:border-t-0 border-white/10 border-dashed flex flex-col justify-between">
                    <div>
                        <h4 class="text-white font-black text-xs uppercase tracking-widest mb-3">Support &amp; Contact</h4>
                        <p class="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4 font-medium">Have inquiries or operating as a vendor? Get in touch with our admin command center.</p>
                    </div>
                    <div class="flex items-center justify-between gap-4 mt-2">
                        <span class="inline-block bg-white/5 text-[#D4F53C] font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl border border-white/10 backdrop-blur-md">
                            Central Hotline Active
                        </span>
                        
                        <div class="flex items-center space-x-2.5 text-gray-300">
                            <!-- Instagram -->
                            <a
                              href="https://instagram.com/useaika2026"
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Instagram"
                              class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#D4F53C] hover:text-[#0A1128] hover:border-[#D4F53C] transition"
                            >
                              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                              </svg>
                            </a>

                            <!-- X (Twitter) -->
                            <a
                              href="https://x.com/useaika"
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="X (Twitter)"
                              class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#D4F53C] hover:text-[#0A1128] hover:border-[#D4F53C] transition"
                            >
                              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            </a>

                            <!-- Facebook -->
                            <a
                              href="#"
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Facebook"
                              class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#D4F53C] hover:text-[#0A1128] hover:border-[#D4F53C] transition"
                            >
                              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M13.5 22v-8.25h2.77l.41-3.22H13.5V8.48c0-.93.26-1.57 1.6-1.57h1.7V4.03c-.3-.04-1.31-.13-2.49-.13-2.46 0-4.15 1.5-4.15 4.26v2.37H7.38v3.22h2.78V22h3.34z" />
                              </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-16 pt-8 border-t border-white/10 text-center text-xs text-gray-400 font-medium flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    &copy; {{ currentYear }} Aika. Powered by <span class="text-white font-semibold">
                      <NuxtLink to="https://techforgetechnologies.com" target="_blank" rel="noopener noreferrer" class="hover:underline">TechForge Technologies</NuxtLink>
                    </span>. All rights reserved.
                </div>
                <div class="flex space-x-6 text-gray-400 font-bold">
                    <NuxtLink to="/terms" class="hover:underline hover:text-white">Terms of Service</NuxtLink>
                    <NuxtLink to="/privacy" class="hover:underline hover:text-white">Privacy Policy</NuxtLink>
                </div>
            </div>
            
        </div>
    </footer>

    <!-- =========================================================================
         GLOBAL GLASS FEEDBACK MODAL
         ========================================================================= -->
    <div v-if="feedbackModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/50 backdrop-blur-md p-4">
      <div class="w-full max-w-sm bg-white/90 backdrop-blur-2xl border border-white/60 rounded-[32px] p-6 sm:p-8 shadow-2xl relative space-y-6 text-[#0A1128] text-center">
        
        <div :class="feedbackModal.type === 'success' ? 'bg-[#D4F53C]/30 text-[#0A1128]' : 'bg-rose-100 text-rose-600'" class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 v-if="feedbackModal.type === 'success'" class="w-8 h-8" />
          <AlertCircle v-else class="w-8 h-8" />
        </div>

        <div class="space-y-2">
          <h3 class="text-xl font-black tracking-tight text-[#0A1128]">{{ feedbackModal.title }}</h3>
          <p class="text-xs text-gray-600 font-medium leading-relaxed">
            {{ feedbackModal.message }}
          </p>
        </div>

        <button 
          type="button" 
          @click="feedbackModal.isOpen = false" 
          class="w-full py-4 bg-[#0A1128] hover:bg-[#151f42] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-xl shadow-[#0A1128]/20 cursor-pointer border-0 outline-none active:scale-95"
        >
          Okay
        </button>

      </div>
    </div>

  </div>
</template>