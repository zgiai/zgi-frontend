/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.zgi.ai/:path*'
      }
    ]
  }
}

export default nextConfig;
