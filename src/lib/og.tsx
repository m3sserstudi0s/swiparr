import { ImageResponse } from 'next/og'

// One social card for the whole app, drawn in the canon's own geometry: an ink box, the generated
// mark, a mono label and a muted line. Satori cannot read CSS variables, so the four colours are the
// resolved token values — the mark PNG carries the same ink box, so the two never drift apart.

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const INK = '#141414'
const PAPER = '#fafafa'
const MUTED = '#a0a0a0'
const HAIRLINE = '#2a2a2a'

const TITLE = 'Messer Swipe'

const FOOT_LEFT = 'messer.wtf'
const FOOT_RIGHT = 'swipe'

export async function loadGoogleFont(family: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const resource = css.match(/src: url\((.+)\) format\(['"](.+)['"]\)/)
  if (resource && (resource[2] === 'truetype' || resource[2] === 'opentype')) {
    const response = await fetch(resource[1])
    if (response.ok) return await response.arrayBuffer()
  }
  throw new Error(`Failed to load font: ${family}`)
}

export function fallbackImage(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: INK,
          color: PAPER,
          fontSize: 64,
          fontFamily: 'sans-serif',
        }}
      >
        {message}
      </div>
    ),
    { ...OG_SIZE },
  )
}

export async function renderOgCard({
  origin,
  basePath,
  join = false,
  code,
}: {
  origin: string
  basePath: string
  join?: boolean
  code?: string | null
}) {
  const subtitle = join
    ? 'You are invited to join a session.'
    : 'Swipe on what to watch next, by yourself or together.'

  const [sans, mono] = await Promise.all([
    loadGoogleFont('Golos+Text', TITLE + subtitle),
    loadGoogleFont('JetBrains+Mono', TITLE.toUpperCase() + FOOT_LEFT + FOOT_RIGHT + (code ?? '')),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: INK,
          color: PAPER,
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* The mark's glyph, drawn in paper on the ink card. The generated PNG would be an ink
              tile on ink — invisible — and this is Phosphor's `cards-three-fill`, the same glyph
              `brand/messer-swipe.json` names (256 grid, inlined because Satori cannot render a
              React icon component). */}
          <svg width={96} height={96} viewBox="0 0 256 256" fill={PAPER}>
            {/* Same 270deg turn as `mark.rotate` in brand/messer-swipe.json: the cards stand up
                and the two thin ones sit on the left, which is where the old mark had them. */}
            <g transform="rotate(270 128 128)">
              <path d="M224,104v96a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V104A16,16,0,0,1,48,88H208A16,16,0,0,1,224,104ZM56,72H200a8,8,0,0,0,0-16H56a8,8,0,0,0,0,16ZM72,40H184a8,8,0,0,0,0-16H72a8,8,0,0,0,0,16Z" />
            </g>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 32 }}>
            <div
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 44,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              {TITLE}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Golos Text', fontSize: 38, color: MUTED, maxWidth: 1000 }}>
            {subtitle}
          </div>
          {code ? (
            <div
              style={{
                display: 'flex',
                marginTop: 32,
                padding: '18px 28px',
                border: `1px solid ${HAIRLINE}`,
                fontFamily: 'JetBrains Mono',
                fontSize: 48,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
              }}
            >
              {code}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: `1px solid ${HAIRLINE}`,
            paddingTop: 24,
            fontFamily: 'JetBrains Mono',
            fontSize: 16,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          <span>{FOOT_LEFT}</span>
          <span>{FOOT_RIGHT}</span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Golos Text', data: sans, style: 'normal', weight: 600 },
        { name: 'JetBrains Mono', data: mono, style: 'normal', weight: 500 },
      ],
    },
  )
}
