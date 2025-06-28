/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: [
        'oaidalleapiprodscus.blob.core.windows.net',
        'res.cloudinary.com',
        // any other hostnames you need…
      ],
    },
  };
  module.exports = nextConfig;
  