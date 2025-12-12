/**
 * 测试管理后台 API
 */

const BASE_URL = 'http://localhost:3000'

let adminToken = null

// 测试管理员登录
async function testAdminLogin() {
  console.log('\n🔐 步骤 1: 管理员登录...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: '12345678',
        loginMethod: 'password',
      }),
    })

    const data = await response.json()

    if (data.success) {
      adminToken = data.data.token
      console.log('✅ 管理员登录成功！')
      console.log('🔑 Token:', adminToken.substring(0, 20) + '...')
      return true
    } else {
      console.log('❌ 登录失败:', data.message)
      return false
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.message)
    return false
  }
}

// 测试获取用户列表
async function testGetUsers() {
  console.log('\n👥 步骤 2: 获取用户列表...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 获取用户列表成功！')
      console.log('👥 用户总数:', data.data.total)
      console.log('📄 当前页:', data.data.page, '/', data.data.totalPages)
      
      if (data.data.users.length > 0) {
        console.log('👥 用户列表:')
        data.data.users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} - ${user.realName} (${user.role})`)
          console.log(`      大学: ${user.university}, 书架: ${user._count.bookshelf} 本`)
        })
      }
      
      return data.data.users
    } else {
      console.log('❌ 获取失败:', data.message)
      return []
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return []
  }
}

// 测试获取图书列表
async function testGetBooks() {
  console.log('\n📚 步骤 3: 获取图书列表...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/books`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 获取图书列表成功！')
      console.log('📚 图书总数:', data.data.total)
      
      if (data.data.books.length > 0) {
        console.log('📚 图书列表:')
        data.data.books.forEach((book, index) => {
          console.log(`   ${index + 1}. ${book.name} - ${book.author}`)
          console.log(`      大学: ${book.university.name}, 收藏: ${book._count.bookshelf} 人`)
        })
      }
      
      return data.data.books
    } else {
      console.log('❌ 获取失败:', data.message)
      return []
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return []
  }
}

// 测试获取大学列表
async function testGetUniversities() {
  console.log('\n🏫 步骤 4: 获取大学列表...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/universities`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 获取大学列表成功！')
      console.log('🏫 大学总数:', data.data.length)
      
      if (data.data.length > 0) {
        console.log('🏫 大学列表:')
        data.data.forEach((uni, index) => {
          console.log(`   ${index + 1}. ${uni.name}`)
          console.log(`      用户: ${uni.userCount} 人, 图书: ${uni._count.books} 本`)
        })
      }
      
      return data.data
    } else {
      console.log('❌ 获取失败:', data.message)
      return []
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return []
  }
}

// 测试添加大学
async function testAddUniversity() {
  console.log('\n➕ 步骤 5: 添加测试大学...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/universities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '测试大学',
        logoUrl: 'https://example.com/logo.png',
      }),
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 添加大学成功！')
      console.log('🏫 大学信息:', data.data.name)
      return data.data
    } else {
      console.log('❌ 添加失败:', data.message)
      return null
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return null
  }
}

// 测试添加图书
async function testAddBook(universityId) {
  console.log('\n➕ 步骤 6: 添加测试图书...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/books`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '测试图书',
        author: '测试作者',
        isbn: '9780000000000',
        publisher: '测试出版社',
        universityId,
      }),
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 添加图书成功！')
      console.log('📚 图书信息:', data.data.name)
      return data.data
    } else {
      console.log('❌ 添加失败:', data.message)
      return null
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return null
  }
}

// 运行所有测试
async function runTests() {
  console.log('🚀 开始测试管理后台 API...')
  console.log('🌐 服务器地址:', BASE_URL)
  
  // 1. 管理员登录
  const loginSuccess = await testAdminLogin()
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，无法继续测试')
    return
  }
  
  // 2. 获取用户列表
  await testGetUsers()
  
  // 3. 获取图书列表
  await testGetBooks()
  
  // 4. 获取大学列表
  const universities = await testGetUniversities()
  
  // 5. 添加测试大学
  const newUniversity = await testAddUniversity()
  
  // 6. 添加测试图书
  if (newUniversity) {
    await testAddBook(newUniversity.id)
  } else if (universities.length > 0) {
    await testAddBook(universities[0].id)
  }
  
  console.log('\n✅ 所有测试完成！')
  console.log('\n📝 提示:')
  console.log('   - 管理后台地址: http://localhost:3000/admin')
  console.log('   - 管理员账号: test@example.com')
  console.log('   - 管理员密码: 12345678')
}

// 运行测试
runTests().catch(console.error)

