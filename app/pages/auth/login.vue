<!-- pages/login.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from '#app'
import {
  Lock, LogIn, Bike, Building2, Mail, Eye, EyeOff, ArrowRight
} from '@lucide/vue'

definePageMeta({
  layout: false // Full screen layout without default layout wrappers
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const router = useRouter()
const route = useRoute()

const isSecureContext = import.meta.client
  ? window.location.protocol === 'https:'
  : process.env.NODE_ENV === 'production'

const authToken      = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7, sameSite: 'lax', secure: isSecureContext })
const userRole       = useCookie('user_role')
const profileId      = useCookie('profile_id')
const businessType   = useCookie('business_type')
const userLocationId = useCookie('customer_location_id')

type PortalType = 'client' | 'rider'
const portalType = ref<PortalType>('client')

const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const isClient = computed(() => portalType.value === 'client')

const switchPortal = (type: PortalType) => {
  if (portalType.value === type) return
  portalType.value = type
  username.value = ''
  password.value = ''
  errorMessage.value = null
  showPassword.value = false
}

const handleLoginSubmit = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  errorMessage.value = null

  try {
    const endpoint = portalType.value === 'rider'
      ? `${apiBase}/api/v1/auth/login/rider`
      : `${apiBase}/api/v1/auth/login`

    const response: any = await $fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: {
        email: username.value,
        password: password.value,
        remember_me: rememberMe.value
      }
    })

    if (!response?.access_token) {
      throw new Error('Invalid authentication response.')
    }

    authToken.value      = response.access_token
    userRole.value       = response.role
    profileId.value      = response.profile_id
    businessType.value   = response.business_type
    userLocationId.value = response.base_location

    const raw = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
    const redirectPath = typeof raw === 'string' && /^\/(?![\/\\])/.test(raw) ? raw : ''
    const target = redirectPath || response.routing_target || '/marketplace'

    await router.push(target)
  } catch (err: any) {
    errorMessage.value =
      err?.data?.detail ||
      err?.data?.error ||
      'Authentication failed. Please check your credentials and try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full grid lg:grid-cols-2 font-sans selection:bg-[#D4F53C] selection:text-[#0A1128]">

    <!-- ───────── Left Side: Full Colored Brand Panel ───────── -->
    <aside class="relative hidden lg:flex flex-col justify-between bg-[#0A1128] p-16 text-white overflow-hidden">
      <!-- Ambient Background Glows -->
      <div class="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#D4F53C]/10 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

      <div class="relative z-10">
        <NuxtLink to="/" class="inline-flex items-center space-x-2.5 group no-underline">
          <div class="w-28 flex items-center justify-center p-1">
            <img src="/images/logo_white.png" alt="Aika Logo" class="w-full h-full object-contain">
          </div>
        </NuxtLink>
      </div>

      <div class="relative z-10 space-y-6 my-auto py-12">
        <span class="inline-block bg-[#D4F53C] text-[#0A1128] font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          Operations Portal
        </span>
        <h2 class="text-5xl font-black leading-tight tracking-tight">
          Sign in to<br />
          <span class="text-[#D4F53C]">Aika</span>
        </h2>
        <p class="text-gray-300 text-sm leading-relaxed max-w-md font-medium">
          Manage live deliveries, track vendor storefronts, and coordinate instant fleet dispatches seamlessly across the network.
        </p>

        <ul class="space-y-4 pt-4">
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Real-time multi-vendor &amp; rider tracking
          </li>
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Secure escrow payment splits &amp; ledgers
          </li>
          <li class="flex items-center gap-3.5 text-xs font-bold text-gray-200">
            <span class="w-2 h-2 rounded-full bg-[#D4F53C]"></span>
            Enterprise-grade session authentication
          </li>
        </ul>
      </div>

      <p class="relative z-10 text-xs text-gray-400 font-medium">
        © {{ new Date().getFullYear() }} Aika. All rights reserved.
      </p>
    </aside>

    <!-- ───────── Right Side: Full White Form Panel ───────── -->
    <main class="flex flex-col justify-center items-center bg-white p-6 sm:p-12 lg:p-20 min-h-screen lg:min-h-0">
      <div class="w-full max-w-md mx-auto space-y-8">
        
        <!-- Mobile brand mark -->
        <div class="lg:hidden flex items-center justify-center mb-6">
          <div class="w-32">
            <img src="/images/logo.png" alt="Aika Logo" class="w-full object-contain">
          </div>
        </div>

        <!-- Header -->
        <header class="text-center lg:text-left space-y-2">
          <h1 class="text-3xl sm:text-4xl font-black text-[#0A1128] tracking-tight">
            {{ isClient ? 'Welcome back' : 'Field Operations' }}
          </h1>
          <p class="text-xs sm:text-sm text-gray-500 font-medium">
            {{ isClient
              ? 'Access your consumer dashboard, orders, and services.'
              : 'Update your field status and review incoming delivery logs.' }}
          </p>
        </header>

        <!-- Portal toggle -->
        <div
          role="tablist"
          aria-label="Portal type"
          class="grid grid-cols-2 gap-1.5 p-1.5 bg-gray-100 rounded-2xl shadow-inner"
        >
          <button
            role="tab"
            :aria-selected="isClient"
            type="button"
            @click="switchPortal('client')"
            :class="isClient ? 'bg-[#0A1128] text-[#D4F53C] shadow-md' : 'text-gray-500 hover:text-[#0A1128]'"
            class="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-0 outline-none"
          >
            <Building2 class="w-4 h-4" />
            <span>Client / Vendor</span>
          </button>
          <button
            role="tab"
            :aria-selected="!isClient"
            type="button"
            @click="switchPortal('rider')"
            :class="!isClient ? 'bg-[#0A1128] text-[#D4F53C] shadow-md' : 'text-gray-500 hover:text-[#0A1128]'"
            class="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-0 outline-none"
          >
            <Bike class="w-4 h-4" />
            <span>Rider Fleet</span>
          </button>
        </div>

        <!-- Error banner -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0"
        >
          <div
            v-if="errorMessage"
            role="alert"
            class="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700"
          >
            <span class="mt-px">⚠</span>
            <span>{{ errorMessage }}</span>
          </div>
        </Transition>

        <!-- Form -->
        <form @submit.prevent="handleLoginSubmit" class="space-y-4" novalidate>
          <!-- Email -->
          <div class="space-y-1.5">
            <label for="email" class="block text-xs font-black text-gray-400 uppercase tracking-wider">
              Email Address
            </label>
            <div class="relative">
              <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="email"
                v-model="username"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
                required
                class="w-full pl-11 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-xs font-semibold text-[#0A1128] placeholder:text-gray-400 placeholder:font-normal outline-none transition focus:bg-white focus:border-[#0A1128] focus:ring-2 focus:ring-[#0A1128]/10"
              />
            </div>
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label for="password" class="block text-xs font-black text-gray-400 uppercase tracking-wider">
                Password
              </label>
              <NuxtLink
                to="/auth/forgot-password"
                class="text-xs font-black text-[#0A1128] hover:underline underline-offset-2"
              >
                Forgot Password?
              </NuxtLink>
            </div>
            <div class="relative">
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                required
                class="w-full pl-11 pr-12 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-xs font-semibold text-[#0A1128] placeholder:text-gray-400 placeholder:font-normal outline-none transition focus:bg-white focus:border-[#0A1128] focus:ring-2 focus:ring-[#0A1128]/10"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A1128] transition-colors cursor-pointer bg-transparent border-0"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Remember me -->
          <label class="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              v-model="rememberMe"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 text-[#0A1128] focus:ring-[#0A1128] cursor-pointer"
            />
            <span class="text-xs font-bold text-gray-500">Keep me logged in on this device</span>
          </label>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="group w-full flex items-center justify-center gap-2 bg-[#0A1128] hover:bg-[#16224a] disabled:opacity-70 disabled:cursor-not-allowed text-[#D4F53C] font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-xl shadow-[#0A1128]/20 transition-all active:scale-[0.99] cursor-pointer border-0 outline-none mt-2"
          >
            <template v-if="!isSubmitting">
              <span>{{ isClient ? 'Sign In to Portal' : 'Login Rider Fleet' }}</span>
              <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </template>
            <template v-else>
              <span class="w-4 h-4 rounded-full border-2 border-[#D4F53C]/30 border-t-[#D4F53C] animate-spin"></span>
              <span>Authenticating…</span>
            </template>
          </button>
        </form>

        <!-- Footer -->
        <p class="text-center text-xs text-gray-500 font-medium">
          <template v-if="isClient">
            New to Aika?
            <NuxtLink to="/auth/register" class="text-[#0A1128] font-black hover:underline underline-offset-2 ml-1">
              Create an Account
            </NuxtLink>
          </template>
          <template v-else>
            Want to ride with our fleet? Contact central operations admin.
          </template>
        </p>

      </div>
    </main>

  </div>
</template>