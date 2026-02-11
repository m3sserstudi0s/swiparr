import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getAsyncRuntimeConfig } from '@/lib/runtime-config'

export const runtime = 'nodejs'

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

  // Fallback to a direct TTF link if Google Fonts API is being difficult
  const fallbacks: Record<string, string> = {
    'Zalando+Sans': 'https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Bold.ttf', // Fallback for proprietary font
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const join = searchParams.get('join')
    const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
    const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
    const logoUrl = `${origin}${basePath}/icon1.png`;

    // Fetch fonts
    const [sansFont, monoFont] = await Promise.all([
      loadGoogleFont('Zalando+Sans', 'Swiparr' + (join ? "You're Invited! Join a session" : "Swipe on what to watch next")),
      loadGoogleFont('JetBrains+Mono', join || 'CODE')
    ])

    const emoji = join ? '🤝' : '🍿';

    return new ImageResponse(
      (
        <div tw="flex flex-col items-center justify-center w-full h-full bg-[#141414]" style={{
          background: 'linear-gradient(to bottom right, #141414, #2a2a2a)',
        }}>
          {/* Header with Logo and Emoji */}
          <div tw="flex items-center mb-4">
            <img
              src={logoUrl}
              alt="Logo"
              tw="w-32 h-32 rounded-[30px]"
            />
            <div tw="text-8xl ml-8 flex">
              {emoji}
            </div>
          </div>

          {/* Bold App Name UNDER the logo/emoji */}
          <div tw="text-8xl font-black text-white mb-8" style={{ fontFamily: 'Zalando Sans' }}>
            Swiparr
          </div>

          {join ? (
            <div tw="flex flex-col items-center">
              <div tw="text-5xl font-bold text-white mb-4">
                You're Invited!
              </div>
              <div tw="text-3xl text-[#a0a0a0] mb-10 max-w-3xl text-center leading-normal">
                Join a session and start swiping on what to watch next together.
              </div>
              <div tw="text-6xl font-bold text-[#ff416c] px-12 py-5 rounded-3xl border-4 border-[#ff416c66] bg-[#ff416c0d]" style={{ fontFamily: 'JetBrains Mono' }}>
                {join}
              </div>
            </div>
          ) : (
            <div tw="text-4xl text-[#a0a0a0] text-center max-w-4xl leading-relaxed">
              Swipe on what to watch next, by yourself or together.
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
        emoji: 'twemoji',
        fonts: [
          {
            name: 'Zalando Sans',
            data: sansFont,
            style: 'normal',
            weight: 700,
          },
          {
            name: 'JetBrains Mono',
            data: monoFont,
            style: 'normal',
            weight: 700,
          }
        ]
      }
    )
  } catch (e: any) {
    console.error(`OG Generation Error: ${e.message}`)
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 })
  }
}
