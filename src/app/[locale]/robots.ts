import { MetadataRoute } from 'next'
import { getRuntimeConfig } from '@/lib/runtime-config'

export default function robots(): MetadataRoute.Robots {
  const { appPublicUrl } = getRuntimeConfig()
  const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/og/*'],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}
