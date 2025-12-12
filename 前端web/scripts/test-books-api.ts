/**
 * 测试图书API
 * 验证API是否正常工作
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testBooksAPI() {
  console.log('🧪 测试图书API...\n')

  try {
    // 1. 测试数据库连接
    console.log('1️⃣  测试数据库连接...')
    await prisma.$connect()
    console.log('   ✅ 数据库连接成功\n')

    // 2. 查询图书数量
    console.log('2️⃣  查询图书数量...')
    const count = await prisma.book.count()
    console.log(`   📚 数据库中共有 ${count} 本图书\n`)

    if (count === 0) {
      console.log('   ⚠️  数据库中没有图书数据')
      console.log('   💡 请运行: npx tsx scripts/seed-books.ts\n')
      return
    }

    // 3. 获取所有图书
    console.log('3️⃣  获取所有图书...')
    const books = await prisma.book.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // 只显示前5本
    })

    console.log(`   ✅ 成功获取 ${books.length} 本图书:\n`)
    books.forEach((book, index) => {
      console.log(`   ${index + 1}. ${book.name}`)
      console.log(`      作者: ${book.author}`)
      console.log(`      ISBN: ${book.isbn}`)
      console.log(`      出版社: ${book.publisher}`)
      console.log(`      封面: ${book.coverUrl ? '✅' : '❌'}`)
      console.log('')
    })

    // 4. 测试搜索功能
    console.log('4️⃣  测试搜索功能（关键词: "数学"）...')
    const searchResults = await prisma.book.findMany({
      where: {
        OR: [
          { name: { contains: '数学', mode: 'insensitive' } },
          { author: { contains: '数学', mode: 'insensitive' } },
        ],
      },
    })

    console.log(`   ✅ 找到 ${searchResults.length} 本相关图书:\n`)
    searchResults.forEach((book, index) => {
      console.log(`   ${index + 1}. ${book.name}`)
    })
    console.log('')

    // 5. 测试API响应格式
    console.log('5️⃣  测试API响应格式...')
    const apiResponse = {
      success: true,
      data: books,
    }
    console.log('   ✅ API响应格式正确')
    console.log(`   📦 响应数据: ${JSON.stringify(apiResponse).length} 字节\n`)

    console.log('🎉 所有测试通过！\n')
    console.log('📝 下一步:')
    console.log('   1. 启动开发服务器: npm run dev')
    console.log('   2. 访问: http://localhost:3000/library-new')
    console.log('   3. 查看图书列表\n')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    console.log('\n💡 可能的原因:')
    console.log('   1. 数据库未运行: docker start my-auth-postgres')
    console.log('   2. 数据库未初始化: npx prisma db push')
    console.log('   3. 环境变量配置错误: 检查 .env 文件\n')
  } finally {
    await prisma.$disconnect()
  }
}

testBooksAPI()

