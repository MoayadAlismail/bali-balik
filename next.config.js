/** @type {import('next').NextConfig} */

module.exports = {
    reactStrictMode: false,
  }

const nextConfig = {
    
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
                ]
            }
        ];
    }
};

module.exports = nextConfig; 