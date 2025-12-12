/**
 * 修复图书封面URL
 * 将所有阿里云OSS的封面替换为placeholder.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 颜色方案
const colors = [
  '4A90E2', // 蓝色
  '50C878', // 绿色
  'E74C3C', // 红色
  'F39C12', // 橙色
  '9B59B6', // 紫色
  '1ABC9C', // 青色
  'E67E22', // 深橙
  '3498DB', // 天蓝
  '2ECC71', // 翠绿
  'E91E63', // 粉红
]

async function fixBookCovers() {
  console.log('🔧 开始修复图书封面...\n')

  try {
    // 获取所有图书
    const books = await prisma.book.findMany()

    console.log(`📚 找到 ${books.length} 本图书\n`)

    let fixedCount = 0
    let skippedCount = 0

    for (let i = 0; i < books.length; i++) {
      const book = books[i]
      
      // 检查是否需要修复
      const needsFix = 
        !book.coverUrl || 
        book.coverUrl.includes('aliyuncs.com') || 
        book.coverUrl.includes('unsplash.com')

      if (needsFix) {
        const colorIndex = i % colors.length
        const color = colors[colorIndex]
        const bookName = encodeURIComponent(book.name.substring(0, 10))
        const newCoverUrl = `https://via.placeholder.com/205x315/${color}/FFFFFF?text=${bookName}`

        await prisma.book.update({
          where: { id: book.id },
          data: { coverUrl: newCoverUrl },
        })

        console.log(`✅ 修复: ${book.name}`)
        console.log(`   新封面: ${newCoverUrl}\n`)
        fixedCount++
      } else {
        console.log(`⏭️  跳过: ${book.name} (封面正常)`)
        skippedCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 修复完成！')
    console.log('='.repeat(50))
    console.log(`✅ 修复: ${fixedCount} 本`)
    console.log(`⏭️  跳过: ${skippedCount} 本`)
    console.log(`📊 总计: ${books.length} 本\n`)

    console.log('📝 下一步:')
    console.log('   1. 启动开发服务器: npm run dev')
    console.log('   2. 访问: http://localhost:3000/library-new')
    console.log('   3. 检查封面是否正常显示\n')

  } catch (error) {
    console.error('❌ 修复失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixBookCovers()

