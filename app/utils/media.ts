// utils/media.ts
export const getMediaUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('blob:')) {
    return imagePath
  }

  // Use Nuxt runtime config to dynamically resolve the correct backend host (localhost or ngrok)
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:8000'
  
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`

  return `${apiBase}${cleanPath}`
}