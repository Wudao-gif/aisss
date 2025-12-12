import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 20 所大学数据（与前端 UniversitySelector 保持一致）
const universities = [
  { name: '北京大学', logo: '🎓' },
  { name: '清华大学', logo: '🏛️' },
  { name: '复旦大学', logo: '📚' },
  { name: '上海交通大学', logo: '🎯' },
  { name: '浙江大学', logo: '🌟' },
  { name: '南京大学', logo: '📖' },
  { name: '中国科学技术大学', logo: '🔬' },
  { name: '武汉大学', logo: '🌸' },
  { name: '华中科技大学', logo: '⚙️' },
  { name: '四川大学', logo: '🏔️' },
  { name: '中山大学', logo: '🌴' },
  { name: '西安交通大学', logo: '🏛️' },
  { name: '哈尔滨工业大学', logo: '❄️' },
  { name: '同济大学', logo: '🌉' },
  { name: '北京航空航天大学', logo: '✈️' },
  { name: '北京师范大学', logo: '👨‍🏫' },
  { name: '南开大学', logo: '📐' },
  { name: '天津大学', logo: '🏗️' },
  { name: '东南大学', logo: '🏛️' },
  { name: '厦门大学', logo: '🌊' },
].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

async function main() {
  console.log('🌱 开始初始化数据...')

  // 清空现有数据（可选）
  console.log('🗑️  清空现有大学数据...')
  await prisma.university.deleteMany()

  // 添加大学数据
  console.log('🏫 添加大学数据...')
  for (const university of universities) {
    await prisma.university.create({
      data: {
        name: university.name,
        logoUrl: null, // 暂时使用 null，后期可以上传真实 LOGO
      },
    })
    console.log(`  ✅ ${university.name}`)
  }

  console.log(`\n✅ 成功添加 ${universities.length} 所大学！`)

  // 可选：添加示例图书数据
  console.log('\n📚 添加示例图书数据...')
  
  const scu = await prisma.university.findUnique({
    where: { name: '四川大学' },
  })

  const thu = await prisma.university.findUnique({
    where: { name: '清华大学' },
  })

  if (scu) {
    await prisma.book.create({
      data: {
        name: '高等数学（上册）',
        author: '同济大学数学系',
        isbn: '9787040396621',
        publisher: '高等教育出版社',
        universityId: scu.id,
        coverUrl: null,
      },
    })
    console.log('  ✅ 高等数学（上册）')

    await prisma.book.create({
      data: {
        name: '线性代数',
        author: '同济大学数学系',
        isbn: '9787040396638',
        publisher: '高等教育出版社',
        universityId: scu.id,
        coverUrl: null,
      },
    })
    console.log('  ✅ 线性代数')
  }

  if (thu) {
    await prisma.book.create({
      data: {
        name: '计算机组成原理',
        author: '唐朔飞',
        isbn: '9787040396645',
        publisher: '高等教育出版社',
        universityId: thu.id,
        coverUrl: null,
      },
    })
    console.log('  ✅ 计算机组成原理')
  }

  console.log('\n🎉 数据初始化完成！')
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

