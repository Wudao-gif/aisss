/**
 * HITL 集成测试脚本
 * 用于验证前端 HITL 功能是否正确集成
 */

import { Decision } from '@/lib/hitl-utils'

// 测试配置
const TEST_CONFIG = {
  apiUrl: 'http://localhost:3000/api/ai/chat',
  resumeUrl: 'http://localhost:3000/api/ai/chat/resume',
  timeout: 30000,
}

// 测试结果
interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

// 辅助函数
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type]
  console.log(`${prefix} ${message}`)
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

// 测试 1: 验证 HITL 工具函数存在
async function testHITLUtilsExist() {
  const start = Date.now()
  try {
    // 检查是否能导入工具函数
    const response = await fetch('/lib/hitl-utils.ts')
    assert(response.ok, 'hitl-utils.ts 文件存在')
    
    const duration = Date.now() - start
    results.push({ name: 'HITL 工具函数存在', passed: true, duration })
    log('HITL 工具函数存在', 'success')
  } catch (error) {
    const duration = Date.now() - start
    results.push({
      name: 'HITL 工具函数存在',
      passed: false,
      error: String(error),
      duration,
    })
    log(`HITL 工具函数检查失败: ${error}`, 'error')
  }
}

// 测试 2: 验证 useHITL Hook 存在
async function testUseHITLHookExists() {
  const start = Date.now()
  try {
    const response = await fetch('/hooks/useHITL.ts')
    assert(response.ok, 'useHITL.ts 文件存在')
    
    const duration = Date.now() - start
    results.push({ name: 'useHITL Hook 存在', passed: true, duration })
    log('useHITL Hook 存在', 'success')
  } catch (error) {
    const duration = Date.now() - start
    results.push({
      name: 'useHITL Hook 存在',
      passed: false,
      error: String(error),
      duration,
    })
    log(`useHITL Hook 检查失败: ${error}`, 'error')
  }
}

// 测试 3: 验证 HITLApprovalModal 组件存在
async function testHITLModalExists() {
  const start = Date.now()
  try {
    const response = await fetch('/components/modals/HITLApprovalModal.tsx')
    assert(response.ok, 'HITLApprovalModal.tsx 文件存在')
    
    const duration = Date.now() - start
    results.push({ name: 'HITLApprovalModal 组件存在', passed: true, duration })
    log('HITLApprovalModal 组件存在', 'success')
  } catch (error) {
    const duration = Date.now() - start
    results.push({
      name: 'HITLApprovalModal 组件存在',
      passed: false,
      error: String(error),
      duration,
    })
    log(`HITLApprovalModal 组件检查失败: ${error}`, 'error')
  }
}

// 测试 4: 验证 resume API 路由存在
async function testResumeAPIExists() {
  const start = Date.now()
  try {
    const response = await fetch('/api/ai/chat/resume', {
      method: 'OPTIONS',
    })
    assert(response.status !== 404, 'resume API 路由存在')
    
    const duration = Date.now() - start
    results.push({ name: 'Resume API 路由存在', passed: true, duration })
    log('Resume API 路由存在', 'success')
  } catch (error) {
    const duration = Date.now() - start
    results.push({
      name: 'Resume API 路由存在',
      passed: false,
      error: String(error),
      duration,
    })
    log(`Resume API 路由检查失败: ${error}`, 'error')
  }
}

// 测试 5: 验证 book-chat-v2 页面集成
async function testBookChatV2Integration() {
  const start = Date.now()
  try {
    const response = await fetch('/app/book-chat-v2/page.tsx')
    const content = await response.text()
    
    assert(content.includes('useHITL'), 'book-chat-v2 导入了 useHITL')
    assert(content.includes('HITLApprovalModal'), 'book-chat-v2 导入了 HITLApprovalModal')
    assert(content.includes('resumeWithDecisions'), 'book-chat-v2 实现了 resumeWithDecisions')
    assert(content.includes('handleHITLApprove'), 'book-chat-v2 实现了 handleHITLApprove')
    
    const duration = Date.now() - start
    results.push({ name: 'book-chat-v2 集成', passed: true, duration })
    log('book-chat-v2 集成完成', 'success')
  } catch (error) {
    const duration = Date.now() - start
    results.push({
      name: 'book-chat-v2 集成',
      passed: false,
      error: String(error),
      duration,
    })
    log(`book-chat-v2 集成检查失败: ${error}`, 'error')
  }
}

// 运行所有测试
async function runAllTests() {
  log('开始 HITL 集成测试...', 'info')
  log('', 'info')

  await testHITLUtilsExist()
  await testUseHITLHookExists()
  await testHITLModalExists()
  await testResumeAPIExists()
  await testBookChatV2Integration()

  log('', 'info')
  log('测试完成！', 'info')
  log('', 'info')

  // 打印总结
  const passed = results.filter(r => r.passed).length
  const total = results.length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  log(`通过: ${passed}/${total}`, passed === total ? 'success' : 'warn')
  log(`总耗时: ${totalDuration}ms`, 'info')
  log('', 'info')

  // 打印详细结果
  log('详细结果:', 'info')
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    const duration = `${result.duration}ms`
    log(`${status} ${result.name} (${duration})`, result.passed ? 'success' : 'error')
    if (result.error) {
      log(`   错误: ${result.error}`, 'error')
    }
  })
}

// 导出测试函数
export { runAllTests }

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  // 在浏览器中运行
  (window as any).runHITLTests = runAllTests
  log('HITL 测试已加载，运行 runHITLTests() 开始测试', 'info')
}

