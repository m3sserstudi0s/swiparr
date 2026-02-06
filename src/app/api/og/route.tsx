import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const join = searchParams.get('join')

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
            }}
          >
            S
          </div>
        </div>
        
        {join ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '20px',
              }}
            >
              You're Invited
            </div>
            <div
              style={{
                fontSize: '32px',
                color: '#a0a0a0',
                marginBottom: '40px',
              }}
            >
              Join a Swiparr session and start swiping together.
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
              }}
            >
              Login to start swiping on movies.
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
