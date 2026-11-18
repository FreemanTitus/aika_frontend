<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase // Automatically picks up from your .env file

// 1. Unified form data
const formData = reactive({
  booking_type: 'trip',
  customer_name: '',
  customer_phone: '',
  pickup_address: '',
  dropoff_address: '',
  fare_amount: 1500,
  receiver_name: '',
  receiver_phone: '',
  package_description: '',
  is_cash_on_delivery: false
})

const activeTab = ref('trip')
const isSubmitting = ref(false)

// 2. Tab switching logic
const switchTab = (type: string) => {
  activeTab.value = type
  formData.booking_type = type
  
  // Optional: Auto-clear delivery fields when switching back to trip
  if (type === 'trip') {
    formData.receiver_name = ''
    formData.receiver_phone = ''
    formData.package_description = ''
    formData.is_cash_on_delivery = false
  }
}

// 3. Form submission
const handleBookingSubmit = async () => {
  isSubmitting.value = true
  try {
    const response = await $fetch(`${apiBase}/api/v1/bookings/create/ride`, {
      method: 'POST',
      body: formData
    })
    alert(`Booking successful!`)
  } catch (err) {
    alert('Booking failed. Please check your details.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="bg-white p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl mx-auto">
    
    <div class="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-2xl mb-6">
      <button 
        type="button"
        @click="switchTab('trip')"
        :class="[activeTab === 'trip' ? 'bg-white text-[#0A1128] shadow-sm' : 'text-gray-500']"
        class="py-3 rounded-xl font-black transition flex items-center justify-center text-sm cursor-pointer border-0"
      >
        Book a Ride
      </button>
      <button 
        type="button"
        @click="switchTab('delivery')"
        :class="[activeTab === 'delivery' ? 'bg-white text-[#0A1128] shadow-sm' : 'text-gray-500']"
        class="py-3 rounded-xl font-black transition flex items-center justify-center text-sm cursor-pointer border-0"
      >
        Send Package
      </button>
    </div>

    <form @submit.prevent="handleBookingSubmit" class="space-y-4">
      <div>
        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Your Full Name</label>
        <input type="text" v-model="formData.customer_name" required placeholder="John Doe" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4F53C] focus:bg-white transition text-sm text-[#0A1128] font-semibold">
      </div>

      <div>
        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Your Phone Number</label>
        <input type="tel" v-model="formData.customer_phone" required placeholder="080XXXXXXXX" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4F53C] focus:bg-white transition text-sm text-[#0A1128] font-semibold">
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Pickup Location</label>
          <input type="text" v-model="formData.pickup_address" required placeholder="Pickup address" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4F53C] focus:bg-white transition text-sm text-[#0A1128] font-semibold">
        </div>
        <div>
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Drop-off Destination</label>
          <input type="text" v-model="formData.dropoff_address" required placeholder="Dropoff address" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4F53C] focus:bg-white transition text-sm text-[#0A1128] font-semibold">
        </div>
      </div>

      <div v-if="activeTab === 'delivery'" class="space-y-4 pt-4 border-t border-dashed border-gray-200 animate-fade-in">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Receiver's Full Name</label>
            <input type="text" v-model="formData.receiver_name" placeholder="Full Name" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4F53C] focus:bg-white transition text-sm text-[#0A1128] font-semibold">
          </div>
          <div>
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Receiver's Phone Line</label>
            <input type="tel" v-model="formData.receiver_phone" placeholder="080XXXXXXXX" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4F53C] focus:bg-white transition text-sm text-[#0A1128] font-semibold">
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Package Content Summary</label>
          <input type="text" v-model="formData.package_description" placeholder="e.g., Documents, parcels" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4F53C] focus:bg-white transition text-sm text-[#0A1128] font-semibold">
        </div>
      </div>

      <button 
        type="submit" 
        :disabled="isSubmitting"
        class="w-full bg-[#D4F53C] hover:bg-opacity-90 text-[#0A1128] font-black py-4 rounded-xl shadow-lg transition transform active:scale-95 mt-4 cursor-pointer border-0"
      >
        {{ isSubmitting ? 'Requesting...' : (activeTab === 'trip' ? 'Request Ride Instantly' : 'Dispatch Package Now') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>