import { PrismaClient } from '@prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()

// 创建一个简单的PDF文件内容（实际上是文本，但用于演示）
function createSamplePDFContent(bookName: string, author: string): string {
  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 100
>>
stream
BT
/F1 24 Tf
100 700 Td
(${bookName}) Tj
0 -30 Td
(Author: ${author}) Tj
0 -30 Td
(This is a sample PDF file for demonstration.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
466
%%EOF`
}

async function main() {
  console.log('🔄 开始为图书创建示例文件...\n')

  try {
    // 确保目录存在
    const bookFilesDir = join(process.cwd(), 'public', 'book-files')
    const bookResourcesDir = join(process.cwd(), 'public', 'book-resources')

    if (!existsSync(bookFilesDir)) {
      await mkdir(bookFilesDir, { recursive: true })
      console.log('✅ 创建目录: public/book-files')
    }

    if (!existsSync(bookResourcesDir)) {
      await mkdir(bookResourcesDir, { recursive: true })
      console.log('✅ 创建目录: public/book-resources')
    }

    // 获取所有允许阅读且有文件URL的图书
    const books = await prisma.book.findMany({
      where: {
        allowReading: true,
        fileUrl: {
          not: null,
        },
      },
    })

    console.log(`\n📊 找到 ${books.length} 本需要创建文件的图书\n`)

    let createdCount = 0

    for (const book of books) {
      if (!book.fileUrl) continue

      // 检查文件URL是否是本地路径
      if (book.fileUrl.startsWith('http')) {
        console.log(`⏭️  跳过: ${book.name} (已有远程URL)`)
        continue
      }

      // 提取文件名
      const fileName = book.fileUrl.split('/').pop()
      if (!fileName) continue

      const filePath = join(bookFilesDir, fileName)

      // 如果文件已存在，跳过
      if (existsSync(filePath)) {
        console.log(`⏭️  跳过: ${book.name} (文件已存在)`)
        continue
      }

      // 创建示例PDF内容
      const pdfContent = createSamplePDFContent(book.name, book.author)
      await writeFile(filePath, pdfContent, 'utf-8')

      console.log(`✅ 创建文件: ${fileName}`)
      console.log(`   图书: ${book.name}`)
      console.log(`   作者: ${book.author}`)
      console.log(`   路径: public/book-files/${fileName}\n`)

      createdCount++
    }

    // 为资源创建示例文件
    const resources = await prisma.bookResource.findMany({
      where: {
        allowReading: true,
      },
      include: {
        book: true,
      },
    })

    console.log(`\n📊 找到 ${resources.length} 个需要创建文件的资源\n`)

    for (const resource of resources) {
      // 检查文件URL是否是本地路径
      if (resource.fileUrl.startsWith('http')) {
        console.log(`⏭️  跳过资源: ${resource.name} (已有远程URL)`)
        continue
      }

      // 提取文件名
      const fileName = resource.fileUrl.split('/').pop()
      if (!fileName) continue

      const filePath = join(bookResourcesDir, fileName)

      // 如果文件已存在，跳过
      if (existsSync(filePath)) {
        console.log(`⏭️  跳过资源: ${resource.name} (文件已存在)`)
        continue
      }

      // 创建示例文件内容
      const content = createSamplePDFContent(
        `${resource.book.name} - ${resource.name}`,
        resource.book.author
      )
      await writeFile(filePath, content, 'utf-8')

      console.log(`✅ 创建资源文件: ${fileName}`)
      console.log(`   资源: ${resource.name}`)
      console.log(`   图书: ${resource.book.name}`)
      console.log(`   路径: public/book-resources/${fileName}\n`)

      createdCount++
    }

    console.log(`\n🎉 完成！共创建 ${createdCount} 个示例文件`)
    console.log(`\n📁 文件位置:`)
    console.log(`   - public/book-files/`)
    console.log(`   - public/book-resources/`)
    console.log(`\n💡 提示: 这些是示例PDF文件，用于演示。实际使用时请上传真实的PDF文件。`)
  } catch (error) {
    console.error('❌ 创建文件失败:', error)
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

