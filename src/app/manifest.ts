import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sahabat AQLI',
    short_name: 'AQLI',
    description: 'Pendamping Anda menuju keunggulan Al-Qur\'an.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#800000',
    icons: [
      {
        src: 'https://placehold.co/192x192/800000/ffffff?text=AQLI',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://placehold.co/512x512/800000/ffffff?text=AQLI',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
