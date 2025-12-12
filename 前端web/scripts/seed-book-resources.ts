/**
 * 添加图书资源测试数据
 * 为每本图书添加一些测试资源
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedBookResources() {
  console.log('🌱 开始添加图书资源测试数据...\n')

  try {
    // 1. 获取所有图书
    const books = await prisma.book.findMany({
      take: 5, // 只为前5本书添加资源
    })

    if (books.length === 0) {
      console.log('❌ 数据库中没有图书数据')
      console.log('💡 请先运行: npx tsx scripts/seed-books.ts\n')
      return
    }

    console.log(`📚 找到 ${books.length} 本图书\n`)

    // 2. 获取所有大学
    const universities = await prisma.university.findMany()

    if (universities.length === 0) {
      console.log('❌ 数据库中没有大学数据')
      console.log('💡 请先添加大学数据\n')
      return
    }

    console.log(`🏫 找到 ${universities.length} 所大学\n`)

    // 3. 为每本书添加资源
    let totalAdded = 0

    for (const book of books) {
      console.log(`📖 为《${book.name}》添加资源...`)

      // 为每所大学添加2-3个资源
      for (const university of universities) {
        const resourceCount = Math.floor(Math.random() * 2) + 2 // 2-3个资源

        for (let i = 0; i < resourceCount; i++) {
          const resourceTypes = [
            { name: '课后习题答案', type: 'pdf', size: 2411724 },
            { name: '教学课件', type: 'pptx', size: 16560742 },
            { name: '历年考试真题', type: 'pdf', size: 1258291 },
            { name: '知识点总结笔记', type: 'docx', size: 876544 },
            { name: '章节练习题', type: 'pdf', size: 3670016 },
            { name: '期末复习资料', type: 'pdf', size: 4299161 },
            { name: '实验指导书', type: 'pdf', size: 1500000 },
            { name: '课程大纲', type: 'pdf', size: 500000 },
          ]

          const randomResource = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]

          try {
            await prisma.bookResource.create({
              data: {
                bookId: book.id,
                universityId: university.id,
                name: `${randomResource.name}.${randomResource.type}`,
                description: `${university.name}提供的${book.name}相关资料`,
                fileUrl: `https://example.com/resources/${book.id}/${randomResource.name}.${randomResource.type}`,
                fileType: randomResource.type,
                fileSize: randomResource.size,
              },
            })

            totalAdded++
          } catch (error) {
            // 忽略重复错误
          }
        }
      }

      console.log(`   ✅ 完成\n`)
    }

    console.log(`\n🎉 成功添加 ${totalAdded} 个图书资源！\n`)
    console.log('📝 下一步:')
    console.log('   1. 启动开发服务器: npm run dev')
    console.log('   2. 访问: http://localhost:3000/library-new')
    console.log('   3. 登录后点击图书查看资源列表\n')

  } catch (error) {
    console.error('❌ 添加资源失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedBookResources()

