/**
 * 数据迁移脚本：将旧的 book_resources 数据迁移到新的多对多关系
 * 
 * 由于 book_id 列已被删除，我们需要手动创建关联关系
 * 这个脚本需要管理员手动指定每个资源应该关联到哪些图书
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 检查现有资源...')
  
  // 获取所有资源
  const resources = await prisma.bookResource.findMany({
    include: {
      university: true,
    },
  })
  
  console.log(`📊 找到 ${resources.length} 个资源`)
  
  if (resources.length === 0) {
    console.log('✅ 没有需要迁移的资源')
    return
  }
  
  // 获取所有图书
  const books = await prisma.book.findMany()
  console.log(`📚 找到 ${books.length} 本图书`)
  
  console.log('\n⚠️  需要手动配置资源与图书的关联关系')
  console.log('请编辑此脚本，在下面的 resourceBookMapping 中配置：\n')
  
  // 打印资源信息
  resources.forEach((resource, index) => {
    console.log(`资源 ${index + 1}:`)
    console.log(`  ID: ${resource.id}`)
    console.log(`  名称: ${resource.name}`)
    console.log(`  大学: ${resource.university.name}`)
    console.log(`  文件类型: ${resource.fileType}`)
    console.log('')
  })
  
  console.log('可用的图书：')
  books.forEach((book, index) => {
    console.log(`图书 ${index + 1}:`)
    console.log(`  ID: ${book.id}`)
    console.log(`  名称: ${book.name}`)
    console.log(`  作者: ${book.author}`)
    console.log('')
  })
  
  // ⚠️ 手动配置：资源ID -> 图书ID数组
  // 将所有资源关联到"英语比赛-thalia liu"这本图书
  const resourceBookMapping: Record<string, string[]> = {
    '68a03a4f-e3aa-49f2-93ad-3d2a7d2284b0': ['a854b0f1-251d-4f20-841f-e095414360e0'],
    '94fcf7b4-9a5c-4641-b59f-33ddcf241b2c': ['a854b0f1-251d-4f20-841f-e095414360e0'],
    'a81f511b-9e16-4f64-9176-e66fe144f3f6': ['a854b0f1-251d-4f20-841f-e095414360e0'],
  }
  
  if (Object.keys(resourceBookMapping).length === 0) {
    console.log('⚠️  请先配置 resourceBookMapping，然后重新运行此脚本')
    return
  }
  
  console.log('\n🔄 开始迁移...')
  
  let successCount = 0
  let errorCount = 0
  
  for (const [resourceId, bookIds] of Object.entries(resourceBookMapping)) {
    try {
      // 为每个资源创建与图书的关联
      for (const bookId of bookIds) {
        await prisma.bookResourceRelation.create({
          data: {
            resourceId,
            bookId,
          },
        })
        console.log(`✅ 关联成功: 资源 ${resourceId} -> 图书 ${bookId}`)
        successCount++
      }
    } catch (error) {
      console.error(`❌ 关联失败: 资源 ${resourceId}`, error)
      errorCount++
    }
  }
  
  console.log(`\n📊 迁移完成！`)
  console.log(`  成功: ${successCount}`)
  console.log(`  失败: ${errorCount}`)
  
  // 验证迁移结果
  const relations = await prisma.bookResourceRelation.findMany({
    include: {
      book: true,
      resource: true,
    },
  })
  
  console.log(`\n✅ 当前共有 ${relations.length} 个资源-图书关联关系`)
}

main()
  .catch((e) => {
    console.error('❌ 迁移失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

