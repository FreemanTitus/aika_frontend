<!-- pages/index.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { MessageSquarePlus, CheckCircle2, AlertCircle, ShieldCheck, Zap, Bike, Store, TrendingUp, Clock, ArrowRight, Star, Sparkles } from '@lucide/vue'

// SEO HEAD META TAG COMPOSITION INTEGRATION
useHead({
  meta: [
    { 
      name: 'description', 
      content: 'Aika Limited is a multi-service digital platform providing efficient bike delivery, logistics, food delivery, shopping, and general errand services. We leverage technology to connect customers with fast, reliable local fulfillment and transportation solutions across Nigeria.' 
    }
  ]
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const reviews = ref<any[]>([])
const faqs = ref<any[]>([])

// Custom Feedback Modal State
const feedbackModal = ref({
  isOpen: false,
  title: '',
  message: '',
  type: 'success' as 'success' | 'error'
})

// 1. Hero Image Slider Background State & Timer
const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=75&w=1200&auto=format&fit=crop',
    tag: '⚡ Instant Bike Transit',
    title: 'Fast Cross-Town Rides'
  },
  {
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?q=75&w=1200&auto=format&fit=crop',
    tag: 'Secure Package Delivery',
    title: 'Real-Time Logistics Tracking'
  },
  {
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=75&w=1200&auto=format&fit=crop',
    tag: 'On-Demand Food',
    title: 'Hot Meals Delivered Fresh'
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

// 2. Horizontal Testimonial Rail Carousel Slider Drivers
const testimonialRail = ref<HTMLElement | null>(null)

const slideRail = (direction: 'left' | 'right'): void => {
  if (!testimonialRail.value) return
  const scrollAmount = 380
  if (direction === 'left') {
    testimonialRail.value.scrollLeft -= scrollAmount
  } else {
    testimonialRail.value.scrollLeft += scrollAmount
  }
}

// 3. Review Modal & Success Popup State Management
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
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: reviewForm.value
    })
    
    isReviewModalOpen.value = false
    reviewForm.value = { name: '', role: 'Customer / Vendor', comment: '' }
    isSuccessModalOpen.value = true
  } catch (err: any) {
    feedbackModal.value = { isOpen: true, title: "Submission Failed", message: err?.data?.detail || "Failed to submit review. Please try again.", type: 'error' }
  }
}

const fetchReviews = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/public/reviews`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    reviews.value = res?.reviews || []
  } catch (err) {
    console.error("Failed to fetch customer reviews", err)
  }
}

const fetchFaqs = async () => {
  try {
    const res: any = await $fetch(`${apiBase}/api/v1/public/faqs`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    faqs.value = res?.faqs || []
  } catch (err) {
    console.error("Failed to fetch FAQs", err)
  }
}

// 4. Reactive FAQ Accordion Visibility Toggles Matrix
const activeFaqIndex = ref<number | null>(null)

const toggleFaq = (index: number): void => {
  activeFaqIndex.value = activeFaqIndex.value === index ? null : index
}

// 5. NATIVE INTERSECTION OBSERVER PIPELINE FOR ON-SCROLL REVEALS & SLIDER AUTO-PLAY
let observer: IntersectionObserver | null = null

onMounted(() => {
  fetchReviews()
  fetchFaqs()
  slideInterval = setInterval(() => {
    nextSlide()
  }, 6000)

  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('scroll-animated')
        observer?.unobserve(entry.target)
      }
    })
  }, observerOptions)

  const animatableElements = document.querySelectorAll('.scroll-slide-up, .scroll-slide-left, .scroll-slide-right')
  animatableElements.forEach(el => observer?.observe(el))
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  if (slideInterval) clearInterval(slideInterval)
})
</script>

<template>
  <div class="selection:bg-[#D4F53C] selection:text-[#0A1128]">
    <!-- =========================================================================
         SECTION 1: HERO DISPLAY HEADER WITH DYNAMIC IMAGE SLIDER
         ========================================================================= -->
    <div class="relative w-full min-h-[92vh] flex items-center justify-center overflow-hidden bg-[#0A1128]">
            
            <div 
              v-for="(slide, idx) in heroSlides" 
              :key="idx"
              :class="[currentSlideIndex === idx ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 pointer-events-none z-0']"
              class="absolute inset-0 transition-all duration-1000 ease-in-out"
            >
                <img :src="slide.image" :alt="slide.title" class="absolute inset-0 w-full h-full object-cover brightness-[0.45] scale-105 transform transition-transform duration-10000" />
                <div class="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-[#0A1128]/60 to-[#0A1128]/30"></div>
            </div>

            <!-- Navigation Arrows -->
            <button type="button" @click="prevSlide" class="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-2xl bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] backdrop-blur-md flex items-center justify-center font-bold transition-all duration-300 cursor-pointer shadow-2xl border border-white/10 outline-none">❮</button>
            <button type="button" @click="nextSlide" class="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-2xl bg-white/10 hover:bg-[#D4F53C] text-white hover:text-[#0A1128] backdrop-blur-md flex items-center justify-center font-bold transition-all duration-300 cursor-pointer shadow-2xl border border-white/10 outline-none">❯</button>

            <!-- Dots Indicator -->
            <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2.5 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <button 
                  type="button"
                  v-for="(_, dotIdx) in heroSlides" 
                  :key="dotIdx"
                  @click="currentSlideIndex = dotIdx"
                  :class="[currentSlideIndex === dotIdx ? 'w-8 bg-[#D4F53C]' : 'w-2 bg-white/40 hover:bg-white/70']"
                  class="h-2 rounded-full transition-all duration-300 cursor-pointer border-0 outline-none"
                ></button>
            </div>

            <div class="relative z-20 max-w-5xl mx-auto px-6 py-24 text-center space-y-8">
                <div class="scroll-slide-up space-y-6">
                    <div class="inline-flex items-center space-x-2 bg-[#D4F53C] text-[#0A1128] font-black px-4 py-2 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl border border-white/20">
                        <Sparkles class="w-3.5 h-3.5 animate-spin" />
                        <span>{{ heroSlides[currentSlideIndex]?.tag || '⚡ Instant Bike Transit' }}</span>
                    </div>
                    
                    <h1 class="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.1] tracking-tight max-w-4xl mx-auto drop-shadow-md">
                        Need a Ride or Delivery? <br><span class="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#D4F53C] to-white">We've Got You Covered.</span>
                    </h1>
                    
                    <p class="text-base sm:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto font-medium drop-shadow-sm">
                        Whether you need a swift cross-town passenger ride or an automated merchant fleet dispatching food and retail packages directly to buyers, Aika secures vetted transit loops instantly.
                    </p>

                    <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <NuxtLink 
                            to="/marketplace" 
                            class="w-full sm:w-auto bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:scale-95 inline-flex items-center justify-center space-x-3 text-xs uppercase tracking-wider cursor-pointer border-0 outline-none no-underline"
                        >
                            <span>Explore Marketplace</span>
                            <ArrowRight class="w-4 h-4" />
                        </NuxtLink>
                    </div>
                </div>

                <div class="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto text-center scroll-slide-up">
                    <div class="flex flex-col items-center p-4 bg-white/[0.06] backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg text-white transition hover:border-[#D4F53C]/50 hover:bg-white/[0.1]">
                        <span class="text-xs font-black tracking-wide uppercase">⚡ Instant Hailing</span>
                    </div>
                    <div class="flex flex-col items-center p-4 bg-white/[0.06] backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg text-white transition hover:border-[#D4F53C]/50 hover:bg-white/[0.1]">
                        <span class="text-xs font-black tracking-wide uppercase">🛡️ Vetted Fleets</span>
                    </div>
                    <div class="flex flex-col items-center p-4 bg-white/[0.06] backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg text-white transition hover:border-[#D4F53C]/50 hover:bg-white/[0.1]">
                        <span class="text-xs font-black tracking-wide uppercase">📍 Live Radar</span>
                    </div>
                </div>
            </div>
    </div>

    <!-- =========================================================================
         SECTION 2: CORE SERVICES & FEATURES GRID BLOCK
         ========================================================================= -->
    <section id="features" class="bg-gray-50/50 py-20 md:py-32 border-b border-gray-100 overflow-hidden">
        <div class="max-w-6xl mx-auto px-6">
            <div class="text-center max-w-2xl mx-auto mb-16 scroll-slide-up space-y-3">
                <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-4 py-1.5 rounded-full shadow-xs inline-block">Our Provisions</span>
                <h2 class="text-3xl sm:text-4xl font-black text-[#0A1128] tracking-tight">What We Provide</h2>
                <p class="text-gray-500 font-medium text-sm sm:text-base leading-relaxed">A complete logistics suite engineered for rapid fulfillment, absolute safety, and everyday transit comfort.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
                <div class="bg-gradient-to-br from-[#D4F53C] to-[#bce02b] rounded-[36px] p-8 md:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden group min-h-[440px] scroll-slide-right border border-lime-300">
                    <div class="space-y-4 max-w-sm z-10 text-left">
                        <span class="text-[#0A1128] text-[10px] font-black uppercase tracking-widest bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full inline-block shadow-xs">On-Demand Catering</span>
                        <h3 class="text-2xl md:text-4xl font-black text-[#0A1128] leading-[1.15] tracking-tight">Order from restaurant of your choice</h3>
                        <p class="text-[#0A1128]/85 text-xs sm:text-sm font-semibold leading-relaxed">
                            Explore a wide variety of local eateries and discover an amazing selection of meals delivered straight to your location while still piping hot.
                        </p>
                    </div>
                    
                    <div class="mt-8 bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-lg transform transition-transform duration-500 group-hover:scale-[1.02] text-left">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-[#0A1128] text-[#D4F53C] rounded-xl flex items-center justify-center font-bold text-lg shadow-md">🍽️</div>
                            <div>
                                <h4 class="text-xs font-black text-[#0A1128] uppercase tracking-wider">Fast Food Routing</h4>
                                <p class="text-[11px] text-gray-500 font-bold mt-0.5">Automated cooking-to-dispatch handshakes.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-[#0A1128] text-white rounded-[36px] p-8 md:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden group min-h-[440px] scroll-slide-left border border-white/10">
                    <div class="space-y-4 max-w-sm z-10 text-left">
                        <span class="text-[#0A1128] bg-[#D4F53C] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full inline-block shadow-sm">City Transit</span>
                        <h3 class="text-2xl md:text-4xl font-black text-white leading-[1.15] tracking-tight">Plethora of errands &amp; bike runs</h3>
                        <p class="text-gray-400 text-xs sm:text-sm font-medium leading-relaxed">
                            From secure cross-town motorcycle passenger bookings to custom item purchase errands, get connected with reliable runners instantly.
                        </p>
                    </div>

                    <div class="mt-8 grid grid-cols-2 gap-4">
                        <div class="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-3 group-hover:border-[#D4F53C]/50 transition bg-white/[0.03]">
                            <div class="text-xs font-black text-[#D4F53C] tracking-wide">⚡ Instant Bike</div>
                        </div>
                        <div class="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-3 group-hover:border-[#D4F53C]/50 transition bg-white/[0.03]">
                            <div class="text-xs font-black text-[#D4F53C] tracking-wide">📦 Errand Loops</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- =========================================================================
         SECTION 3: DETAILED FOOD & RETAIL EXPERIENCE ACCENT
         ========================================================================= -->
    <section class="bg-[#0A1128] text-white py-20 md:py-32 border-t border-b border-white/5 overflow-hidden relative">
        <div class="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div class="lg:col-span-7 space-y-6 text-center lg:text-left scroll-slide-right">
                <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-4 py-1.5 rounded-full inline-block shadow-sm">Vendor Ecosystem</span>
                <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
                    Everything You Need for a <br/><span class="text-[#D4F53C]">Better Food &amp; Retail Experience</span>
                </h2>
                <p class="text-gray-300 text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Enjoy a seamless way to discover, order, and receive your favorite meals and retail items with speed, convenience, and variety—all in one integrated platform.
                </p>
                
                <div class="space-y-4 max-w-lg mx-auto lg:mx-0 text-left pt-2">
                    <div class="flex items-start space-x-3.5 bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <div class="flex-shrink-0 w-6 h-6 rounded-xl bg-[#D4F53C] flex items-center justify-center text-[#0A1128] text-xs font-black shadow-sm">✓</div>
                        <p class="text-xs sm:text-sm font-bold text-gray-200 leading-snug">
                            Access meals and products from multiple restaurants and local vendors all in one platform.
                        </p>
                    </div>
                    <div class="flex items-start space-x-3.5 bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <div class="flex-shrink-0 w-6 h-6 rounded-xl bg-[#D4F53C] flex items-center justify-center text-[#0A1128] text-xs font-black shadow-sm">✓</div>
                        <p class="text-xs sm:text-sm font-bold text-gray-200 leading-snug">
                            Get your items delivered quickly and fresh, straight to your exact doorstep coordinates.
                        </p>
                    </div>
                </div>
            </div>

            <div class="lg:col-span-5 flex justify-center scroll-slide-left">
                <div class="bg-white/[0.06] backdrop-blur-2xl border border-white/10 p-8 rounded-[36px] w-full max-w-md shadow-2xl relative flex flex-col justify-center min-h-[360px]">
                    <div class="w-full bg-white text-[#0A1128] p-6 rounded-3xl shadow-xl relative border border-gray-100">
                        <div class="flex items-center justify-between mb-6">
                            <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-3.5 py-1.5 rounded-full flex items-center space-x-1.5 shadow-xs">
                                <span class="w-2 h-2 rounded-full bg-[#0A1128] animate-pulse"></span>
                                <span>Featured Items</span>
                            </span>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-gray-50 border border-gray-200/60 rounded-2xl p-2.5 flex flex-col justify-between min-h-[140px] shadow-2xs">
                                <div class="relative rounded-xl overflow-hidden h-24 bg-white border border-gray-100 p-2.5 flex flex-col justify-between shadow-2xs">
                                    <div class="bg-[#0A1128] text-[#D4F53C] text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs self-start font-mono">₦1,500</div>
                                    <div class="text-center font-black text-xs text-[#0A1128]">Jollof Rice</div>
                                </div>
                            </div>
                            <div class="bg-gray-50 border border-gray-200/60 rounded-2xl p-2.5 flex flex-col justify-between min-h-[140px] shadow-2xs">
                                <div class="relative rounded-xl overflow-hidden h-24 bg-white border border-gray-100 p-2.5 flex flex-col justify-between shadow-2xs">
                                    <div class="bg-[#0A1128] text-[#D4F53C] text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs self-start font-mono">₦1,500</div>
                                    <div class="text-center font-black text-xs text-[#0A1128]">Pounded Yam</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- =========================================================================
         SECTION 4: HOW IT WORKS SECTION
         ========================================================================= -->
    <section id="how-it-works" class="bg-white py-20 md:py-32 border-b border-gray-100">
        <div class="max-w-6xl mx-auto px-6">
            <div class="text-center max-w-2xl mx-auto mb-16 scroll-slide-up space-y-3">
                <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-4 py-1.5 rounded-full inline-block">Workflow</span>
                <h2 class="text-3xl sm:text-4xl font-black text-[#0A1128] tracking-tight">How Aika Works</h2>
                <p class="text-gray-500 font-medium text-sm sm:text-base leading-relaxed">Get matched with a secure proximity vehicle inside our synchronized maps router within minutes.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-lg mx-auto md:max-w-none">
                <div class="p-8 bg-gray-50/80 rounded-[32px] border border-gray-100 shadow-sm scroll-slide-up text-left space-y-4 hover:border-[#D4F53C] transition">
                    <div class="w-14 h-14 bg-[#D4F53C] text-[#0A1128] rounded-2xl flex items-center justify-center text-xl font-black shadow-md">1</div>
                    <h3 class="text-lg font-black text-[#0A1128]">Set Coordinates</h3>
                    <p class="text-gray-500 text-xs sm:text-sm leading-relaxed font-medium">Select your booking intent. Key in pickup points and coordinate landmarks safely.</p>
                </div>
                <div class="p-8 bg-gray-50/80 rounded-[32px] border border-gray-100 shadow-sm scroll-slide-up text-left space-y-4 hover:border-[#D4F53C] transition">
                    <div class="w-14 h-14 bg-[#D4F53C] text-[#0A1128] rounded-2xl flex items-center justify-center text-xl font-black shadow-md">2</div>
                    <h3 class="text-lg font-black text-[#0A1128]">Fleet Processing</h3>
                    <p class="text-gray-500 text-xs sm:text-sm leading-relaxed font-medium">Our central API allocation matrix cross-checks active tokens and pins down the nearest available runner.</p>
                </div>
                <div class="p-8 bg-gray-50/80 rounded-[32px] border border-gray-100 shadow-sm scroll-slide-up text-left space-y-4 hover:border-[#D4F53C] transition">
                    <div class="w-14 h-14 bg-[#D4F53C] text-[#0A1128] rounded-2xl flex items-center justify-center text-xl font-black shadow-md">3</div>
                    <h3 class="text-lg font-black text-[#0A1128]">Transit Realized</h3>
                    <p class="text-gray-500 text-xs sm:text-sm leading-relaxed font-medium">Your rider arrives instantly for secure transit or package clearance, logging digital keys upon completion.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- =========================================================================
         SECTION 5: PLATFORM HIGHLIGHTS & LIVE METRICS MATRIX
         ========================================================================= -->
    <section id="platform-highlights" class="py-20 md:py-32 bg-gray-50/50 border-b border-gray-100 overflow-hidden">
        <div class="max-w-6xl mx-auto px-6 space-y-16">
            <div class="text-center max-w-2xl mx-auto scroll-slide-up space-y-3">
                <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-4 py-1.5 rounded-full inline-block">
                    Platform Performance
                </span>
                <h2 class="text-3xl sm:text-4xl font-black text-[#0A1128] tracking-tight">
                    Engineered for Speed &amp; Reliability
                </h2>
                <p class="text-gray-500 text-sm sm:text-base font-medium leading-relaxed">
                    Our synchronized multi-tenant backend infrastructure coordinates riders, merchants, and customers in real-time.
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div class="bg-white border border-gray-100 p-8 rounded-[32px] text-left space-y-4 hover:border-[#D4F53C] transition shadow-sm scroll-slide-up group">
                    <div class="w-14 h-14 rounded-2xl bg-[#0A1128] text-[#D4F53C] flex items-center justify-center font-black shadow-lg group-hover:scale-105 transition-transform">
                        <Zap class="w-6 h-6" />
                    </div>
                    <div class="space-y-1.5">
                        <h3 class="text-base font-black text-[#0A1128]">Instant Dispatch</h3>
                        <p class="text-xs text-gray-500 font-medium leading-relaxed">Automated matching pairs orders with the closest available rider within seconds.</p>
                    </div>
                </div>

                <div class="bg-white border border-gray-100 p-8 rounded-[32px] text-left space-y-4 hover:border-[#D4F53C] transition shadow-sm scroll-slide-up group">
                    <div class="w-14 h-14 rounded-2xl bg-[#0A1128] text-[#D4F53C] flex items-center justify-center font-black shadow-lg group-hover:scale-105 transition-transform">
                        <Store class="w-6 h-6" />
                    </div>
                    <div class="space-y-1.5">
                        <h3 class="text-base font-black text-[#0A1128]">Multi-Storefront</h3>
                        <p class="text-xs text-gray-500 font-medium leading-relaxed">Diverse merchant catalogs ranging from local eateries to boutique retail stores.</p>
                    </div>
                </div>

                <div class="bg-white border border-gray-100 p-8 rounded-[32px] text-left space-y-4 hover:border-[#D4F53C] transition shadow-sm scroll-slide-up group">
                    <div class="w-14 h-14 rounded-2xl bg-[#0A1128] text-[#D4F53C] flex items-center justify-center font-black shadow-lg group-hover:scale-105 transition-transform">
                        <ShieldCheck class="w-6 h-6" />
                    </div>
                    <div class="space-y-1.5">
                        <h3 class="text-base font-black text-[#0A1128]">Secure Escrow</h3>
                        <p class="text-xs text-gray-500 font-medium leading-relaxed">Split payments and secure checkout flows protected by industry-grade encryption.</p>
                    </div>
                </div>

                <div class="bg-white border border-gray-100 p-8 rounded-[32px] text-left space-y-4 hover:border-[#D4F53C] transition shadow-sm scroll-slide-up group">
                    <div class="w-14 h-14 rounded-2xl bg-[#0A1128] text-[#D4F53C] flex items-center justify-center font-black shadow-lg group-hover:scale-105 transition-transform">
                        <Clock class="w-6 h-6" />
                    </div>
                    <div class="space-y-1.5">
                        <h3 class="text-base font-black text-[#0A1128]">24/7 Operations</h3>
                        <p class="text-xs text-gray-500 font-medium leading-relaxed">Round-the-clock logistics support and live web-push notification alerts.</p>
                    </div>
                </div>

            </div>
        </div>
    </section>

    <!-- =========================================================================
         SECTION 6: PARTNERSHIP & CAREERS SECTION
         ========================================================================= -->
    <section class="py-24 md:py-36 bg-[#080E21] border-b border-white/5 relative overflow-hidden">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4F53C]/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div class="max-w-6xl mx-auto px-6 text-center space-y-16 relative z-10">
            
            <div class="space-y-4 scroll-slide-up max-w-xl mx-auto">
                <span class="bg-[#D4F53C]/15 text-[#D4F53C] font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest inline-flex items-center space-x-2 border border-[#D4F53C]/30 shadow-sm">
                    <span>Ecosystem Opportunities</span>
                </span>
                <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
                    Let's Build &amp; Grow <span class="text-[#D4F53C]">Together</span>
                </h2>
                <p class="text-gray-400 text-sm sm:text-base font-medium leading-relaxed">
                    Whether you want to ride, expand your merchant storefront, or join our core engineering crew, we have a place for you.
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
                
                <div class="bg-white/[0.04] backdrop-blur-2xl p-8 md:p-10 rounded-[36px] shadow-2xl border border-white/10 flex flex-col justify-between text-center space-y-8 scroll-slide-up group hover:border-[#D4F53C]/50 hover:bg-white/[0.07] transition-all duration-300">
                    <div class="space-y-4">
                        <span class="text-[10px] font-black uppercase tracking-widest text-[#D4F53C] bg-[#D4F53C]/15 px-3.5 py-1.5 rounded-full inline-block">Fleet Partner</span>
                        <h3 class="text-2xl font-black text-white tracking-tight">Become a Rider</h3>
                        <p class="text-xs text-gray-300 font-medium leading-relaxed">
                            Enjoy total flexibility, freedom, and competitive weekly earnings by delivering through Aika's active transit network.
                        </p>
                    </div>
                    <NuxtLink to="/rider/register" class="bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black px-6 py-4 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg w-full block no-underline transform active:scale-95">
                        Register as Rider
                    </NuxtLink>
                </div>

                <div class="bg-white/[0.04] backdrop-blur-2xl p-8 md:p-10 rounded-[36px] shadow-2xl border border-white/10 flex flex-col justify-between text-center space-y-8 scroll-slide-up group hover:border-[#D4F53C]/50 hover:bg-white/[0.07] transition-all duration-300">
                    <div class="space-y-4">
                        <span class="text-[10px] font-black uppercase tracking-widest text-[#D4F53C] bg-[#D4F53C]/15 px-3.5 py-1.5 rounded-full inline-block">Merchant Hub</span>
                        <h3 class="text-2xl font-black text-white tracking-tight">Register Storefront</h3>
                        <p class="text-xs text-gray-300 font-medium leading-relaxed">
                            Grow with Aika! Our cutting-edge technology and engaged customer base help you boost sales and unlock new fulfillment channels.
                        </p>
                    </div>
                    <NuxtLink to="/merchant/register" class="bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black px-6 py-4 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg w-full block no-underline transform active:scale-95">
                        Register Storefront
                    </NuxtLink>
                </div>

                <div class="bg-white/[0.04] backdrop-blur-2xl p-8 md:p-10 rounded-[36px] shadow-2xl border border-white/10 flex flex-col justify-between text-center space-y-8 scroll-slide-up group hover:border-[#D4F53C]/50 hover:bg-white/[0.07] transition-all duration-300">
                    <div class="space-y-4">
                        <span class="text-[10px] font-black uppercase tracking-widest text-[#D4F53C] bg-[#D4F53C]/15 px-3.5 py-1.5 rounded-full inline-block">Open Roles</span>
                        <h3 class="text-2xl font-black text-white tracking-tight">Join Our Team</h3>
                        <p class="text-xs text-gray-300 font-medium leading-relaxed">
                            Ready for an exciting challenge? If you're ambitious, humble, and love engineering impactful systems, we want to hear from you!
                        </p>
                    </div>
                    <NuxtLink to="/careers" class="bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black px-6 py-4 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg w-full block no-underline transform active:scale-95">
                        Explore Careers
                    </NuxtLink>
                </div>

            </div>
        </div>
    </section>

    <!-- =========================================================================
     SECTION 7: TESTIMONIAL SUITE CAROUSEL SLIDER & REVIEW TRIGGER
     ========================================================================= -->
    <section class="bg-[#0A1128] text-white py-20 md:py-32 border-t border-b border-white/5 relative overflow-hidden">
        <div class="max-w-6xl mx-auto px-6">
            <div class="text-center max-w-2xl mx-auto mb-16 scroll-slide-up space-y-3">
                <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-4 py-1.5 rounded-full inline-block">User Proof</span>
                <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Trusted Across Town</h2>
                <p class="text-gray-400 font-medium text-sm sm:text-base leading-relaxed">See how individuals and marketplace business vendors leverage our lightning-fast transit channels daily.</p>
            </div>

            <div class="relative w-full overflow-visible px-2 scroll-slide-up">
                <div ref="testimonialRail" class="flex space-x-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-8 pr-12 scrollbar-none" style="-ms-overflow-style: none; scrollbar-width: none;">
                    
                    <!-- Dynamic Backend Reviews Loop -->
                    <div 
                        v-for="rev in reviews" 
                        :key="rev.id" 
                        class="flex-shrink-0 w-full sm:w-[420px] bg-white/[0.04] border border-white/10 rounded-[32px] p-8 shadow-2xl snap-center flex flex-col justify-between transition-all duration-300 hover:border-[#D4F53C]/50 text-left"
                    >
                        <div class="space-y-4">
                            <div class="flex items-center space-x-1 text-[#D4F53C]">
                                <Star v-for="i in 5" :key="i" class="w-4 h-4 fill-current" />
                            </div>
                            <p class="text-gray-300 text-sm sm:text-base font-medium leading-relaxed">
                                “{{ rev.comment }}”
                            </p>
                        </div>
                        <div class="pt-6 border-t border-white/10 mt-6">
                            <h4 class="text-base font-black text-[#D4F53C]">{{ rev.name }}</h4>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{{ rev.role }}</p>
                        </div>
                    </div>

                </div>

                <!-- Controls & Review Trigger Block -->
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 w-full">
                    <div class="hidden sm:block w-32"></div>

                    <div class="flex justify-center items-center space-x-3">
                        <button type="button" @click="slideRail('left')" class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:text-[#0A1128] hover:bg-[#D4F53C] transition cursor-pointer outline-none shadow-md">←</button>
                        <button type="button" @click="slideRail('right')" class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:text-[#0A1128] hover:bg-[#D4F53C] transition cursor-pointer outline-none shadow-md">→</button>
                    </div>

                    <div class="w-full sm:w-auto flex justify-center sm:justify-end">
                        <button 
                            type="button" 
                            @click="openReviewModal" 
                            class="text-xs font-black uppercase tracking-wider text-[#0A1128] bg-[#D4F53C] hover:bg-[#c3e334] px-6 py-3.5 rounded-2xl transition shadow-lg cursor-pointer outline-none inline-flex items-center gap-2 border-0 transform active:scale-95"
                        >
                            <MessageSquarePlus class="w-4 h-4" />
                            <span>Share Experience</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- =========================================================================
         SECTION 8: DYNAMIC FAQ ACCORDIONS MATRIX
         ========================================================================= -->
    <section id="faq" class="bg-white py-20 md:py-32 border-b border-gray-100 overflow-hidden">
        <div class="max-w-4xl mx-auto px-6">
            <div class="text-center max-w-2xl mx-auto mb-16 scroll-slide-up space-y-3">
                <span class="text-[10px] font-black tracking-widest uppercase text-[#0A1128] bg-[#D4F53C] px-4 py-1.5 rounded-full inline-block">FAQ</span>
                <h2 class="text-3xl sm:text-4xl font-black text-[#0A1128] tracking-tight">Got Questions? We Have Answers</h2>
            </div>

            <div class="space-y-4 max-w-3xl mx-auto text-left">
                <div 
                  v-for="(faq, index) in faqs" 
                  :key="faq.id" 
                  class="border border-gray-200/80 rounded-2xl bg-gray-50/60 transition-all duration-300 scroll-slide-up overflow-hidden shadow-2xs"
                >
                    <button type="button" @click="toggleFaq(index)" class="w-full flex items-center justify-between px-6 py-5 text-left font-extrabold text-sm sm:text-base text-[#0A1128] focus:outline-none cursor-pointer group border-0 bg-transparent">
                        <span>{{ faq.question }}</span>
                        <span class="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-black text-emerald-700 shadow-2xs transition-transform group-hover:scale-105">{{ activeFaqIndex === index ? '−' : '＋' }}</span>
                    </button>
                    <div :class="[activeFaqIndex === index ? 'max-h-60 pb-5 px-6' : 'max-h-0']" class="overflow-hidden transition-all duration-300 ease-in-out">
                        <p class="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed pt-2 border-t border-gray-200/60">
                            {{ faq.answer }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- =========================================================================
         CUSTOMER REVIEW SUBMISSION MODAL
         ========================================================================= -->
    <div v-if="isReviewModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/75 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg bg-white border border-gray-100 rounded-[36px] p-8 shadow-2xl relative space-y-6 text-[#0A1128] text-left animate-in fade-in zoom-in duration-200">
        
        <div class="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span class="text-[10px] font-black tracking-widest bg-[#D4F53C]/40 text-[#0A1128] px-3.5 py-1.5 rounded-full uppercase">Community</span>
            <h3 class="text-xl font-black tracking-tight text-[#0A1128] mt-1.5">Share Your Experience</h3>
          </div>
          <button type="button" @click="isReviewModalOpen = false" class="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#0A1128] bg-gray-100 rounded-2xl border-0 cursor-pointer outline-none transition">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleReviewSubmit" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Your Name</label>
            <input 
              v-model="reviewForm.name" 
              type="text" 
              required 
              placeholder="e.g. Sarah Jenkins" 
              class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl px-4 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Your Role / Affiliation</label>
            <input 
              v-model="reviewForm.role" 
              type="text" 
              required 
              placeholder="e.g. Restaurant Vendor / Daily Commuter" 
              class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl px-4 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Your Review / Testimonial</label>
            <textarea 
              v-model="reviewForm.comment" 
              rows="4" 
              required 
              placeholder="Tell us about your delivery or ride experience..." 
              class="w-full bg-gray-50 border border-gray-200 text-[#0A1128] rounded-2xl px-4 py-3.5 text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-[#0A1128] focus:bg-white transition shadow-2xs resize-none"
            ></textarea>
          </div>

          <div class="pt-2 flex items-center gap-3">
            <button 
              type="button" 
              @click="isReviewModalOpen = false" 
              class="w-1/3 py-4 bg-gray-100 hover:bg-gray-200 text-[#0A1128] font-black text-xs uppercase tracking-wider rounded-2xl transition border-0 cursor-pointer outline-none"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="w-2/3 py-4 bg-[#D4F53C] hover:bg-[#c3e334] text-[#0A1128] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg cursor-pointer border-0 flex items-center justify-center space-x-2 outline-none active:scale-95"
            >
              Submit Review
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- =========================================================================
         SUCCESS MODAL POPUP OVERLAY
         ========================================================================= -->
    <div v-if="isSuccessModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/75 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm bg-white border border-gray-100 rounded-[36px] p-8 shadow-2xl relative space-y-6 text-[#0A1128] text-center animate-in fade-in zoom-in duration-200">
        
        <div class="w-16 h-16 bg-[#D4F53C]/25 rounded-2xl flex items-center justify-center mx-auto text-[#0A1128]">
          <CheckCircle2 class="w-8 h-8 text-[#0A1128]" />
        </div>

        <div class="space-y-2">
          <h3 class="text-xl font-black tracking-tight text-[#0A1128]">Review Received!</h3>
          <p class="text-xs text-gray-500 font-medium leading-relaxed">
            Thank you for sharing your experience! Your review has been submitted successfully and will appear on the platform once approved.
          </p>
        </div>

        <button 
          type="button" 
          @click="isSuccessModalOpen = false" 
          class="w-full py-4 bg-[#0A1128] hover:bg-[#151f42] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg cursor-pointer border-0 outline-none active:scale-95"
        >
          Awesome, Thanks
        </button>

      </div>
    </div>

    <!-- =========================================================================
         CUSTOM FEEDBACK MODAL (REPLACING ALERTS)
         ========================================================================= -->
    <div v-if="feedbackModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1128]/75 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm bg-white border border-gray-100 rounded-[36px] p-8 shadow-2xl relative space-y-6 text-[#0A1128] text-center animate-in fade-in zoom-in duration-200">
        
        <div :class="feedbackModal.type === 'success' ? 'bg-[#D4F53C]/25 text-[#0A1128]' : 'bg-rose-100 text-rose-600'" class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 v-if="feedbackModal.type === 'success'" class="w-8 h-8" />
          <AlertCircle v-else class="w-8 h-8" />
        </div>

        <div class="space-y-2">
          <h3 class="text-xl font-black tracking-tight text-[#0A1128]">{{ feedbackModal.title }}</h3>
          <p class="text-xs text-gray-500 font-medium leading-relaxed">
            {{ feedbackModal.message }}
          </p>
        </div>

        <button 
          type="button" 
          @click="feedbackModal.isOpen = false" 
          class="w-full py-4 bg-[#0A1128] hover:bg-[#151f42] text-[#D4F53C] font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg cursor-pointer border-0 outline-none active:scale-95"
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
.scroll-slide-up, .scroll-slide-left, .scroll-slide-right {
    opacity: 1;
    transform: translateY(0);
}
.scroll-animated {
    opacity: 1 !important;
    transform: translate(0) !important;
}
</style>