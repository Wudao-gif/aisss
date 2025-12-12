/**
 * 图书数据初始化脚本
 * 添加测试图书数据到数据库
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 测试图书数据
// 使用 placeholder.com 作为占位图（更稳定）
const sampleBooks = [
  {
    name: '高等数学（第七版）上册',
    isbn: '978-7-04-039766-6',
    author: '同济大学数学系',
    publisher: '高等教育出版社',
    coverUrl: 'https://via.placeholder.com/205x315/4A90E2/FFFFFF?text=高等数学',
  },
  {
    name: '线性代数（第六版）',
    isbn: '978-7-04-046708-6',
    author: '同济大学数学系',
    publisher: '高等教育出版社',
    coverUrl: 'https://via.placeholder.com/205x315/50C878/FFFFFF?text=线性代数',
  },
  {
    name: '概率论与数理统计（第五版）',
    isbn: '978-7-04-051567-1',
    author: '盛骤, 谢式千, 潘承毅',
    publisher: '高等教育出版社',
    coverUrl: 'https://via.placeholder.com/205x315/FF6B6B/FFFFFF?text=概率统计',
  },
  {
    name: '大学物理（第三版）',
    isbn: '978-7-04-028126-9',
    author: '张三慧',
    publisher: '清华大学出版社',
    coverUrl: 'https://via.placeholder.com/205x315/FFA500/FFFFFF?text=大学物理',
  },
  {
    name: '大学英语综合教程（第三版）',
    isbn: '978-7-5446-4321-8',
    author: '何兆熊',
    publisher: '上海外语教育出版社',
    coverUrl: 'https://via.placeholder.com/205x315/9B59B6/FFFFFF?text=大学英语',
  },
  {
    name: 'C程序设计（第五版）',
    isbn: '978-7-302-48179-8',
    author: '谭浩强',
    publisher: '清华大学出版社',
    coverUrl: 'https://via.placeholder.com/205x315/3498DB/FFFFFF?text=C语言',
  },
  {
    name: '数据结构（C语言版）',
    isbn: '978-7-04-039777-1',
    author: '严蔚敏, 吴伟民',
    publisher: '清华大学出版社',
    coverUrl: 'https://via.placeholder.com/205x315/E74C3C/FFFFFF?text=数据结构',
  },
  {
    name: '计算机网络（第八版）',
    isbn: '978-7-121-38839-6',
    author: '谢希仁',
    publisher: '电子工业出版社',
    coverUrl: 'https://via.placeholder.com/205x315/1ABC9C/FFFFFF?text=计算机网络',
  },
  {
    name: '操作系统概念（第九版）',
    isbn: '978-7-111-54432-6',
    author: 'Abraham Silberschatz',
    publisher: '机械工业出版社',
    coverUrl: 'https://via.placeholder.com/205x315/F39C12/FFFFFF?text=操作系统',
  },
  {
    name: '微观经济学（第九版）',
    isbn: '978-7-300-25463-2',
    author: '高鸿业',
    publisher: '中国人民大学出版社',
    coverUrl: 'https://via.placeholder.com/205x315/2ECC71/FFFFFF?text=微观经济学',
  },
]

async function main() {
  console.log('📚 开始添加图书数据...\n')

  let addedCount = 0
  let skippedCount = 0

  for (const bookData of sampleBooks) {
    try {
      // 检查图书是否已存在
      const existing = await prisma.book.findUnique({
        where: { isbn: bookData.isbn },
      })

      if (existing) {
        console.log(`⏭️  跳过: ${bookData.name} (ISBN已存在)`)
        skippedCount++
        continue
      }

      // 创建图书
      await prisma.book.create({
        data: bookData,
      })

      console.log(`✅ 添加: ${bookData.name}`)
      addedCount++
    } catch (error) {
      console.error(`❌ 添加失败: ${bookData.name}`, error)
    }
  }

  console.log(`\n🎉 完成！`)
  console.log(`   新增: ${addedCount} 本`)
  console.log(`   跳过: ${skippedCount} 本`)
  console.log(`   总计: ${sampleBooks.length} 本`)
}

main()
  .catch((e) => {
    console.error('❌ 脚本执行失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

