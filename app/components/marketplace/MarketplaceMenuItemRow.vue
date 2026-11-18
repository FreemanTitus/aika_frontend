<!-- components/marketplace/MenuItemRow.vue -->
<script setup lang="ts">
import { Flame, Plus, UtensilsCrossed } from '@lucide/vue'

interface MenuOption {
  id: string | number
  name: string
  price: string | number
}

interface MenuItem {
  id: string | number
  name?: string
  description?: string | null
  image?: string | null
  image_url?: string | null
  bonanza_mode?: boolean
  discount_percentage?: number
  current_price?: string | number
  price?: string | number
  menu_options?: MenuOption[]
  [key: string]: any
}

defineProps<{
  item: MenuItem
}>()

const emit = defineEmits<{
  (e: 'add', item: MenuItem): void
}>()
</script>

<template>
  <div class="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition-colors duration-200 hover:border-[#0A1128]/30">
    <!-- Discount badge -->
    <div
      v-if="item.bonanza_mode && (item.discount_percentage ?? 0) > 0"
      class="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white"
    >
      <Flame class="h-3 w-3 fill-white" />
      -{{ item.discount_percentage }}% Off
    </div>

    <div class="flex min-w-0 flex-1 items-center gap-3.5">
      <div class="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 text-gray-300 sm:h-20 sm:w-20">
        <img
          v-if="item.image || item.image_url"
          :src="getMediaUrl(item.image || item.image_url)"
          :alt="item.name || 'Menu item thumbnail'"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <UtensilsCrossed v-else class="h-5 w-5 stroke-[1.5] text-gray-300" />
      </div>

      <div class="min-w-0 flex-1 space-y-1 text-left">
        <h3 class="truncate text-sm font-extrabold text-[#0A1128] transition-colors group-hover:text-emerald-700">
          {{ item.name }}
        </h3>
        <p class="line-clamp-2 text-[11px] font-medium leading-relaxed text-gray-500">
          {{ item.description || '' }}
        </p>
        <div class="flex items-baseline gap-2 pt-0.5">
          <template v-if="item.menu_options && item.menu_options.length > 0">
            <span class="text-sm font-extrabold tracking-tight text-[#0A1128]">
              From {{ formatCurrency(item.menu_options[0].price) }}
            </span>
          </template>
          <template v-else>
            <template v-if="item.bonanza_mode">
              <span class="text-sm font-extrabold tracking-tight text-rose-600">{{ formatCurrency(item.current_price) }}</span>
              <span class="text-[10px] font-bold text-gray-400 line-through">{{ formatCurrency(item.price) }}</span>
            </template>
            <span v-else class="text-sm font-extrabold tracking-tight text-[#0A1128]">{{ formatCurrency(item.price) }}</span>
          </template>
        </div>
      </div>
    </div>

    <button
      type="button"
      title="Add to order"
      aria-label="Add to order"
      @click="emit('add', item)"
      class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-gray-100 text-[#0A1128] outline-none transition-colors hover:bg-[#D4F53C] focus-visible:ring-2 focus-visible:ring-[#0A1128]"
    >
      <Plus class="h-4 w-4 stroke-[3]" />
    </button>
  </div>
</template>
