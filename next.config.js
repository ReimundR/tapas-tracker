const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} = require("next/constants");

const withMDX = require('@next/mdx')({
  extension: /\.(md|mdx)$/,
  options: {
    // Optionally add remark and rehype plugins here
    // If you're using Tailwind's Typography plugin, you might still want
    // rehype-pretty-code or other plugins for code blocks, etc.
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const { version } = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'md', 'mdx'],
  // Enable Turbopack for development mode
  /*turbopack: {
    enabled: true,
  },*/
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    });
    return config;
  },
  env: {
    version,
    FIREBASE_WEBAPP_CONFIG: process.env.FIREBASE_WEBAPP_CONFIG
  },
};

module.exports = (phase) => {
  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const withPWA = require('@ducanh2912/next-pwa').default({
      dest: "public",         // destination directory for the PWA files
      disable: process.env.NODE_ENV === "development",        // disable PWA in the development environment
      register: true,         // register the PWA service worker
      skipWaiting: true,      // skip waiting for service worker activation
    });
    return withPWA(withMDX(nextConfig));
  }
  return withMDX(nextConfig);
};
