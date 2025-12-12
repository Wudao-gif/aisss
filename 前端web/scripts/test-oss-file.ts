/**
 * 测试 OSS 文件是否存在
 */

import OSS from 'ali-oss'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const filePath = 'book-files/1763548065248-4d4fbflzdru.pdf'

// 私有 bucket 配置
const privateClient = new OSS({
  region: process.env.NEXT_PUBLIC_OSS_REGION || 'oss-cn-chengdu',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.NEXT_PUBLIC_OSS_BUCKET || 'yongh222',
  authorizationV4: true,
  secure: true,
})

// 公共 bucket 配置
const publicClient = new OSS({
  region: process.env.NEXT_PUBLIC_OSS_REGION || 'oss-cn-chengdu',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC || 'ziyuangongkai11',
  authorizationV4: true,
  secure: true,
})

async function testFile() {
  console.log('🔍 测试文件是否存在...\n')
  console.log(`文件路径: ${filePath}\n`)

  // 测试私有 bucket
  console.log('1️⃣ 测试私有 Bucket (yongh222)...')
  try {
    const result = await privateClient.head(filePath)
    console.log('✅ 文件存在于私有 Bucket!')
    console.log('   文件大小:', result.res.headers['content-length'], 'bytes')
    console.log('   文件类型:', result.res.headers['content-type'])
    console.log('')
  } catch (error: any) {
    if (error.code === 'NoSuchKey') {
      console.log('❌ 文件不存在于私有 Bucket')
    } else {
      console.log('❌ 检查失败:', error.message)
    }
    console.log('')
  }

  // 测试公共 bucket
  console.log('2️⃣ 测试公共 Bucket (ziyuangongkai11)...')
  try {
    const result = await publicClient.head(filePath)
    console.log('✅ 文件存在于公共 Bucket!')
    console.log('   文件大小:', result.res.headers['content-length'], 'bytes')
    console.log('   文件类型:', result.res.headers['content-type'])
    console.log('')
  } catch (error: any) {
    if (error.code === 'NoSuchKey') {
      console.log('❌ 文件不存在于公共 Bucket')
    } else {
      console.log('❌ 检查失败:', error.message)
    }
    console.log('')
  }

  // 列出私有 bucket 中 book-files 目录的文件
  console.log('3️⃣ 列出私有 Bucket 中 book-files 目录的文件...')
  try {
    const result = await privateClient.list({
      prefix: 'book-files/',
      'max-keys': 10,
    })
    
    if (result.objects && result.objects.length > 0) {
      console.log(`找到 ${result.objects.length} 个文件:`)
      result.objects.forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.name}`)
        console.log(`      大小: ${obj.size} bytes`)
        console.log(`      最后修改: ${obj.lastModified}`)
      })
    } else {
      console.log('❌ book-files 目录为空')
    }
  } catch (error: any) {
    console.log('❌ 列出文件失败:', error.message)
  }
}

testFile().catch(console.error)

