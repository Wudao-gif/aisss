/**
 * 清空所有空白模板的脚本
 * 运行方式: node clear-blank-templates.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearBlankTemplates() {
  try {
    console.log('🗑️  开始清空空白模板...')

    // 删除所有空白模板
    const result = await prisma.docTemplate.deleteMany({
      where: {
        category: '空白模板'
      }
    })

    console.log(`✅ 成功删除 ${result.count} 个空白模板`)
    console.log('📝 现在可以在管理后台重新创建空白模板了')
  } catch (error) {
    console.error('❌ 清空失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearBlankTemplates()

