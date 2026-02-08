import { ImageResponse } from 'next/og'
import { getAsyncRuntimeConfig } from '@/lib/runtime-config'

export const runtime = 'edge'

export const alt = 'Swiparr - Swipe on what to watch next'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
  const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
  const logoUrl = `${origin}${basePath}/icon1.png`;

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
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <img 
            src={logoUrl} 
            alt="Swiparr Logo" 
            style={{ 
              width: '160px', 
              height: '160px',
              borderRadius: '40px',
            }} 
          />
        </div>
        <div
          style={{
            fontSize: '80px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '10px',
            letterSpacing: '-0.02em',
          }}
        >
          Swiparr
        </div>
        <div
          style={{
            fontSize: '36px',
            color: '#a0a0a0',
            maxWidth: '900px',
            textAlign: 'center',
            lineHeight: '1.4',
          }}
        >
          Swipe on what to watch next, by yourself or together.
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
