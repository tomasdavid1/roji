/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pdf.js ships with .mjs workers — needed for the COA reader.
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
};

module.exports = nextConfig;
