import { ImageResponse } from 'next/og'
import { getAsyncRuntimeConfig } from '@/lib/runtime-config'

export const runtime = 'edge'

export const alt = 'Swiparr - Swipe on what to watch next'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)

  if (resource) {
    const response = await fetch(resource[1])
    if (response.status === 200) {
      return await response.arrayBuffer()
    }
  }

  throw new Error('failed to load font data')
}

export default async function Image() {
  try {
    const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
    const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
    const logoUrl = `${origin}${basePath}/icon1.png`;

    const text = "Swiparr Swipe on what to watch next, by yourself or together."
    const sansFont = await loadGoogleFont('Zalando+Sans:700', text)

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(to bottom right, #141414, #2a2a2a)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Zalando Sans, sans-serif',
          }}
        >
          {/* Logo and Emoji Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
            }}
          >
            <img 
              src={logoUrl} 
              alt="Swiparr Logo" 
              style={{ 
                width: '120px', 
                height: '120px',
                borderRadius: '30px',
              }} 
            />
            <span style={{ fontSize: '80px', marginLeft: '20px' }}>🎬</span>
          </div>

          {/* App Name */}
          <div
            style={{
              fontSize: '60px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '30px',
              fontFamily: 'Zalando Sans',
            }}
          >
            Swiparr
          </div>

          <div
            style={{
              fontSize: '32px',
              color: '#a0a0a0',
              maxWidth: '800px',
              textAlign: 'center',
              lineHeight: '1.5',
            }}
          >
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
    return new Response(`Failed to generate image`, { status: 500 })
  }
}
