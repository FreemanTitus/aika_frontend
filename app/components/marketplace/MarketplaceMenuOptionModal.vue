<!-- components/marketplace/MarketplaceMenuOptionModal.vue -->
<script setup lang="ts">
import { X, Plus } from '@lucide/vue'

interface MenuOption {
  id: string | number
  name: string
  price: string | number
}

interface MenuItem {
  id: string | number
  name?: string
  menu_options?: MenuOption[]
  [key: string]: any
}

const props = defineProps<{
  item: MenuItem
  modelValue: MenuOption | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', option: MenuOption): void
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const selected = computed({
  get: () => props.modelValue,
  set: (val: any) => emit('update:modelValue', val)
})
</script>

<template>
  <div
    class="fixed inset-0 z-[9999] flex items-end justify-center bg-[#0A1128]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="`Choose an option for ${item.name}`"
      class="animate-sheet-up w-full max-w-md space-y-5 rounded-t-3xl border border-gray-200 bg-white p-5 text-left sm:rounded-3xl sm:p-6"
    >
      <div class="flex items-start justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 class="text-base font-extrabold text-[#0A1128]">{{ item.name }}</h3>
          <p class="mt-0.5 text-xs font-medium text-gray-400">Select a portion size or pricing tier</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          @click="emit('close')"
          class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none transition-colors hover:text-gray-800"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="max-h-[260px] space-y-2.5 overflow-y-auto pr-1">
        <label
          v-for="opt in item.menu_options"
          :key="opt.id"
          class="flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-colors"
          :class="selected?.id === opt.id ? 'border-[#0A1128] bg-[#0A1128]/5' : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'"
        >
          <div class="flex items-center gap-3">
            <input type="radio" :value="opt" v-model="selected" class="text-[#0A1128] focus:ring-0" />
            <span class="text-xs font-extrabold text-[#0A1128]">{{ opt.name }}</span>
          </div>
          <span class="text-xs font-extrabold text-emerald-700">{{ formatCurrency(opt.price) }}</span>
        </label>
      </div>

      <div class="flex items-center gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          @click="emit('close')"
          class="flex-1 cursor-pointer rounded-xl border-0 bg-gray-100 py-3.5 text-xs font-bold text-gray-600 outline-none transition-colors hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="emit('confirm')"
          class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[#0A1128] py-3.5 text-xs font-bold text-[#D4F53C] outline-none transition-colors hover:bg-[#16224a]"
        >
          Add to Order
          <Plus class="h-3.5 w-3.5 stroke-[3]" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes sheetUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-sheet-up { animation: sheetUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@media (prefers-reduced-motion: reduce) {
  .animate-sheet-up { animation: none; }
}
</style>
