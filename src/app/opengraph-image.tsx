import { ImageResponse } from 'next/og'

// Image metadata
export const alt = 'Tarefas da Família'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Open Graph Image
export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '40px',
            padding: '80px',
          }}
        >
          {/* Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '200px',
              height: '200px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50px',
            }}
          >
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <h1
              style={{
                fontSize: '80px',
                fontWeight: 'bold',
                color: 'white',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Tarefas da Família
            </h1>
            <p
              style={{
                fontSize: '40px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Organize as tarefas domésticas em família
            </p>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
