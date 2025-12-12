/**
 * 阿里云 IMM（智能媒体管理）配置和工具函数
 */

import Imm, * as $Imm from '@alicloud/imm20200930'
import * as $OpenApi from '@alicloud/openapi-client'

// 创建 IMM 客户端
function createIMMClient() {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    endpoint: `imm.${process.env.IMM_REGION || 'cn-chengdu'}.aliyuncs.com`,
  })

  const client = new Imm(config)
  return client
}

/**
 * 生成 WebOffice 预览凭证
 * @param fileUrl OSS 文件路径（例如：book-files/xxx.docx）
 * @param options 预览选项
 */
export async function generateWebOfficeToken(
  fileUrl: string,
  options: {
    fileName?: string   // 文件名（用于 IMM 显示）
    permission?: {
      readonly?: boolean  // 是否只读（默认 false）
      print?: boolean     // 是否允许打印（默认 true）
      copy?: boolean      // 是否允许复制（默认 true）
      export?: boolean    // 是否允许导出（默认 true）
    }
    watermark?: {
      type?: number       // 水印类型：1-文字水印
      value?: string      // 水印内容
      fillStyle?: string  // 水印颜色（默认 rgba(192,192,192,0.6)）
      font?: string       // 水印字体（默认 bold 20px Serif）
      rotate?: number     // 水印旋转角度（默认 -0.7854，即 -45度）
      horizontal?: number // 水印水平间距（默认 50）
      vertical?: number   // 水印垂直间距（默认 50）
    }
    user?: {
      id?: string         // 用户 ID
      name?: string       // 用户名称
      avatar?: string     // 用户头像
    }
  } = {}
): Promise<{
  accessToken: string
  webofficeURL: string
  refreshToken: string
  accessTokenExpiredTime: string
  refreshTokenExpiredTime: string
}> {
  const client = createIMMClient()

  try {
    // 提取文件路径
    let path = fileUrl
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      const url = new URL(fileUrl)
      path = url.pathname.substring(1)
    }

    // 构建 OSS URI
    const ossUri = `oss://${process.env.NEXT_PUBLIC_OSS_BUCKET}/${path}`

    // 构建请求参数（使用 SDK 类）
    const request = new $Imm.GenerateWebofficeTokenRequest({
      projectName: process.env.IMM_PROJECT_NAME,
      sourceURI: ossUri,
      ...(options.fileName && { fileName: options.fileName }), // 传递文件名
      permission: new $Imm.WebofficePermission({
        readonly: options.permission?.readonly ?? false,
        print: options.permission?.print ?? true,
        copy: options.permission?.copy ?? true,
        export: options.permission?.export ?? true,
      }),
      ...(options.watermark && {
        watermark: new $Imm.WebofficeWatermark({
          type: options.watermark.type ?? 1,
          value: options.watermark.value ?? '测试水印',
          fillStyle: options.watermark.fillStyle ?? 'rgba(192,192,192,0.6)',
          font: options.watermark.font ?? 'bold 20px Serif',
          rotate: options.watermark.rotate ?? -0.7854,
          horizontal: options.watermark.horizontal ?? 50,
          vertical: options.watermark.vertical ?? 50,
        }),
      }),
      ...(options.user && {
        user: new $Imm.WebofficeUser({
          id: options.user.id,
          name: options.user.name,
          avatar: options.user.avatar,
        }),
      }),
    })

    console.log('🔧 [IMM] 请求参数:', {
      projectName: process.env.IMM_PROJECT_NAME,
      sourceURI: ossUri,
      fileName: options.fileName,
      permission: request.permission,
      user: options.user,
    })

    // 调用 API
    const response = await client.generateWebofficeToken(request)

    console.log('🔧 [IMM] API 响应:', {
      accessToken: response.body?.accessToken?.substring(0, 20) + '...',
      webofficeURL: response.body?.webofficeURL,
    })

    if (!response.body?.accessToken || !response.body?.webofficeURL) {
      throw new Error('IMM API 返回数据不完整')
    }

    return {
      accessToken: response.body.accessToken,
      webofficeURL: response.body.webofficeURL,
      refreshToken: response.body.refreshToken || '',
      accessTokenExpiredTime: response.body.accessTokenExpiredTime || '',
      refreshTokenExpiredTime: response.body.refreshTokenExpiredTime || '',
    }
  } catch (error: any) {
    console.error('生成 WebOffice 凭证失败:', error)
    console.error('错误详情:', error.message)
    if (error.data) {
      console.error('错误数据:', error.data)
    }
    throw new Error(`生成预览凭证失败: ${error.message}`)
  }
}

/**
 * 刷新 WebOffice 访问令牌
 */
export async function refreshWebOfficeToken(
  refreshToken: string
): Promise<{
  accessToken: string
  refreshToken: string
  accessTokenExpiredTime: string
  refreshTokenExpiredTime: string
}> {
  const client = createIMMClient()

  try {
    const request = new $Imm.RefreshWebofficeTokenRequest({
      projectName: process.env.IMM_PROJECT_NAME,
      refreshToken: refreshToken,
    })

    const response = await client.refreshWebofficeToken(request)

    if (!response.body?.accessToken) {
      throw new Error('刷新令牌失败')
    }

    return {
      accessToken: response.body.accessToken,
      refreshToken: response.body.refreshToken || '',
      accessTokenExpiredTime: response.body.accessTokenExpiredTime || '',
      refreshTokenExpiredTime: response.body.refreshTokenExpiredTime || '',
    }
  } catch (error: any) {
    console.error('刷新 WebOffice 令牌失败:', error)
    throw new Error(`刷新令牌失败: ${error.message}`)
  }
}

