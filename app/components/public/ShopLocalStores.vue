<script setup lang="ts">
import { ArrowRight, Zap, ShieldCheck, MapPin } from '@lucide/vue'

const ecommerceCategories = [
  {
    title: 'Supermarket & Groceries',
    subtitle: 'Fresh produce, provisions & drinks',
    badge: '30 Min Delivery',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
    query: 'groceries'
  },
  {
    title: 'Gadgets & Accessories',
    subtitle: 'Chargers, earbuds, powerbanks & phones',
    badge: 'Verified Stores',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop',
    query: 'gadgets'
  },
  {
    title: 'Pharmacy & Wellness',
    subtitle: 'Daily essentials, skincare & health care',
    badge: 'Discreet & Fast',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop',
    query: 'pharmacy'
  },
  {
    title: 'Fashion & Lifestyle',
    subtitle: 'Sneakers, perfumes, watches & bags',
    badge: 'Trending Drops',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop',
    query: 'fashion'
  }
]
</script>

<template>
  <section id="ecommerce" class="py-16 md:py-24 bg-[#0A1128] text-white relative overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 space-y-12">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-2 max-w-xl">
          <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-3.5 py-1 rounded-full inline-block">
            Beyond Food
          </span>
          <h2 class="text-3xl sm:text-4xl font-black tracking-tight">
            Shop Local Stores &amp; <span class="text-[#D4F53C]">E-Commerce</span>
          </h2>
          <p class="text-gray-300 text-sm font-medium">
            Order groceries, gadgets, pharmacy items, and fashion from trusted neighborhood stores—delivered in minutes.
          </p>
        </div>
        <NuxtLink
          to="/marketplace"
          class="bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition inline-flex items-center gap-2 self-start md:self-auto no-underline"
        >
          <span>Explore Marketplace</span>
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>

      <!-- E-Commerce Category Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <NuxtLink
          v-for="cat in ecommerceCategories"
          :key="cat.title"
          :to="`/marketplace?category=${cat.query}`"
          class="group relative h-72 rounded-[28px] overflow-hidden border border-white/10 shadow-xl flex flex-col justify-end p-6 no-underline"
        >
          <img
            :src="cat.image"
            :alt="cat.title"
            class="absolute inset-0 w-full h-full object-cover brightness-[0.55] group-hover:scale-110 transition-transform duration-500"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-[#0A1128]/40 to-transparent"></div>

          <div class="relative z-10 space-y-2">
            <span class="inline-block bg-[#D4F53C] text-[#0A1128] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
              {{ cat.badge }}
            </span>
            <h3 class="text-lg font-black text-white leading-snug">{{ cat.title }}</h3>
            <p class="text-xs text-gray-300 font-medium">{{ cat.subtitle }}</p>
          </div>
        </NuxtLink>
      </div>

      <!-- Compact 3-Step Strip -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div class="bg-white/[0.05] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-[#D4F53C] text-[#0A1128] flex items-center justify-center font-black flex-shrink-0">
            <Zap class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-black text-white">Instant Rider Dispatch</h4>
            <p class="text-xs text-gray-400">Nearest vetted rider assigned in seconds.</p>
          </div>
        </div>

        <div class="bg-white/[0.05] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-[#D4F53C] text-[#0A1128] flex items-center justify-center font-black flex-shrink-0">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-black text-white">Protected Escrow Checkout</h4>
            <p class="text-xs text-gray-400">Safe payments released upon delivery.</p>
          </div>
        </div>

        <div class="bg-white/[0.05] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-[#D4F53C] text-[#0A1128] flex items-center justify-center font-black flex-shrink-0">
            <MapPin class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-black text-white">Live Doorstep Tracking</h4>
            <p class="text-xs text-gray-400">Follow your food or parcel in real time.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>