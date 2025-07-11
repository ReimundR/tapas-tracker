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
    version
  }
};

module.exports = withMDX(nextConfig);
