/**
 * 测试图书和书架 API
 */

const BASE_URL = 'http://localhost:3001'

let authToken = null

// 测试登录获取 Token
async function testLogin() {
  console.log('\n🔐 步骤 1: 登录获取 Token...')
  
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
      authToken = data.data.token
      console.log('✅ 登录成功！')
      console.log('🔑 Token:', authToken.substring(0, 20) + '...')
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

// 测试获取图书列表
async function testGetBooks() {
  console.log('\n📚 步骤 2: 获取图书列表...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/books`, {
      method: 'GET',
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 获取图书列表成功！')
      console.log('📚 图书数量:', data.data.length)
      
      if (data.data.length > 0) {
        console.log('📚 图书列表:')
        data.data.forEach((book, index) => {
          console.log(`   ${index + 1}. ${book.name} - ${book.author} (${book.university.name})`)
          console.log(`      ID: ${book.id}`)
        })
        return data.data
      }
    } else {
      console.log('❌ 获取失败:', data.message)
    }
    
    return []
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return []
  }
}

// 测试搜索图书
async function testSearchBooks() {
  console.log('\n🔍 步骤 3: 搜索图书（关键词：数学）...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/books?search=数学`, {
      method: 'GET',
    })

    const data = await response.json()

    if (data.success) {
      console.log('✅ 搜索成功！')
      console.log('📚 找到图书:', data.data.length, '本')
      data.data.forEach((book, index) => {
        console.log(`   ${index + 1}. ${book.name}`)
      })
    } else {
      console.log('❌ 搜索失败:', data.message)
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

// 测试添加图书到书架
async function testAddToBookshelf(bookId) {
  console.log(`\n➕ 步骤 4: 添加图书到书架 (ID: ${bookId})...`)
  
  if (!authToken) {
    console.log('❌ 未登录，无法添加到书架')
    return false
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/bookshelf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookId }),
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)
    console.log('📊 响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 添加成功！')
      return true
    } else {
      console.log('❌ 添加失败:', data.message)
      return false
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return false
  }
}

// 测试获取书架
async function testGetBookshelf() {
  console.log('\n📖 步骤 5: 获取我的书架...')
  
  if (!authToken) {
    console.log('❌ 未登录，无法获取书架')
    return []
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/bookshelf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)

    if (data.success) {
      console.log('✅ 获取书架成功！')
      console.log('📚 书架中的图书:', data.data.length, '本')
      
      if (data.data.length > 0) {
        console.log('📚 书架列表:')
        data.data.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.book.name}`)
          console.log(`      添加时间: ${new Date(item.addedAt).toLocaleString('zh-CN')}`)
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

// 测试从书架移除图书
async function testRemoveFromBookshelf(bookId) {
  console.log(`\n➖ 步骤 6: 从书架移除图书 (ID: ${bookId})...`)
  
  if (!authToken) {
    console.log('❌ 未登录，无法移除')
    return false
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/bookshelf?bookId=${bookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    const data = await response.json()
    console.log('📊 响应状态:', response.status)
    console.log('📊 响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 移除成功！')
      return true
    } else {
      console.log('❌ 移除失败:', data.message)
      return false
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return false
  }
}

// 运行所有测试
async function runTests() {
  console.log('🚀 开始测试图书和书架 API...')
  console.log('🌐 服务器地址:', BASE_URL)
  
  // 1. 登录
  const loginSuccess = await testLogin()
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，无法继续测试')
    return
  }
  
  // 2. 获取图书列表
  const books = await testGetBooks()
  
  // 3. 搜索图书
  await testSearchBooks()
  
  if (books.length > 0) {
    const firstBookId = books[0].id
    
    // 4. 添加第一本图书到书架
    await testAddToBookshelf(firstBookId)
    
    // 5. 获取书架
    const bookshelf = await testGetBookshelf()
    
    // 6. 从书架移除
    if (bookshelf.length > 0) {
      await testRemoveFromBookshelf(firstBookId)
      
      // 7. 再次获取书架验证
      await testGetBookshelf()
    }
  }
  
  console.log('\n✅ 所有测试完成！')
}

// 运行测试
runTests().catch(console.error)

