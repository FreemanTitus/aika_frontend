// composables/useCart.ts
import { ref, computed } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'

export interface CartItem {
  id: number | string
  productId?: string
  variantId?: string
  storeId: string
  name: string
  price: number
  image: string
  quantity: number
  vendorName?: string
}

const cartState = ref<CartItem[]>([])
const isInitialized = ref(false)

export const useCart = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const mediaBase = (config.public.apiClientBase as string) || apiBase
  const authToken = useCookie('auth_token')

  const resolveImageUrl = (raw?: string | null): string => {
    if (!raw) return ''
    const trimmed = String(raw).trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed
    }
    const cleanBase = String(mediaBase || '').replace(/\/+$/, '')
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return cleanBase ? `${cleanBase}${cleanPath}` : cleanPath
  }

  const extractProductImage = (item: any): string => {
    const raw =
      item?.image ||
      item?.image_url ||
      item?.food_image ||
      item?.product_image ||
      item?.thumbnail ||
      ''
    return resolveImageUrl(raw)
  }

  // Fetch cart directly from backend server
  const fetchServerCart = async () => {
    if (!authToken.value || !import.meta.client) return
    try {
      const res: any = await $fetch(`${apiBase}/api/v1/customer/cart`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${authToken.value}`
        }
      })
      const remoteItems = res?.data || res || []
      if (Array.isArray(remoteItems)) {
        cartState.value = remoteItems.map((item: any) => ({
          id: item.product_id || item.id,
          storeId: String(item.store_id || item.storeId || ''),
          name: item.name,
          price: Number(item.price || 0),
          image: extractProductImage(item),
          quantity: Number(item.quantity || 1),
          vendorName: item.vendor_name || item.vendorName
        }))
      }
    } catch (e) {
      console.error('Failed to fetch server-side cart', e)
    }
  }

  // Initialize cart from Server API on client-side
  if (!isInitialized.value && import.meta.client) {
    if (authToken.value) {
      fetchServerCart()
    }
    isInitialized.value = true
  }

  const addToCart = async (
    product: any,
    storeId: string,
    storeName: string,
    quantityToAdd = 1,
    replaceQuantity = false
  ) => {
    const rawPrice = product.bonanza_mode
      ? (product.current_price ?? product.price ?? product.base_price)
      : (product.price ?? product.current_price ?? product.base_price)
    const activePrice = Number(rawPrice) || 0

    const productId = String(product.id)
    const resolvedImage = extractProductImage(product)
    const qty = Math.max(1, Number(quantityToAdd) || 1)
    
    // Optimistic local UI update
    const existingItem = cartState.value.find(item => String(item.id) === productId)
    if (existingItem) {
      existingItem.quantity = replaceQuantity ? qty : existingItem.quantity + qty
      existingItem.price = activePrice || existingItem.price
      if (resolvedImage) existingItem.image = resolvedImage
      if (storeName) existingItem.vendorName = storeName
    } else {
      cartState.value.push({
        id: product.id,
        productId: product.productId ? String(product.productId) : productId,
        variantId: product.variantId ? String(product.variantId) : undefined,
        storeId: String(storeId),
        name: product.name,
        price: activePrice,
        image: resolvedImage,
        quantity: qty,
        vendorName: storeName
      })
    }

    // Sync with backend API
    if (authToken.value && import.meta.client) {
      try {
        const targetItem = cartState.value.find(item => String(item.id) === productId)
        await $fetch(`${apiBase}/api/v1/cart/add`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken.value}`,
            'Content-Type': 'application/json'
          },
          body: {
            product_id: productId,
            quantity: targetItem ? targetItem.quantity : qty,
            store_id: String(storeId),
            name: product.name,
            price: activePrice,
            image: resolvedImage,
            vendor_name: storeName
          }
        })
      } catch (e) {
        console.error('Failed to sync added item to server', e)
        fetchServerCart() // Revert on failure
      }
    }
  }

  const removeFromCart = async (productId: number | string) => {
    const pId = String(productId)
    cartState.value = cartState.value.filter(item => String(item.id) !== pId)

    if (authToken.value && import.meta.client) {
      try {
        await $fetch(`${apiBase}/api/v1/cart/remove/${pId}`, {
          method: 'DELETE',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken.value}`
          }
        })
      } catch (e) {
        console.error('Failed to remove item from server cart', e)
        fetchServerCart()
      }
    }
  }

  const updateQuantity = async (productId: number | string, action: 'increment' | 'decrement') => {
    const pId = String(productId)
    const item = cartState.value.find(i => String(i.id) === pId)
    if (!item) return

    if (action === 'increment') {
      item.quantity += 1
    } else if (action === 'decrement' && item.quantity > 1) {
      item.quantity -= 1
    } else if (action === 'decrement' && item.quantity === 1) {
      await removeFromCart(pId)
      return
    }

    if (authToken.value && import.meta.client) {
      try {
        await $fetch(`${apiBase}/api/v1/cart/update/${pId}`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken.value}`,
            'Content-Type': 'application/json'
          },
          body: { action }
        })
      } catch (e) {
        console.error('Failed to update quantity on server', e)
        fetchServerCart()
      }
    }
  }

  const clearCart = async () => {
    const previousItems = [...cartState.value]
    cartState.value = []

    if (authToken.value && import.meta.client) {
      try {
        await Promise.all(
          previousItems.map(item =>
            $fetch(`${apiBase}/api/v1/cart/remove/${item.id}`, {
              method: 'DELETE',
              headers: {
                'ngrok-skip-browser-warning': 'true',
                Authorization: `Bearer ${authToken.value}`
              }
            }).catch(() => {})
          )
        )
      } catch (e) {
        console.error('Failed to clear cart on server', e)
      }
    }
  }

  const cartTotal = computed(() => {
    return cartState.value.reduce((total, item) => total + (item.price * item.quantity), 0)
  })

  const cartItemCount = computed(() => {
    return cartState.value.reduce((count, item) => count + item.quantity, 0)
  })

  return {
    cartItems: cartState,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartItemCount,
    fetchServerCart
  }
}