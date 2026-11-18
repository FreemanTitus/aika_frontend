<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  Bike,
  ArrowRight,
  Star,
  Sparkles,
  Search,
  Utensils,
  ShoppingBag
} from '@lucide/vue'

definePageMeta({
  layout: 'default'
})
// Import extracted components
import FeaturedMeals from '~/components/public/FeaturedMeals.vue'
import PopularRestaurants from '~/components/public/PopularRestaurants.vue'
import ShopLocalStores from '~/components/public/ShopLocalStores.vue'

useHead({
  title: 'Aika | Food Delivery, Restaurants, Shopping & Instant Bike Runs',
  meta: [
    {
      name: 'description',
      content:
        'Order hot meals from top restaurants, shop local retail stores, and book instant bike deliveries across town with Aika.'
    }
  ]
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const router = useRouter()

// ============================================================================
// STATE FOR LIVE FEED DATA
// ============================================================================
const featuredMeals = ref<any[]>([])
const mealCategories = ref<any[]>([])
const restaurants = ref<any[]>([])
const isLoadingFeed = ref(true)

// ============================================================================
// 1. HERO SLIDER & QUICK SEARCH STATE
// ============================================================================
const searchQuery = ref('')

const handleQuickSearch = () => {
  const q = searchQuery.value.trim()
  if (q) {
    router.push({ path: '/marketplace', query: { q } })
  } else {
    router.push('/marketplace')
  }
}

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop',
    badge: '🔥 Hot & Fresh in 25 Mins',
    headline: 'Craving Something Delicious?',
    highlight: 'Delivered Hot to Your Door.'
  },
  {
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1400&auto=format&fit=crop',
    badge: '🛍️ Local E-Commerce & Marts',
    headline: 'Shop Groceries, Gadgets & More.',
    highlight: 'Same-Hour Dispatch.'
  },
  {
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1400&auto=format&fit=crop',
    badge: '⚡ Instant Bike Transit',
    headline: 'Send Packages or Catch a Ride.',
    highlight: 'Zero Delays Across Town.'
  }
]

const currentSlideIndex = ref(0)
let slideInterval: any = null

const nextSlide = () => {
  currentSlideIndex.value = (currentSlideIndex.value + 1) % heroSlides.length
}

const prevSlide = () => {
  currentSlideIndex.value = (currentSlideIndex.value - 1 + heroSlides.length) % heroSlides.length
}

// ============================================================================
// 2. REVIEWS & FAQS (LIVE DJANGO NINJA API INTEGRATION)
// ============================================================================
const reviews = ref<any[]>([])
const faqs = ref<any[]>([])

const feedbackModal = ref({
  isOpen: false,
  title: '',
  message: '',
  type: 'success' as 'success' | 'error'
})

const testimonialRail = ref<HTMLElement | null>(null)

const slideRail = (direction: 'left' | 'right'): void => {
  if (!testimonialRail.value) return
  const scrollAmount = 380
  testimonialRail.value.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount
}

const isReviewModalOpen = ref(false)
const isSuccessModalOpen = ref(false)
const reviewForm = ref({
  name: '',
  role: 'Customer / Vendor',
  comment: ''
})

const openReviewModal = () => {
  isReviewModalOpen.value = true
}

const handleReviewSubmit = async () => {
  try {
    await $fetch(`${apiBase}/api/v1/public/submit-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: reviewForm.value
    })
    isReviewModalOpen.value = false
    reviewForm.value = { name: '', role: 'Customer / Vendor', comment: '' }
    isSuccessModalOpen.value = true
  } catch (err: any) {
    feedbackModal.value = {
      isOpen: true,
      title: 'Submission Failed',
      message: err?.data?.detail || 'Failed to submit review. Please try again.',
      type: 'error'
    }
  }
}

const fetchReviews = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/public/reviews`)
    reviews.value = res?.reviews || []
  } catch (err) {
    console.error('Failed to fetch customer reviews', err)
  }
}

const fetchFaqs = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/public/faqs`)
    faqs.value = res?.faqs || []
  } catch (err) {
    console.error('Failed to fetch FAQs', err)
  }
}

const activeFaqIndex = ref<number | null>(0)
const toggleFaq = (index: number): void => {
  activeFaqIndex.value = activeFaqIndex.value === index ? null : index
}

const fetchHomeFeed = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/public/home-feed`) // Match your actual router path prefix
    if (res?.status === 'success') {
      featuredMeals.value = res.featured_meals || []
      mealCategories.value = res.meal_categories || []
      restaurants.value = res.restaurants || []
    }
  } catch (err) {
    console.error('Failed to load marketplace home feed:', err)
  } finally {
    isLoadingFeed.value = false
  }
}

onMounted(() => {
    fetchHomeFeed()
  fetchReviews()
  fetchFaqs()
  slideInterval = setInterval(nextSlide, 5500)
})

onBeforeUnmount(() => {
  if (slideInterval) clearInterval(slideInterval)
})
</script>

<template>
  <div class="selection:bg-[#D4F53C] selection:text-[#0A1128] bg-white text-[#0A1128]">
    <!-- =========================================================================
         1. LIVELY INTERACTIVE HERO WITH SEARCH & QUICK SERVICE PILLS
         ========================================================================= -->
    <section class="relative w-full min-h-[86vh] flex items-center justify-center overflow-hidden bg-[#0A1128]">
      <!-- Background Image Slider -->
      <div
        v-for="(slide, idx) in heroSlides"
        :key="idx"
        :class="[currentSlideIndex === idx ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 pointer-events-none z-0']"
        class="absolute inset-0 transition-all duration-1000 ease-in-out"
      >
        <img
          :src="slide.image"
          :alt="slide.headline"
          class="absolute inset-0 w-full h-full object-cover brightness-[0.42] scale-105 transition-transform duration-1000"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-[#0A1128]/55 to-[#0A1128]/30"></div>
      </div>

      <!-- Slider Arrows -->
      <button
        type="button"
        @click="prevSlide"
        aria-label="Previous slide"
        class="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-2xl bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] backdrop-blur-md items-center justify-center font-bold transition cursor-pointer border border-white/15"
      >
        ❮
      </button>
      <button
        type="button"
        @click="nextSlide"
        aria-label="Next slide"
        class="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-2xl bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] backdrop-blur-md items-center justify-center font-bold transition cursor-pointer border border-white/15"
      >
        ❯
      </button>

      <!-- Center Hero Content -->
      <div class="relative z-20 max-w-5xl mx-auto px-6 py-20 text-center space-y-7">
        <div class="inline-flex items-center space-x-2 bg-[#D4F53C] text-[#0A1128] font-black px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider shadow-xl">
          <Sparkles class="w-3.5 h-3.5" />
          <span>{{ heroSlides[currentSlideIndex]?.badge }}</span>
        </div>

        <h1 class="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.08] tracking-tight max-w-4xl mx-auto">
          {{ heroSlides[currentSlideIndex]?.headline }}
          <span class="block text-[#D4F53C] mt-1">{{ heroSlides[currentSlideIndex]?.highlight }}</span>
        </h1>

        <p class="text-sm sm:text-lg text-gray-200 max-w-xl mx-auto font-medium">
          Hot meals, local stores, groceries, and fast bike runs—all in one tap.
        </p>

        <!-- Interactive Marketplace Search Bar -->
        <form
          @submit.prevent="handleQuickSearch"
          class="max-w-2xl mx-auto bg-white p-2 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-white/20"
        >
          <div class="flex items-center flex-1 px-3.5 py-2.5 sm:py-0">
            <Search class="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search Jollof rice, shawarma, groceries, or stores..."
              class="w-full text-sm font-semibold text-[#0A1128] placeholder-gray-400 bg-transparent border-0 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            class="bg-[#0A1128] hover:bg-[#16224a] text-[#D4F53C] font-black px-7 py-3.5 rounded-xl sm:rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer border-0 flex items-center justify-center gap-2 shadow-md active:scale-95"
          >
            <span>Find Now</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </form>

        <!-- Quick Service Action Pills -->
        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <NuxtLink
            to="/marketplace?category=food"
            class="bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] backdrop-blur-md border border-white/15 px-5 py-2.5 rounded-full text-xs font-black tracking-wide transition flex items-center gap-2 no-underline"
          >
            <Utensils class="w-3.5 h-3.5" />
            <span>Order Food</span>
          </NuxtLink>
          <NuxtLink
            to="/marketplace?category=retail"
            class="bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] backdrop-blur-md border border-white/15 px-5 py-2.5 rounded-full text-xs font-black tracking-wide transition flex items-center gap-2 no-underline"
          >
            <ShoppingBag class="w-3.5 h-3.5" />
            <span>Shop Stores</span>
          </NuxtLink>
          <NuxtLink
            to="/marketplace"
            class="bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] backdrop-blur-md border border-white/15 px-5 py-2.5 rounded-full text-xs font-black tracking-wide transition flex items-center gap-2 no-underline"
          >
            <Bike class="w-3.5 h-3.5" />
            <span>Book Bike / Errand</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Slide Dots -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
        <button
          v-for="(_, dotIdx) in heroSlides"
          :key="dotIdx"
          type="button"
          @click="currentSlideIndex = dotIdx"
          :class="[currentSlideIndex === dotIdx ? 'w-7 bg-[#D4F53C]' : 'w-2 bg-white/40 hover:bg-white/75']"
          class="h-2 rounded-full transition-all duration-300 cursor-pointer border-0"
        ></button>
      </div>
    </section>

    <!-- =========================================================================
         2. FEATURED FOODS COMPONENT
         ========================================================================= -->
    <FeaturedMeals :meals="featuredMeals" :categories="mealCategories" :loading="isLoadingFeed" />
   

    <!-- =========================================================================
         3. POPULAR RESTAURANTS COMPONENT
         ========================================================================= -->
    <PopularRestaurants :restaurants="restaurants" :loading="isLoadingFeed" />
    

    <!-- =========================================================================
         4. SHOP LOCAL STORES & E-COMMERCE COMPONENT
         ========================================================================= -->
    <ShopLocalStores />

    <!-- =========================================================================
         5. COMPACT ECOSYSTEM CTA BANNER (RIDERS, VENDORS, CAREERS)
         ========================================================================= -->
    <section class="py-16 md:py-20 bg-gray-50 border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
            <div class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-[#0A1128] bg-[#D4F53C] px-3 py-1 rounded-full inline-block">Earn Weekly</span>
              <h3 class="text-xl font-black text-[#0A1128]">Ride with Aika</h3>
              <p class="text-xs text-gray-500 font-medium leading-relaxed">Flexible hours, instant trip alerts, and reliable weekly payouts.</p>
            </div>
            <NuxtLink to="/rider/register" class="bg-[#0A1128] hover:bg-[#16224a] text-[#D4F53C] font-black text-xs uppercase tracking-wider py-3.5 px-5 rounded-xl text-center transition no-underline">
              Become a Rider
            </NuxtLink>
          </div>

          <div class="bg-gradient-to-br from-[#D4F53C] to-[#bfe324] p-7 rounded-[28px] shadow-md flex flex-col justify-between space-y-6">
            <div class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-[#0A1128] bg-white/80 px-3 py-1 rounded-full inline-block">Boost Sales</span>
              <h3 class="text-xl font-black text-[#0A1128]">Open Your Storefront</h3>
              <p class="text-xs text-[#0A1128]/85 font-semibold leading-relaxed">List your restaurant or retail shop and reach hungry buyers across town.</p>
            </div>
            <NuxtLink to="/merchant/register" class="bg-[#0A1128] hover:bg-[#16224a] text-white font-black text-xs uppercase tracking-wider py-3.5 px-5 rounded-xl text-center transition no-underline">
              Register Storefront
            </NuxtLink>
          </div>

          <div class="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
            <div class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-[#0A1128] bg-[#D4F53C] px-3 py-1 rounded-full inline-block">Careers</span>
              <h3 class="text-xl font-black text-[#0A1128]">Join the Crew</h3>
              <p class="text-xs text-gray-500 font-medium leading-relaxed">Help us build fast local commerce and logistics infrastructure.</p>
            </div>
            <NuxtLink to="/careers" class="bg-[#0A1128] hover:bg-[#16224a] text-[#D4F53C] font-black text-xs uppercase tracking-wider py-3.5 px-5 rounded-xl text-center transition no-underline">
              Explore Roles
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================================
         6. LIVE REVIEWS CAROUSEL & SUBMISSION
         ========================================================================= -->
    <section class="bg-[#0A1128] text-white py-16 md:py-24 border-b border-white/5 overflow-hidden">
      <div class="max-w-6xl mx-auto px-6">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div class="space-y-2">
            <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-3.5 py-1 rounded-full inline-block">Reviews</span>
            <h2 class="text-3xl sm:text-4xl font-black tracking-tight">Loved Across Town</h2>
          </div>

          <button
            type="button"
            @click="openReviewModal"
            class="text-xs font-black uppercase tracking-wider text-[#0A1128] bg-[#D4F53C] hover:bg-[#c3e334] px-5 py-3 rounded-2xl transition shadow-lg cursor-pointer inline-flex items-center gap-2 border-0 self-start sm:self-auto"
          >
            <MessageSquarePlus class="w-4 h-4" />
            <span>Share Experience</span>
          </button>
        </div>

        <div
          ref="testimonialRail"
          class="flex space-x-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 scrollbar-none"
          style="-ms-overflow-style: none; scrollbar-width: none;"
        >
          <div
            v-for="rev in reviews"
            :key="rev.id"
            class="flex-shrink-0 w-full sm:w-[380px] bg-white/[0.05] border border-white/10 rounded-[28px] p-7 snap-center flex flex-col justify-between hover:border-[#D4F53C]/50 transition"
          >
            <div class="space-y-3">
              <div class="flex items-center space-x-1 text-[#D4F53C]">
                <Star v-for="i in 5" :key="i" class="w-4 h-4 fill-current" />
              </div>
              <p class="text-gray-200 text-sm font-medium leading-relaxed">“{{ rev.comment }}”</p>
            </div>
            <div class="pt-5 border-t border-white/10 mt-5">
              <h4 class="text-sm font-black text-[#D4F53C]">{{ rev.name }}</h4>
              <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{{ rev.role }}</p>
            </div>
          </div>
        </div>

        <div v-if="reviews.length > 1" class="flex justify-end items-center space-x-2.5 mt-4">
          <button
            type="button"
            @click="slideRail('left')"
            class="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] flex items-center justify-center transition cursor-pointer border-0"
          >
            ←
          </button>
          <button
            type="button"
            @click="slideRail('right')"
            class="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] flex items-center justify-center transition cursor-pointer border-0"
          >
            →
          </button>
        </div>
      </div>
    </section>

    <!-- =========================================================================
         7. COMPACT FAQ ACCORDION
         ========================================================================= -->
    <section id="faq" class="bg-white py-16 md:py-24">
      <div class="max-w-3xl mx-auto px-6">
        <div class="text-center mb-10 space-y-2">
          <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-3.5 py-1 rounded-full inline-block">FAQ</span>
          <h2 class="text-3xl font-black text-[#0A1128] tracking-tight">Quick Answers</h2>
        </div>

        <div class="space-y-3">
          <div
            v-for="(faq, index) in faqs"
            :key="faq.id"
            class="border border-gray-200/80 rounded-2xl bg-gray-50/60 overflow-hidden"
          >
            <button
              type="button"
              @click="toggleFaq(index)"
              class="w-full flex items-center justify-between px-5 py-4 text-left font-extrabold text-sm text-[#0A1128] cursor-pointer border-0 bg-transparent"
            >
              <span>{{ faq.question }}</span>
              <span class="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-black text-emerald-700">
                {{ activeFaqIndex === index ? '−' : '＋' }}
              </span>
            </button>
            <div
              :class="[activeFaqIndex === index ? 'max-h-60 pb-4 px-5' : 'max-h-0']"
              class="overflow-hidden transition-all duration-300 ease-in-out"
            >
              <p class="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed pt-2 border-t border-gray-200/60">
                {{ faq.answer }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================================
         MODALS (REVIEW SUBMISSION, SUCCESS, FEEDBACK)
         ========================================================================= -->
    <div v-if="isReviewModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/75 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg bg-white rounded-[32px] p-7 shadow-2xl space-y-5 text-[#0A1128]">
        <div class="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span class="text-[10px] font-black tracking-widest bg-[#D4F53C]/40 px-3 py-1 rounded-full uppercase">Community</span>
            <h3 class="text-xl font-black mt-1">Share Your Experience</h3>
          </div>
          <button
            type="button"
            @click="isReviewModalOpen = false"
            class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[#0A1128] bg-gray-100 rounded-xl border-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleReviewSubmit" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Your Name</label>
            <input
              v-model="reviewForm.name"
              type="text"
              required
              placeholder="e.g. Chinedu Okafor"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#0A1128]"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Your Role</label>
            <input
              v-model="reviewForm.role"
              type="text"
              required
              placeholder="e.g. Food Lover / Restaurant Owner"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#0A1128]"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Your Review</label>
            <textarea
              v-model="reviewForm.comment"
              rows="3"
              required
              placeholder="Tell us about your order or delivery..."
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#0A1128] resize-none"
            ></textarea>
          </div>
          <div class="pt-1 flex items-center gap-3">
            <button
              type="button"
              @click="isReviewModalOpen = false"
              class="w-1/3 py-3.5 bg-gray-100 hover:bg-gray-200 font-black text-xs uppercase rounded-2xl border-0 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="w-2/3 py-3.5 bg-[#D4F53C] hover:bg-[#c3e334] font-black text-xs uppercase rounded-2xl shadow-md border-0 cursor-pointer"
            >
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="isSuccessModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/75 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm bg-white rounded-[32px] p-7 shadow-2xl space-y-5 text-center">
        <div class="w-14 h-14 bg-[#D4F53C]/30 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 class="w-7 h-7 text-[#0A1128]" />
        </div>
        <div class="space-y-1.5">
          <h3 class="text-xl font-black">Review Received!</h3>
          <p class="text-xs text-gray-500 font-medium">Thank you! Your review will appear once approved.</p>
        </div>
        <button
          type="button"
          @click="isSuccessModalOpen = false"
          class="w-full py-3.5 bg-[#0A1128] text-[#D4F53C] font-black text-xs uppercase rounded-2xl border-0 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>

    <div v-if="feedbackModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/75 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm bg-white rounded-[32px] p-7 shadow-2xl space-y-5 text-center">
        <div :class="feedbackModal.type === 'success' ? 'bg-[#D4F53C]/30 text-[#0A1128]' : 'bg-rose-100 text-rose-600'" class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 v-if="feedbackModal.type === 'success'" class="w-7 h-7" />
          <AlertCircle v-else class="w-7 h-7" />
        </div>
        <div class="space-y-1.5">
          <h3 class="text-xl font-black">{{ feedbackModal.title }}</h3>
          <p class="text-xs text-gray-500 font-medium">{{ feedbackModal.message }}</p>
        </div>
        <button
          type="button"
          @click="feedbackModal.isOpen = false"
          class="w-full py-3.5 bg-[#0A1128] text-[#D4F53C] font-black text-xs uppercase rounded-2xl border-0 cursor-pointer"
        >
          Okay
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>