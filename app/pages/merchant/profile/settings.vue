<!-- pages/merchant/settings/profile.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useCookie, useRuntimeConfig } from '#app'
import { 
  Store, 
  Layers, 
  Phone, 
  Clock, 
  UploadCloud, 
  Save, 
  Loader2,
  X,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Navigation,
  Truck
} from '@lucide/vue'
import { siInstagram, siX } from 'simple-icons'
import BrandIcon from '@/components/BrandIcon.vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const router = useRouter()
const authToken = useCookie('auth_token')
const businessTypeCookie = useCookie('business_type')

// Structural UI State Tracking Controls
const isPageLoading = ref(true)
const isSubmitting = ref(false)
const serverError = ref<string | null>(null)
const showSuccessToast = ref(false)

// Geolocation Status Tracking
const isGettingLocation = ref(false)
const locationStatusMessage = ref<string | null>(null)
const locationStatusIsError = ref(false)

// Banner Preview Memory Anchors
const heroBannerFile = ref<File | null>(null)
const heroBannerPreview = ref<string | null>(null)

// Locations Data List & State Selection
const availableLocations = ref<any[]>([])
const selectedState = ref<string>('')

// Complete Reactive Payload Data Fields Map
const form = ref({
  company_name: '',
  business_type: '',
  ecommerce_sub_category: '',
  phone_number: '',
  opening_time: '08:00',
  closing_time: '22:00',
  base_location_id: '' as string | number,
  street_address: '',
  
  // Geospatial Coordinates
  latitude: null as number | null,
  longitude: null as number | null,
  
  // Custom Extended Retail & Storefront Specs
  tagline: '',
  brand_bio: '',
  instagram_handle: '',
  twitter_handle: '',
  
  // Fulfillment Policy Choice
  fulfillment_policy: 'platform'
})

const isEcommerce = computed(() => form.value.business_type === 'e_commerce')

// Helper to derive coordinates from a CoverageArea object without mutating it
const getHubCoordinates = (hub: any) => {
  if (!hub || hub.latitude == null || hub.longitude == null) return null
  const baseLat = Number(hub.latitude)
  const baseLng = Number(hub.longitude)
  if (Number.isNaN(baseLat) || Number.isNaN(baseLng) || baseLat === 0 || baseLng === 0) {
    return null
  }
  return {
    latitude: Number(baseLat.toFixed(6)),
    longitude: Number(baseLng.toFixed(6))
  }
}

// Fetch active coverage areas from the database (matching registration pattern)
const fetchLocations = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/locations`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    availableLocations.value = res?.data || res || []
  } catch (err) {
    console.error("Failed to load locations", err)
  }
}

// Extract a unique list of states from the fetched locations
const uniqueStates = computed(() => {
  const states = availableLocations.value.map(loc => loc.state_name)
  return [...new Set(states)].sort()
})

// Filter locations to only show areas within the selected state
const filteredLocations = computed(() => {
  if (!selectedState.value) return []
  return availableLocations.value
    .filter(loc => loc.state_name === selectedState.value)
    .sort((a, b) => a.name.localeCompare(b.name))
})

// Current resolved CoverageArea object
const activeHubSummary = computed(() => {
  if (!form.value.base_location_id) return null
  return (
    availableLocations.value.find(
      loc => String(loc.id) === String(form.value.base_location_id)
    ) || null
  )
})

// Check if valid coordinates are already captured on the account
const hasExistingCoordinates = computed(() => {
  const lat = Number(form.value.latitude)
  const lng = Number(form.value.longitude)
  return form.value.latitude !== null && form.value.longitude !== null && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
})

// =========================================================================
// DATA HOOK: LIFECYCLE HYDRATION WITH EXPLICIT HEADERS
// =========================================================================
onMounted(async () => {
  if (!authToken.value) {
    router.push('/auth/login')
    return
  }

  try {
    // Fetch locations first so the dropdown arrays are populated
    await fetchLocations()

    const profile: any = await $fetch(`${apiBase}/api/v1/merchant/profile`, {
      headers: { 'ngrok-skip-browser-warning': 'true', Authorization: `Bearer ${authToken.value}` }
    })

    if (profile) {
      form.value.company_name = profile.company_name || ''
      form.value.business_type = profile.business_type || ''
      form.value.ecommerce_sub_category = profile.ecommerce_sub_category || ''
      form.value.phone_number = profile.phone_number || ''
      
      // Assign the numeric base location ID returned by the API
      form.value.base_location_id = profile.base_location || ''
      form.value.street_address = profile.street_address || ''
      form.value.latitude = profile.latitude ?? null
      form.value.longitude = profile.longitude ?? null

      // Pre-select state automatically using the fetched base_location ID
      if (form.value.base_location_id && availableLocations.value.length > 0) {
        const matchingLoc = availableLocations.value.find(loc => String(loc.id) === String(form.value.base_location_id))
        if (matchingLoc) {
          selectedState.value = matchingLoc.state_name

          // Seed coordinates from the selected CoverageArea if none are saved yet
          if (!hasExistingCoordinates.value) {
            const hubCoords = getHubCoordinates(matchingLoc)
            if (hubCoords) {
              form.value.latitude = hubCoords.latitude
              form.value.longitude = hubCoords.longitude
            }
          }
        }
      }

      if (profile.opening_time) form.value.opening_time = profile.opening_time.substring(0, 5)
      if (profile.closing_time) form.value.closing_time = profile.closing_time.substring(0, 5)

      form.value.tagline = profile.tagline || ''
      form.value.brand_bio = profile.brand_bio || ''
      form.value.instagram_handle = profile.instagram_handle || ''
      form.value.twitter_handle = profile.twitter_handle || ''
      
      if (profile.fulfillment_policy) {
        form.value.fulfillment_policy = profile.fulfillment_policy
      }

      if (profile.hero_image) {
        heroBannerPreview.value = profile.hero_image.startsWith('http')
          ? profile.hero_image
          : `${config.public.apiClientBase || apiBase}${profile.hero_image}`
      }
    }
  } catch (err: any) {
    console.error("Profile Hydration Trace Error:", err)
    serverError.value = "Failed to synchronize existing identity settings configurations."
  } finally {
    isPageLoading.value = false
  }
})

// Automatically sync GPS coordinates whenever the merchant selects a different CoverageArea hub
watch(() => form.value.base_location_id, (newHubId, oldHubId) => {
  if (!newHubId || String(newHubId) === String(oldHubId)) return
  const hub = availableLocations.value.find(loc => String(loc.id) === String(newHubId))
  const hubCoords = getHubCoordinates(hub)
  if (hubCoords) {
    form.value.latitude = hubCoords.latitude
    form.value.longitude = hubCoords.longitude
    locationStatusIsError.value = false
    locationStatusMessage.value = `Hub coordinates auto-filled for ${hub.name}.`
  }
})

// Sync coordinates directly from the selected CoverageArea hub
const syncCoverageAreaCoordinates = async () => {
  if (!activeHubSummary.value) {
    locationStatusIsError.value = true
    locationStatusMessage.value = "Please select a state and operational hub base first."
    return
  }

  isGettingLocation.value = true
  locationStatusIsError.value = false
  locationStatusMessage.value = `Syncing coordinates from ${activeHubSummary.value.name} coverage area...`

  const hubCoords = getHubCoordinates(activeHubSummary.value)
  if (!hubCoords) {
    isGettingLocation.value = false
    locationStatusIsError.value = true
    locationStatusMessage.value = `Coordinates are not yet mapped for ${activeHubSummary.value.name}. You can still save your hub and street address.`
    return
  }

  form.value.latitude = hubCoords.latitude
  form.value.longitude = hubCoords.longitude
  isGettingLocation.value = false
  locationStatusMessage.value = `Hub GPS synced (${activeHubSummary.value.name}): ${hubCoords.latitude.toFixed(4)}, ${hubCoords.longitude.toFixed(4)}`
}

const handleBannerSelection = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const selectedFile = target.files[0]
    heroBannerFile.value = selectedFile
    heroBannerPreview.value = URL.createObjectURL(selectedFile)
  }
}

const clearSelectedBanner = () => {
  heroBannerFile.value = null
  heroBannerPreview.value = null
}

// =========================================================================
// INTERCEPT SUBMIT AND TRANSMIT FORMDATA PAYLOAD
// =========================================================================
const handleProfileSubmission = async () => {
  if (!form.value.base_location_id) {
    serverError.value = "Please select your state and operational base hub area."
    return
  }

  isSubmitting.value = true
  serverError.value = null

  // Ensure coordinates are resolved from the selected CoverageArea if missing
  if (!hasExistingCoordinates.value && activeHubSummary.value) {
    const hubCoords = getHubCoordinates(activeHubSummary.value)
    if (hubCoords) {
      form.value.latitude = hubCoords.latitude
      form.value.longitude = hubCoords.longitude
    }
  }
  
  const formData = new FormData()
  
  formData.append('company_name', form.value.company_name.trim())
  formData.append('business_type', form.value.business_type)
  formData.append('phone_number', form.value.phone_number.trim())
  formData.append('opening_time', form.value.opening_time)
  formData.append('closing_time', form.value.closing_time)
  
  // Ensure base_location is appended with the correct key expected by the schema
  formData.append('base_location', String(form.value.base_location_id))
  
  formData.append('street_address', form.value.street_address.trim())
  
  if (form.value.latitude !== null) formData.append('latitude', String(form.value.latitude))
  if (form.value.longitude !== null) formData.append('longitude', String(form.value.longitude))

  if (form.value.ecommerce_sub_category) {
    formData.append('ecommerce_sub_category', form.value.ecommerce_sub_category)
  }

  formData.append('tagline', form.value.tagline.trim())
  formData.append('brand_bio', form.value.brand_bio.trim())
  formData.append('instagram_handle', form.value.instagram_handle.trim().replace('@', ''))
  formData.append('twitter_handle', form.value.twitter_handle.trim().replace('@', ''))
  formData.append('fulfillment_policy', form.value.fulfillment_policy)
  
  if (heroBannerFile.value) {
    formData.append('hero_image', heroBannerFile.value)
  }

  try {
    await $fetch(`${apiBase}/api/v1/merchant/dashboard/profile/update`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: formData
    })

    if (form.value.business_type) {
      businessTypeCookie.value = form.value.business_type
    }

    showSuccessToast.value = true
    setTimeout(() => {
      router.push('/merchant/dashboard')
    }, 1500)
  } catch (err: any) {
    serverError.value = err?.data?.detail || err?.message || "An error occurred compiling changes."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="py-10 px-4 sm:px-6 lg:px-12 bg-gray-50/40 min-h-screen text-left">

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSuccessToast" class="fixed inset-0 bg-[#0A1128]/40 backdrop-blur-xs z-[100000] flex items-center justify-center p-4">
          <div class="bg-white rounded-[28px] border border-gray-100 p-8 max-w-sm w-full text-center shadow-2xl space-y-4 animate-scale-up">
            <div class="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div class="space-y-1">
              <h3 class="text-sm font-black text-[#0A1128] tracking-tight uppercase">Sync Complete</h3>
              <p class="text-[11px] text-gray-400 font-semibold leading-relaxed">
                Business profile parameters successfully synchronized! Redirecting to dashboard...
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <div v-if="isPageLoading" class="py-32 text-center space-y-4">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0A1128] mx-auto"></div>
      <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">Hydrating Profile Matrices...</p>
    </div>

    <div v-else class="max-w-3xl mx-auto space-y-8">
      
      <div>
        <span class="bg-[#D4F53C]/20 text-emerald-800 font-black px-3 py-1 rounded-md text-[10px] uppercase tracking-widest inline-block">
          Identity Registry &bull; Regional Hub Routing
        </span>
        <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight mt-2">Business Profile Settings</h1>
        <p class="text-sm text-gray-400 mt-1">Update your operational base hub, public storefront branding, and delivery policies.</p>
      </div>

      <form @submit.prevent="handleProfileSubmission" class="bg-white rounded-[32px] border border-gray-100 shadow-2xl p-6 sm:p-10 space-y-6">
        
        <div v-if="serverError" class="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-semibold text-rose-800 flex items-start space-x-2 animate-fade-in">
          <AlertCircle class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{{ serverError }}</span>
        </div>

        <div class="space-y-6">
          
          <div class="space-y-1.5">
            <label class="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center space-x-2">
              <Store class="w-3.5 h-3.5" />
              <span>Registered Business Name</span>
            </label>
            <input v-model="form.company_name" type="text" placeholder="e.g., TechForge Hub, Pride Kitchen" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128] focus:bg-white transition" required />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center space-x-2">
                <Layers class="w-3.5 h-3.5" />
                <span>Core Industry Classification</span>
              </label>
              <select v-model="form.business_type" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer">
                <option value="restaurant">Restaurant / Kitchen Operations</option>
                <option value="e_commerce">E-Commerce Retail Storefront</option>
                <option value="other">Other Framework Business</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center space-x-2">
                <Phone class="w-3.5 h-3.5" />
                <span>Official Support Line</span>
              </label>
              <input v-model="form.phone_number" type="tel" placeholder="e.g., +23480..." class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128] focus:bg-white transition" required />
            </div>
          </div>

          <div v-if="isEcommerce" class="space-y-1.5 animate-slide-in">
            <label class="text-[11px] font-black uppercase tracking-wider text-gray-400">Retail Operation Category Niche</label>
            <select v-model="form.ecommerce_sub_category" class="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer">
              <option value="">Select Primary Market Niche</option>
              <option value="gadgets">Gadgets &amp; Tech Systems</option>
              <option value="apparel">Clothing &amp; Retail Apparel</option>
              <option value="appliances">Home Appliances Matrix</option>
              <option value="beauty">Beauty &amp; Aesthetics Cosmetics</option>
            </select>
          </div>

          <!-- FULFILLMENT PREFERENCE CONFIGURATION -->
          <div class="bg-gray-50 border border-gray-100 p-5 sm:p-6 rounded-2xl space-y-4">
            <h3 class="text-xs font-black uppercase tracking-wider text-[#0A1128] border-b border-gray-200/60 pb-2.5 flex items-center space-x-2">
              <Truck class="w-4 h-4 text-amber-600" />
              <span>Logistics &amp; Delivery Preference Policy</span>
            </h3>
            
            <div class="space-y-3">
              <label class="flex items-start space-x-3 p-3.5 bg-white border border-gray-200/80 rounded-xl cursor-pointer hover:border-gray-400 transition">
                <input type="radio" v-model="form.fulfillment_policy" value="platform" class="mt-0.5 text-[#0A1128] focus:ring-[#0A1128]" />
                <div class="space-y-0.5">
                  <p class="text-xs font-black text-[#0A1128]">Platform Logistics Only</p>
                  <p class="text-[11px] text-gray-400 font-medium">Aika riders handle all local dispatches and deliveries.</p>
                </div>
              </label>

              <label class="flex items-start space-x-3 p-3.5 bg-white border border-gray-200/80 rounded-xl cursor-pointer hover:border-gray-400 transition">
                <input type="radio" v-model="form.fulfillment_policy" value="hybrid" class="mt-0.5 text-[#0A1128] focus:ring-[#0A1128]" />
                <div class="space-y-0.5">
                  <p class="text-xs font-black text-[#0A1128]">Hybrid (Platform Inside Region, Self Outside)</p>
                  <p class="text-[11px] text-gray-400 font-medium">Aika riders deliver within your hub region (Akwanga, Lafia, Keffi), but you handle and ship out orders yourself when customers order from outside your region.</p>
                </div>
              </label>

              <label class="flex items-start space-x-3 p-3.5 bg-white border border-gray-200/80 rounded-xl cursor-pointer hover:border-gray-400 transition">
                <input type="radio" v-model="form.fulfillment_policy" value="self" class="mt-0.5 text-[#0A1128] focus:ring-[#0A1128]" />
                <div class="space-y-0.5">
                  <p class="text-xs font-black text-[#0A1128]">Vendor Self-Delivery Only</p>
                  <p class="text-[11px] text-gray-400 font-medium">You handle all deliveries and shipping for your products personally or via external waybills.</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Storefront Design Customization -->
          <div class="bg-[#0A1128] p-5 sm:p-6 rounded-2xl text-white border border-white/5 space-y-4">
            <h3 class="text-xs font-black uppercase tracking-wider text-[#D4F53C] border-b border-white/10 pb-2.5 flex items-center space-x-2">
              <span>Storefront Design Customization</span>
            </h3>

            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-wider text-gray-300 block">Storefront Showcase Banner</label>
              <div class="flex items-center space-x-4">
                <div class="relative bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-sm transition active:scale-95 flex items-center space-x-2 cursor-pointer select-none">
                  <UploadCloud class="w-4 h-4 text-[#D4F53C]" />
                  <span>Choose Banner Image</span>
                  <input @change="handleBannerSelection" type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <span class="text-xs text-gray-400 truncate max-w-[200px] font-mono">
                  {{ heroBannerFile ? heroBannerFile.name : 'Default Active' }}
                </span>
              </div>
              
              <div v-if="heroBannerPreview" class="w-full h-24 rounded-xl overflow-hidden border border-white/10 relative mt-2 animate-fade-in">
                <img :src="heroBannerPreview" class="w-full h-full object-cover" alt="Banner canvas" />
                <button @click="clearSelectedBanner" type="button" class="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-md hover:bg-black transition"><X class="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div class="space-y-1.5 pt-1">
              <label class="text-[11px] font-black uppercase tracking-wider text-gray-300 block">Slogan / Brand Tagline</label>
              <input v-model="form.tagline" type="text" placeholder="e.g., Fast Delivery. Fresh Meals Daily." class="w-full bg-white/5 border border-white/10 focus:border-white focus:bg-white/10 text-white rounded-xl px-4 py-3 text-xs font-semibold outline-none" />
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase tracking-wider text-gray-300 block">Brand Mission Statement / Bio</label>
              <textarea v-model="form.brand_bio" rows="3" placeholder="Detail store operations metrics or customer guidelines safely..." class="w-full bg-white/5 border border-white/10 focus:border-white focus:bg-white/10 text-white rounded-xl px-4 py-3 text-xs font-semibold outline-none resize-none"></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-gray-300 flex items-center space-x-1.5 uppercase tracking-wide">
                  <BrandIcon :path="siInstagram.path" size="24" class="text-pink-600 hover:opacity-80" />
                  <span>Instagram Handle</span>
                </label>
                <input v-model="form.instagram_handle" type="text" placeholder="e.g., brand_hub" class="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-gray-300 flex items-center space-x-1.5 uppercase tracking-wide">
                  <BrandIcon :path="siX.path" size="24" class="text-gray-900 hover:opacity-80" />
                  <span>Twitter Handle</span>
                </label>
                <input v-model="form.twitter_handle" type="text" placeholder="e.g., brand_ng" class="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none" />
              </div>
            </div>
          </div>

          <div class="bg-gray-50 border border-gray-100 p-5 sm:p-6 rounded-2xl space-y-4">
            <h3 class="text-xs font-black uppercase tracking-wider text-[#0A1128] border-b border-gray-200/60 pb-2.5 flex items-center space-x-2">
              <Clock class="w-4 h-4 text-emerald-700" />
              <span>Operational Hours Scheduling Window</span>
            </h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-wide block">Opening Time</label>
                <input v-model="form.opening_time" type="time" class="w-full bg-white border border-gray-200/80 rounded-xl px-4 py-2.5 text-xs font-black text-[#0A1128] outline-none" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-wide block">Closing Time</label>
                <input v-model="form.closing_time" type="time" class="w-full bg-white border border-gray-200/80 rounded-xl px-4 py-2.5 text-xs font-black text-[#0A1128] outline-none" />
              </div>
            </div>
          </div>

          <!-- Base Location Hub Selection & Coverage Area Coordinates -->
          <div class="space-y-4 bg-gray-50 border border-gray-100 p-5 sm:p-6 rounded-2xl">
            <h3 class="text-xs font-black uppercase tracking-wider text-[#0A1128] border-b border-gray-200/60 pb-2.5 flex items-center justify-between">
              <span class="flex items-center space-x-2">
                <MapPin class="w-4 h-4 text-indigo-600" />
                <span>Storefront Hub Base &amp; Address</span>
              </span>
              
              <span v-if="hasExistingCoordinates" class="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 class="w-3 h-3 text-emerald-600" /> Hub GPS Locked
              </span>
            </h3>

            <!-- State Selector -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase tracking-wider text-gray-400">State *</label>
              <select 
                v-model="selectedState" 
                @change="form.base_location_id = ''" 
                class="w-full bg-white border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer"
              >
                <option value="" disabled>Select State</option>
                <option v-for="st in uniqueStates" :key="st" :value="st">{{ st }}</option>
              </select>
            </div>

            <!-- Coverage Area / Hub Selector -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase tracking-wider text-gray-400">Operational Hub Base *</label>
              <select 
                v-model="form.base_location_id" 
                required 
                :disabled="!selectedState || filteredLocations.length === 0"
                class="w-full bg-white border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-black text-[#0A1128] focus:outline-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <option value="" disabled>{{ !selectedState ? 'Select state first' : 'Select area / hub' }}</option>
                <option v-for="loc in filteredLocations" :key="loc.id" :value="loc.id">
                  {{ loc.name }}
                </option>
              </select>
            </div>
            
            <div class="space-y-1.5">
              <label class="text-[11px] font-black uppercase tracking-wider text-gray-400">Specific Street Details</label>
              <input 
                v-model="form.street_address" 
                type="text" 
                placeholder="e.g., Layout Road, GRA..." 
                class="w-full bg-white border border-gray-200/80 rounded-xl px-4 py-3.5 text-xs font-semibold text-[#0A1128]" 
              />
            </div>

            <!-- Coverage Area Geolocation Sync Trigger -->
            <div class="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-gray-200/60 p-4 rounded-2xl shadow-2xs">
              <div class="space-y-0.5">
                <p class="text-xs font-black text-[#0A1128]">
                  {{ activeHubSummary ? `${activeHubSummary.name} Hub GPS Coordinates` : 'Coverage Area GPS Coordinates' }}
                </p>
                <p class="text-[11px] text-gray-400 font-medium font-mono">
                  {{ hasExistingCoordinates ? `Lat: ${Number(form.latitude).toFixed(5)}, Lng: ${Number(form.longitude).toFixed(5)}` : 'Select an operational hub area to lock GPS coordinates.' }}
                </p>
              </div>

              <button 
                @click="syncCoverageAreaCoordinates" 
                :disabled="isGettingLocation || !activeHubSummary"
                type="button" 
                class="bg-gray-100 hover:bg-[#0A1128] hover:text-[#D4F53C] text-[#0A1128] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 shrink-0 cursor-pointer border-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Loader2 v-if="isGettingLocation" class="w-3.5 h-3.5 animate-spin" />
                <Navigation v-else class="w-3.5 h-3.5" />
                <span>{{ hasExistingCoordinates ? 'Sync Hub GPS' : 'Load Hub GPS' }}</span>
              </button>
            </div>
            <p
              v-if="locationStatusMessage"
              :class="locationStatusIsError ? 'text-rose-600' : 'text-emerald-700'"
              class="text-[10px] font-bold px-1"
            >
              {{ locationStatusMessage }}
            </p>

            <p class="text-[10px] text-gray-400 font-medium leading-relaxed">Merchants are grouped under regional coverage zones for precise order dispatch and delivery routing.</p>
          </div>

        </div>

        <div class="pt-6 border-t border-gray-100 flex items-center justify-end">
          <button :disabled="isSubmitting" type="submit" class="w-full sm:w-auto bg-[#0A1128] text-white font-black text-xs sm:text-sm py-4 px-8 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center space-x-2 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <Save v-else class="w-4 h-4" />
            <span>Save Profile Configurations</span>
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
@keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-slide-in { animation: slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
</style>