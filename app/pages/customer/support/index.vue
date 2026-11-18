<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import {
  LifeBuoy,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  X,
  FileText,
  Wallet,
  Building2,
  UserRound,
  Hash,
  ArrowUpRight,
  Search,
} from '@lucide/vue'

definePageMeta({ layout: 'customer', middleware: 'auth' })

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token')

const disputes = ref<any[]>([])
const pending = ref<boolean>(true)
const isModalOpen = ref<boolean>(false)
const isSubmitting = ref<boolean>(false)

// New Dispute Form State
const form = ref({
  order_id: '',
  reason: '',
  amount: 0,
  bank_name: '',
  account_number: '',
  account_name: ''
})

const fetchCustomerDisputes = async () => {
  pending.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/customer/disputes`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true', Authorization: `Bearer ${authToken.value}` }
    })
    disputes.value = res?.data || res || []
  } catch (err) {
    console.error("Failed to load customer disputes", err)
  } finally {
    pending.value = false
  }
}

onMounted(fetchCustomerDisputes)

const submitDispute = async () => {
  if (!form.value.order_id || !form.value.reason || form.value.amount <= 0 || !form.value.bank_name || !form.value.account_number || !form.value.account_name) {
    alert("Please fill in all required fields accurately.")
    return
  }

  isSubmitting.value = true
  try {
    await $fetch(`${apiBase}/api/v1/customer/disputes/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: form.value
    })
    isModalOpen.value = false
    form.value = { order_id: '', reason: '', amount: 0, bank_name: '', account_number: '', account_name: '' }
    await fetchCustomerDisputes()
  } catch (err: any) {
    alert(err?.data?.detail || "Failed to submit support claim.")
  } finally {
    isSubmitting.value = false
  }
}

const totalClaimAmount = computed(() =>
  disputes.value.reduce((total, dispute) => total + (Number(dispute.amount) || 0), 0)
)

const statusClass = (status: string) => ({
  'bg-amber-50 text-amber-700 border-amber-200': status === 'pending',
  'bg-emerald-50 text-emerald-700 border-emerald-200': status === 'approved',
  'bg-rose-50 text-rose-700 border-rose-200': status === 'rejected',
})

const formatDate = (date: string) => {
  if (!date) return '—'
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString()
}

const formatCurrency = (amount: number | string) =>
  `₦${Number(amount || 0).toLocaleString('en-NG')}`
</script>

<template>
  <main class="min-h-screen bg-[#F6F7F9] px-4 py-6 text-[#0A1128] sm:px-6 lg:px-8 lg:py-9">
    <div class="mx-auto max-w-6xl space-y-6 lg:space-y-8">
      <!-- Page heading -->
      <section class="relative overflow-hidden rounded-[28px] bg-[#0A1128] p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
        <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#D4F53C]/10 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl"></div>

        <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="max-w-2xl">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#D4F53C]">
              <LifeBuoy :size="13" />
              Customer care centre
            </div>
            <h1 class="text-2xl font-black tracking-tight sm:text-3xl">Support &amp; dispute resolution</h1>
            <p class="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Submit a refund request for a cancelled or failed delivery and keep track of every resolution in one place.
            </p>
          </div>

          <div class="flex shrink-0 flex-col gap-3 min-[420px]:flex-row">
            <button
              type="button"
              @click="fetchCustomerDisputes"
              :disabled="pending"
              aria-label="Refresh disputes"
              class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw :size="15" :class="{ 'animate-spin': pending }" />
              Refresh
            </button>
            <button
              type="button"
              @click="isModalOpen = true"
              class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D4F53C] px-5 py-3 text-xs font-black text-[#0A1128] shadow-lg shadow-black/10 transition hover:bg-[#e1ff55] focus:outline-none focus:ring-4 focus:ring-[#D4F53C]/25"
            >
              <Plus :size="16" />
              Raise a claim
            </button>
          </div>
        </div>
      </section>

      <!-- Overview -->
      <section class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total claims</span>
            <span class="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><FileText :size="17" /></span>
          </div>
          <div class="mt-4 flex items-end gap-2">
            <span class="text-3xl font-black tracking-tight text-[#0A1128]">{{ disputes.length }}</span>
            <span class="pb-1 text-xs font-medium text-slate-400">submitted</span>
          </div>
        </div>

        <div class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Claim value</span>
            <span class="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Wallet :size="17" /></span>
          </div>
          <div class="mt-4 text-2xl font-black tracking-tight text-[#0A1128]">{{ formatCurrency(totalClaimAmount) }}</div>
          <p class="mt-1 text-[11px] font-medium text-slate-400">Combined amount requested</p>
        </div>

        <div class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolution status</span>
            <span class="rounded-xl bg-amber-50 p-2.5 text-amber-600"><Clock :size="17" /></span>
          </div>
          <div class="mt-4 text-lg font-black tracking-tight text-[#0A1128]">Stay informed</div>
          <p class="mt-1 text-[11px] font-medium text-slate-400">Check this page for claim updates</p>
        </div>
      </section>

      <!-- Claims list -->
      <section class="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-black tracking-tight text-[#0A1128]">Your submitted claims</h2>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">{{ disputes.length }}</span>
            </div>
            <p class="mt-1 text-xs text-slate-500">A record of the support requests you have lodged.</p>
          </div>
          <div class="inline-flex items-center gap-2 self-start rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500 sm:self-auto">
            <ShieldAlert :size="14" class="text-indigo-500" />
            Keep your order reference handy
          </div>
        </div>

        <!-- Loading -->
        <div v-if="pending && disputes.length === 0" class="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Loader2 :size="22" class="animate-spin" />
          </span>
          <p class="text-sm font-bold text-slate-700">Loading your claims</p>
          <p class="mt-1 text-xs text-slate-400">Please wait while we retrieve your support history.</p>
        </div>

        <!-- Empty state -->
        <div v-else-if="disputes.length === 0" class="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Search :size="24" />
          </span>
          <h3 class="text-sm font-black text-[#0A1128]">No claims submitted yet</h3>
          <p class="mt-1 max-w-sm text-xs leading-5 text-slate-500">If a delivery has an issue that needs a refund review, you can create a support claim here.</p>
          <button
            type="button"
            @click="isModalOpen = true"
            class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0A1128] px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
          >
            <Plus :size="15" />
            Create your first claim
          </button>
        </div>

        <!-- Desktop table -->
        <div v-else class="hidden overflow-x-auto md:block">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="bg-slate-50/80 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                <th class="px-7 py-4">Order reference</th>
                <th class="px-5 py-4">Complaint reason</th>
                <th class="px-5 py-4">Claim amount</th>
                <th class="px-5 py-4">Date lodged</th>
                <th class="px-7 py-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="d in disputes" :key="d.id" class="transition hover:bg-slate-50/70">
                <td class="whitespace-nowrap px-7 py-5">
                  <span class="font-mono text-xs font-black text-indigo-600">#{{ d.order_id }}</span>
                </td>
                <td class="max-w-xs px-5 py-5">
                  <p class="truncate text-xs font-semibold text-slate-700" :title="d.reason">{{ d.reason }}</p>
                </td>
                <td class="whitespace-nowrap px-5 py-5 font-mono text-xs font-black text-[#0A1128]">{{ formatCurrency(d.amount) }}</td>
                <td class="whitespace-nowrap px-5 py-5 text-xs font-medium text-slate-500">{{ formatDate(d.created_at) }}</td>
                <td class="whitespace-nowrap px-7 py-5">
                  <span :class="statusClass(d.status)" class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                    <Clock v-if="d.status === 'pending'" :size="12" />
                    <CheckCircle2 v-else-if="d.status === 'approved'" :size="12" />
                    <XCircle v-else :size="12" />
                    {{ d.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile claim cards -->
        <div v-if="disputes.length > 0" class="divide-y divide-slate-100 md:hidden">
          <article v-for="d in disputes" :key="d.id" class="space-y-4 p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order reference</p>
                <p class="mt-1 font-mono text-sm font-black text-indigo-600">#{{ d.order_id }}</p>
              </div>
              <span :class="statusClass(d.status)" class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                <Clock v-if="d.status === 'pending'" :size="12" />
                <CheckCircle2 v-else-if="d.status === 'approved'" :size="12" />
                <XCircle v-else :size="12" />
                {{ d.status }}
              </span>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complaint reason</p>
              <p class="mt-1 text-xs font-semibold leading-5 text-slate-700">{{ d.reason }}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Claim amount</p>
                <p class="mt-1 text-sm font-black text-[#0A1128]">{{ formatCurrency(d.amount) }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date lodged</p>
                <p class="mt-1 text-xs font-semibold text-slate-600">{{ formatDate(d.created_at) }}</p>
              </div>
            </div>
          </article>
        </div>

        <div v-if="pending && disputes.length > 0" class="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-[11px] font-semibold text-slate-400">
          <Loader2 :size="13" class="animate-spin" />
          Refreshing claims…
        </div>
      </section>

      <div class="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
        <AlertCircle :size="17" class="mt-0.5 shrink-0 text-indigo-600" />
        <p class="text-xs leading-5 text-indigo-900/80">
          Please ensure that the order reference and refund account details are accurate before submitting a claim. Your request will appear in this list after it has been submitted.
        </p>
      </div>
    </div>

    <!-- New dispute modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#070D20]/65 p-4 backdrop-blur-sm"
          @click.self="isModalOpen = false"
        >
          <div class="my-auto w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-black/20">
            <div class="relative overflow-hidden bg-[#0A1128] px-6 py-6 text-white sm:px-8">
              <div class="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#D4F53C]/10 blur-2xl"></div>
              <button
                type="button"
                @click="isModalOpen = false"
                aria-label="Close claim form"
                class="absolute right-5 top-5 rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X :size="19" />
              </button>
              <div class="relative flex items-center gap-3">
                <span class="rounded-2xl bg-white/10 p-3 text-[#D4F53C]"><LifeBuoy :size="20" /></span>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-[#D4F53C]">Customer support</p>
                  <h2 class="mt-1 text-lg font-black tracking-tight sm:text-xl">Lodge a refund claim</h2>
                </div>
              </div>
              <p class="relative mt-4 max-w-md text-xs leading-5 text-slate-300">
                Enter the order and bank details associated with your request. All fields are required.
              </p>
            </div>

            <div class="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label for="order_id" class="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <Hash :size="13" /> Order ID / reference
                  </label>
                  <input
                    id="order_id"
                    v-model="form.order_id"
                    type="text"
                    placeholder="e.g. 10452"
                    autocomplete="off"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0A1128] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div class="sm:col-span-2">
                  <label for="claim_amount" class="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <Wallet :size="13" /> Claim amount (₦)
                  </label>
                  <input
                    id="claim_amount"
                    v-model.number="form.amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="5000"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0A1128] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label for="bank_name" class="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <Building2 :size="13" /> Bank name
                  </label>
                  <input
                    id="bank_name"
                    v-model="form.bank_name"
                    type="text"
                    placeholder="e.g. Access Bank"
                    autocomplete="organization"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0A1128] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label for="account_number" class="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <Hash :size="13" /> Account number
                  </label>
                  <input
                    id="account_number"
                    v-model="form.account_number"
                    type="text"
                    inputmode="numeric"
                    maxlength="10"
                    placeholder="10-digit number"
                    autocomplete="off"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold text-[#0A1128] outline-none transition placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div class="sm:col-span-2">
                  <label for="account_name" class="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <UserRound :size="13" /> Account holder name
                  </label>
                  <input
                    id="account_name"
                    v-model="form.account_name"
                    type="text"
                    placeholder="As it appears on your bank account"
                    autocomplete="name"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#0A1128] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div class="sm:col-span-2">
                  <label for="claim_reason" class="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">Reason for dispute</label>
                  <textarea
                    id="claim_reason"
                    v-model="form.reason"
                    rows="4"
                    placeholder="Explain what happened with this order…"
                    class="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-[#0A1128] outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  ></textarea>
                </div>
              </div>

              <div class="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-3 text-[11px] leading-5 text-amber-800">
                <AlertCircle :size="15" class="mt-0.5 shrink-0" />
                Double-check your bank details. They will be used when reviewing an approved refund request.
              </div>
            </div>

            <div class="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button
                type="button"
                @click="isModalOpen = false"
                class="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                @click="submitDispute"
                :disabled="isSubmitting"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A1128] px-6 py-3 text-xs font-black text-white shadow-lg shadow-[#0A1128]/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Loader2 v-if="isSubmitting" :size="15" class="animate-spin" />
                <ArrowUpRight v-else :size="15" />
                {{ isSubmitting ? 'Submitting claim…' : 'Submit claim' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>
