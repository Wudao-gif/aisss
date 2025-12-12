/**
 * 配置阿里云 OSS CORS 规则（公共 Bucket）
 * 运行命令：node scripts/setup-oss-cors-public.js
 */

const OSS = require('ali-oss')
require('dotenv').config({ path: '.env.local' })

async function setupCORS() {
  console.log('🔧 开始配置公共 Bucket OSS CORS 规则...\n')

  // 创建 OSS 客户端
  const client = new OSS({
    region: process.env.NEXT_PUBLIC_OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC,
  })

  try {
    // 配置 CORS 规则
    const corsRules = [
      {
        allowedOrigin: ['*'], // 允许所有来源
        allowedMethod: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
        allowedHeader: ['*'],
        exposeHeader: [
          'ETag',
          'x-oss-request-id',
          'x-oss-version-id',
          'x-oss-delete-marker',
        ],
        maxAgeSeconds: 600,
      },
    ]

    await client.putBucketCORS(process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC, corsRules)

    console.log('✅ CORS 规则配置成功！')
    console.log('\n配置详情：')
    console.log('- Bucket:', process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC)
    console.log('- 允许来源: *')
    console.log('- 允许方法: GET, HEAD, POST, PUT, DELETE')
    console.log('- 允许头部: *')
    console.log('- 缓存时间: 600 秒')

    // 验证配置
    console.log('\n🔍 验证 CORS 配置...')
    const result = await client.getBucketCORS(process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC)
    console.log('✅ 当前 CORS 规则数量:', result.rules.length)
    console.log('\n配置完成！')
  } catch (error) {
    console.error('❌ 配置失败:', error.message)
    process.exit(1)
  }
}

setupCORS()

