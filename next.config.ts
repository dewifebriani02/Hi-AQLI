import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lhqbqzrghdbbmstnhple.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/whatsapp',
        destination: 'https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq',
        permanent: true,
      },
      {
        source: '/telegram',
        destination: 'https://t.me/rq_aqli',
        permanent: true,
      },
      {
        source: '/channel',
        destination: 'https://whatsapp.com/channel/0029Vb5sNGZ9mrGkJGzEh421',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
