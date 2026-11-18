<!-- error.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, RefreshCw, Home } from '@lucide/vue'

const props = defineProps({
  error: Object
})

const handleError = () => clearError({ redirect: '/' })

const reloadPage = () => {
  if (import.meta.client) {
    window.location.reload()
  }
}

const isNotFound = computed(() => props.error?.statusCode === 404)
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-left">
    <div class="max-w-md w-full bg-white rounded-[32px] border border-gray-100 shadow-xl p-8 space-y-6 text-center">
      
      <!-- Icon Indicator -->
      <div :class="[isNotFound ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600']" class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
        <AlertTriangle :size="32" />
      </div>

      <!-- Error Details -->
      <div class="space-y-2">
        <span class="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
          Error Code: {{ error?.statusCode || 500 }}
        </span>
        <h1 class="text-xl font-black text-gray-900 tracking-tight">
          {{ isNotFound ? 'Page Not Found' : 'System Exception Encountered' }}
        </h1>
        <p class="text-xs text-gray-500 font-medium leading-relaxed">
          {{ isNotFound 
            ? "The dispatch route or portal page you're trying to reach doesn't exist or has been relocated." 
            : (error?.message || 'An unexpected error occurred while communicating with the server gateway.') }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button 
          @click="handleError"
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2 cursor-pointer outline-none border-0"
        >
          <Home :size="16" />
          <span>Return Home</span>
        </button>
        
        <button 
          @click="reloadPage"
          class="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer outline-none border-0"
        >
          <RefreshCw :size="16" />
          <span>Try Again</span>
        </button>
      </div>

    </div>
  </div>
</template>