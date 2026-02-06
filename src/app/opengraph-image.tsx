import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Swiparr - Swipe on your media'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
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
          {/* Logo placeholder - using a stylized S or a circle for now as we can't easily embed local SVG without reading it */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '30px',
              background: 'linear-gradient(to bottom right, #ff4b2b, #ff416c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '80px',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 10px 30px rgba(255, 75, 43, 0.3)',
            }}
          >
            S
          </div>
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
            fontSize: '32px',
            color: '#a0a0a0',
            maxWidth: '800px',
            textAlign: 'center',
            lineHeight: '1.4',
          }}
        >
          The Tinder-like experience for movies.
          Swipe, rate, and discover.
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
