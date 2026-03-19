
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hi AQLI',
    short_name: 'Hi AQLI',
    description: 'Pendamping Anda menuju keunggulan Al-Qur\'an.',
    start_url: '/',
    display: 'standalone',
    background_color: '#800000',
    theme_color: '#800000',
    icons: [
      {
        src: '/logoaqli.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/logoaqli.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/splash-screen.png',
        sizes: '540x720',
        type: 'image/png',
      },
    ],
  }
}
