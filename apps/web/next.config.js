const { existsSync } = require('fs');
const { resolve } = require('path');

// Load monorepo root .env so NEXT_PUBLIC_* is available when running from apps/web
for (const p of [resolve(__dirname, '../../.env'), resolve(__dirname, '.env.local')]) {
  if (existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@placement/shared'],
};

module.exports = nextConfig;
