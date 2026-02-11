import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getAsyncRuntimeConfig } from '@/lib/runtime-config'

export const runtime = 'edge'

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const join = searchParams.get('join')
    const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
    const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
    const logoUrl = `${origin}${basePath}/icon1.png`;

    // Load fonts based on the text they will display
    const titleText = "Swiparr"
    const taglineText = join 
      ? `You're Invited! Join a session and start swiping on what to watch next together. Code: ${join}`
      : "Swipe on what to watch next, by yourself or together."
    
    const [sansFont, monoFont] = await Promise.all([
      loadGoogleFont('Zalando+Sans:700', titleText + taglineText),
      loadGoogleFont('JetBrains+Mono:700', join || '')
    ])

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
            <span style={{ fontSize: '80px', marginLeft: '20px' }}>
              {join ? '🤝' : '🍿'}
            </span>
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
          
          {join ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  fontSize: '54px',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '15px',
                }}
              >
                You're Invited!
              </div>
              <div
                style={{
                  fontSize: '28px',
                  color: '#a0a0a0',
                  marginBottom: '35px',
                  maxWidth: '850px',
                  textAlign: 'center',
                  lineHeight: '1.4',
                }}
              >
                Join a session and start swiping on what to watch next together.
              </div>
              <div
                style={{
                  fontSize: '64px',
                  fontWeight: 'bold',
                  color: '#ff416c',
                  background: 'rgba(255, 65, 108, 0.1)',
                  padding: '15px 50px',
                  borderRadius: '25px',
                  border: '3px solid rgba(255, 65, 108, 0.4)',
                  fontFamily: 'JetBrains Mono',
                  letterSpacing: '0.05em',
                }}
              >
                {join}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  fontSize: '32px',
                  color: '#a0a0a0',
                  textAlign: 'center',
                  maxWidth: '800px',
                  lineHeight: '1.5',
                }}
              >
                Swipe on what to watch next, by yourself or together.
              </div>
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
    return new Response(`Failed to generate OG image`, { status: 500 })
  }
}
