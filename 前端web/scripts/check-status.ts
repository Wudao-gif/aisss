/**
 * 检查当前数据库状态
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStatus() {
  console.log('🔍 检查数据库状态...\n')

  try {
    // 1. 检查图书数量
    const bookCount = await prisma.book.count()
    console.log(`📚 图书数量: ${bookCount}`)

    if (bookCount > 0) {
      const sampleBook = await prisma.book.findFirst()
      console.log(`   示例: ${sampleBook?.name}`)
      console.log(`   封面: ${sampleBook?.coverUrl ? '✅' : '❌'}`)
    }

    // 2. 检查大学数量
    const universityCount = await prisma.university.count()
    console.log(`\n🏫 大学数量: ${universityCount}`)

    if (universityCount > 0) {
      const universities = await prisma.university.findMany({ take: 3 })
      universities.forEach((u) => {
        console.log(`   - ${u.name}`)
      })
    } else {
      console.log('   ⚠️  没有大学数据，资源功能将无法使用')
      console.log('   💡 建议: 添加一些大学数据')
    }

    // 3. 检查资源数量
    const resourceCount = await prisma.bookResource.count()
    console.log(`\n📄 图书资源数量: ${resourceCount}`)

    if (resourceCount > 0) {
      const sampleResource = await prisma.bookResource.findFirst({
        include: {
          book: true,
          university: true,
        },
      })
      console.log(`   示例: ${sampleResource?.name}`)
      console.log(`   图书: ${sampleResource?.book.name}`)
      console.log(`   大学: ${sampleResource?.university.name}`)
    } else {
      console.log('   ⚠️  没有资源数据')
      console.log('   💡 运行: npx tsx scripts/seed-book-resources.ts')
    }

    // 4. 检查用户数量
    const userCount = await prisma.user.count()
    console.log(`\n👤 用户数量: ${userCount}`)

    if (userCount > 0) {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } })
      console.log(`   管理员: ${adminCount}`)
      console.log(`   普通用户: ${userCount - adminCount}`)
    }

    // 5. 检查书架数量
    const bookshelfCount = await prisma.bookshelfItem.count()
    console.log(`\n📖 书架项目数量: ${bookshelfCount}`)

    console.log('\n' + '='.repeat(50))
    console.log('📊 状态总结:')
    console.log('='.repeat(50))

    const checks = [
      { name: '图书数据', status: bookCount > 0, count: bookCount },
      { name: '大学数据', status: universityCount > 0, count: universityCount },
      { name: '资源数据', status: resourceCount > 0, count: resourceCount },
      { name: '用户数据', status: userCount > 0, count: userCount },
    ]

    checks.forEach((check) => {
      const icon = check.status ? '✅' : '❌'
      console.log(`${icon} ${check.name}: ${check.count}`)
    })

    console.log('\n📝 下一步建议:')

    if (universityCount === 0) {
      console.log('   1. 添加大学数据（必需）')
    }

    if (resourceCount === 0 && universityCount > 0) {
      console.log('   2. 运行: npx tsx scripts/seed-book-resources.ts')
    }

    if (bookCount > 0 && universityCount > 0) {
      console.log('   3. 启动开发服务器: npm run dev')
      console.log('   4. 访问: http://localhost:3000/library-new')
    }

    console.log('')

  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStatus()

