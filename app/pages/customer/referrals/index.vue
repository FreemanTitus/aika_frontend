<!-- pages/customer/referrals.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { 
  Gift, 
  Copy, 
  Check, 
  Users, 
  Award, 
  Clock, 
  Loader2, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Share2
} from '@lucide/vue'

definePageMeta({
  layout: 'customer',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

interface ReferralItem {
  invitee_name: string;
  invitee_email: string;
  has_completed_qualifying_order: boolean;
  reward_granted: boolean;
  created_at: string;
}

interface ReferralData {
  referral_code: string;
  total_referrals: number;
  successful_rewards: number;
  pending_rewards: number;
  referrals: ReferralItem[];
}

const referralData = ref<ReferralData>({
  referral_code: '',
  total_referrals: 0,
  successful_rewards: 0,
  pending_rewards: 0,
  referrals: []
})

const pending = ref(true)
const errorMessage = ref<string | null>(null)
const copiedCode = ref(false)

const fetchReferrals = async () => {
  pending.value = true
  errorMessage.value = null

  try {
    const res: any = await $fetch(`${apiBase}/api/v1/customer/referrals`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    referralData.value = res?.data || res || referralData.value
  } catch (err: any) {
    console.error("Failed to fetch referral records:", err)
    errorMessage.value = err?.data?.detail || err?.message || "Could not load referral data."
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchReferrals()
})

const copyReferralCode = () => {
  const code = referralData.value?.referral_code
  if (!code) return
  navigator.clipboard.writeText(code)
  copiedCode.value = true
  setTimeout(() => { copiedCode.value = false }, 2500)
}

const shareReferralLink = () => {
  const code = referralData.value?.referral_code
  const shareText = `Join Aika using my referral code ${code} for quick deliveries and rides!`
  
  if (navigator.share) {
    navigator.share({
      title: 'Aika Referral',
      text: shareText,
      url: window.location.origin + `/auth/register?ref=${code}`
    }).catch(console.error)
  } else {
    copyReferralCode()
  }
}
</script>

<template>
  <div class="bg-[#F8FAFC] min-h-screen py-6 sm:py-10 px-3 sm:px-8 font-sans text-[#0A1128] relative text-left">
    
    <div class="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#D4F53C]/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute top-1/3 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

    <div class="max-w-5xl mx-auto space-y-6 sm:space-y-8 relative z-10">
      
      <!-- Referral Header Banner -->
      <div class="bg-gradient-to-br from-[#0A1128] via-[#101b3b] to-[#0A1128] text-white p-6 sm:p-10 rounded-[28px] sm:rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-white/10">
        <div class="absolute -right-12 -bottom-12 w-48 h-48 bg-[#D4F53C]/15 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="space-y-4 z-10 max-w-lg">
          <div class="inline-flex items-center gap-1.5 bg-[#D4F53C] text-[#0A1128] font-black px-3.5 py-1 rounded-full text-[10px] uppercase tracking-widest shadow-sm">
            <Sparkles class="w-3 h-3 text-[#0A1128]" />
            <span>Referral Program</span>
          </div>
          
          <div class="space-y-1">
            <h1 class="text-xl sm:text-3xl font-black tracking-tight text-white">
              Invite Friends &amp; Earn Rewards
            </h1>
            <p class="text-gray-300 text-xs font-medium leading-relaxed">
              Share your unique referral code with friends. Once they complete their qualifying order, bonus rewards are automatically added to your wallet!
            </p>
          </div>

          <!-- Code Box -->
          <div class="bg-white/10 border border-white/15 p-4 rounded-2xl flex items-center justify-between gap-4 backdrop-blur-md">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-[#D4F53C] text-[#0A1128] flex items-center justify-center font-black shadow-sm shrink-0">
                <Gift class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Your Referral Code</span>
                <div class="text-sm sm:text-base font-black font-mono text-[#D4F53C] truncate">
                  {{ referralData?.referral_code || 'Loading...' }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button 
                type="button"
                @click="copyReferralCode"
                class="px-3.5 py-2.5 bg-white hover:bg-gray-100 text-[#0A1128] rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 cursor-pointer border-0 outline-none"
              >
                <Check v-if="copiedCode" class="w-4 h-4 stroke-[3] text-emerald-600" />
                <Copy v-else class="w-4 h-4 stroke-[2.5]" />
                <span>{{ copiedCode ? 'Copied' : 'Copy' }}</span>
              </button>

              <button 
                type="button"
                @click="shareReferralLink"
                class="p-2.5 bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] rounded-xl transition shadow-sm flex items-center justify-center cursor-pointer border-0 outline-none"
                title="Share Code"
              >
                <Share2 class="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[28px] border border-gray-100 shadow-sm space-y-1.5 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Referrals</p>
            <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users class="w-4 h-4" />
            </div>
          </div>
          <p class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">{{ referralData?.total_referrals || 0 }}</p>
          <div class="flex items-center gap-1 text-[10px] font-bold text-blue-600 pt-1">
            <span>Friends invited</span>
          </div>
        </div>

        <div class="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[28px] border border-gray-100 shadow-sm space-y-1.5 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Successful Rewards</p>
            <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award class="w-4 h-4" />
            </div>
          </div>
          <p class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">{{ referralData?.successful_rewards || 0 }}</p>
          <div class="flex items-center gap-1 text-[10px] font-bold text-emerald-600 pt-1">
            <span>Bonuses unlocked</span>
          </div>
        </div>

        <div class="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[28px] border border-gray-100 shadow-sm space-y-1.5 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <p class="text-[10px] font-black uppercase tracking-wider text-gray-400">Pending Milestones</p>
            <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock class="w-4 h-4" />
            </div>
          </div>
          <p class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">{{ referralData?.pending_rewards || 0 }}</p>
          <div class="flex items-center gap-1 text-[10px] font-bold text-amber-600 pt-1">
            <span>Awaiting qualifying order</span>
          </div>
        </div>
      </div>

      <!-- Referral Invitees Table List -->
      <div class="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-gray-100 shadow-sm space-y-5">
        <div class="flex justify-between items-center border-b border-gray-100 pb-4">
          <h3 class="font-black uppercase text-[11px] tracking-widest text-gray-400 flex items-center gap-2">
            <Users class="w-4 h-4 text-[#0A1128]" /> Referred Users History
          </h3>
        </div>

        <div v-if="pending" class="text-center py-16">
          <Loader2 class="w-7 h-7 animate-spin mx-auto text-[#0A1128]" />
        </div>

        <div v-else-if="errorMessage" class="text-xs font-bold text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0 text-rose-600" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-else-if="!referralData?.referrals?.length" class="text-center py-16 space-y-3">
          <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-400 shadow-inner">
            <Gift class="w-7 h-7" />
          </div>
          <div class="space-y-1">
            <h4 class="text-sm font-black text-[#0A1128]">No Referrals Yet</h4>
            <p class="text-xs text-gray-400 max-w-xs mx-auto">Share your referral code with friends and family to start earning rewards.</p>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="(ref, index) in referralData.referrals" 
            :key="index"
            class="p-4 sm:p-5 bg-gray-50/80 rounded-24px border border-gray-200/60 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition hover:bg-gray-50"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-black text-sm text-[#0A1128]">{{ ref.invitee_name }}</span>
                <span v-if="ref.reward_granted" class="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Rewarded</span>
                <span v-else-if="ref.has_completed_qualifying_order" class="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Order Completed</span>
                <span v-else class="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Pending Order</span>
              </div>
              <p class="text-xs font-medium text-gray-500">{{ ref.invitee_email }}</p>
              <p class="text-[10px] text-gray-400 font-medium">Joined on {{ new Date(ref.created_at).toLocaleDateString() }}</p>
            </div>

            <div class="flex items-center gap-2 self-start sm:self-auto">
              <div v-if="ref.reward_granted" class="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/50">
                <CheckCircle2 class="w-4 h-4" />
                <span>Bonus Granted</span>
              </div>
              <div v-else class="flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/50">
                <Clock class="w-4 h-4" />
                <span>Awaiting Milestone</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
</style>