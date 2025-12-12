/**
 * 设置用户为管理员的脚本
 * 使用方法: node set-admin.js <email>
 */

const email = process.argv[2]

if (!email) {
  console.log('❌ 请提供用户邮箱')
  console.log('使用方法: node set-admin.js <email>')
  process.exit(1)
}

async function setAdmin() {
  try {
    const response = await fetch('http://localhost:3001/api/dev/set-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()
    
    if (data.success) {
      console.log('✅ 成功设置管理员:', data.data)
    } else {
      console.log('❌ 设置失败:', data.message)
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

setAdmin()

