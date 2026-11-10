import { connection } from 'next/server'
import { getRuntimeConfig } from '@/lib/runtime-config'
import { fallbackImage, OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og'

export const alt = 'Messer Swipe — swipe on what to watch next'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  try {
    try {
      await connection()
    } catch (error) {
      console.warn('[opengraph-image] connection() failed during prerender.')
      return fallbackImage('Messer Swipe')
    }

    const { basePath, appPublicUrl } = getRuntimeConfig()
    const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`

    return await renderOgCard({ origin, basePath })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`OG Image Error: ${message}`)
    return new Response(`Failed to generate image: ${message}`, { status: 500 })
  }
}
