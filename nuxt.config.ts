// https://nuxt.com/docs/api/configuration/nuxt-config
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://www.useaika.com.ng'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],

  // Global CSS registration files
  css: [
    'tailwindcss/tailwind.css'
  ],

  // Ported Header Configuration Matrix
  app: {
    head: {
      title: 'Aika | Shop, Send, Ride & Earn — All in One App',
      htmlAttrs: {
        lang: 'en-NG'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0' },
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
        
        // Standard Search Engine SEO Meta Tags
        { 
          name: 'description', 
          content: 'Aika is an all-in-one multi-vendor marketplace, logistics, errand, and cross-town ride booking platform in Nigeria. Shop local vendors, send parcels and food with real-time tracking, book safe rides across town, or earn as a vendor or rider.' 
        },
        { 
          name: 'keywords', 
          content: 'Aika, useaika, useaika.ng, useaika.com.ng, multi-vendor marketplace Nigeria, bike delivery, parcel delivery, food delivery, grocery delivery, errand services, book ride across town, ride hailing Nigeria, logistics app, earn as a rider, TechForge Global' 
        },
        { name: 'robots', content: 'index, follow' },
        { name: 'author', content: 'TechForge Global Ltd.' },
        
        // Open Graph (OG) Meta Data Link Previews
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Aika' },
        { property: 'og:url', content: siteUrl },
        { property: 'og:title', content: 'Aika | Shop, Send, Ride & Earn — All in One App' },
        { 
          property: 'og:description', 
          content: 'Marketplace. Logistics. Connected. Shop from local vendors, send parcels & food, run errands, or book a safe ride across town in Nigeria.' 
        },
        { property: 'og:image', content: `${siteUrl}/images/og-share-preview.png` },
        { property: 'og:image:alt', content: 'Aika — Marketplace, Logistics, Errands & Ride Booking App' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'en_NG' },

        // Twitter Cards Matrix
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@AikaApp' },
        { name: 'twitter:creator', content: '@Aika' },
        { name: 'twitter:title', content: 'Aika | Shop, Send, Ride & Earn — All in One App' },
        { 
          name: 'twitter:description', 
          content: 'Marketplace. Logistics. Connected. Shop local vendors, send parcels & food, run errands, or book a safe ride across town.' 
        },
        { name: 'twitter:image', content: `${siteUrl}/images/og-share-preview.png` },
        { name: 'twitter:image:alt', content: 'Aika — Marketplace, Logistics, Errands & Ride Booking App' },

        // Mobile Status Bar Overrides (Aligned with Brand Teal #005F69)
        { name: 'theme-color', content: '#005F69', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#0f172a', media: '(prefers-color-scheme: dark)' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Aika' }
      ],
      link: [
        // Canonical & Dual-Domain References
        { rel: 'canonical', href: 'https://www.useaika.com.ng' },
        { rel: 'alternate', hreflang: 'en-NG', href: 'https://www.useaika.com.ng' },
        { rel: 'alternate', hreflang: 'x-default', href: 'https://www.useaika.ng' },

        // Favicons Asset Matrix
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon/favicon-96x96.png' },
        { rel: 'icon', href: '/favicon/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
        { rel: 'icon', href: '/favicon/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/favicon/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' }, 
      
        { 
          rel: 'stylesheet', 
          href: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css' 
        }
      ],
      script: [
        { 
          src: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
          defer: true
        }
      ]
    }
  },

  runtimeConfig: {
    // Keys inside public are also accessible on the client-side
    public: {
      siteUrl,
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000',
    },
  }, 

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@lucide/vue',
        'leaflet',
      ]
    },
    server: {
      hmr: {
        protocol: 'wss',
        host: 'localhost',
        clientPort: 443,
      },
      allowedHosts: true,
    },
  },
})