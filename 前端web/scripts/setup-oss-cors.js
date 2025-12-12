/**
 * 配置阿里云 OSS CORS 规则
 * 运行命令：node scripts/setup-oss-cors.js
 */

const OSS = require('ali-oss')
require('dotenv').config({ path: '.env.local' })

async function setupCORS() {
  console.log('🔧 开始配置 OSS CORS 规则...\n')

  // 创建 OSS 客户端
  const client = new OSS({
    region: process.env.NEXT_PUBLIC_OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.NEXT_PUBLIC_OSS_BUCKET,
  })

  try {
    // 配置 CORS 规则
    const corsRules = [
      {
        allowedOrigin: ['*'], // 允许所有来源（生产环境建议改为具体域名）
        allowedMethod: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
        allowedHeader: ['*'], // 允许所有请求头（包括 Range）
        exposeHeader: [
          'ETag',
          'x-oss-request-id',
          'x-oss-version-id',
          'x-oss-delete-marker',
          // 🆕 Range Request 必需的响应头
          'Content-Range',
          'Content-Length',
          'Accept-Ranges',
        ],
        maxAgeSeconds: 600,
      },
    ]

    await client.putBucketCORS(process.env.NEXT_PUBLIC_OSS_BUCKET, corsRules)

    console.log('✅ CORS 规则配置成功！')
    console.log('\n配置详情：')
    console.log('- Bucket:', process.env.NEXT_PUBLIC_OSS_BUCKET)
    console.log('- 允许来源: *')
    console.log('- 允许方法: GET, HEAD, POST, PUT, DELETE')
    console.log('- 允许头部: *')
    console.log('- 缓存时间: 600 秒')

    // 验证配置
    console.log('\n🔍 验证 CORS 配置...')
    const result = await client.getBucketCORS(process.env.NEXT_PUBLIC_OSS_BUCKET)
    console.log('✅ 当前 CORS 规则数量:', result.rules.length)
    console.log('\n配置完成！现在可以正常访问 PDF 文件了。')
  } catch (error) {
    console.error('❌ 配置失败:', error.message)
    console.error('\n请检查：')
    console.error('1. OSS AccessKey 是否正确')
    console.error('2. 是否有 Bucket 的管理权限')
    console.error('3. Bucket 名称是否正确')
    process.exit(1)
  }
}

setupCORS()

