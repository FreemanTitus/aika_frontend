<!-- pages/admin/reviews.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader2, MessageSquare, CheckCircle2, Trash2, RefreshCw, ShieldCheck } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const reviews = ref<any[]>([])
const isLoading = ref(true)

const fetchReviews = async () => {
  isLoading.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/admin/reviews`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    reviews.value = res?.reviews || []
  } catch (err) {
    console.error("Failed to fetch admin reviews", err)
  } finally {
    isLoading.value = false
  }
}

const toggleApproval = async (reviewId: number) => {
  try {
    await $fetch(`${apiBase}/api/v1/admin/reviews/${reviewId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    await fetchReviews()
  } catch (err: any) {
    alert(err?.data?.detail || "Failed to update review approval status.")
  }
}

const deleteReview = async (reviewId: number) => {
  if (!confirm("Are you sure you want to delete this review?")) return
  try {
    await $fetch(`${apiBase}/api/v1/admin/reviews/${reviewId}/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    await fetchReviews()
  } catch (err: any) {
    alert(err?.data?.detail || "Failed to delete review.")
  }
}

onMounted(fetchReviews)
</script>

<template>
  <div class="space-y-8 text-left max-w-5xl mx-auto">
    
    <!-- Enhanced Header Banner Card -->
    <div class="bg-[#0A1128] text-white p-6 sm:p-8 rounded-[32px] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-[#D4F53C]/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div class="flex items-center space-x-4 relative z-10">
        <div class="w-14 h-14 bg-white/10 border border-white/20 text-[#D4F53C] rounded-2xl flex items-center justify-center shadow-inner shrink-0">
          <MessageSquare class="w-7 h-7" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-[#D4F53C] bg-[#D4F53C]/10 px-3 py-1 rounded-full border border-[#D4F53C]/20">Moderation Hub</span>
          <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">Customer Reviews</h2>
          <p class="text-xs text-gray-300 font-medium mt-0.5">
            Manage and approve customer testimonials featured on the platform landing page.
          </p>
        </div>
      </div>
      
      <button 
        type="button"
        @click="fetchReviews" 
        :disabled="isLoading"
        class="relative z-10 px-5 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black rounded-2xl transition shadow-lg flex items-center gap-2 cursor-pointer outline-none backdrop-blur-md"
      >
        <RefreshCw :class="{ 'animate-spin': isLoading }" class="w-4 h-4 text-[#D4F53C]" />
        <span>Refresh Reviews</span>
      </button>
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="flex justify-center py-24">
      <Loader2 class="w-8 h-8 animate-spin text-[#0A1128]" />
    </div>

    <!-- Empty State -->
    <div v-else-if="reviews.length === 0" class="bg-white border border-gray-100 rounded-[32px] p-16 text-center text-gray-400 shadow-sm">
      <MessageSquare class="w-12 h-12 mx-auto mb-3 opacity-20 text-[#0A1128]" />
      <p class="text-xs font-black uppercase tracking-wider text-gray-500">No customer reviews submitted yet.</p>
      <p class="text-[11px] text-gray-400 mt-1">Reviews submitted from the homepage will appear here for moderation.</p>
    </div>

    <!-- Reviews Grid Layout -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div 
        v-for="rev in reviews" 
        :key="rev.id" 
        class="bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-6 relative group"
      >
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-gray-100 text-gray-600 border border-gray-200">
              {{ rev.role }}
            </span>
            <span 
              :class="rev.is_approved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'"
              class="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-xl border flex items-center gap-1.5 shadow-2xs"
            >
              <span :class="rev.is_approved ? 'bg-emerald-500' : 'bg-amber-500'" class="w-1.5 h-1.5 rounded-full"></span>
              {{ rev.is_approved ? 'Live on Site' : 'Pending Moderation' }}
            </span>
          </div>

          <div class="relative pl-4 border-l-2 border-[#D4F53C]">
            <p class="text-sm font-semibold text-gray-700 leading-relaxed italic">
              “{{ rev.comment }}”
            </p>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h4 class="text-xs font-black text-[#0A1128]">{{ rev.name }}</h4>
            <p class="text-[10px] text-gray-400 font-mono mt-0.5">{{ new Date(rev.created_at).toLocaleDateString() }}</p>
          </div>

          <div class="flex items-center gap-2">
            <button 
              @click="toggleApproval(rev.id)"
              :class="rev.is_approved ? 'bg-amber-100 hover:bg-amber-200 text-amber-900' : 'bg-[#0A1128] hover:bg-[#151f42] text-[#D4F53C]'"
              class="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer border-0 shadow-sm flex items-center gap-1.5"
            >
              <ShieldCheck class="w-3.5 h-3.5" />
              <span>{{ rev.is_approved ? 'Unapprove' : 'Approve' }}</span>
            </button>
            <button 
              @click="deleteReview(rev.id)"
              class="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer border-0 shadow-2xs"
              title="Delete Review"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>