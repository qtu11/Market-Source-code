import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-side modules from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
      
      // ✅ FIX: Next.js đã tự xử lý React và jsx-runtime
      // Không cần alias React vì có thể gây xung đột với jsx-runtime
      // Chỉ giữ lại fallback cho server-side modules
    }
    
    // Cho phép optional dependencies như firebase-admin được resolve ở runtime
    // Không bundle chúng vào webpack, sẽ load bằng require() khi cần
    if (isServer) {
      const originalExternals = config.externals || [];
      const isFunction = typeof originalExternals === 'function';
      const externalsArray = Array.isArray(originalExternals) ? originalExternals : [];
      
      config.externals = [
        ...externalsArray,
        ({ context, request }, callback) => {
          // firebase-admin là optional dependency, không bắt buộc
          if (request === 'firebase-admin') {
            return callback(null, `commonjs ${request}`);
          }
          // Call original externals function nếu có
          if (isFunction) {
            return originalExternals({ context, request }, callback);
          }
          callback();
        },
      ];
    }
    
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // ✅ FIX: Chỉ unoptimized khi deploy static (Netlify static)
    // Với Vercel/Docker, để false để tận dụng Next.js Image Optimization
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === 'true',
  },
  // ✅ FIX: Next.js tự động expose NEXT_PUBLIC_* variables
  // Chỉ cần config server-side only variables nếu thực sự cần
  // (Thường không cần vì có thể access trực tiếp từ process.env)
  // env: {
  //   // Chỉ thêm nếu cần expose server-side vars cho client (không nên)
  // },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/icons/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },
  // ✅ FIX: Redirects để xử lý các requests không tồn tại
  async rewrites() {
    return [
      // Redirect icon-192.png to logoqtusdev.png
      {
        source: '/icon-192.png',
        destination: '/logoqtusdev.png',
      },
    ]
  },
  // Skip static generation for admin routes
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Disable static optimization for all pages (use dynamic rendering)
  // ✅ FIX: Conditional output - standalone cho Docker, undefined cho Netlify
  // Netlify plugin tự động xử lý Next.js output, không cần standalone
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
}

export default nextConfig;