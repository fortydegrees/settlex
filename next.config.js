const { readEnvironment } = require("./lib/config/environment.cjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: Object.fromEntries([
    "NEXT_PUBLIC_SETTLEHEX_SETTLEGRAPH_V2", "NEXT_PUBLIC_SETTLEHEX_RELEASE_VERSION",
    "NEXT_PUBLIC_SETTLEHEX_BUILD_SHA", "NEXT_PUBLIC_SETTLEHEX_BUILD_DATE",
  ].map(name => [name, readEnvironment(process.env, name) ?? ""])),
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      bufferutil: false,
      "utf-8-validate": false,
    };
    return config;
  },
};

module.exports = nextConfig


// const withImages = require('next-images');

// module.exports = withImages();
