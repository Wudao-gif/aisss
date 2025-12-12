/**
 * 阿里云 OSS 配置和工具函数
 */

import OSS from 'ali-oss'

// OSS 基础配置
const ossBaseConfig = {
  region: process.env.NEXT_PUBLIC_OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  // 启用 V4 签名（IMM 预览需要）
  authorizationV4: true,
  // 使用 HTTPS 协议
  secure: true,
  // 超时配置（毫秒）- 大文件上传需要更长时间
  timeout: 1800000, // 30 分钟
}

// 私有 Bucket 配置（图书文件、资源文件）
const ossPrivateConfig = {
  ...ossBaseConfig,
  bucket: process.env.NEXT_PUBLIC_OSS_BUCKET || '',
}

// 公共 Bucket 配置（封面、图标、LOGO）
const ossPublicConfig = {
  ...ossBaseConfig,
  bucket: process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC || '',
}

// 创建 OSS 客户端
export function createOSSClient(isPublic: boolean = false) {
  return new OSS(isPublic ? ossPublicConfig : ossPrivateConfig)
}

// 生成唯一文件名
export function generateFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const ext = originalName.split('.').pop()
  return `${timestamp}-${random}.${ext}`
}

// 获取文件类型
export function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    pdf: 'pdf',
    doc: 'doc',
    docx: 'doc',
    ppt: 'ppt',
    pptx: 'ppt',
    xls: 'xls',
    xlsx: 'xls',
    txt: 'txt',
    md: 'md',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',
  }
  return typeMap[ext] || 'other'
}

// 上传文件到 OSS（使用普通上传，超时时间已设为30分钟）
export async function uploadToOSS(
  file: Buffer,
  filename: string,
  folder: string = 'uploads',
  isPublic: boolean = false
): Promise<{ url: string; path: string; size: number }> {
  console.log('🔧 [OSS] 开始上传文件:', {
    filename,
    folder,
    isPublic,
    fileSize: file.length,
    fileSizeMB: (file.length / 1024 / 1024).toFixed(2) + ' MB',
    bucket: isPublic ? process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC : process.env.NEXT_PUBLIC_OSS_BUCKET,
    region: process.env.NEXT_PUBLIC_OSS_REGION,
  })

  // 检查环境变量
  if (!process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) {
    console.error('❌ [OSS] 缺少 OSS 配置: AccessKey 未设置')
    throw new Error('OSS 配置错误：缺少 AccessKey')
  }

  const bucketName = isPublic ? process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC : process.env.NEXT_PUBLIC_OSS_BUCKET
  if (!bucketName) {
    console.error('❌ [OSS] 缺少 OSS 配置: Bucket 未设置')
    throw new Error('OSS 配置错误：缺少 Bucket 名称')
  }

  const client = createOSSClient(isPublic)
  const fileName = generateFileName(filename)
  const path = `${folder}/${fileName}`

  console.log('📝 [OSS] 生成的文件路径:', path)

  try {
    const result = await client.put(path, file)
    console.log('✅ [OSS] 上传成功:', result)

    if (isPublic) {
      // 公共 Bucket：返回完整的公共 URL
      const url = `https://${bucketName}.${process.env.NEXT_PUBLIC_OSS_REGION}.aliyuncs.com/${path}`
      return {
        url: url,
        path: path,
        size: file.length,
      }
    } else {
      // 私有 Bucket：返回 OSS 路径，前端访问时通过 API 获取签名 URL
      return {
        url: path,
        path: path,
        size: file.length,
      }
    }
  } catch (error) {
    console.error('❌ [OSS] 上传失败:', error)
    throw new Error(`文件上传失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 复制 OSS 文件
export async function copyFileInOSS(
  sourceFilePath: string,
  targetFolder: string = 'documents',
  targetFileName?: string,
  isPublic: boolean = false
): Promise<{ url: string; path: string }> {
  const client = createOSSClient(isPublic)

  try {
    // sourceFilePath 可能是完整 URL 或 OSS 路径
    let sourcePath = sourceFilePath

    // 如果是完整 URL，提取路径
    if (sourceFilePath.startsWith('http://') || sourceFilePath.startsWith('https://')) {
      const url = new URL(sourceFilePath)
      sourcePath = url.pathname.substring(1)
    }

    // 生成目标文件名
    const originalFileName = sourcePath.split('/').pop() || 'file'
    const fileName = targetFileName || generateFileName(originalFileName)
    const targetPath = `${targetFolder}/${fileName}`

    console.log('📋 [OSS] 复制文件:', {
      source: sourcePath,
      target: targetPath,
      bucket: isPublic ? process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC : process.env.NEXT_PUBLIC_OSS_BUCKET
    })

    // 使用 OSS copy 方法复制文件
    const bucketName = isPublic ? process.env.NEXT_PUBLIC_OSS_BUCKET_PUBLIC : process.env.NEXT_PUBLIC_OSS_BUCKET
    await client.copy(targetPath, sourcePath, bucketName!)

    console.log('✅ [OSS] 文件复制成功:', targetPath)

    if (isPublic) {
      // 公共 Bucket：返回完整的公共 URL
      const result = await client.get(targetPath)
      return {
        url: result.url,
        path: targetPath,
      }
    } else {
      // 私有 Bucket：返回 OSS 路径
      return {
        url: targetPath,
        path: targetPath,
      }
    }
  } catch (error) {
    console.error('❌ [OSS] 文件复制失败:', error)
    throw new Error(`文件复制失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 删除 OSS 文件
export async function deleteFromOSS(fileUrl: string, isPublic: boolean = false): Promise<void> {
  const client = createOSSClient(isPublic)

  try {
    // fileUrl 可能是完整 URL 或 OSS 路径
    let path = fileUrl

    // 如果是完整 URL，提取路径
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      const url = new URL(fileUrl)
      path = url.pathname.substring(1) // 移除开头的 /
    }

    await client.delete(path)
  } catch (error) {
    console.error('OSS 删除失败:', error)
    throw new Error('文件删除失败')
  }
}

// 生成临时访问 URL（用于私有文件）
// 🆕 OSS 默认支持 Range Request，无需特殊配置
export async function generateSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = createOSSClient()

  try {
    // filePath 可能是完整 URL 或 OSS 路径
    let path = filePath

    // 如果是完整 URL，提取路径
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const url = new URL(filePath)
      path = url.pathname.substring(1)
    }

    console.log('🔧 [OSS] 生成签名 URL:', {
      原始路径: filePath,
      处理后路径: path,
      Bucket: process.env.NEXT_PUBLIC_OSS_BUCKET,
    })

    // 使用 V4 签名（OSS 默认支持 Range Request）
    const signedUrl = await client.signatureUrlV4('GET', expiresInSeconds, {
      headers: {},
      queries: {},
    }, path)

    console.log('🔧 [OSS] 签名 URL 生成成功:', signedUrl)
    return signedUrl
  } catch (error) {
    console.error('生成签名 URL 失败:', error)
    throw new Error('生成访问链接失败')
  }
}

/**
 * 生成阿里云 WebOffice 在线预览 URL
 * 使用 OSS 的 doc/preview 功能（需要绑定 IMM Project 到 Bucket）
 *
 * @param filePath - 文件路径
 * @param expiresInSeconds - 过期时间（秒）
 * @param options - 预览选项
 * @returns 签名 URL
 */
export async function generateWebOfficePreviewUrl(
  filePath: string,
  expiresInSeconds: number = 3600,
  options: {
    allowExport?: boolean  // 是否允许导出为 PDF（默认 true）
    allowPrint?: boolean   // 是否允许打印（默认 true）
    allowCopy?: boolean    // 是否允许复制（默认 true）
    watermarkText?: string // 水印文字（可选）
    watermarkSize?: number // 水印大小（默认 30）
    watermarkOpacity?: number // 水印透明度 0-100（默认 100 不透明）
    watermarkColor?: string // 水印颜色 RGB（默认 #FFFFFF）
    watermarkRotate?: number // 水印旋转角度 0-360（默认 0）
    watermarkFont?: string // 水印字体（可选）
  } = {}
): Promise<string> {
  const client = createOSSClient()

  try {
    // filePath 可能是完整 URL 或 OSS 路径
    let path = filePath

    // 如果是完整 URL，提取路径
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const url = new URL(filePath)
      path = url.pathname.substring(1)
    }

    // 构建 doc/preview 参数
    const previewParams: string[] = []

    // 导出权限（默认允许）
    if (options.allowExport !== false) {
      previewParams.push('export_1')
    } else {
      previewParams.push('export_0')
    }

    // 打印权限（默认允许）
    if (options.allowPrint !== false) {
      previewParams.push('print_1')
    } else {
      previewParams.push('print_0')
    }

    // 复制权限（默认允许）
    if (options.allowCopy !== false) {
      previewParams.push('copy_1')
    } else {
      previewParams.push('copy_0')
    }

    // 组合预览参数
    const previewParamStr = previewParams.length > 0 ? previewParams.join(',') : ''

    // 构建水印参数
    let watermarkParamStr = ''
    if (options.watermarkText) {
      const watermarkParts: string[] = []

      // 水印文字（需要 URL Safe Base64 编码）
      const encodedText = Buffer.from(options.watermarkText, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      watermarkParts.push(`text_${encodedText}`)

      // 水印大小（默认 30）
      if (options.watermarkSize) {
        watermarkParts.push(`size_${options.watermarkSize}`)
      }

      // 水印透明度（默认 100）
      if (options.watermarkOpacity !== undefined) {
        watermarkParts.push(`t_${options.watermarkOpacity}`)
      }

      // 水印颜色（默认 #FFFFFF）
      if (options.watermarkColor) {
        const color = options.watermarkColor.replace('#', '')
        watermarkParts.push(`color_${color}`)
      }

      // 水印旋转角度（默认 0）
      if (options.watermarkRotate !== undefined) {
        watermarkParts.push(`rotate_${options.watermarkRotate}`)
      }

      // 水印字体（可选）
      if (options.watermarkFont) {
        const encodedFont = Buffer.from(options.watermarkFont, 'utf-8')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '')
        watermarkParts.push(`type_${encodedFont}`)
      }

      watermarkParamStr = `/watermark,${watermarkParts.join(',')}`
    }

    // 组合完整的处理参数：doc/preview,export_1,print_1/watermark,text_xxx,size_30,t_60
    const processParam = `doc/preview${previewParamStr ? ',' + previewParamStr : ''}${watermarkParamStr}`

    // 生成签名 URL（使用 V4 签名）
    // 使用 signatureUrlV4 方法，并在 queries 中添加 x-oss-process 参数
    const signedUrl = await client.signatureUrlV4('GET', expiresInSeconds, {
      headers: {},
      queries: {
        'x-oss-process': processParam,
      },
    }, path)

    console.log('🔧 [OSS] WebOffice 预览 URL:', signedUrl)
    return signedUrl
  } catch (error) {
    console.error('生成 WebOffice 预览 URL 失败:', error)
    throw new Error('生成预览链接失败')
  }
}

/**
 * 从 URL 或路径中提取 OSS 路径
 * 私有 Bucket 存储的是路径（如 book-files/xxx.pdf）
 * 公共 Bucket 存储的是完整 URL
 */
export function getOssPathFromUrl(urlOrPath: string): string | null {
  if (!urlOrPath) return null

  // 如果是相对路径（私有 Bucket），直接返回
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath
  }

  // 如果是完整 URL，提取路径部分
  try {
    const url = new URL(urlOrPath)
    // 移除开头的 /
    return url.pathname.replace(/^\//, '')
  } catch {
    return null
  }
}

