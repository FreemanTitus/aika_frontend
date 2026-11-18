<!-- pages/admin/customers.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { Users, Search, ShieldCheck, Ban, Mail, Phone, Calendar, MapPin, Loader2, RefreshCw } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')
const searchQuery = ref('')

// Reactive states for customers data, loading, and error handling
const customers = ref<any[]>([])
const pending = ref<boolean>(true)
const error = ref<any>(null)

// Fetch customers directory from Django Ninja backend on mount with explicit headers
const fetchCustomers = async () => {
  pending.value = true
  error.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/customers`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    customers.value = res?.data || res || []
  } catch (err: any) {
    console.error("Customers list fetch error:", err)
    error.value = err
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchCustomers()
})

const filteredCustomers = computed(() => {
  if (!customers.value || !Array.isArray(customers.value)) return []
  if (!searchQuery.value) return customers.value
  const q = searchQuery.value.toLowerCase()
  return customers.value.filter((c: any) => 
    c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="max-w-7xl mx-auto p-6 space-y-8 font-sans text-left">
    
    <!-- Header Section with Fixed Search Alignment -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users :size="20" />
          </span>
          <h1 class="text-xl font-black text-gray-900 tracking-tight">Customer Management</h1>
        </div>
        <p class="text-xs text-gray-500 font-medium">Monitor active platform consumers, delivery addresses, and account statuses.</p>
      </div>

      <div class="flex items-center gap-3 w-full md:w-auto">
        <!-- Clean, Non-overlapping Search Bar -->
        <div class="relative w-full md:w-80">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search :size="16" class="w-4 h-4 shrink-0" />
            </span>
            <input 
                v-model="searchQuery"
                type="text"
                placeholder="Search by name or email..."
                class="w-full pl-10 pr-4 py-3 
                    bg-gray-50 border border-gray-200 rounded-2xl text-xs 
                    font-semibold text-gray-900 outline-none 
                    focus:border-indigo-600 transition shadow-2xs"
            />
        </div>

        <button 
          @click="fetchCustomers" 
          :disabled="pending"
          type="button" 
          class="bg-white border border-gray-200 shadow-xs text-gray-700 text-xs font-bold p-3 rounded-2xl transition flex items-center justify-center hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer outline-none shrink-0"
          title="Refresh Customer Directory"
        >
          <RefreshCw :class="{ 'animate-spin': pending }" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending && !customers.length" class="py-20 text-center space-y-3">
      <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600" />
      <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading customer database...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error && !customers.length" class="p-6 bg-rose-50 border border-rose-100 rounded-3xl text-center space-y-2">
      <h3 class="text-sm font-black text-rose-800">Failed to load customer directory</h3>
      <p class="text-xs text-rose-600 font-medium">Ensure you have active admin staff authorization credentials.</p>
    </div>

    <!-- Customers Table Grid -->
    <div v-else class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50/75 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th class="py-4 px-6">Customer Profile</th>
              <th class="py-4 px-6">Contact Details</th>
              <th class="py-4 px-6">Delivery Address</th>
              <th class="py-4 px-6">Status</th>
              <th class="py-4 px-6">Joined</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-xs font-medium text-gray-600">
            <tr v-for="customer in filteredCustomers" :key="customer.id" class="hover:bg-gray-50/50 transition">
              
              <!-- Profile Column -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                    {{ customer.full_name ? customer.full_name.charAt(0).toUpperCase() : 'U' }}
                  </div>
                  <div>
                    <h4 class="font-black text-gray-900 tracking-tight">{{ customer.full_name }}</h4>
                    <p class="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Mail :size="12" /> {{ customer.email }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Phone Column -->
              <td class="py-4 px-6">
                <span class="flex items-center gap-1.5 text-gray-700 font-semibold">
                  <Phone :size="12" class="text-gray-400" /> {{ customer.phone_number }}
                </span>
              </td>

              <!-- Delivery Address Column -->
              <td class="py-4 px-6 max-w-xs">
                <span class="flex items-start gap-1.5 text-gray-600 truncate">
                  <MapPin :size="13" class="text-indigo-600 shrink-0 mt-0.5" />
                  <span class="truncate" :title="customer.default_delivery_address">{{ customer.default_delivery_address }}</span>
                </span>
              </td>

              <!-- Status Column -->
              <td class="py-4 px-6">
                <span :class="[customer.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100']" class="px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                  <ShieldCheck v-if="customer.is_active" :size="12" />
                  <Ban v-else :size="12" />
                  <span>{{ customer.is_active ? 'Active' : 'Suspended' }}</span>
                </span>
              </td>

              <!-- Date Joined Column -->
              <td class="py-4 px-6">
                <span class="flex items-center gap-1 text-gray-500 text-[11px] whitespace-nowrap">
                  <Calendar :size="12" /> {{ customer.date_joined }}
                </span>
              </td>
            </tr>

            <tr v-if="filteredCustomers.length === 0">
              <td colspan="5" class="py-16 text-center text-gray-400 font-bold uppercase tracking-wider text-xs">
                No customer accounts found matching query.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>