/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://use.typekit.net; font-src 'self' data: https://use.typekit.net; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com; connect-src 'self' https://*.supabase.co https://*.supabase.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;