<!-- components/MarketplaceProductCard.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Store, Star, Tag, ShoppingCart, Plus, Minus, Check } from '@lucide/vue'

const props = defineProps<{
  item: Record<string, any>
  cartQuantity?: number
}>()

const emit = defineEmits<{
  (e: 'add-to-cart', payload: { item: Record<string, any>; vendor: Record<string, any>; quantity: number }): void
  (e: 'update-quantity', payload: { item: Record<string, any>; vendor: Record<string, any>; quantity: number }): void
}>()

const vendor = computed(() => props.item.vendor || {})

const storeUrl = computed(() => {
  const target =
    vendor.value.id ||
    vendor.value.vendor_id ||
    props.item.vendor_id ||
    props.item.store_id ||
    vendor.value.store_slug
  return `/store/${encodeURIComponent(String(target))}?item=${encodeURIComponent(String(props.item.id))}`
})

const hasDiscount = computed(() => {
  const current = Number(props.item.current_price ?? props.item.price ?? 0)
  const original = Number(props.item.price ?? 0)
  return Boolean(props.item.bonanza_mode) && original > current
})

const effectivePrice = computed(() =>
  Number(props.item.current_price ?? props.item.price ?? 0)
)

const isVendorOpen = computed(() => vendor.value.is_currently_open !== false)
const justAdded = ref(false)

const formatNaira = (amount: number | string | null | undefined) => {
  const num = Number(amount ?? 0)
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(num)
}

const handleAdd = () => {
  if (!isVendorOpen.value) return
  emit('add-to-cart', {
    item: props.item,
    vendor: vendor.value,
    quantity: 1
  })
  justAdded.value = true
  setTimeout(() => {
    justAdded.value = false
  }, 1200)
}

const handleIncrement = () => {
  if (!isVendorOpen.value) return
  const nextQty = (props.cartQuantity || 0) + 1
  emit('update-quantity', {
    item: props.item,
    vendor: vendor.value,
    quantity: nextQty
  })
}

const handleDecrement = () => {
  const nextQty = Math.max(0, (props.cartQuantity || 0) - 1)
  emit('update-quantity', {
    item: props.item,
    vendor: vendor.value,
    quantity: nextQty
  })
}
</script>

<template>
  <article
    class="group flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0A1128]/30 hover:shadow-md"
  >
    <!-- Product Image -->
    <NuxtLink :to="storeUrl" class="relative block aspect-[4/3] sm:aspect-video w-full overflow-hidden bg-gray-100">
      <img
        v-if="item.image"
        :src="getMediaUrl(item.image)"
        :alt="item.name"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center bg-[#0A1128]/5 text-[11px] sm:text-xs font-bold text-gray-400"
      >
        No Photo
      </div>

      <span
        v-if="hasDiscount"
        class="absolute left-2 top-2 sm:left-3 sm:top-3 inline-flex items-center gap-1 rounded-full bg-[#D4F53C] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wide text-[#0A1128] shadow-sm"
      >
        <Tag class="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        {{ item.discount_percentage ? `${item.discount_percentage}% Off` : 'Bonanza' }}
      </span>
    </NuxtLink>

    <!-- Body -->
    <div class="flex flex-1 flex-col justify-between gap-2.5 sm:gap-3.5 p-2.5 sm:p-4">
      <div class="space-y-1 sm:space-y-1.5">
        <div class="flex items-start justify-between gap-1.5 sm:gap-2">
          <NuxtLink :to="storeUrl" class="min-w-0 flex-1 no-underline">
            <h3 class="line-clamp-1 text-xs sm:text-sm font-extrabold text-[#0A1128] group-hover:underline">
              {{ item.name }}
            </h3>
          </NuxtLink>
          <span
            v-if="item.sub_category_name || item.category_label"
            class="hidden sm:inline-block shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600"
          >
            {{ item.sub_category_name || item.category_label }}
          </span>
        </div>

        <p v-if="item.description" class="line-clamp-1 sm:line-clamp-2 text-[11px] sm:text-xs leading-relaxed text-gray-500">
          {{ item.description }}
        </p>

        <!-- Price & Add to Cart -->
        <div class="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pt-1 sm:pt-1.5">
          <div class="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-2 min-w-0">
            <span class="text-xs sm:text-sm font-black text-[#0A1128] truncate">
              {{ formatNaira(effectivePrice) }}
            </span>
            <span v-if="hasDiscount" class="text-[10px] sm:text-xs font-semibold text-gray-400 line-through">
              {{ formatNaira(item.price) }}
            </span>
          </div>

          <!-- Quantity Stepper when already in cart -->
          <div
            v-if="(cartQuantity || 0) > 0"
            class="inline-flex items-center gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl border border-[#0A1128] bg-[#0A1128] p-0.5 text-white shrink-0"
          >
            <button
              type="button"
              @click="handleDecrement"
              aria-label="Decrease quantity"
              class="flex h-6 w-6 sm:h-7 sm:w-7 cursor-pointer items-center justify-center rounded-md sm:rounded-lg border-0 bg-white/10 text-white outline-none transition-colors hover:bg-white/20"
            >
              <Minus class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            <span class="min-w-[1.25rem] sm:min-w-[1.5rem] text-center text-[11px] sm:text-xs font-extrabold text-[#D4F53C]">
              {{ cartQuantity }}
            </span>
            <button
              type="button"
              @click="handleIncrement"
              :disabled="!isVendorOpen"
              aria-label="Increase quantity"
              class="flex h-6 w-6 sm:h-7 sm:w-7 cursor-pointer items-center justify-center rounded-md sm:rounded-lg border-0 bg-white/10 text-white outline-none transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>

          <!-- Add to Cart Button -->
          <button
            v-else
            type="button"
            @click="handleAdd"
            :disabled="!isVendorOpen"
            :class="
              !isVendorOpen
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#D4F53C] text-[#0A1128] hover:bg-[#c5e632]'
            "
            class="inline-flex cursor-pointer items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border-0 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-extrabold outline-none transition-colors shrink-0"
          >
            <Check v-if="justAdded" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <ShoppingCart v-else class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{{ !isVendorOpen ? 'Closed' : justAdded ? 'Added' : 'Add' }}<span class="hidden sm:inline"> to Cart</span></span>
          </button>
        </div>
      </div>

      <!-- Clickable Vendor Footer -->
      <NuxtLink
        :to="storeUrl"
        class="flex items-center justify-between gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-gray-100 bg-gray-50 px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs no-underline transition-colors hover:border-[#0A1128]/20 hover:bg-[#D4F53C]/20"
      >
        <div class="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Store class="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-[#0A1128]" />
          <span class="truncate font-bold text-[#0A1128]">
            {{ vendor.company_name || 'View Store' }}
          </span>
        </div>

        <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span
            :class="isVendorOpen ? 'text-emerald-700' : 'text-gray-400'"
            class="text-[9px] sm:text-[10px] font-extrabold"
          >
            {{ isVendorOpen ? 'Open' : 'Closed' }}
          </span>
          <span v-if="vendor.rating" class="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold text-[#0A1128]">
            <Star class="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-amber-400 text-amber-400" />
            {{ Number(vendor.rating).toFixed(1) }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </article>
</template>