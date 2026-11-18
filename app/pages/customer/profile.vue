<!-- pages/customer/profile.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  MapPin,
  Building2,
  Loader2,
  User,
  Mail,
  Save,
  Navigation,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Compass,
  Lock,
  ChevronLeft,
  ChevronDown,
  ShieldCheck,
  X
} from '@lucide/vue'
import type { UserProfile } from '~/types/profile'
import ChangePasswordModal from '~/components/ChangePasswordModal.vue'

definePageMeta({
  layout: 'customer',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const profile = ref<UserProfile | null>(null)
const isLoading = ref(true)
const error = ref<any>(null)

const isSaving = ref(false)
const isLocating = ref(false)

// Dynamic Locations State
const availableLocations = ref<any[]>([])
const fetchingLocations = ref(false)
const selectedState = ref('')

const editableBaseLocation = ref<string | number | ''>('')
const editableStreetAddress = ref('')

const notification = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let notificationTimer: ReturnType<typeof setTimeout> | null = null

// Change Password Modal State
const isPasswordModalOpen = ref(false)

const showNotification = (message: string, type: 'success' | 'error') => {
  if (notificationTimer) clearTimeout(notificationTimer)
  notification.value = { message, type }
  notificationTimer = setTimeout(() => {
    notification.value = null
  }, 4000)
}

// Helper to derive regional coordinates from a CoverageArea object without mutating it
const getHubCoordinates = (hub: any, addLocalJitter = false) => {
  if (!hub || hub.latitude == null || hub.longitude == null) return null
  const baseLat = Number(hub.latitude)
  const baseLng = Number(hub.longitude)
  if (Number.isNaN(baseLat) || Number.isNaN(baseLng)) return null

  if (!addLocalJitter) {
    return {
      latitude: Number(baseLat.toFixed(6)),
      longitude: Number(baseLng.toFixed(6))
    }
  }

  // Subtle ~100m–350m regional offset within the selected CoverageArea
  const latOffset = (Math.random() - 0.5) * 0.006
  const lngOffset = (Math.random() - 0.5) * 0.006
  return {
    latitude: Number((baseLat + latOffset).toFixed(6)),
    longitude: Number((baseLng + lngOffset).toFixed(6))
  }
}

// 1. Fetch active coverage areas first
const fetchLocations = async () => {
  fetchingLocations.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/locations`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    availableLocations.value = res?.data || res || []
  } catch (err) {
    console.error('Failed to load locations', err)
  } finally {
    fetchingLocations.value = false
  }
}

// 2. Fetch profile and auto-match state/hub dropdowns
const fetchProfile = async () => {
  isLoading.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/customer/profile`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })

    profile.value = res?.data || res || null
    if (profile.value) {
      editableBaseLocation.value = profile.value.base_location || ''
      editableStreetAddress.value = profile.value.street_address || ''

      // Safely match and set initial selectedState using the numeric base_location ID
      if (profile.value.base_location && availableLocations.value.length > 0) {
        const matchedLoc = availableLocations.value.find(
          (loc: any) => String(loc.id) === String(profile.value?.base_location)
        )
        if (matchedLoc) {
          selectedState.value = matchedLoc.state_name

          // If user has no saved coordinates yet, seed from their CoverageArea
          if (!profile.value.coordinates?.latitude || !profile.value.coordinates?.longitude) {
            const hubCoords = getHubCoordinates(matchedLoc, false)
            if (hubCoords) {
              profile.value.coordinates = hubCoords
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Profile fetch error:', err)
    error.value = err
    showNotification('Failed to load profile details', 'error')
  } finally {
    isLoading.value = false
  }
}

// Ensure locations are fetched BEFORE profile data so dropdown matching works seamlessly
const refreshAll = async () => {
  await fetchLocations()
  await fetchProfile()
}

onMounted(async () => {
  await refreshAll()
})

// Extract unique sorted list of states
const uniqueStates = computed(() => {
  const states = availableLocations.value.map((loc) => loc.state_name)
  return [...new Set(states)].sort()
})

// Filter locations within selected state
const filteredLocations = computed(() => {
  if (!selectedState.value) return []
  return availableLocations.value
    .filter((loc) => loc.state_name === selectedState.value)
    .sort((a, b) => a.name.localeCompare(b.name))
})

// Current resolved hub object for summary display & coordinate lookup
const activeHubSummary = computed(() => {
  if (!editableBaseLocation.value) return null
  return (
    availableLocations.value.find(
      (loc) => String(loc.id) === String(editableBaseLocation.value)
    ) || null
  )
})

const userInitials = computed(() => {
  if (!profile.value) return 'CU'
  const first = profile.value.first_name?.[0] || ''
  const last = profile.value.last_name?.[0] || ''
  return `${first}${last}`.toUpperCase() || 'CU'
})

// Reset area selection whenever state changes manually
watch(selectedState, (newState) => {
  const currentLoc = availableLocations.value.find(
    (loc) => String(loc.id) === String(editableBaseLocation.value)
  )
  if (!currentLoc || currentLoc.state_name !== newState) {
    editableBaseLocation.value = ''
  }
})

// Automatically sync GPS coordinates whenever the user selects a different CoverageArea hub
watch(editableBaseLocation, (newHubId, oldHubId) => {
  if (!newHubId || String(newHubId) === String(oldHubId)) return
  const hub = availableLocations.value.find((loc) => String(loc.id) === String(newHubId))
  const hubCoords = getHubCoordinates(hub, false)
  if (hubCoords && profile.value) {
    profile.value.coordinates = hubCoords
  }
})

// Sync coordinates directly from the selected CoverageArea hub
const syncGpsCoordinates = () => {
  if (!activeHubSummary.value) {
    showNotification('Please select a state and location hub area first.', 'error')
    return
  }

  isLocating.value = true
  const hubCoords = getHubCoordinates(activeHubSummary.value, false)

  if (!hubCoords) {
    isLocating.value = false
    showNotification(`No coordinates configured for ${activeHubSummary.value.name} hub.`, 'error')
    return
  }

  if (!profile.value) profile.value = {} as UserProfile
  profile.value.coordinates = hubCoords
  isLocating.value = false
  showNotification(
    `Hub GPS Synced (${activeHubSummary.value.name}): ${hubCoords.latitude.toFixed(4)}, ${hubCoords.longitude.toFixed(4)}`,
    'success'
  )
}

const saveProfileDetails = async () => {
  if (!editableBaseLocation.value) {
    showNotification('Please select an operational base location hub.', 'error')
    return
  }

  isSaving.value = true
  try {
    // Always resolve coordinates from the selected CoverageArea if not already set
    const resolvedCoords =
      profile.value?.coordinates?.latitude && profile.value?.coordinates?.longitude
        ? profile.value.coordinates
        : getHubCoordinates(activeHubSummary.value, false)

    const payload: any = {
      base_location: Number(editableBaseLocation.value),
      street_address: editableStreetAddress.value
    }

    if (resolvedCoords) {
      payload.latitude = resolvedCoords.latitude
      payload.longitude = resolvedCoords.longitude
    }

    await $fetch(`${apiBase}/api/v1/customer/profile/update-coordinates`, {
      method: 'POST',
      body: payload,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })
    await fetchProfile()
    showNotification('Operational identity updated successfully!', 'success')
  } catch (e: any) {
    console.error('Save profile error details:', e?.data)
    showNotification(e?.data?.detail || 'Failed to save changes. Please try again.', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-10 font-sans text-left">
    <!-- Fixed Toast Notification -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform -translate-y-4 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-4 opacity-0"
      >
        <div
          v-if="notification"
          class="fixed top-20 right-5 left-5 sm:left-auto sm:w-full sm:max-w-md z-50"
        >
          <div
            :class="[
              'p-4 rounded-2xl text-xs font-bold tracking-wide text-white shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md',
              notification.type === 'success'
                ? 'bg-[#0A1128] border border-white/15'
                : 'bg-rose-600 border border-rose-400/30'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <CheckCircle2
                v-if="notification.type === 'success'"
                class="w-4 h-4 text-[#D4F53C] shrink-0"
              />
              <AlertCircle v-else class="w-4 h-4 text-white shrink-0" />
              <span>{{ notification.message }}</span>
            </div>
            <button
              type="button"
              @click="notification = null"
              aria-label="Dismiss notification"
              class="text-white/70 hover:text-white cursor-pointer border-0 bg-transparent p-1"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="max-w-5xl mx-auto space-y-6">
      <!-- Top Breadcrumb & Refresh Bar -->
      <div class="flex items-center justify-between">
        <NuxtLink
          to="/customer/dashboard"
          class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-[#0A1128] bg-white border border-gray-200/80 px-4 py-2.5 rounded-xl shadow-2xs transition group"
        >
          <ChevronLeft class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Dashboard</span>
        </NuxtLink>

        <button
          type="button"
          @click="refreshAll"
          :disabled="isLoading || fetchingLocations"
          class="inline-flex items-center gap-2 bg-white border border-gray-200/80 shadow-2xs text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition hover:bg-gray-50 hover:border-gray-300 active:scale-95 disabled:opacity-50 cursor-pointer outline-none"
          title="Refresh Profile"
        >
          <RefreshCw
            :class="{ 'animate-spin': isLoading || fetchingLocations }"
            class="w-3.5 h-3.5 text-[#0A1128]"
          />
          <span class="hidden sm:inline">Sync Data</span>
        </button>
      </div>

      <!-- Hero Header Banner -->
      <header class="bg-[#0A1128] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div class="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#D4F53C]/10 blur-2xl pointer-events-none" />
        <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div class="flex items-start sm:items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-[#D4F53C] text-[#0A1128] font-black text-lg flex items-center justify-center shrink-0 shadow-md">
              {{ userInitials }}
            </div>
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="bg-white/10 text-[#D4F53C] font-black px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-widest">
                  Operational Setup
                </span>
                <span
                  v-if="activeHubSummary"
                  class="bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 font-bold px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider"
                >
                  Hub: {{ activeHubSummary.name }}
                </span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Identity &amp; Delivery Hub
              </h1>
              <p class="text-xs sm:text-sm text-gray-300 font-medium max-w-xl">
                Configure your primary service zone, street landmarks, and account security credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="isPasswordModalOpen = true"
            class="px-5 py-3.5 bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none shrink-0 border border-white/15 hover:border-[#D4F53C] group"
          >
            <Lock class="w-4 h-4 text-[#D4F53C] group-hover:text-[#0A1128] transition-colors" />
            <span>Change Password</span>
          </button>
        </div>
      </header>

      <!-- Loading Skeleton State -->
      <div v-if="isLoading && !profile" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 bg-white rounded-3xl border border-gray-200/70 p-6 space-y-5 animate-pulse">
          <div class="h-4 w-36 bg-gray-200 rounded-md" />
          <div class="space-y-3">
            <div class="h-16 bg-gray-100 rounded-2xl" />
            <div class="h-16 bg-gray-100 rounded-2xl" />
            <div class="h-24 bg-gray-100 rounded-2xl" />
          </div>
        </div>
        <div class="lg:col-span-7 bg-white rounded-3xl border border-gray-200/70 p-6 space-y-5 animate-pulse">
          <div class="h-4 w-44 bg-gray-200 rounded-md" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="h-14 bg-gray-100 rounded-2xl" />
            <div class="h-14 bg-gray-100 rounded-2xl" />
          </div>
          <div class="h-14 bg-gray-100 rounded-2xl" />
          <div class="h-12 bg-gray-200 rounded-2xl mt-4" />
        </div>
      </div>

      <!-- Error Fallback State -->
      <div
        v-else-if="error && !profile"
        class="bg-white rounded-3xl border border-rose-200 p-10 text-center space-y-4 shadow-xs"
      >
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <h2 class="text-base font-black text-[#0A1128]">Unable to Load Profile</h2>
          <p class="text-xs text-gray-500 max-w-md mx-auto">
            We couldn't synchronize your profile matrix from the server. Check your connection and try again.
          </p>
        </div>
        <button
          type="button"
          @click="refreshAll"
          class="inline-flex items-center gap-2 px-5 py-3 bg-[#0A1128] text-[#D4F53C] text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-md"
        >
          <RefreshCw class="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>

      <!-- Main Profile Dashboard Grid -->
      <div v-else-if="profile" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Column: Account Identity & Telemetry -->
        <div class="lg:col-span-5 space-y-6">
          <!-- Core Credentials Card -->
          <section class="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <h2 class="text-xs font-black uppercase tracking-widest text-[#0A1128] flex items-center gap-2">
                <User class="w-4 h-4 text-[#65a30d]" />
                Core Credentials
              </h2>
              <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                <ShieldCheck class="w-3 h-3" /> Verified
              </span>
            </div>

            <div class="space-y-3">
              <div class="bg-gray-50/90 border border-gray-100 rounded-2xl p-4 flex items-center gap-3.5">
                <div class="w-9 h-9 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-[#0A1128] shrink-0">
                  <User class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <span class="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                    Full Name
                  </span>
                  <p class="text-sm font-black text-[#0A1128] truncate">
                    {{ profile.first_name }} {{ profile.last_name }}
                  </p>
                </div>
              </div>

              <div class="bg-gray-50/90 border border-gray-100 rounded-2xl p-4 flex items-center gap-3.5">
                <div class="w-9 h-9 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-[#0A1128] shrink-0">
                  <Mail class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <span class="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                    Email Address
                  </span>
                  <p class="text-sm font-black text-[#0A1128] truncate">
                    {{ profile.email }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Geolocation Telemetry Card -->
          <section class="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <h2 class="text-xs font-black uppercase tracking-widest text-[#0A1128] flex items-center gap-2">
                <Compass class="w-4 h-4 text-[#65a30d]" />
                Hub Coordinates
              </h2>
              <span
                :class="[
                  'text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border',
                  profile.coordinates?.latitude
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                ]"
              >
                {{ profile.coordinates?.latitude ? 'Locked' : 'Unset' }}
              </span>
            </div>

            <div
              :class="[
                profile.coordinates?.latitude
                  ? 'bg-emerald-50/60 border-emerald-200/80'
                  : 'bg-gray-50/90 border-gray-200/70'
              ]"
              class="border p-4 rounded-2xl space-y-4 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    profile.coordinates?.latitude
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-400 text-white'
                  ]"
                  class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                >
                  <Navigation class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <span class="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                    {{ activeHubSummary ? `${activeHubSummary.name} Region GPS` : 'Coverage Area GPS' }}
                  </span>
                  <span class="text-xs sm:text-sm font-black text-[#0A1128] font-mono block truncate">
                    {{
                      profile.coordinates?.latitude && profile.coordinates?.longitude
                        ? `${Number(profile.coordinates.latitude).toFixed(5)}, ${Number(profile.coordinates.longitude).toFixed(5)}`
                        : 'Select a Hub Area'
                    }}
                  </span>
                </div>
              </div>

              <button
                type="button"
                @click="syncGpsCoordinates"
                :disabled="isLocating || !activeHubSummary"
                class="w-full py-3 px-4 bg-[#0A1128] hover:bg-[#131e42] text-[#D4F53C] text-xs font-black uppercase tracking-wider rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer outline-none border-0 active:scale-[0.99] disabled:opacity-60"
              >
                <Loader2 v-if="isLocating" class="w-4 h-4 animate-spin text-[#D4F53C]" />
                <Navigation v-else class="w-4 h-4 text-[#D4F53C]" />
                <span>{{ isLocating ? 'Syncing Hub Coordinates...' : 'Sync Coverage Area GPS' }}</span>
              </button>
            </div>
          </section>
        </div>

        <!-- Right Column: Operational Delivery Hub Form -->
        <form
          @submit.prevent="saveProfileDetails"
          class="lg:col-span-7 bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 sm:p-8 space-y-6"
        >
          <div class="flex items-start justify-between border-b border-gray-100 pb-4">
            <div class="space-y-1">
              <h2 class="text-xs font-black uppercase tracking-widest text-[#0A1128] flex items-center gap-2">
                <MapPin class="w-4 h-4 text-[#65a30d]" />
                Operational Delivery Hub
              </h2>
              <p class="text-xs text-gray-500 font-medium">
                Select your state and neighborhood dispatch hub for accurate rider routing.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- State Select -->
            <div class="space-y-2">
              <label class="block text-[11px] font-black uppercase tracking-wider text-[#0A1128]">
                State <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                  <Loader2 v-if="fetchingLocations" class="w-4 h-4 animate-spin" />
                  <MapPin v-else class="w-4 h-4" />
                </span>
                <select
                  v-model="selectedState"
                  required
                  :disabled="fetchingLocations || uniqueStates.length === 0"
                  class="w-full bg-gray-50/80 border border-gray-200 rounded-xl pl-10 pr-10 py-3.5 text-xs sm:text-sm font-bold text-[#0A1128] focus:border-[#0A1128] focus:ring-2 focus:ring-[#0A1128]/10 focus:bg-white outline-none transition appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    {{ fetchingLocations ? 'Loading states...' : 'Select State' }}
                  </option>
                  <option v-for="state in uniqueStates" :key="state" :value="state">
                    {{ state }}
                  </option>
                </select>
                <ChevronDown class="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <!-- Location Hub Area Select -->
            <div class="space-y-2">
              <label class="block text-[11px] font-black uppercase tracking-wider text-[#0A1128]">
                Location Hub Area <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                  <MapPin class="w-4 h-4" />
                </span>
                <select
                  v-model="editableBaseLocation"
                  required
                  :disabled="!selectedState || filteredLocations.length === 0"
                  class="w-full bg-gray-50/80 border border-gray-200 rounded-xl pl-10 pr-10 py-3.5 text-xs sm:text-sm font-bold text-[#0A1128] focus:border-[#0A1128] focus:ring-2 focus:ring-[#0A1128]/10 focus:bg-white outline-none transition appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    {{ !selectedState ? 'Select state first' : 'Select area hub' }}
                  </option>
                  <option v-for="loc in filteredLocations" :key="loc.id" :value="loc.id">
                    {{ loc.name }}
                  </option>
                </select>
                <ChevronDown class="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <!-- Street Address / Landmark -->
          <div class="space-y-2">
            <label class="block text-[11px] font-black uppercase tracking-wider text-[#0A1128]">
              Specific Street Details / Landmark
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                <Building2 class="w-4 h-4" />
              </span>
              <input
                v-model="editableStreetAddress"
                type="text"
                class="w-full bg-gray-50/80 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-xs sm:text-sm font-semibold text-[#0A1128] placeholder-gray-400 focus:border-[#0A1128] focus:ring-2 focus:ring-[#0A1128]/10 focus:bg-white outline-none transition"
                placeholder="Specific landmark (e.g. Opposite Blue Gate, House 4)..."
              />
            </div>
            <p class="text-[11px] text-gray-400 font-medium">
              Adding a clear landmark helps dispatch riders locate your drop-off point faster.
            </p>
          </div>

          <!-- Submit Action -->
          <div class="pt-3 border-t border-gray-100">
            <button
              type="submit"
              :disabled="isSaving"
              class="w-full bg-[#0A1128] hover:bg-[#131e42] text-[#D4F53C] py-4 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition cursor-pointer border-0 flex items-center justify-center gap-2.5 outline-none shadow-lg active:scale-[0.99] disabled:opacity-50"
            >
              <Loader2 v-if="isSaving" class="w-5 h-5 animate-spin text-[#D4F53C]" />
              <Save v-else class="w-5 h-5 text-[#D4F53C]" />
              <span>{{ isSaving ? 'Synchronizing Changes...' : 'Save Operational Identity' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modular Change Password Modal -->
    <ChangePasswordModal
      v-model:open="isPasswordModalOpen"
      @success="(msg) => showNotification(msg, 'success')"
    />
  </div>
</template>