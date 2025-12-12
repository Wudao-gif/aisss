import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 开始更新图书资源的 allowReading 字段...\n')

  try {
    // 获取所有资源
    const resources = await prisma.bookResource.findMany({
      include: {
        book: true,
        university: true,
      },
    })

    console.log(`📊 找到 ${resources.length} 个资源\n`)

    let updatedCount = 0

    for (const resource of resources) {
      // 默认设置为可阅读（你可以根据需要调整逻辑）
      const allowReading = true

      await prisma.bookResource.update({
        where: { id: resource.id },
        data: { allowReading },
      })

      console.log(`✅ 更新资源: ${resource.name}`)
      console.log(`   图书: ${resource.book.name}`)
      console.log(`   大学: ${resource.university.name}`)
      console.log(`   允许阅读: ${allowReading ? '是' : '否'}\n`)

      updatedCount++
    }

    console.log(`\n🎉 完成！共更新 ${updatedCount} 个资源`)
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

