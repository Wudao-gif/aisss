const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('12345678', 10)
  
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: hash,
      role: 'admin',
      realName: '管理员'
    }
  })
  
  console.log('✅ 管理员账户创建成功:', user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

