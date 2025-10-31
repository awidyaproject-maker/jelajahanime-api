/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverComponentsExternalPackages: [
      'cheerio',
      'puppeteer',
      'puppeteer-extra',
      'puppeteer-extra-plugin-stealth',
      'puppeteer-extra-plugin',
      'clone-deep',
      'merge-deep',
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude puppeteer and related packages from client-side bundling
    if (!isServer) {
      config.externals = [...(config.externals || []), 'puppeteer', 'puppeteer-extra'];
    }
    return config;
  },
}

module.exports = nextConfig