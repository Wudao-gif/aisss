/**
 * 测试检查邮箱 API
 */

const BASE_URL = 'http://localhost:3001'

// 测试检查邮箱
async function testCheckEmail(email, description) {
  console.log(`\n🧪 测试: ${description}`)
  console.log(`📧 邮箱: ${email}`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)
    console.log('📊 响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 检查成功！')
      console.log(`   - 邮箱存在: ${data.data.exists ? '是' : '否'}`)
      console.log(`   - 是否封禁: ${data.data.isBanned ? '是' : '否'}`)
    } else {
      console.log('❌ 检查失败:', data.message)
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始测试检查邮箱 API...')
  console.log('🌐 服务器地址:', BASE_URL)
  
  // 测试已存在的邮箱
  await testCheckEmail('test@example.com', '已注册的邮箱')
  
  // 测试不存在的邮箱
  await testCheckEmail('newuser@example.com', '未注册的邮箱')
  
  // 测试无效邮箱
  await testCheckEmail('', '空邮箱')
  
  console.log('\n✅ 所有测试完成！')
}

// 运行测试
runTests().catch(console.error)

