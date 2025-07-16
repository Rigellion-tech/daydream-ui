/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "oaidalleapiprodscus.blob.core.windows.net",
      "res.cloudinary.com",
      "www.daydreamforge.com",
      "daydreamforge.com",
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: "https://www.daydreamforge.com",
  },
  trailingSlash: false, // Optional - remove if you prefer slashes
};

module.exports = nextConfig;
