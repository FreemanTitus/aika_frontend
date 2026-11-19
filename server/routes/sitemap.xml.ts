// server/routes/sitemap.xml.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.siteUrl || 'https://www.useaika.com.ng').replace(/\/+$/, '')
  const today = new Date().toISOString().split('T')[0]

  const staticPaths = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/marketplace', changefreq: 'daily', priority: '0.9' },
    { path: '/delivery', changefreq: 'weekly', priority: '0.8' },
    { path: '/rides', changefreq: 'weekly', priority: '0.8' },
    { path: '/errands', changefreq: 'weekly', priority: '0.8' },
  ]

  const urls = staticPaths.map(
    (item) => `
  <url>
    <loc>${siteUrl}${item.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}\n</urlset>`
})