/**
 * 测试封禁用户
 */

const BASE_URL = 'http://localhost:3001'

async function testBannedUser() {
  console.log('🧪 测试封禁用户检查...')
  console.log('📧 邮箱: banned@example.com')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'banned@example.com' }),
    })

    const data = await response.json()
    console.log('📊 响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 检查成功！')
      console.log(`   - 邮箱存在: ${data.data.exists ? '是' : '否'}`)
      console.log(`   - 是否封禁: ${data.data.isBanned ? '是 ⚠️' : '否'}`)
      
      if (data.data.isBanned) {
        console.log('   ✅ 封禁检测正常工作！')
      }
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

testBannedUser().catch(console.error)

