/**
 * 检查特定图书的文件路径
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBookFile() {
  const bookId = 'e49157a3-b541-4a50-bcad-76d071b00186'
  
  console.log('🔍 查询图书文件信息...\n')

  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      console.log('❌ 未找到该图书')
      return
    }

    console.log('📚 图书信息:')
    console.log(`   名称: ${book.name}`)
    console.log(`   作者: ${book.author}`)
    console.log(`   ISBN: ${book.isbn}`)
    console.log(`   文件URL: ${book.fileUrl || '无'}`)
    console.log(`   文件大小: ${book.fileSize || '无'}`)
    console.log(`   允许阅读: ${book.allowReading ? '是' : '否'}`)
    console.log('')

    // 如果有文件URL，分析路径
    if (book.fileUrl) {
      console.log('📄 文件路径分析:')
      
      if (book.fileUrl.startsWith('http://') || book.fileUrl.startsWith('https://')) {
        console.log(`   类型: 完整 URL`)
        console.log(`   URL: ${book.fileUrl}`)
        
        try {
          const url = new URL(book.fileUrl)
          console.log(`   域名: ${url.hostname}`)
          console.log(`   路径: ${url.pathname}`)
        } catch (e) {
          console.log(`   ⚠️ URL 格式错误`)
        }
      } else {
        console.log(`   类型: 相对路径`)
        console.log(`   路径: ${book.fileUrl}`)
      }
    } else {
      console.log('⚠️ 该图书没有文件URL')
    }

  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBookFile()

