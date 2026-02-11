import { ImageResponse } from 'next/og'
import { getAsyncRuntimeConfig } from '@/lib/runtime-config'

export const runtime = 'nodejs'

export const alt = 'Swiparr - Swipe on what to watch next'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url, {
    headers: {
      // Force TTF format by using an old browser User-Agent
      'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
    },
  })).text()

  const resource = css.match(/src: url\((.+)\) format\(['"](.+)['"]\)/)

  if (resource && (resource[2] === 'truetype' || resource[2] === 'opentype')) {
    const response = await fetch(resource[1])
    if (response.ok) {
      return await response.arrayBuffer()
    }
  }

  // Fallback to a direct TTF link
  const fallbacks: Record<string, string> = {
    'Zalando+Sans': 'https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Bold.ttf',
    'JetBrains+Mono': 'https://github.com/JetBrains/JetBrainsMono/raw/v2.304/fonts/ttf/JetBrainsMono-Bold.ttf'
  }

  if (fallbacks[font]) {
    const response = await fetch(fallbacks[font])
    if (response.ok) {
      return await response.arrayBuffer()
    }
  }

  throw new Error(`Failed to load font: ${font}`)
}

export default async function Image() {
  try {
    const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
    const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
    const logoUrl = `${origin}${basePath}/icon1.png`;

    const text = "Swiparr Swipe on what to watch next, by yourself or together."
    const sansFont = await loadGoogleFont('Zalando+Sans', text)

    return new ImageResponse(
      (
        <div tw="flex flex-col items-center justify-center w-full h-full bg-[#141414]" style={{
          background: 'linear-gradient(to bottom right, #141414, #2a2a2a)',
        }}>
          {/* Header with Logo and Emoji */}
          <div tw="flex items-center mb-4">
            <img 
              src={logoUrl} 
              alt="Swiparr Logo" 
              tw="w-32 h-32 rounded-[30px]"
            />
            <span tw="text-8xl ml-8 flex">🍿</span>
          </div>

          {/* App Name UNDER logo/emoji */}
          <div tw="text-8xl font-black text-white mb-8" style={{ fontFamily: 'Zalando Sans' }}>
            Swiparr
          </div>

          <div tw="text-4xl text-[#a0a0a0] text-center max-w-4xl leading-relaxed">
            Swipe on what to watch next, by yourself or together.
          </div>
        </div>
      ),
      {
        ...size,
        emoji: 'twemoji',
        fonts: [
          {
            name: 'Zalando Sans',
            data: sansFont,
            style: 'normal',
            weight: 700,
          }
        ]
      }
    )
  } catch (e: any) {
    console.error(`OG Image Error: ${e.message}`)
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 })
  }
}
