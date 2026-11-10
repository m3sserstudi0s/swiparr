import { NextRequest } from 'next/server'
import { connection } from 'next/server'
import { getAsyncRuntimeConfig } from '@/lib/server/runtime-config'
import { fallbackImage, OG_CONTENT_TYPE, renderOgCard } from '@/lib/og'

export async function GET(req: NextRequest) {
  try {
    try {
      await connection()
    } catch (error) {
      console.warn('[og] connection() failed during prerender.')
      return fallbackImage('Messer Swipe')
    }

    const { searchParams } = new URL(req.url)
    const join = searchParams.get('join')
    const { basePath, appPublicUrl } = await getAsyncRuntimeConfig()
    const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`

    const image = await renderOgCard({ origin, basePath, join: Boolean(join), code: join })
    return new Response(image.body, { headers: { 'Content-Type': OG_CONTENT_TYPE } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`OG Generation Error: ${message}`)
    return new Response(`Failed to generate image: ${message}`, { status: 500 })
  }
}
