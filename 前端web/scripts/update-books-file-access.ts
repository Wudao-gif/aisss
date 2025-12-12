import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 开始更新图书的文件访问权限...\n')

  try {
    // 获取所有图书
    const books = await prisma.book.findMany()

    console.log(`📊 找到 ${books.length} 本图书\n`)

    let updatedCount = 0

    for (const book of books) {
      // 为前几本书添加示例文件URL和访问权限
      let fileUrl = book.fileUrl
      let allowReading = book.allowReading

      // 如果没有文件URL，为部分图书添加示例URL
      if (!fileUrl && updatedCount < 5) {
        // 使用示例PDF文件（你可以替换为真实的文件URL）
        fileUrl = `https://example.com/books/${book.isbn}.pdf`
        allowReading = updatedCount % 2 === 0 // 偶数索引的允许阅读，奇数的不允许
      }

      // 更新图书
      await prisma.book.update({
        where: { id: book.id },
        data: {
          fileUrl,
          allowReading,
        },
      })

      console.log(`${allowReading ? '✅' : '⚠️'} 更新图书: ${book.name}`)
      console.log(`   ISBN: ${book.isbn}`)
      console.log(`   文件URL: ${fileUrl || '无'}`)
      console.log(`   允许阅读: ${allowReading ? '是' : '否'}\n`)

      updatedCount++
    }

    console.log(`\n🎉 完成！共更新 ${updatedCount} 本图书`)

    // 显示统计
    const allowedCount = await prisma.book.count({
      where: { allowReading: true },
    })
    const withFileCount = await prisma.book.count({
      where: { fileUrl: { not: null } },
    })

    console.log(`\n📊 统计:`)
    console.log(`   允许在线阅读: ${allowedCount} 本`)
    console.log(`   有文件URL: ${withFileCount} 本`)
  } catch (error) {
    console.error('❌ 更新失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

