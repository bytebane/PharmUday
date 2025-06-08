import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	/* config options here */
	output: 'standalone',
	eslint: {
		ignoreDuringBuilds: true,
	},
	poweredByHeader: false,
	reactStrictMode: true,
	experimental: {
		// Enable optimizations
		optimizeCss: true,
		scrollRestoration: true,
	},
}

export default nextConfig
