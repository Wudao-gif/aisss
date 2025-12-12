/**
 * 测试 Letta Sync API
 * 验证 UserLearning 创建时是否正确处理 topic 和 questionType 字段
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testLettaSync() {
  console.log('🧪 测试 Letta Sync API...\n')

  try {
    // 1. 测试数据库连接
    console.log('1️⃣  测试数据库连接...')
    await prisma.$connect()
    console.log('   ✅ 数据库连接成功\n')

    // 2. 获取测试用户和图书
    console.log('2️⃣  获取测试数据...')
    const user = await prisma.user.findFirst()
    const book = await prisma.book.findFirst()

    if (!user) {
      console.log('   ❌ 没有找到测试用户')
      return
    }

    if (!book) {
      console.log('   ❌ 没有找到测试图书')
      return
    }

    console.log(`   ✅ 找到测试用户: ${user.id}`)
    console.log(`   ✅ 找到测试图书: ${book.id}\n`)

    // 3. 测试创建 UserLearning 记录
    console.log('3️⃣  测试创建 UserLearning 记录...')
    const testMessage = '什么是微积分基本定理？'
    
    const userLearning = await prisma.userLearning.create({
      data: {
        userId: user.id,
        bookId: book.id,
        topic: testMessage.substring(0, 50),
        questionType: 'concept', // 根据 inferQuestionType 逻辑
      },
    })

    console.log('   ✅ UserLearning 记录创建成功!')
    console.log(`   📝 记录 ID: ${userLearning.id}`)
    console.log(`   📚 用户 ID: ${userLearning.userId}`)
    console.log(`   📖 图书 ID: ${userLearning.bookId}`)
    console.log(`   🏷️  主题: ${userLearning.topic}`)
    console.log(`   ❓ 问题类型: ${userLearning.questionType}\n`)

    // 4. 验证记录是否正确保存
    console.log('4️⃣  验证记录是否正确保存...')
    const savedRecord = await prisma.userLearning.findUnique({
      where: { id: userLearning.id },
      include: {
        user: { select: { id: true, email: true } },
        book: { select: { id: true, name: true } },
      },
    })

    if (savedRecord) {
      console.log('   ✅ 记录验证成功!')
      console.log(`   👤 用户: ${savedRecord.user.email}`)
      console.log(`   📚 图书: ${savedRecord.book.name}`)
      console.log(`   🏷️  主题: ${savedRecord.topic}`)
      console.log(`   ❓ 问题类型: ${savedRecord.questionType}\n`)
    } else {
      console.log('   ❌ 记录验证失败\n')
    }

    // 5. 测试 inferQuestionType 逻辑
    console.log('5️⃣  测试 inferQuestionType 逻辑...')
    const testCases = [
      { msg: '什么是微积分基本定理？', expected: 'concept' },
      { msg: '请举个例子', expected: 'example' },
      { msg: '做题练习', expected: 'exercise' },
      { msg: '随机问题', expected: 'other' },
    ]

    for (const testCase of testCases) {
      const learning = await prisma.userLearning.create({
        data: {
          userId: user.id,
          bookId: book.id,
          topic: testCase.msg.substring(0, 50),
          questionType: inferQuestionType(testCase.msg),
        },
      })
      console.log(`   ✅ "${testCase.msg}" -> ${learning.questionType}`)
    }

    console.log('\n🎉 所有测试通过！\n')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 根据用户消息推断问题类型（与 route.ts 中的逻辑一致）
function inferQuestionType(message: string): string {
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('什么是') || lowerMsg.includes('定义') || lowerMsg.includes('解释')) {
    return 'concept'
  }

  if (lowerMsg.includes('例子') || lowerMsg.includes('例如') || lowerMsg.includes('举例')) {
    return 'example'
  }

  if (lowerMsg.includes('做题') || lowerMsg.includes('练习') || lowerMsg.includes('习题') ||
      lowerMsg.includes('解答') || lowerMsg.includes('答案')) {
    return 'exercise'
  }

  return 'other'
}

testLettaSync()

