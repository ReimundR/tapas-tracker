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
    messagingSenderId: "136005099339",
    appId: "1:136005099339:web:28b6186333d3ae2ef792ce",
    apiKey: "AIzaSyB8O-7yvSsyaSyKTBFOzOY-E98zaiSsg6s",
    projectId: "tapas-aya"
  }
};

module.exports = withMDX(nextConfig);
