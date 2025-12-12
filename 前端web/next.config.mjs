/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 启用严格类型检查 - 生产环境必须修复所有类型错误
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // 添加环境变量配置
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
  // 配置 Server Actions 的请求体大小限制
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // LobeHub UI 需要 transpile
  transpilePackages: ['@lobehub/ui', '@lobehub/icons', 'antd-style'],
  // Webpack 配置 - 忽略 pdfjs-dist 的 canvas 依赖
  webpack: (config, { isServer }) => {
    // 在服务端忽略 canvas 模块（pdfjs-dist 在 Node.js 环境下需要）
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('canvas')
    }
    // 客户端也需要处理
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },
}

export default nextConfig
