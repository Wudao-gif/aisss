const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // 查找所有用户的 email 和 phone 字段
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      realName: true,
    }
  })
  
  console.log('所有用户的邮箱和手机号信息:')
  users.forEach(user => {
    console.log(`ID: ${user.id}`)
    console.log(`  姓名: ${user.realName}`)
    console.log(`  邮箱: ${user.email === null ? 'null' : user.email === '' ? '空字符串' : user.email}`)
    console.log(`  手机: ${user.phone === null ? 'null' : user.phone === '' ? '空字符串' : user.phone}`)
    console.log('---')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

