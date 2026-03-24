
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hi AQLI',
    short_name: 'Hi AQLI',
    description: 'Berhijrah dengan Ilmu, Beramal dengan Itqan.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#800000',
    icons: [
      {
        src: '/app-logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/app-logo.png',
        sizes: '512x512',
        type: 'image/png',
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
