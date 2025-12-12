/**
 * 添加有真实封面的图书数据
 * 使用公开可访问的图片URL
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 使用不同的占位图服务，确保可访问
const realBooks = [
  {
    name: '深入理解计算机系统（第3版）',
    isbn: '978-7-111-54493-7',
    author: 'Randal E. Bryant, David R. O\'Hallaron',
    publisher: '机械工业出版社',
    coverUrl: 'https://dummyimage.com/205x315/4A90E2/ffffff&text=CSAPP',
  },
  {
    name: 'JavaScript高级程序设计（第4版）',
    isbn: '978-7-115-54506-4',
    author: 'Matt Frisbie',
    publisher: '人民邮电出版社',
    coverUrl: 'https://dummyimage.com/205x315/F39C12/ffffff&text=JavaScript',
  },
  {
    name: 'Python编程：从入门到实践（第2版）',
    isbn: '978-7-115-54608-5',
    author: 'Eric Matthes',
    publisher: '人民邮电出版社',
    coverUrl: 'https://dummyimage.com/205x315/2ECC71/ffffff&text=Python',
  },
  {
    name: '算法导论（第3版）',
    isbn: '978-7-111-40701-0',
    author: 'Thomas H. Cormen 等',
    publisher: '机械工业出版社',
    coverUrl: 'https://dummyimage.com/205x315/E74C3C/ffffff&text=Algorithms',
  },
  {
    name: '数据结构与算法分析（C++版）',
    isbn: '978-7-121-15572-8',
    author: 'Mark Allen Weiss',
    publisher: '电子工业出版社',
    coverUrl: 'https://dummyimage.com/205x315/9B59B6/ffffff&text=Data+Structures',
  },
  {
    name: '计算机网络（第7版）',
    isbn: '978-7-121-30271-1',
    author: '谢希仁',
    publisher: '电子工业出版社',
    coverUrl: 'https://dummyimage.com/205x315/1ABC9C/ffffff&text=Networks',
  },
  {
    name: '操作系统概念（第9版）',
    isbn: '978-7-111-54496-8',
    author: 'Abraham Silberschatz 等',
    publisher: '高等教育出版社',
    coverUrl: 'https://dummyimage.com/205x315/E67E22/ffffff&text=OS',
  },
  {
    name: '数据库系统概念（第6版）',
    isbn: '978-7-111-37235-1',
    author: 'Abraham Silberschatz 等',
    publisher: '机械工业出版社',
    coverUrl: 'https://dummyimage.com/205x315/3498DB/ffffff&text=Database',
  },
  {
    name: '编译原理（第2版）',
    isbn: '978-7-111-25210-0',
    author: 'Alfred V. Aho 等',
    publisher: '机械工业出版社',
    coverUrl: 'https://dummyimage.com/205x315/E91E63/ffffff&text=Compilers',
  },
  {
    name: '设计模式：可复用面向对象软件的基础',
    isbn: '978-7-111-21116-6',
    author: 'Erich Gamma 等',
    publisher: '机械工业出版社',
    coverUrl: 'https://dummyimage.com/205x315/34495E/ffffff&text=Design+Patterns',
  },
]

async function addRealBooks() {
  console.log('📚 开始添加真实图书数据...\n')

  try {
    let addedCount = 0
    let skippedCount = 0

    for (const bookData of realBooks) {
      // 检查是否已存在
      const existing = await prisma.book.findFirst({
        where: { isbn: bookData.isbn },
      })

      if (existing) {
        console.log(`⏭️  跳过: ${bookData.name} (已存在)`)
        skippedCount++
        continue
      }

      // 添加图书
      await prisma.book.create({
        data: {
          ...bookData,
          allowReading: true,
        },
      })

      console.log(`✅ 添加: ${bookData.name}`)
      console.log(`   封面: ${bookData.coverUrl}`)
      addedCount++
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 完成！')
    console.log('='.repeat(50))
    console.log(`✅ 新增: ${addedCount} 本`)
    console.log(`⏭️  跳过: ${skippedCount} 本`)
    console.log(`📊 总计: ${realBooks.length} 本\n`)

    // 显示总数
    const totalBooks = await prisma.book.count()
    console.log(`📚 数据库中现有图书总数: ${totalBooks} 本\n`)

    console.log('📝 下一步:')
    console.log('   1. 访问测试页面: http://localhost:3000/test-covers.html')
    console.log('   2. 检查封面是否正常显示')
    console.log('   3. 如果测试页面正常，访问: http://localhost:3000/library-new\n')

  } catch (error) {
    console.error('❌ 添加失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addRealBooks()

