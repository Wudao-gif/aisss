const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // 清除指定用户的邮箱
  const userId = 'de88ed4b-d1c5-4756-80eb-aee8bed666ec'
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: { email: null }
  })
  
  console.log('已清除用户邮箱:')
  console.log(`  ID: ${user.id}`)
  console.log(`  姓名: ${user.realName}`)
  console.log(`  邮箱: ${user.email}`)
  console.log(`  手机: ${user.phone}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

