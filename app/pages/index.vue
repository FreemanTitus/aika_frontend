<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  Bike,
  ArrowRight,
  Star,
  Search,
  ShoppingBag,
  MapPin,
  Clock,
  ShieldCheck,
  Package
} from '@lucide/vue'

definePageMeta({
  layout: 'default'
})

// Import extracted components
import FeaturedMeals from '~/components/public/FeaturedMeals.vue'
import PopularRestaurants from '~/components/public/PopularRestaurants.vue'
import ShopLocalStores from '~/components/public/ShopLocalStores.vue'

useHead({
  title: 'Aika | Food Delivery, Gadgets, Apparel, Appliances & Instant Bike Runs',
  meta: [
    {
      name: 'description',
      content:
        'Order hot meals from top restaurants, shop Gadgets & Tech, Clothing & Apparel, Home Appliances, Beauty & Cosmetics, or book instant bike runs with Aika.'
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
// 1. GLOVO-STYLE INTERACTIVE SEARCH & LEFT ANIMATED IMAGE SHOWCASE
// ============================================================================
const searchQuery = ref('')
const deliveryLocation = ref('')

const handleQuickSearch = () => {
  const q = searchQuery.value.trim()
  const loc = deliveryLocation.value.trim()
  const query: Record<string, string> = {}
  if (q) query.q = q
  if (loc) query.location = loc

  router.push({ path: '/marketplace', query })
}

const leftHeroSlides = [
  {
    label: 'Hot Meals & Food',
    image: '/gif/meal.png'
  },
  {
    label: 'Gadgets & Tech',
    image: '/gif/gadget.png'
  },
  {
    label: 'Clothing & Apparel',
    image: '/gif/apparel.png'
  },
  {
    label: 'Home Appliances',
    image: '/gif/appliance.png'
  },
  {
    label: 'Beauty & Cosmetics',
    image: 'gif/cosmetic.png'
  },
  {
    label: 'Perfumes & Body Sprays',
    image: '/gif/perfume.png'
  },
  {
    label: 'Fast Deliveries',
    image: '/gif/rider.png'
  }
]

const activeLeftSlide = ref(0)
let leftSlideTimer: ReturnType<typeof setInterval> | null = null

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
    const res: any = await $fetch(`${apiBase}/api/v1/public/home-feed`)
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
  leftSlideTimer = setInterval(() => {
    activeLeftSlide.value = (activeLeftSlide.value + 1) % leftHeroSlides.length
  }, 3200)
})

onBeforeUnmount(() => {
  if (leftSlideTimer) clearInterval(leftSlideTimer)
})
</script>

<template>
  <div class="selection:bg-[#0A1128] selection:text-[#D4F53C] bg-white text-[#0A1128]">
    <!-- =========================================================================
         1. GLOVO-INSPIRED HERO WITH LEMON GREEN -> SECOND NAVY GRADIENT & LEFT IMAGE
         ========================================================================= -->
    <section class="relative bg-gradient-to-br from-[#D4F53C] via-[#9cc936] to-[#16224a] pt-10 pb-20 md:pt-14 md:pb-28 overflow-hidden">
      <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/15 blur-2xl pointer-events-none"></div>
      <div class="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-[#16224a]/25 blur-xl pointer-events-none"></div>

      <div class="relative z-10 max-w-6xl mx-auto px-5 sm:px-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <!-- Left Non-Clickable, Borderless, Seamlessly Blended Animated Showcase -->
          <div class="lg:col-span-5 flex flex-col items-center select-none pointer-events-none">
            <div class="relative w-full max-w-[380px] aspect-square bg-transparent border-0">
              <div
                v-for="(slide, idx) in leftHeroSlides"
                :key="slide.label"
                :class="[
                  activeLeftSlide === idx
                    ? 'opacity-100 scale-100 translate-y-0 z-10'
                    : 'opacity-0 scale-105 translate-y-3 z-0'
                ]"
                class="absolute inset-0 transition-all duration-700 ease-out bg-transparent flex flex-col items-center justify-center"
              >
                <img
                  :src="slide.image"
                  :alt="slide.label"
                  class="w-full h-full object-contain animate-hero-float bg-transparent mix-blend-multiply hero-edge-fade"
                />
                <div class="mt-2">
                  <span class="bg-[#0A1128] text-[#D4F53C] text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full inline-block shadow-sm">
                    {{ slide.label }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Slide Indicator Pills -->
            <div class="mt-6 flex items-center gap-2">
              <span
                v-for="(slide, idx) in leftHeroSlides"
                :key="slide.label"
                :class="[
                  activeLeftSlide === idx
                    ? 'w-6 bg-[#D4F53C]'
                    : 'w-2 bg-white/40'
                ]"
                class="h-2 rounded-full transition-all duration-300 inline-block"
              ></span>
            </div>
          </div>

          <!-- Right Hero Copy & Unified Search Bar -->
          <div class="lg:col-span-7 text-center lg:text-left space-y-5">
            <div class="inline-flex items-center gap-2 bg-[#0A1128] text-[#D4F53C] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm">
              <Bike class="w-3.5 h-3.5" />
              <span>Food, Stores &amp; Instant Bike Runs</span>
            </div>

            <h1 class="text-4xl sm:text-6xl font-black text-[#0A1128] leading-[1.05] tracking-tight">
              Anything in town,
              <span class="block text-white">delivered in minutes.</span>
            </h1>

            <p class="text-sm sm:text-base text-[#0A1128]/90 font-semibold max-w-xl mx-auto lg:mx-0">
              Order hot meals, shop gadgets, apparel, home appliances &amp; beauty stores, or send a quick bike errand—even without a heavy sign-up.
            </p>

            <!-- Unified Glovo-Style Split Search Bar -->
            <form
              @submit.prevent="handleQuickSearch"
              class="mt-6 bg-white p-2 rounded-[26px] shadow-xl shadow-[#0A1128]/15 flex flex-col md:flex-row items-stretch md:items-center gap-2"
            >
              <div class="flex items-center md:w-2/5 px-4 py-2.5 md:py-2 border-b md:border-b-0 md:border-r border-gray-100">
                <MapPin class="w-4 h-4 text-[#0A1128] mr-2.5 flex-shrink-0" />
                <input
                  v-model="deliveryLocation"
                  type="text"
                  placeholder="Your area or landmark..."
                  class="w-full text-xs sm:text-sm font-bold text-[#0A1128] placeholder-gray-400 bg-transparent border-0 focus:outline-none"
                />
              </div>

              <div class="flex items-center flex-1 px-4 py-2.5 md:py-2">
                <Search class="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Jollof, gadgets, apparel, appliances, or beauty..."
                  class="w-full text-xs sm:text-sm font-bold text-[#0A1128] placeholder-gray-400 bg-transparent border-0 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                class="bg-[#0A1128] hover:bg-[#16224a] text-[#D4F53C] font-black px-7 py-3.5 rounded-[20px] text-xs uppercase tracking-wider transition cursor-pointer border-0 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Explore</span>
                <ArrowRight class="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <!-- Compact Value Strip -->
        <div class="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-extrabold text-white/95">
          <span class="inline-flex items-center gap-1.5">
            <Clock class="w-4 h-4" /> Fast local dispatch
          </span>
          <span class="inline-flex items-center gap-1.5">
            <ShieldCheck class="w-4 h-4" /> Cash on delivery &amp; secure pay
          </span>
          <span class="inline-flex items-center gap-1.5">
            <Bike class="w-4 h-4" /> Guest bike booking supported
          </span>
        </div>
      </div>

      <!-- Glovo-Style Curved Bottom Wave Transition -->
      <div class="absolute bottom-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
        <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-7 sm:h-11 preserve-3d">
          <path d="M0 56H1440V18C1180 56 880 0 540 24C260 44 100 28 0 12V56Z" fill="#FFFFFF" />
        </svg>
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
         5. GLOVO-STYLE "TOGETHER WITH AIKA" PARTNER CARDS
         ========================================================================= -->
    <section class="py-16 md:py-24 bg-[#F8FAFC] border-y border-gray-100">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center max-w-xl mx-auto mb-12 space-y-2">
          <span class="text-[10px] font-black uppercase tracking-widest bg-[#D4F53C] text-[#0A1128] px-3.5 py-1 rounded-full inline-block">
            Grow With Us
          </span>
          <h2 class="text-3xl sm:text-4xl font-black text-[#0A1128] tracking-tight">
            Let’s move town together
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6">
            <div class="space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-[#0A1128] text-[#D4F53C] flex items-center justify-center">
                <Bike class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-black text-[#0A1128]">Become a Rider</h3>
              <p class="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                Ride full-time or part-time with transparent earnings, instant order alerts, and fast wallet payouts.
              </p>
            </div>
            <NuxtLink
              to="/rider/register"
              class="inline-flex items-center justify-center gap-2 bg-[#D4F53C] hover:bg-[#c5e82a] text-[#0A1128] font-black text-xs uppercase tracking-wider py-3.5 px-5 rounded-2xl transition no-underline"
            >
              <span>Start Riding</span>
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
          </div>

          <div class="bg-[#0A1128] text-white rounded-[32px] p-8 shadow-xl flex flex-col justify-between space-y-6">
            <div class="space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-[#D4F53C] text-[#0A1128] flex items-center justify-center">
                <ShoppingBag class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-black text-white">Partner Your Store</h3>
              <p class="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
                Whether you run a restaurant, gadget shop, apparel brand, appliance store, or beauty line—list your catalog and let Aika handle dispatch.
              </p>
            </div>
            <NuxtLink
              to="/merchant/register"
              class="inline-flex items-center justify-center gap-2 bg-[#D4F53C] hover:bg-[#c5e82a] text-[#0A1128] font-black text-xs uppercase tracking-wider py-3.5 px-5 rounded-2xl transition no-underline"
            >
              <span>Open Storefront</span>
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
          </div>

          <div class="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6">
            <div class="space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-lime-100 text-[#0A1128] flex items-center justify-center">
                <Package class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-black text-[#0A1128]">Join the Team</h3>
              <p class="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                Help build reliable local commerce, dispatch operations, and tools for everyday businesses.
              </p>
            </div>
            <NuxtLink
              to="/careers"
              class="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-[#0A1128] text-[#0A1128] hover:text-[#D4F53C] font-black text-xs uppercase tracking-wider py-3.5 px-5 rounded-2xl transition no-underline"
            >
              <span>See Open Roles</span>
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================================================================
         6. CLEAN LIGHT-MODE REVIEWS RAIL & SUBMISSION
         ========================================================================= -->
    <section class="bg-white py-16 md:py-24 border-b border-gray-100 overflow-hidden">
      <div class="max-w-6xl mx-auto px-6">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div class="space-y-2">
            <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-3.5 py-1 rounded-full inline-block">
              Community Love
            </span>
            <h2 class="text-3xl sm:text-4xl font-black tracking-tight text-[#0A1128]">
              Trusted Across Town
            </h2>
          </div>

          <button
            type="button"
            @click="openReviewModal"
            class="text-xs font-black uppercase tracking-wider text-[#D4F53C] bg-[#0A1128] hover:bg-[#16224a] px-5 py-3.5 rounded-2xl transition shadow-md cursor-pointer inline-flex items-center gap-2 border-0 self-start sm:self-auto"
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
            class="flex-shrink-0 w-full sm:w-[370px] bg-gray-50 border border-gray-100 rounded-[28px] p-7 snap-center flex flex-col justify-between hover:border-[#0A1128]/20 transition"
          >
            <div class="space-y-3">
              <div class="flex items-center space-x-1 text-amber-400">
                <Star v-for="i in 5" :key="i" class="w-4 h-4 fill-current" />
              </div>
              <p class="text-[#0A1128]/85 text-sm font-semibold leading-relaxed">“{{ rev.comment }}”</p>
            </div>
            <div class="pt-4 border-t border-gray-200/70 mt-5">
              <h4 class="text-sm font-black text-[#0A1128]">{{ rev.name }}</h4>
              <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{{ rev.role }}</p>
            </div>
          </div>
        </div>

        <div v-if="reviews.length > 1" class="flex justify-end items-center space-x-2.5 mt-4">
          <button
            type="button"
            @click="slideRail('left')"
            class="w-10 h-10 rounded-xl bg-gray-100 hover:bg-[#0A1128] text-[#0A1128] hover:text-[#D4F53C] flex items-center justify-center transition cursor-pointer border-0 font-bold"
          >
            ←
          </button>
          <button
            type="button"
            @click="slideRail('right')"
            class="w-10 h-10 rounded-xl bg-gray-100 hover:bg-[#0A1128] text-[#0A1128] hover:text-[#D4F53C] flex items-center justify-center transition cursor-pointer border-0 font-bold"
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
          <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-3.5 py-1 rounded-full inline-block">
            FAQ
          </span>
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
              <span class="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-black text-[#0A1128]">
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
            <span class="text-[10px] font-black tracking-widest bg-[#D4F53C]/50 px-3 py-1 rounded-full uppercase">Community</span>
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
              placeholder="e.g. Food Lover / Store Owner"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#0A1128]"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Your Review</label>
            <textarea
              v-model="reviewForm.comment"
              rows="3"
              required
              placeholder="Tell us about your order or bike delivery..."
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
        <div class="w-14 h-14 bg-[#D4F53C]/40 rounded-2xl flex items-center justify-center mx-auto">
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
        <div :class="feedbackModal.type === 'success' ? 'bg-[#D4F53C]/40 text-[#0A1128]' : 'bg-rose-100 text-rose-600'" class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto">
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

.hero-edge-fade {
  -webkit-mask-image: radial-gradient(ellipse 76% 76% at 50% 48%, #000 62%, transparent 100%);
  mask-image: radial-gradient(ellipse 76% 76% at 50% 48%, #000 62%, transparent 100%);
}

@keyframes heroFloat {
  0%, 100% {
    transform: scale(1.02) translateY(0px);
  }
  50% {
    transform: scale(1.06) translateY(-6px);
  }
}

.animate-hero-float {
  animation: heroFloat 4.5s ease-in-out infinite;
}
</style>