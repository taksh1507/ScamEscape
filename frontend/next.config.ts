import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve('./'), // ✅ FIXED
  },
  // Produces a minimal standalone server (server.js + only the deps it needs)
  // so the production Docker image doesn't have to ship full node_modules.
  output: 'standalone',
}

export default nextConfig