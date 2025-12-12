/**
 * 查看数据库中的图书数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function viewBooks() {
  console.log('📚 查看图书数据...\n')

  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
    })

    console.log(`找到 ${books.length} 本图书:\n`)

    books.forEach((book, index) => {
      console.log(`${index + 1}. ${book.name}`)
      console.log(`   ISBN: ${book.isbn}`)
      console.log(`   作者: ${book.author}`)
      console.log(`   出版社: ${book.publisher}`)
      console.log(`   封面: ${book.coverUrl || '无'}`)
      console.log(`   文件: ${book.fileUrl || '无'}`)
      console.log(`   ID: ${book.id}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

viewBooks()

