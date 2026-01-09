import { MetadataRoute } from 'next'
import { getRuntimeConfig } from '@/lib/runtime-config'

export default function manifest(): MetadataRoute.Manifest {
  const { basePath } = getRuntimeConfig();
  
  return {
    name: 'Swiparr',
    short_name: 'Swiparr',
    description: 'Swipe on your Jellyfin media',
    start_url: `${basePath}/`,
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: `${basePath}/web-app-manifest-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${basePath}/web-app-manifest-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${basePath}/apple-icon.png`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
