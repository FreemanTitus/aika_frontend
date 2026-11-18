<!-- pages/admin/locations/index.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { MapPin, Plus, Loader2, RefreshCw, Globe, CheckCircle2, AlertCircle, Map } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

// Form State
const stateName = ref('')
const areaName = ref('')
const pending = ref(false)
const feedback = ref<{ type: 'success' | 'error', text: string } | null>(null)

// Locations List State
const locations = ref<any[]>([])
const fetching = ref(true)

const fetchLocations = async () => {
  fetching.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/locations`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    locations.value = res?.data || res || []
  } catch (err) {
    console.error("Failed to load locations", err)
  } finally {
    fetching.value = false
  }
}

const submitLocation = async () => {
  if (!stateName.value || !areaName.value) return
  pending.value = true
  feedback.value = null

  try {
    await $fetch(`${apiBase}/api/v1/admin/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: {
        state_name: stateName.value,
        area_name: areaName.value
      }
    })
    
    feedback.value = { 
      type: 'success', 
      text: `${areaName.value}, ${stateName.value} was added successfully. Geocoding is running in the background.` 
    }
    stateName.value = ''
    areaName.value = ''
    
    // Refresh the list to show the newly added location
    fetchLocations()
  } catch (err: any) {
    feedback.value = {
      type: 'error',
      text: err.response?._data?.detail || 'Failed to add location. Check for duplicates.'
    }
  } finally {
    pending.value = false
  }
}

onMounted(fetchLocations)

// Metrics
const totalLocations = computed(() => locations.value.length)
const uniqueStates = computed(() => new Set(locations.value.map(l => l.state_name)).size)
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-6 lg:p-10 text-left space-y-8">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Coverage Areas Management</h1>
          <p class="text-xs text-gray-500 font-medium mt-0.5">Define and manage operational states and regional hubs for vendors and riders.</p>
        </div>

        <button @click="fetchLocations" :disabled="fetching" class="bg-white border border-gray-200 shadow-2xs text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 hover:bg-gray-50 cursor-pointer outline-none shrink-0">
          <RefreshCw :class="{ 'animate-spin': fetching }" class="w-4 h-4 text-indigo-600" />
          <span>Sync Database</span>
        </button>
      </div>

      <!-- Main Layout Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- LEFT COLUMN: ADD LOCATION FORM -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-6">
            <div class="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <MapPin :size="18" />
              </div>
              <div>
                <h3 class="text-sm font-black text-gray-900 tracking-tight">Add New Hub</h3>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expand Coverage</p>
              </div>
            </div>

            <form @submit.prevent="submitLocation" class="space-y-4">
              <!-- State Input -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">State Name</label>
                <div class="bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-3 flex items-center transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                  <input 
                    v-model="stateName" 
                    type="text" 
                    required
                    placeholder="e.g. Nasarawa" 
                    class="w-full text-xs font-semibold text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
                  />
                </div>
              </div>

              <!-- Area Input -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">Coverage Area / City</label>
                <div class="bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-3 flex items-center transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                  <input 
                    v-model="areaName" 
                    type="text" 
                    required
                    placeholder="e.g. Akwanga" 
                    class="w-full text-xs font-semibold text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
                  />
                </div>
              </div>

              <!-- Submit Button -->
              <button 
                type="submit" 
                :disabled="pending || !stateName || !areaName" 
                class="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-3.5 rounded-2xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <Loader2 v-if="pending" class="w-4 h-4 animate-spin" />
                <Plus v-else class="w-4 h-4" />
                <span>{{ pending ? 'Provisioning Hub...' : 'Register Coverage Area' }}</span>
              </button>
            </form>

            <!-- Feedback Alert -->
            <div v-if="feedback" :class="[
              'p-3 rounded-xl flex items-start gap-2 border text-[11px] font-bold leading-relaxed',
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
            ]">
              <CheckCircle2 v-if="feedback.type === 'success'" class="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <AlertCircle v-else class="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{{ feedback.text }}</span>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-[10px] font-black uppercase tracking-wider text-emerald-600">Active States</p>
              <p class="text-2xl font-black text-emerald-700 font-mono">{{ uniqueStates }}</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Map :size="20" />
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: ACTIVE LOCATIONS LIST -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden h-full flex flex-col">
            <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-indigo-600"></div>
                <h3 class="text-xs font-black text-gray-700 uppercase tracking-wider">Active Regional Database</h3>
              </div>
              <span class="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-2xs">Total Hubs: {{ totalLocations }}</span>
            </div>

            <!-- Loading State -->
            <div v-if="fetching && !locations.length" class="flex-1 py-24 text-center">
              <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">Loading Regions...</p>
            </div>

            <!-- Locations Grid Matrix -->
            <div v-else class="p-6 overflow-y-auto max-h-[600px]">
              <div v-if="locations.length === 0" class="py-12 text-center text-gray-400 font-bold uppercase tracking-wider space-y-1">
                <Globe class="w-10 h-10 mx-auto text-gray-200 mb-3" />
                <p>No operational locations found.</p>
                <p class="text-[10px] text-gray-300">Add a new hub using the form to begin.</p>
              </div>

              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-for="loc in locations" :key="loc.id" class="border border-gray-100 bg-gray-50/30 rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-100 hover:bg-indigo-50/30 transition">
                  <div class="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-2xs flex items-center justify-center shrink-0 text-indigo-400">
                    <Globe :size="16" />
                  </div>
                  <div>
                    <p class="text-sm font-black text-gray-900">{{ loc.name }}</p>
                    <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{{ loc.state_name }} State</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>