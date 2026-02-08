import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getAsyncRuntimeConfig } from '@/lib/runtime-config'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const join = searchParams.get('join')
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
            marginBottom: '40px',
          }}
        >
          <img 
            src={logoUrl} 
            alt="Swiparr Logo" 
            style={{ 
              width: '140px', 
              height: '140px',
              borderRadius: '35px',
            }} 
          />
        </div>
        
        {join ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '20px',
              }}
            >
              You're Invited!
            </div>
            <div
              style={{
                fontSize: '32px',
                color: '#a0a0a0',
                marginBottom: '40px',
                maxWidth: '800px',
                textAlign: 'center'
              }}
            >
              Join a session and start swiping on what to watch next together.
            </div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ff416c',
                background: 'rgba(255, 65, 108, 0.1)',
                padding: '20px 40px',
                borderRadius: '20px',
                border: '2px solid rgba(255, 65, 108, 0.3)',
              }}
            >
              Code: {join}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontSize: '80px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '10px',
              }}
            >
              Swiparr
            </div>
            <div
              style={{
                fontSize: '32px',
                color: '#a0a0a0',
                textAlign: 'center',
                maxWidth: '800px'
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
    }
  )
}
