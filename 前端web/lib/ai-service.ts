/**
 * AI 教育资料处理服务客户端
 * 用于调用 Python 后端服务处理文档
 */

// AI 服务配置
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || ''

interface ProcessDocumentRequest {
  oss_key: string
  bucket?: string
  metadata?: Record<string, any>
}

interface ProcessDocumentResponse {
  success: boolean
  message: string
  data?: {
    status: string
    file_key: string
    chunks_count?: number
    vectors_stored?: number
    error?: string
  }
}

/**
 * 处理文档（同步）
 * 等待处理完成后返回结果
 */
export async function processDocument(
  ossKey: string,
  metadata?: Record<string, any>
): Promise<ProcessDocumentResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v4/process-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': AI_SERVICE_API_KEY,
    },
    body: JSON.stringify({
      oss_key: ossKey,
      metadata: metadata,
    } as ProcessDocumentRequest),
  })

  if (!response.ok) {
    throw new Error(`AI 服务请求失败: ${response.status}`)
  }

  return response.json()
}

/**
 * 异步处理文档
 * 立即返回，后台处理
 */
export async function processDocumentAsync(
  ossKey: string,
  metadata?: Record<string, any>
): Promise<ProcessDocumentResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v4/process-document/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': AI_SERVICE_API_KEY,
    },
    body: JSON.stringify({
      oss_key: ossKey,
      metadata: metadata,
    } as ProcessDocumentRequest),
  })

  if (!response.ok) {
    throw new Error(`AI 服务请求失败: ${response.status}`)
  }

  return response.json()
}

/**
 * 检查 AI 服务健康状态
 */
export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v4/health`)
    return response.ok
  } catch {
    return false
  }
}

/**
 * 在文件上传成功后自动处理文档
 * 用于集成到现有的上传流程中
 */
export async function processUploadedDocument(
  ossPath: string,
  documentInfo: {
    book_id?: string
    resource_id?: string
    name?: string
    type?: string
  }
): Promise<ProcessDocumentResponse> {
  console.log('📤 [AI Service] 开始处理文档:', ossPath, '| metadata:', documentInfo)

  try {
    const result = await processDocumentAsync(ossPath, {
      book_id: documentInfo.book_id,
      resource_id: documentInfo.resource_id,
      document_name: documentInfo.name,
      document_type: documentInfo.type,
      processed_at: new Date().toISOString(),
    })

    if (result.success) {
      console.log('✅ [AI Service] 文档处理任务已提交:', result.data)
    } else {
      console.error('❌ [AI Service] 文档处理失败:', result.message)
    }

    return result
  } catch (error) {
    console.error('❌ [AI Service] 调用失败:', error)
    throw error
  }
}

/**
 * 删除文档的向量数据
 * 用于删除或更新图书时清理旧向量
 */
export async function deleteDocumentVectors(bookId: string): Promise<boolean> {
  console.log('🗑️ [AI Service] 删除向量:', bookId)

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v4/vectors/${bookId}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
      },
    })

    if (!response.ok) {
      console.error('❌ [AI Service] 删除向量失败:', response.status)
      return false
    }

    const result = await response.json()
    console.log('✅ [AI Service] 向量删除结果:', result)
    return result.success
  } catch (error) {
    console.error('❌ [AI Service] 删除向量调用失败:', error)
    return false
  }
}

