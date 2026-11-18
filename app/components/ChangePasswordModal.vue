<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Loader2,
  AlertCircle
} from '@lucide/vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success', message: string): void
}>()

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const authToken = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7, sameSite: 'lax', secure: import.meta.client && window.location.protocol === 'https:' })

const isChangingPassword = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const passwordError = ref<string | null>(null)

const resetForm = () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  passwordError.value = null
}

const closeModal = () => {
  if (isChangingPassword.value) return
  resetForm()
  emit('update:open', false)
}

watch(() => props.open, (isOpen) => {
  if (isOpen) passwordError.value = null
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.open) {
    closeModal()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

const handlePasswordChange = async () => {
  passwordError.value = null

  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = 'New passwords do not match.'
    return
  }

  isChangingPassword.value = true
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/auth/password/change`, {
      method: 'POST',
      body: {
        current_password: currentPassword.value,
        new_password: newPassword.value
      },
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${authToken.value}`
      }
    })

    // Changing the password revokes every issued token. The API returns a fresh one so this
    // session stays signed in; all other devices must log in again.
    if (res?.access_token) authToken.value = res.access_token

    resetForm()
    emit('update:open', false)
    emit('success', 'Password changed successfully!')
  } catch (err: any) {
    passwordError.value =
      err?.data?.message ||
      err?.data?.detail ||
      err?.message ||
      'Failed to change password. Check your current password.'
  } finally {
    isChangingPassword.value = false
  }
}
</script>

<template>
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
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/65 backdrop-blur-xs p-4"
        @click.self="closeModal"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-modal-title"
          class="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 text-[#0A1128] animate-scale-up"
        >
          <!-- Modal Header -->
          <div class="flex items-start justify-between border-b border-gray-100 pb-4">
            <div class="space-y-1.5">
              <span class="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest bg-[#D4F53C] text-[#0A1128] px-2.5 py-1 rounded-lg uppercase">
                <ShieldCheck class="w-3 h-3" />
                Account Security
              </span>
              <h3 id="password-modal-title" class="text-xl font-black tracking-tight text-[#0A1128]">
                Change Password
              </h3>
              <p class="text-xs text-gray-500 font-medium">
                Enter your current password and choose a strong 8+ character replacement.
              </p>
            </div>
            <button
              type="button"
              @click="closeModal"
              aria-label="Close modal"
              class="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-[#0A1128] border-0 cursor-pointer outline-none transition shrink-0"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Password Form -->
          <form @submit.prevent="handlePasswordChange" class="space-y-4">
            <!-- Current Password -->
            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                Current Password
              </label>
              <div class="relative group">
                <KeyRound class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors" />
                <input
                  v-model="currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  required
                  autocomplete="current-password"
                  class="w-full bg-gray-50/80 border border-gray-200 text-[#0A1128] rounded-xl pl-10 pr-11 py-3 text-xs sm:text-sm font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:ring-2 focus:ring-[#0A1128]/10 focus:bg-white transition"
                />
                <button
                  type="button"
                  @click="showCurrentPassword = !showCurrentPassword"
                  aria-label="Toggle current password visibility"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A1128] bg-transparent border-0 cursor-pointer p-1 outline-none"
                >
                  <EyeOff v-if="showCurrentPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- New Password -->
            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                New Password
              </label>
              <div class="relative group">
                <ShieldCheck class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors" />
                <input
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="Minimum 8 characters"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  class="w-full bg-gray-50/80 border border-gray-200 text-[#0A1128] rounded-xl pl-10 pr-11 py-3 text-xs sm:text-sm font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:ring-2 focus:ring-[#0A1128]/10 focus:bg-white transition"
                />
                <button
                  type="button"
                  @click="showNewPassword = !showNewPassword"
                  aria-label="Toggle new password visibility"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A1128] bg-transparent border-0 cursor-pointer p-1 outline-none"
                >
                  <EyeOff v-if="showNewPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Confirm New Password -->
            <div class="space-y-1.5">
              <label class="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div class="relative group">
                <ShieldCheck class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0A1128] transition-colors" />
                <input
                  v-model="confirmNewPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="Re-enter new password"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  class="w-full bg-gray-50/80 border border-gray-200 text-[#0A1128] rounded-xl pl-10 pr-11 py-3 text-xs sm:text-sm font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:ring-2 focus:ring-[#0A1128]/10 focus:bg-white transition"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  aria-label="Toggle confirm password visibility"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A1128] bg-transparent border-0 cursor-pointer p-1 outline-none"
                >
                  <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Error Alert -->
            <div
              v-if="passwordError"
              class="flex items-start gap-2.5 text-xs font-bold text-rose-700 bg-rose-50 p-3.5 rounded-xl border border-rose-200"
            >
              <AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{{ passwordError }}</span>
            </div>

            <!-- Action Buttons -->
            <div class="pt-2 flex items-center gap-3">
              <button
                type="button"
                @click="closeModal"
                :disabled="isChangingPassword"
                class="w-1/3 py-3.5 bg-gray-100 hover:bg-gray-200 text-[#0A1128] font-black text-xs uppercase tracking-wider rounded-xl transition border-0 cursor-pointer outline-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isChangingPassword"
                class="w-2/3 py-3.5 bg-[#0A1128] hover:bg-[#131e42] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 flex items-center justify-center gap-2 outline-none active:scale-[0.99]"
              >
                <Loader2 v-if="isChangingPassword" class="w-4 h-4 animate-spin text-[#D4F53C]" />
                <span>{{ isChangingPassword ? 'Updating...' : 'Update Password' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-scale-up {
  animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>