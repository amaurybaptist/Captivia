import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'Captivia', short_name: 'Captivia', lang: 'fr',
    description: 'Les soins et les rappels de vos animaux.',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#f9fafb', theme_color: '#059669',
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
