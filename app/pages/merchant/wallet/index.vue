<!-- pages/merchant/wallet/index.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Loader2, 
  RefreshCw,
  ArrowDownLeft,
  Coins,
  ShieldCheck,
  UserCheck,
  History,
  XCircle,
  ChevronDown,
  Search,
  Lock,
  KeyRound
} from '@lucide/vue'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const authToken = useCookie('auth_token')
const backendHost = apiBase

// 1. Core UI Control States
const isSubmittingPayout = ref(false)
const showPayoutModal = ref(false)
const showBankModal = ref(false)
const showPinModal = ref(false)
const notificationMessage = ref<string | null>(null)

// SEARCHABLE CUSTOM DROPDOWN CONTROL STATES
const isBankDropdownOpen = ref(false)
const bankSearchQuery = ref('')
const isResolvingAccount = ref(false)

// ERROR DIALOG CONSOLE ANCHORS
const errorMessageTitle = ref<string | null>(null)
const errorMessageDetail = ref<string | null>(null)
const localValidationErrors = ref({
  payoutAmount: '',
  bankAccountNumber: '',
  transferPin: ''
})

// Form Anchors
const payoutForm = ref({ amount: '', pin: '' })
const pinForm = ref({ pin: '', current_pin: '', password: '' })
const bankPin = ref('')
const bankForm = ref({
  bank_name: '',
  bank_code: '', 
  account_number: '',
  account_name: ''
})

// Reactive states for wallet dashboard data, loading, and error handling
const walletData = ref<any>({})
const pending = ref<boolean>(true)
const bankCodeMap = ref<Array<{ name: string; code: string }>>([])

// 2. Fetch Integrated Real-Time Wallet Dashboard Dataset on Mount
const fetchWalletDashboard = async () => {
  pending.value = true
  try {
    const res: any = await $fetch(`${backendHost}/api/v1/wallet/dashboard`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    walletData.value = res?.data || res || {}
  } catch (err) {
    console.error("Wallet dashboard fetch error:", err)
  } finally {
    pending.value = false
  }
}

// Fetch supported banks list on mount
const fetchSupportedBanks = async () => {
  try {
    const res: any = await $fetch(`${backendHost}/api/v1/wallet/supported-banks`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {})
      }
    })
    if (res) {
      bankCodeMap.value = Object.entries(res).map(([name, code]) => ({ name, code: String(code) }))
    }
  } catch (err) {
    console.error("Supported banks fetch error:", err)
  }
}

onMounted(() => {
  fetchWalletDashboard()
  fetchSupportedBanks()
})

// FILTERABLE BANKS SEARCH COMPUTED ALGORITHM
const filteredBanks = computed(() => {
  if (!bankCodeMap.value || !Array.isArray(bankCodeMap.value)) return []
  return bankCodeMap.value.filter(bank => 
    bank.name.toLowerCase().includes(bankSearchQuery.value.toLowerCase())
  )
})

watch(
  () => [bankForm.value.account_number, bankForm.value.bank_code],
  async ([accNum, bankCode]) => {
    if (!accNum || accNum.length < 10) {
      bankForm.value.account_name = ''
      isResolvingAccount.value = false
      return
    }

    if (accNum && accNum.length === 10 && /^\d+$/.test(accNum) && bankCode) {
      isResolvingAccount.value = true
      bankForm.value.account_name = 'Resolving account name...'
      
      try {
        const res: any = await $fetch(`${backendHost}/api/v1/wallet/resolve-account`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken.value}`
          },
          body: { account_number: accNum, bank_code: bankCode }
        })
        
        if (res?.account_name) {
          bankForm.value.account_name = res.account_name
        }
      } catch (err: any) {
        bankForm.value.account_name = ''
        triggerErrorPopup("Resolution Failed", err?.data?.detail || "Could not verify account number with selected bank.")
      } finally {
        isResolvingAccount.value = false
      }
    }
  }
)

const showToast = (msg: string) => {
  notificationMessage.value = msg
  setTimeout(() => { notificationMessage.value = null }, 4000)
}

const triggerErrorPopup = (title: string, detail: string) => {
  errorMessageTitle.value = title
  errorMessageDetail.value = detail
}

const clearErrorPopup = () => {
  errorMessageTitle.value = null
  errorMessageDetail.value = null
}

const handleSetTransferPin = async () => {
  localValidationErrors.value.transferPin = ''
  if (!pinForm.value.pin || pinForm.value.pin.length !== 4 || !/^\d+$/.test(pinForm.value.pin)) {
    localValidationErrors.value.transferPin = "Transfer PIN must be exactly 4 numerical digits."
    return
  }

  if (!pinForm.value.password) {
    localValidationErrors.value.transferPin = "Enter your account password to confirm this change."
    return
  }
  if (walletData.value?.has_transfer_pin && !/^\d{4}$/.test(pinForm.value.current_pin)) {
    localValidationErrors.value.transferPin = "Enter your current 4-digit PIN."
    return
  }

  isSubmittingPayout.value = true
  try {
    const res: any = await $fetch(`${backendHost}/api/v1/wallet/vendor/set-pin`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: {
        pin: pinForm.value.pin,
        password: pinForm.value.password,
        ...(pinForm.value.current_pin ? { current_pin: pinForm.value.current_pin } : {})
      }
    })
    showToast(res.message || "Transfer PIN configured successfully.")
    showPinModal.value = false
    pinForm.value = { pin: '', current_pin: '', password: '' }
    await fetchWalletDashboard()
  } catch (err: any) {
    triggerErrorPopup("PIN Setup Fault", err?.data?.detail || "Could not set transfer PIN.")
  } finally {
    isSubmittingPayout.value = false
  }
}

const handleWithdrawalSubmit = async () => {
  localValidationErrors.value.payoutAmount = ''
  const withdrawalAmount = parseFloat(payoutForm.value.amount)
  
  if (!withdrawalAmount || withdrawalAmount <= 0) {
    localValidationErrors.value.payoutAmount = "Please assign a valid numerical transaction volume."
    return
  }

  if (withdrawalAmount > (walletData.value?.available_balance || 0)) {
    localValidationErrors.value.payoutAmount = "Insufficient liquid settlement volume inside available balances."
    return
  }

  if (!payoutForm.value.pin || payoutForm.value.pin.length !== 4) {
    triggerErrorPopup("Security Validation", "Please enter your 4-digit transfer PIN to authorize this payout.")
    return
  }

  const settlementAccountId = walletData.value?.settlement_account?.id
  if (!settlementAccountId) {
    triggerErrorPopup("Payout Core Rejection", "No active verified settlement account found. Please link a bank account first.")
    return
  }

  isSubmittingPayout.value = true
  try {
    const res: any = await $fetch(`${backendHost}/api/v1/wallet/vendor/payout/request`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: { 
        amount: withdrawalAmount,
        settlement_account_id: settlementAccountId,
        pin: payoutForm.value.pin
      }
    })

    showToast(res.message || "Payout payload queued successfully.")
    showPayoutModal.value = false
    payoutForm.value.amount = ''
    payoutForm.value.pin = ''
    await fetchWalletDashboard()
  } catch (err: any) {
    const failureMessage = err?.data?.detail || "Payout Core Engine rejected cashout ledger entry."
    triggerErrorPopup("Payout Core Rejection", failureMessage)
  } finally {
    isSubmittingPayout.value = false
  }
}

const handleLinkBankAccount = async () => {
  localValidationErrors.value.bankAccountNumber = ''
  
  if (bankForm.value.account_number.length !== 10 || !/^\d+$/.test(bankForm.value.account_number)) {
    localValidationErrors.value.bankAccountNumber = "NUBAN layout requires exactly 10 numerical digits."
    return
  }

  if (!bankForm.value.bank_code) {
    triggerErrorPopup("Validation Error", "Please pick a bank institution route from the options menu.")
    return
  }

  const needsPin = !!(walletData.value?.has_transfer_pin || walletData.value?.settlement_account)
  if (needsPin && (!bankPin.value || bankPin.value.length !== 4)) {
    triggerErrorPopup("Validation Error", "Enter your 4-digit transfer PIN to change your payout account.")
    return
  }

  isSubmittingPayout.value = true
  try {
    const res: any = await $fetch(`${backendHost}/api/v1/wallet/bank-setup`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      },
      body: {
        account_number: bankForm.value.account_number,
        bank_code: bankForm.value.bank_code,
        ...(needsPin ? { pin: bankPin.value } : {})
      }
    })

    showToast(res.message || "Payout route bank details linked and active.")
    showBankModal.value = false
    bankPin.value = ''
    bankForm.value.account_number = ''
    bankForm.value.account_name = ''
    await fetchWalletDashboard()
  } catch (err: any) {
    const failureMessage = err?.data?.detail || "NUBAN account resolution validation failure."
    triggerErrorPopup("Bank Verification Fault", failureMessage)
  } finally {
    isSubmittingPayout.value = false
  }
}

const formatMoney = (val: number) => "₦" + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const getStatusClass = (status: string) => {
  const norm = String(status).toLowerCase()
  if (norm === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (norm === 'processing') return 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
  if (norm === 'failed') return 'bg-rose-50 text-rose-700 border-rose-100'
  return 'bg-gray-100 text-gray-600 border-gray-200'
}
</script>

<template>
  <div class="py-10 px-4 sm:px-6 lg:px-12 relative min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50/40">
    
    <!-- SYSTEM ALERTS TOAST BANNER -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="notificationMessage" class="fixed bottom-8 right-8 z-[100000] bg-[#0A1128] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 border border-gray-800 animate-slide-in">
          <CheckCircle2 class="w-5 h-5 text-[#D4F53C]" />
          <span class="text-xs font-black tracking-tight">{{ notificationMessage }}</span>
        </div>
      </Transition>
    </Teleport>

    <!-- TELEPORTED EXCEPTION AND ERROR NOTICE OVERLAY POPUP -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="errorMessageTitle" class="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div class="bg-white rounded-[28px] border border-gray-100 p-6 max-w-sm w-full text-center shadow-2xl animate-scale-up space-y-4">
            <div class="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
              <XCircle class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div class="space-y-1.5">
              <h3 class="text-sm font-black text-[#0A1128] tracking-tight uppercase">{{ errorMessageTitle }}</h3>
              <p class="text-[11px] text-gray-400 font-semibold leading-relaxed">{{ errorMessageDetail }}</p>
            </div>
            <button @click="clearErrorPopup" type="button" class="w-full bg-gray-900 hover:bg-opacity-95 text-white text-xs font-black py-3 rounded-xl transition cursor-pointer border-0 outline-none">
              Acknowledge Notice
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- TELEPORTED TRANSFER PIN SETUP MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPinModal" class="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <form @submit.prevent="handleSetTransferPin" class="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-5 animate-scale-up text-left">
            <div class="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 class="text-sm font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-1.5"><KeyRound class="w-4 h-4 text-[#84cc16]" /> Configure Transfer PIN</h3>
              <button type="button" @click="showPinModal = false" class="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition"><X class="w-4 h-4" /></button>
            </div>
            <div class="space-y-1.5">
              <template v-if="walletData?.has_transfer_pin">
                <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Current PIN</label>
                <input v-model="pinForm.current_pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" class="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-center text-lg font-mono font-black tracking-widest text-[#0A1128] focus:outline-none focus:border-[#0A1128] mb-2" required />
              </template>
              <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">{{ walletData?.has_transfer_pin ? 'New 4-Digit PIN' : '4-Digit Security PIN' }}</label>
              <input v-model="pinForm.pin" type="password" maxlength="4" placeholder="••••" class="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-center text-lg font-mono font-black tracking-widest text-[#0A1128] focus:outline-none focus:border-[#0A1128]" required />
              <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider block pt-2">Account Password</label>
              <input v-model="pinForm.password" type="password" autocomplete="current-password" placeholder="Confirm with your password" class="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-xs font-semibold text-[#0A1128] focus:outline-none focus:border-[#0A1128]" required />
              <p v-if="localValidationErrors.transferPin" class="text-[10px] font-bold text-rose-600 flex items-center gap-1"><AlertTriangle class="w-3 h-3" /> {{ localValidationErrors.transferPin }}</p>
              <span v-else class="text-[10px] text-gray-400 font-medium block">Required to authorize all future liquid revenue transfers.</span>
            </div>
            <button :disabled="isSubmittingPayout" type="submit" class="w-full bg-[#0A1128] text-white text-xs font-black py-4 rounded-xl shadow-md flex items-center justify-center space-x-2 disabled:bg-gray-400 cursor-pointer border-0 outline-none">
              <Loader2 v-if="isSubmittingPayout" class="w-4 h-4 animate-spin" />
              <Lock v-else class="w-4 h-4" />
              <span>Save Transfer PIN</span>
            </button>
          </form>
        </div>
      </Transition>
    </Teleport>

    <!-- TELEPORTED PAYOUT MUTATION DIALOG MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPayoutModal" class="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <form @submit.prevent="handleWithdrawalSubmit" class="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up text-left">
            <div class="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 class="text-sm font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-1.5"><Coins class="w-4 h-4 text-[#84cc16]" /> Execute OPay Payout</h3>
              <button type="button" @click="showPayoutModal = false" class="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition"><X class="w-4 h-4" /></button>
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Amount to Withdraw (₦)</label>
              <input v-model="payoutForm.amount" type="number" step="0.01" placeholder="e.g. 25000" :class="[localValidationErrors.payoutAmount ? 'border-rose-400 bg-rose-50/10' : 'border-gray-200 bg-gray-50']" class="w-full border rounded-xl px-4 py-3 text-sm font-black text-[#0A1128] focus:outline-none focus:border-[#0A1128]" required />
              
              <p v-if="localValidationErrors.payoutAmount" class="text-[10px] font-bold text-rose-600 flex items-center gap-1 animate-slide-in"><AlertTriangle class="w-3 h-3" /> {{ localValidationErrors.payoutAmount }}</p>
              <span v-else class="text-[10px] font-bold text-gray-400 block">Available limit: {{ formatMoney(walletData?.available_balance) }}</span>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">4-Digit Transfer PIN</label>
              <input v-model="payoutForm.pin" type="password" maxlength="4" placeholder="••••" class="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-center text-lg font-mono font-black tracking-widest text-[#0A1128] focus:outline-none focus:border-[#0A1128]" required />
            </div>

            <button :disabled="isSubmittingPayout" type="submit" class="w-full bg-[#0A1128] text-white text-xs font-black py-4 rounded-xl shadow-md flex items-center justify-center space-x-2 disabled:bg-gray-400 cursor-pointer border-0 outline-none">
              <Loader2 v-if="isSubmittingPayout" class="w-4 h-4 animate-spin" />
              <ArrowUpRight v-else class="w-4 h-4" />
              <span>Process Transfer</span>
            </button>
          </form>
        </div>
      </Transition>
    </Teleport>

    <!-- TELEPORTED BANK SETTLEMENT LOGISTICS ACQUISITION MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showBankModal" class="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4" @click.self="isBankDropdownOpen = false">
          <form @submit.prevent="handleLinkBankAccount" class="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up text-left">
            <div class="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 class="text-sm font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-1.5"><Building2 class="w-4 h-4 text-[#84cc16]" /> Settlement Bank</h3>
              <button type="button" @click="showBankModal = false" class="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition"><X class="w-4 h-4" /></button>
            </div>
            
            <!-- RE-ENGINEERED SEARCHABLE DROP-DOWN CONTAINER -->
            <div class="space-y-1.5 relative">
              <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Bank Name Identifier</label>
              
              <!-- Selected Target Trigger Input -->
              <button 
                type="button" 
                @click="isBankDropdownOpen = !isBankDropdownOpen"
                class="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-xs text-[#0A1128] font-black flex justify-between items-center cursor-pointer transition"
              >
                <span>{{ bankForm.bank_name || 'Choose your settlement bank destination...' }}</span>
                <ChevronDown class="w-4 h-4 text-gray-400 transform transition-transform duration-200" :class="[isBankDropdownOpen ? 'rotate-180' : '']" />
              </button>

              <!-- Dynamic Dropdown Container Box -->
              <div 
                v-if="isBankDropdownOpen" 
                class="absolute z-[100001] w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl p-2 max-h-52 overflow-y-auto custom-scrollbar text-left animate-slide-in"
              >
                <!-- Filter Search Query Row Input -->
                <div class="relative mb-2 shrink-0">
                  <Search class="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    v-model="bankSearchQuery"
                    type="text" 
                    placeholder="Search bank name query..."
                    class="w-full bg-gray-50 border border-gray-100 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white"
                  />
                </div>

                <!-- Dynamic Render Menu Elements -->
                <div class="space-y-0.5">
                  <button 
                    v-for="bank in filteredBanks" 
                    :key="bank.code"
                    type="button" 
                    @click="() => {
                      bankForm.bank_name = bank.name;
                      bankForm.bank_code = bank.code;
                      isBankDropdownOpen = false;
                      bankSearchQuery = '';
                    }"
                    :class="[bankForm.bank_code === bank.code ? 'bg-gray-50 font-black text-[#84cc16]' : 'text-gray-700 font-medium']"
                    class="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-50/80 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{{ bank.name }}</span>
                  </button>
                  
                  <div v-if="filteredBanks.length === 0" class="text-center py-3 text-xs font-bold text-gray-400 uppercase tracking-tight">
                    No matching banks found.
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">10-Digit NUBAN Account Number</label>
              <input v-model="bankForm.account_number" type="text" maxlength="10" placeholder="e.g. 8123456789" :class="[localValidationErrors.bankAccountNumber ? 'border-rose-400 bg-rose-50/10' : 'border-gray-200 bg-gray-50']" class="w-full border rounded-xl px-4 py-3 text-xs font-mono font-black tracking-widest text-[#0A1128] focus:outline-none" required />
              <p v-if="localValidationErrors.bankAccountNumber" class="text-[10px] font-bold text-rose-600 flex items-center gap-1 animate-slide-in"><AlertTriangle class="w-3 h-3" /> {{ localValidationErrors.bankAccountNumber }}</p>
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                <span>Official Bank Account Name</span>
                <span v-if="isResolvingAccount" class="text-blue-600 animate-pulse font-bold">Verifying NUBAN...</span>
              </label>
              <div class="relative">
                <input 
                  v-model="bankForm.account_name" 
                  type="text" 
                  placeholder="Will auto-fill upon 10-digit entry..." 
                  readonly
                  class="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-[#0A1128] focus:outline-none cursor-not-allowed" 
                  required 
                />
                <div v-if="isResolvingAccount" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 class="w-4 h-4 animate-spin text-blue-600" />
                </div>
              </div>
              <p class="text-[9px] text-gray-400 font-medium">Account name is securely locked and verified automatically via banking networks.</p>
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-gray-400 tracking-wider">Transfer PIN</label>
              <input v-model="bankPin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" class="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-center text-lg font-mono font-black tracking-widest text-[#0A1128] focus:outline-none focus:border-[#0A1128]" required />
              <p class="text-[9px] text-gray-400 font-medium">Required to link or change your payout account.</p>
            </div>
            <button :disabled="isSubmittingPayout" type="submit" class="w-full bg-[#0A1128] text-white text-xs font-black py-4 rounded-xl shadow-md flex items-center justify-center space-x-2 disabled:bg-gray-400 border-0 cursor-pointer outline-none">
              <Loader2 v-if="isSubmittingPayout" class="w-4 h-4 animate-spin" />
              <Save v-else class="w-4 h-4" />
              <span>Link Settlement Route</span>
            </button>
          </form>
        </div>
      </Transition>
    </Teleport>

    <!-- MAIN PAGE BASE LAYOUT LINKED CONTENT -->
    <div v-if="pending" class="max-w-5xl mx-auto py-32 text-center space-y-4">
      <Loader2 class="w-10 h-10 animate-spin text-[#0A1128] mx-auto stroke-[2.5]" />
      <p class="text-xs text-gray-400 font-black uppercase tracking-widest animate-pulse">Recompiling Wallet General Ledger Accounts...</p>
    </div>

    <div v-else class="max-w-5xl mx-auto space-y-8 animate-fade-in">
      
      <!-- DASHBOARD HEADER TERMINAL -->
      <div class="flex items-center justify-between">
        <div class="text-left space-y-1">
          <h1 class="text-2xl sm:text-3xl font-black text-[#0A1128] tracking-tight">Fintech Wallet Center</h1>
          <p class="text-sm text-gray-400">Track current transaction settlements, deliveries held in escrow, and withdraw directly to your account.</p>
        </div>
        <div class="flex items-center gap-3">
          <button @click="showPinModal = true" class="px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-black text-[#0A1128] hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer">
            <KeyRound class="w-4 h-4 text-[#84cc16]" /> Set Transfer PIN
          </button>
          <button @click="fetchWalletDashboard" class="p-3 bg-white border border-gray-100 rounded-xl shadow-2xs hover:bg-gray-50 text-gray-400 hover:text-[#0A1128] transition cursor-pointer">
            <RefreshCw class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- MASTER BALANCE GRID CARDS -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- CARD 1: AVAILABLE LIQUID PAYOUT BALANCES -->
        <div class="bg-[#0A1128] text-white p-6 rounded-[24px] border border-gray-800 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[160px] text-left group">
          <div class="absolute -right-6 -bottom-6 text-white/5 pointer-events-none transition-transform duration-300 group-hover:scale-110">
            <Wallet class="w-40 h-40" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
              <ShieldCheck class="w-3.5 h-3.5 text-[#D4F53C]" /> Liquid Settled Revenue
            </span>
            <button 
              @click="showPayoutModal = true" 
              :disabled="!walletData?.settlement_account?.is_verified"
              class="bg-[#D4F53C] hover:bg-opacity-90 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-[#0A1128] font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg transition border-0 flex items-center gap-1 cursor-pointer"
            >
              Payout <ArrowUpRight class="w-3 h-3 stroke-[3]" />
            </button>
          </div>
          <div class="space-y-1 pt-4">
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight font-mono text-[#D4F53C]">{{ formatMoney(walletData?.available_balance) }}</h2>
            <p class="text-[10px] text-gray-400 font-medium">Ready for instant payouts via the automated OPay networks.</p>
          </div>
        </div>

        <!-- CARD 2: ESCROW CLEARING PROTECTION CARD -->
        <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-2xs flex flex-col justify-between min-h-[160px] text-left">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
              <Clock class="w-3.5 h-3.5 text-blue-500" /> Deliveries Escrow Balance
            </span>
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          </div>
          <div class="space-y-1 pt-4">
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight font-mono text-[#0A1128]">{{ formatMoney(walletData?.escrow_balance) }}</h2>
            <p class="text-[10px] text-gray-400 font-medium leading-relaxed">Funds locked securely until package delivery is confirmed by the rider dispatch systems.</p>
          </div>
        </div>

        <!-- CARD 3: BANK DETAILS METRICS BOARD -->
        <div class="bg-white p-6 rounded-[24px] border border-gray-100 shadow-2xs flex flex-col justify-between min-h-[160px] text-left">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
              <Building2 class="w-3.5 h-3.5 text-amber-500" /> Verified Payout Target
            </span>
            <button @click="showBankModal = true" class="text-[10px] font-black text-blue-600 hover:underline bg-transparent border-0 cursor-pointer">
              {{ walletData?.settlement_account ? 'Modify Routing' : 'Configure Bank' }}
            </button>
          </div>

          <div v-if="walletData?.settlement_account" class="space-y-2 pt-2">
            <div class="flex items-center space-x-2 text-[#0A1128]">
              <span class="text-xs font-mono font-black tracking-wider bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">{{ walletData.settlement_account.account_number }}</span>
              <span class="text-xs font-black truncate max-w-[130px]">{{ walletData.settlement_account.bank_name }}</span>
            </div>
            <div class="flex items-center space-x-1 text-[10px] text-gray-400 font-bold uppercase tracking-wide">
              <UserCheck class="w-3 h-3 text-emerald-500" />
              <span class="truncate max-w-[190px]">{{ walletData.settlement_account.account_name }}</span>
            </div>
          </div>

          <div class="flex items-center space-x-2 bg-amber-50/50 border border-amber-100/60 p-3 rounded-xl" v-else>
            <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
            <p class="text-[10px] text-amber-700 font-semibold leading-normal">Payout channel unlinked. Provide valid bank details to release cashout features.</p>
          </div>
        </div>

      </div>

      <!-- HISTORICAL TRANSACTION LOGS DISPATCH TABLES -->
      <div class="bg-white rounded-[24px] border border-gray-100 shadow-2xs p-6 space-y-4">
        <div class="flex items-center space-x-2 border-b border-gray-50 pb-3">
          <History class="w-4 h-4 text-[#84cc16]" />
          <h2 class="text-xs font-black uppercase text-[#0A1128] tracking-wider">Settlement Audit Logs History</h2>
        </div>

        <div v-if="!walletData?.recent_payouts || walletData.recent_payouts.length === 0" class="py-16 text-center text-gray-400 text-xs font-medium space-y-2 bg-gray-50/20 border border-dashed border-gray-100 rounded-2xl">
          <p>No recorded settlement cashout transactions detected on this account profile ledger yet.</p>
        </div>

        <div class="overflow-x-auto no-scrollbar" v-else>
          <table class="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr class="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                <th class="pb-3 pl-2">OPay System Identifier Reference</th>
                <th class="pb-3">Timestamp Tracking</th>
                <th class="pb-3 text-center">Execution Status</th>
                <th class="pb-3 text-right pr-2">Settled Volume</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
              <tr v-for="payout in walletData.recent_payouts" :key="payout.id" class="hover:bg-gray-50/40 transition-colors">
                <td class="py-3.5 pl-2 font-mono font-black text-[#0A1128] uppercase tracking-wide">{{ payout.reference }}</td>
                <td class="py-3.5 text-gray-400">{{ formatDateTime(payout.created_at) }}</td>
                <td class="py-3.5 text-center">
                  <span :class="getStatusClass(payout.status)" class="inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider">
                    {{ payout.status }}
                  </span>
                </td>
                <td class="py-3.5 text-right pr-2 font-mono font-black text-gray-900 flex items-center justify-end gap-1">
                  <ArrowDownLeft v-if="payout.status === 'failed'" class="w-3.5 h-3.5 text-rose-500" />
                  <ArrowUpRight v-else class="w-3.5 h-3.5 text-emerald-500" />
                  <span>{{ formatMoney(payout.amount) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }

@keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

.animate-slide-in { animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-scale-up { animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>