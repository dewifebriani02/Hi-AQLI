
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'com.hiaqli.app',
    name: 'Hi AQLI',
    short_name: 'Hi AQLI',
    description: 'Berhijrah dengan Ilmu, Beramal dengan Itqan.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#800000',
    lang: 'id',
    categories: ['education', 'books', 'lifestyle'],
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
        label: 'Beranda Hi AQLI',
      },
    ],
  }
}
