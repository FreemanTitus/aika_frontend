<!-- pages/login.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from '#app'
import {
  Lock, 
  LogIn,
  Bike,
  Building2, 
  Mail,
  Eye,
  EyeOff
} from '@lucide/vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const router = useRouter()
const route = useRoute()

const isSecureContext = import.meta.client ? window.location.protocol === 'https:' : process.env.NODE_ENV === 'production'
const authToken = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7, sameSite: 'lax', secure: isSecureContext })
const userRole = useCookie('user_role')
const profileId = useCookie('profile_id')
const businessType = useCookie('business_type')
const userLocationId = useCookie('customer_location_id')

type PortalType = 'client' | 'rider'
const portalType = ref<PortalType>('client')

const username = ref<string>('')
const password = ref<string>('')
const rememberMe = ref<boolean>(false)
const showPassword = ref<boolean>(false)

const errorMessage = ref<string | null>(null)
const isSubmitting = ref<boolean>(false)

const switchPortal = (type: PortalType): void => {
  portalType.value = type
  username.value = ''
  password.value = ''
  errorMessage.value = null
  showPassword.value = false
}
// ACCT_qfbue31iqa0vzxi
const handleLoginSubmit = async (): Promise<void> => {
  isSubmitting.value = true
  errorMessage.value = null

  try {
    const targetEndpoint = portalType.value === 'rider' 
      ? `${apiBase}/api/v1/auth/login/rider` 
      : `${apiBase}/api/v1/auth/login`

    const payload = {
      email: username.value,
      password: password.value,
      remember_me: rememberMe.value
    }
    
    const response: any = await $fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: payload
    })

    if (response?.access_token) {
      authToken.value = response.access_token
      userRole.value = response.role
      profileId.value = response.profile_id
      businessType.value = response.business_type
      userLocationId.value = response.base_location
      
      // Only same-site paths are accepted as a redirect target (blocks //evil.com and https://evil.com).
      const rawRedirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
      const redirectPath = typeof rawRedirect === 'string' && /^\/(?![\/\\])/.test(rawRedirect) ? rawRedirect : ''
      const target = redirectPath || response.routing_target || '/marketplace'

      await router.push(target)
    } else {
      throw new Error('Invalid authentication response.')
    }
    
  } catch (err: any) {
    errorMessage.value = err?.data?.detail || err?.data?.error || 'Authentication operation rejected by gateway access channel.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[85vh] flex flex-col justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 border-b border-gray-100">
    <main class="max-w-md w-full mx-auto">
      <div class="bg-white p-8 sm:p-10 rounded-[32px] shadow-xl border border-gray-100 relative overflow-hidden">
          
          <!-- Decorative Top Glow Accent -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0A1128] via-[#D4F53C] to-[#0A1128]"></div>

          <!-- Header Section -->
          <div class="text-center mb-8">
              <span class="bg-[#D4F53C]/20 text-[#0A1128] font-black px-3.5 py-1 rounded-full text-[10px] uppercase tracking-widest inline-block shadow-2xs">
                  Secure Gateway
              </span>
              
              <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight mt-3">
                {{ portalType === 'client' ? 'Welcome Back' : 'Field Operations' }}
              </h1>
              
              <p class="text-gray-500 text-xs sm:text-sm mt-2 font-medium leading-relaxed max-w-xs mx-auto">
                {{ portalType === 'client' 
                  ? 'Access your account dashboard, ledger, and services' 
                  : 'Sign in to update operational status and review dispatch logs' 
                }}
              </p>
          </div>

          <!-- Toggle Switch Tabs -->
          <div class="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-2xl mb-8">
              <button 
                @click="switchPortal('client')"
                type="button"
                :class="[portalType === 'client' ? 'bg-[#0A1128] text-white shadow-md' : 'text-gray-500 hover:text-[#0A1128]']"
                class="py-3 rounded-xl font-black text-center transition-all flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer border-0 outline-none"
              >
                  <Building2 :class="[portalType === 'client' ? 'text-[#D4F53C]' : 'text-gray-400']" class="w-4 h-4 transition-colors" />
                  <span>Client Login</span>
              </button>
              <button 
                @click="switchPortal('rider')"
                type="button"
                :class="[portalType === 'rider' ? 'bg-[#0A1128] text-white shadow-md' : 'text-gray-500 hover:text-[#0A1128]']"
                class="py-3 rounded-xl font-black text-center transition-all flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer border-0 outline-none"
              >
                  <Bike :class="[portalType === 'rider' ? 'text-[#D4F53C]' : 'text-gray-400']" class="w-4 h-4 transition-colors" />
                  <span>Rider Login</span>
              </button>
          </div>

          <!-- Error Message Banner -->
          <div v-if="errorMessage" class="bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-2xl text-xs font-bold mb-6 flex items-center space-x-2.5 shadow-sm">
            <span class="text-sm">⚠</span>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleLoginSubmit" class="space-y-5">
              
              <!-- Email Input Field -->
              <div>
                  <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div class="relative group">
                      <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors duration-200">
                        <Mail class="w-4 h-4" />
                      </span>
                      <input 
                        v-model="username"
                        type="email" 
                        placeholder="name@example.com" 
                        required 
                        class="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold transition duration-200 text-base sm:text-sm placeholder-gray-400 shadow-2xs"
                      >
                  </div>
              </div>

              <!-- Password Input Field -->
              <div>
                  <div class="flex justify-between items-center mb-1.5">
                      <label class="block text-xs font-black text-gray-400 uppercase tracking-wider">Password</label>
                      <NuxtLink to="/auth/forgot-password" class="text-xs font-black text-[#0A1128] hover:text-[#D4F53C] hover:underline tracking-tight transition-colors">Forgot password?</NuxtLink>
                  </div>
                  <div class="relative group">
                      <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors duration-200">
                          <Lock class="w-4 h-4" />
                      </span>
                      
                      <input 
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'" 
                        required 
                        placeholder="••••••••" 
                        class="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:outline-none focus:border-[#0A1128] focus:bg-white text-[#0A1128] font-semibold transition duration-200 text-base sm:text-sm placeholder-gray-400 shadow-2xs"
                      >
                      
                      <button 
                        @click="showPassword = !showPassword"
                        type="button"
                        class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#0A1128] border-0 bg-transparent cursor-pointer focus:outline-none"
                      >
                        <EyeOff v-if="showPassword" class="w-4 h-4" />
                        <Eye v-else class="w-4 h-4" />
                      </button>
                  </div>
              </div>

              <!-- Remember Me Checkbox -->
              <div class="flex items-center pt-1">
                  <input 
                      id="remember_me" 
                      type="checkbox" 
                      v-model="rememberMe"
                      class="w-4 h-4 text-[#0A1128] border-gray-300 rounded focus:ring-0 cursor-pointer accent-[#0A1128]"
                  >
                  <label class="ml-2.5 text-xs font-bold text-gray-500 select-none cursor-pointer tracking-tight" for="remember_me">
                      Keep me logged in on this device
                  </label>
              </div>

              <!-- Submit Button -->
              <button 
                type="submit" 
                :disabled="isSubmitting"
                class="w-full bg-[#D4F53C] hover:bg-[#c3e334] disabled:bg-gray-100 disabled:text-gray-400 text-[#0A1128] font-black py-4 rounded-2xl shadow-lg transition transform active:scale-95 mt-2 flex items-center justify-center space-x-2 cursor-pointer text-xs sm:text-sm uppercase tracking-wider border-0 outline-none"
              >
                  <span>{{ isSubmitting ? 'Authenticating Gateway...' : (portalType === 'client' ? 'Sign In' : 'Verify Rider Account') }}</span>
                  <LogIn class="w-4 h-4" />
              </button>
          </form>

          <!-- Footer Action Callout -->
          <div class="mt-8 pt-6 border-t border-dashed border-gray-200 text-center text-xs text-gray-500 font-bold tracking-tight">
              <div v-if="portalType === 'client'">
                New user? 
                <NuxtLink to="/auth/register" class="text-[#0A1128] font-black hover:underline ml-1">
                  Create an account
                </NuxtLink>
              </div>
              <div v-else>
                <span>Want to ride with us? Contact our central admin command.</span>
              </div>
          </div>
          
      </div>
    </main>
  </div>
</template>