import { MetadataRoute } from 'next'
import { getRuntimeConfig } from '@/lib/runtime-config'

export default function manifest(): MetadataRoute.Manifest {
  const { basePath } = getRuntimeConfig();
  
  return {
    name: 'Messer Swipe',
    short_name: 'Messer Swipe',
    description: 'Swipe on what to watch next, by yourself or together.',
    start_url: `${basePath}/`,
    display: 'standalone',
    // The mark comes from `npm run marks` in messer-ui; only those sizes exist, so the manifest
    // declares exactly them rather than claiming a maskable 512 that is really a re-scaled 180.
    background_color: '#141414',
    theme_color: '#141414',
    icons: [
      {
        src: `${basePath}/favicon.svg`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: `${basePath}/favicon-32.png`,
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: `${basePath}/apple-touch-icon.png`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
