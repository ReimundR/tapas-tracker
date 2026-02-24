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
  reactCompiler: true,
  reactStrictMode: true,
  cacheComponents: true,
  pageExtensions: ['js', 'jsx', 'md', 'mdx'],
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

/** @type {(phase: string, defaultConfig: import("next").NextConfig) => Promise<import("next").NextConfig>} */
module.exports = async (phase) => {
  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const withSerwist = (await import("@serwist/next")).default({
      // Note: This is only an example. If you use Pages Router,
      // use something else that works, such as "service-worker/index.ts".
      swSrc: "src/app/sw.ts",
      swDest: "public/sw.js",
      cacheOnNavigation: false,
      reloadOnOnline: false,
      //disable: process.env.NODE_ENV !== "production",
    });
    return withSerwist(withMDX(nextConfig));
  }

  return withMDX(nextConfig);
};