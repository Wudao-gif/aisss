/**
 * API 测试脚本
 * 测试注册和登录功能
 */

const BASE_URL = 'http://localhost:3001'

// 测试数据
const testUser = {
  email: 'test@example.com',
  password: '12345678',
  realName: '测试用户',
  university: '四川大学',
  verificationCode: '123456',
}

// 测试注册
async function testRegister() {
  console.log('\n🧪 测试用户注册...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)
    console.log('📊 响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 注册成功！')
      console.log('👤 用户信息:', data.data.user)
      console.log('🔑 Token:', data.data.token.substring(0, 20) + '...')
      return data.data.token
    } else {
      console.log('❌ 注册失败:', data.message)
      return null
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return null
  }
}

// 测试登录（密码）
async function testLogin() {
  console.log('\n🧪 测试密码登录...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        loginMethod: 'password',
      }),
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)
    console.log('📊 响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 登录成功！')
      console.log('👤 用户信息:', data.data.user)
      console.log('🔑 Token:', data.data.token.substring(0, 20) + '...')
      return data.data.token
    } else {
      console.log('❌ 登录失败:', data.message)
      return null
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return null
  }
}

// 测试获取用户信息
async function testGetMe(token) {
  console.log('\n🧪 测试获取用户信息...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)
    console.log('📊 响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 获取用户信息成功！')
      console.log('👤 用户信息:', data.data)
    } else {
      console.log('❌ 获取失败:', data.message)
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

// 测试获取大学列表
async function testGetUniversities() {
  console.log('\n🧪 测试获取大学列表...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/universities`, {
      method: 'GET',
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 获取大学列表成功！')
      console.log('🏫 大学数量:', data.data.length)
      console.log('🏫 前 5 所大学:', data.data.slice(0, 5).map(u => u.name))
    } else {
      console.log('❌ 获取失败:', data.message)
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

// 测试获取图书列表
async function testGetBooks() {
  console.log('\n🧪 测试获取图书列表...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/books`, {
      method: 'GET',
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 获取图书列表成功！')
      console.log('📚 图书数量:', data.data.length)
      console.log('📚 图书列表:', data.data.map(b => `${b.name} (${b.university.name})`))
    } else {
      console.log('❌ 获取失败:', data.message)
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

// 运行所有测试
async function runTests() {
  console.log('🚀 开始测试 API...')
  console.log('🌐 服务器地址:', BASE_URL)
  
  // 测试大学列表
  await testGetUniversities()
  
  // 测试图书列表
  await testGetBooks()
  
  // 测试注册
  const registerToken = await testRegister()
  
  if (registerToken) {
    // 测试获取用户信息
    await testGetMe(registerToken)
  }
  
  // 测试登录
  const loginToken = await testLogin()
  
  if (loginToken) {
    // 测试获取用户信息
    await testGetMe(loginToken)
  }
  
  console.log('\n✅ 所有测试完成！')
}

// 运行测试
runTests().catch(console.error)

