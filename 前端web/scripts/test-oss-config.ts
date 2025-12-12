/**
 * 测试 OSS 配置
 * 运行: npx tsx scripts/test-oss-config.ts
 */

import OSS from 'ali-oss'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

// 加载 .env.local 文件
const envPath = resolve(process.cwd(), '.env.local')
console.log('📂 加载环境变量文件:', envPath)
loadEnv({ path: envPath })
console.log()

console.log('🔍 检查 OSS 环境变量配置...\n')

// 检查环境变量
const ossConfig = {
  region: process.env.NEXT_PUBLIC_OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.NEXT_PUBLIC_OSS_BUCKET,
  bucketPublic: process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC,
}

console.log('📋 环境变量状态:')
console.log('  NEXT_PUBLIC_OSS_REGION:', ossConfig.region ? '✅ 已设置' : '❌ 未设置')
console.log('  OSS_ACCESS_KEY_ID:', ossConfig.accessKeyId ? '✅ 已设置' : '❌ 未设置')
console.log('  OSS_ACCESS_KEY_SECRET:', ossConfig.accessKeySecret ? '✅ 已设置' : '❌ 未设置')
console.log('  NEXT_PUBLIC_OSS_BUCKET:', ossConfig.bucket ? '✅ 已设置' : '❌ 未设置')
console.log('  NEXT_PUBLIC_OSS_BUCKET_PUBLIC:', ossConfig.bucketPublic ? '✅ 已设置' : '❌ 未设置')
console.log()

// 检查是否所有必需的配置都存在
const missingConfigs = []
if (!ossConfig.region) missingConfigs.push('NEXT_PUBLIC_OSS_REGION')
if (!ossConfig.accessKeyId) missingConfigs.push('OSS_ACCESS_KEY_ID')
if (!ossConfig.accessKeySecret) missingConfigs.push('OSS_ACCESS_KEY_SECRET')
if (!ossConfig.bucket) missingConfigs.push('NEXT_PUBLIC_OSS_BUCKET')

if (missingConfigs.length > 0) {
  console.error('❌ 缺少以下环境变量:')
  missingConfigs.forEach(key => console.error(`   - ${key}`))
  console.log('\n💡 请在 .env.local 文件中配置这些变量')
  process.exit(1)
}

console.log('✅ 所有必需的环境变量都已设置\n')

// 测试 OSS 连接
async function testOSSConnection() {
  console.log('🔗 测试 OSS 连接...\n')

  try {
    const client = new OSS({
      region: ossConfig.region!,
      accessKeyId: ossConfig.accessKeyId!,
      accessKeySecret: ossConfig.accessKeySecret!,
      bucket: ossConfig.bucket!,
      authorizationV4: true,
      secure: true,
    })

    console.log('📦 尝试列出 Bucket 中的文件（最多 10 个）...')
    const result = await client.list({
      'max-keys': 10,
    })

    console.log('✅ OSS 连接成功！')
    console.log(`📊 Bucket: ${ossConfig.bucket}`)
    console.log(`📊 文件数量: ${result.objects?.length || 0}`)
    
    if (result.objects && result.objects.length > 0) {
      console.log('\n📁 最近的文件:')
      result.objects.slice(0, 5).forEach((obj: any) => {
        console.log(`   - ${obj.name} (${(obj.size / 1024).toFixed(2)} KB)`)
      })
    }

    console.log('\n✅ OSS 配置测试通过！')
  } catch (error) {
    console.error('\n❌ OSS 连接失败:')
    console.error('错误信息:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && 'code' in error) {
      const ossError = error as any
      console.error('错误代码:', ossError.code)
      console.error('错误详情:', ossError.message)
      
      // 常见错误提示
      if (ossError.code === 'InvalidAccessKeyId') {
        console.log('\n💡 提示: AccessKeyId 无效，请检查 OSS_ACCESS_KEY_ID')
      } else if (ossError.code === 'SignatureDoesNotMatch') {
        console.log('\n💡 提示: AccessKeySecret 错误，请检查 OSS_ACCESS_KEY_SECRET')
      } else if (ossError.code === 'NoSuchBucket') {
        console.log('\n💡 提示: Bucket 不存在，请检查 NEXT_PUBLIC_OSS_BUCKET')
      } else if (ossError.code === 'AccessDenied') {
        console.log('\n💡 提示: 权限不足，请检查 RAM 用户权限')
      }
    }
    
    process.exit(1)
  }
}

testOSSConnection()

