<!-- components/marketplace/ProductCard.vue -->
<script setup lang="ts">
import { Flame, Plus, ShoppingBag } from '@lucide/vue'

interface Product {
  id: string | number
  name?: string
  image?: string | null
  sub_category_name?: string | null
  bonanza_mode?: boolean
  discount_percentage?: number
  current_price?: string | number
  price?: string | number
  [key: string]: any
}

defineProps<{
  item: Product
}>()

const emit = defineEmits<{
  (e: 'add', item: Product): void
}>()
</script>

<template>
  <div class="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200 bg-white transition-colors duration-200 hover:border-[#0A1128]/30">
    <!-- Discount badge -->
    <div
      v-if="item.bonanza_mode && (item.discount_percentage ?? 0) > 0"
      class="absolute left-2 top-2 sm:left-3 sm:top-3 z-10 inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-rose-600 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wide text-white"
    >
      <Flame class="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-white" />
      -{{ item.discount_percentage }}% Off
    </div>

    <NuxtLink
      :to="`/marketplace/product/${item.id}`"
      class="relative flex aspect-square items-center justify-center overflow-hidden border-b border-gray-100 bg-gray-50 text-gray-300"
    >
      <img
        v-if="item.image"
        :src="getMediaUrl(item.image)"
        :alt="item.name || 'Product thumbnail'"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <ShoppingBag v-else class="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.5] text-gray-300" />
    </NuxtLink>

    <div class="flex flex-1 flex-col justify-between gap-2.5 sm:gap-4 p-2.5 sm:p-4 text-left">
      <div class="space-y-1 sm:space-y-2">
        <span class="inline-block max-w-full truncate rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold text-emerald-800">
          {{ item.sub_category_name || 'General Asset' }}
        </span>
        <NuxtLink
          :to="`/marketplace/product/${item.id}`"
          class="line-clamp-2 block text-xs sm:text-sm font-extrabold leading-snug tracking-tight text-[#0A1128] transition-colors hover:text-emerald-700"
        >
          {{ item.name }}
        </NuxtLink>
      </div>

      <div class="flex items-center justify-between gap-2 sm:gap-3 border-t border-gray-100 pt-2 sm:pt-3">
        <div class="flex flex-col min-w-0">
          <template v-if="item.bonanza_mode">
            <span class="text-sm sm:text-base font-extrabold leading-none text-rose-600 truncate">{{ formatCurrency(item.current_price) }}</span>
            <span class="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] font-bold text-gray-400 line-through truncate">{{ formatCurrency(item.price) }}</span>
          </template>
          <span v-else class="text-sm sm:text-base font-extrabold leading-none text-[#0A1128] truncate">{{ formatCurrency(item.price) }}</span>
        </div>

        <button
          type="button"
          title="Add to Cart"
          aria-label="Add to cart"
          @click.prevent="emit('add', item)"
          class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg sm:rounded-xl border-0 bg-gray-100 text-[#0A1128] outline-none transition-colors hover:bg-[#D4F53C] focus-visible:ring-2 focus-visible:ring-[#0A1128]"
        >
          <Plus class="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3]" />
        </button>
      </div>
    </div>
  </div>
</template>