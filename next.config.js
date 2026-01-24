/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }
    return config
  }
}
module.exports = nextConfig
