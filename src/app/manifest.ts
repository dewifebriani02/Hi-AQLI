
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hi AQLI',
    short_name: 'Hi AQLI',
    description: 'Berhijrah dengan Ilmu, Beramal dengan Itqan.',
    start_url: '/',
    display: 'standalone',
    background_color: '#800000',
    theme_color: '#800000',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/app-splash.jpg',
        sizes: '540x720',
        type: 'image/jpeg',
      },
    ],
  }
}
