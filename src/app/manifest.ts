
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
        src: 'https://picsum.photos/seed/aqli-icon/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://picsum.photos/seed/aqli-icon/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
