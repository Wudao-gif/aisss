/**
 * 更新所有大学，确保有 enablePdfBlank 字段
 * 运行方式: node update-universities-pdf.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateUniversities() {
  try {
    console.log('🔄 开始更新所有大学的 PDF 空白模板设置...')

    // 更新所有大学，设置 enablePdfBlank 为 true
    const result = await prisma.university.updateMany({
      data: {
        enablePdfBlank: true
      }
    })

    console.log(`✅ 成功更新 ${result.count} 个大学`)
    console.log('📝 所有大学现在都启用了 PDF 空白模板')
  } catch (error) {
    console.error('❌ 更新失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUniversities()

