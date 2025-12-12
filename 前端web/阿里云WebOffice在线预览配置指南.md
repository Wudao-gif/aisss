# 阿里云 WebOffice 在线预览配置指南

## 📖 概述

本项目使用阿里云 OSS 的 **WebOffice 在线预览功能**（`doc/preview`），实现 Office 文档的在线预览。

**官方文档**: https://help.aliyun.com/zh/oss/user-guide/online-object-preview

---

## ✨ 功能特性

### 支持的文件格式

| 文件类型 | 支持的扩展名 |
|---------|------------|
| **Word** | doc, dot, wps, wpt, docx, dotx, docm, dotm, rtf |
| **PPT** | ppt, pptx, pptm, ppsx, ppsm, pps, potx, potm, dpt, dps |
| **Excel** | xls, xlt, et, xlsx, xltx, csv, xlsm, xltm |
| **PDF** | pdf |

### 高级功能

- ✅ **权限控制**: 禁止导出、打印、复制
- ✅ **水印保护**: 文字水印，可自定义大小、透明度、颜色、旋转角度
- ✅ **快速加载**: 1-2 秒加载完成
- ✅ **国内 CDN**: 阿里云 CDN 加速
- ✅ **安全可靠**: V4 签名算法，1 小时有效期

---

## 🔧 前提条件

### 1. 创建 OSS Bucket

在阿里云 OSS 控制台创建 Bucket，上传需要预览的文档。

### 2. 绑定 IMM Project ⭐

**重要**: WebOffice 预览功能需要为 Bucket 绑定智能媒体管理（IMM）的 Project。

#### 步骤：

1. 登录 [智能媒体管理控制台](https://imm.console.aliyun.com/)
2. 点击「创建项目」
3. 填写项目信息：
   - **项目名称**: 例如 `library-preview`
   - **地域**: 必须与 Bucket 在同一地域（例如：华东1-杭州）
   - **服务地址**: 自动生成
4. 点击「确定」创建项目
5. 在 OSS 控制台，进入 Bucket 设置
6. 找到「数据处理」→「智能媒体管理」
7. 绑定刚创建的 IMM Project

### 3. 绑定自定义域名 ⭐

**重要**: 必须绑定自定义域名，通过自定义域名访问文件时才能打开预览。

#### 步骤：

1. 在 OSS 控制台，进入 Bucket 设置
2. 找到「传输管理」→「域名管理」
3. 点击「绑定域名」
4. 填写自定义域名（例如：`static.example.com`）
5. 在域名 DNS 服务商处添加 CNAME 记录：
   ```
   static.example.com  →  your-bucket.oss-cn-hangzhou.aliyuncs.com
   ```
6. 等待 DNS 生效（通常 10 分钟内）

---

## ⚙️ 配置步骤

### 1. 环境变量配置

复制 `.env.example` 到 `.env.local`，并填写以下配置：

```env
# 阿里云 OSS 配置
NEXT_PUBLIC_OSS_REGION="oss-cn-hangzhou"
NEXT_PUBLIC_OSS_BUCKET="your-bucket-name"
NEXT_PUBLIC_OSS_CUSTOM_DOMAIN="https://static.example.com"  # ⭐ 必须配置
OSS_ACCESS_KEY_ID="LTAI*********************"
OSS_ACCESS_KEY_SECRET="your-secret-key"

# WebOffice 预览配置
NEXT_PUBLIC_WEBOFFICE_ALLOW_EXPORT="true"   # 允许导出为 PDF
NEXT_PUBLIC_WEBOFFICE_ALLOW_PRINT="true"    # 允许打印
NEXT_PUBLIC_WEBOFFICE_ALLOW_COPY="true"     # 允许复制

# 水印配置（可选）
NEXT_PUBLIC_WEBOFFICE_WATERMARK_TEXT="内部资料"  # 水印文字
NEXT_PUBLIC_WEBOFFICE_WATERMARK_SIZE="30"        # 水印大小
NEXT_PUBLIC_WEBOFFICE_WATERMARK_OPACITY="100"    # 透明度 0-100
NEXT_PUBLIC_WEBOFFICE_WATERMARK_COLOR="#FFFFFF"  # 水印颜色
NEXT_PUBLIC_WEBOFFICE_WATERMARK_ROTATE="0"       # 旋转角度 0-360
```

### 2. OSS 客户端配置

确保 `lib/oss.ts` 中的 OSS 客户端配置正确：

```typescript
export function createOSSClient() {
  return new OSS({
    region: process.env.NEXT_PUBLIC_OSS_REGION!,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    bucket: process.env.NEXT_PUBLIC_OSS_BUCKET!,
    endpoint: process.env.NEXT_PUBLIC_OSS_CUSTOM_DOMAIN, // ⭐ 使用自定义域名
    cname: true,  // ⭐ 必须开启 CNAME
    secure: true, // 使用 HTTPS
  })
}
```

### 3. 重启开发服务器

```bash
npm run dev
```

---

## 📝 使用示例

### 生成预览 URL

```typescript
import { generateWebOfficePreviewUrl } from '@/lib/oss'

// 生成带水印的预览 URL
const previewUrl = generateWebOfficePreviewUrl('documents/example.docx', 3600, {
  allowExport: false,  // 禁止导出
  allowPrint: false,   // 禁止打印
  allowCopy: true,     // 允许复制
  watermarkText: '内部资料',
  watermarkSize: 30,
  watermarkOpacity: 60,
  watermarkColor: '#FF0000',
  watermarkRotate: 45,
})

console.log(previewUrl)
// 输出：https://static.example.com/documents/example.docx?x-oss-process=doc/preview,export_0,print_0,copy_1/watermark,text_5YaF6YOo6LWE5paZ,size_30,t_60,color_FF0000,rotate_45&x-oss-date=...
```

### 在组件中使用

```tsx
import { WebOfficeViewer } from '@/components/library/ImmOfficeViewer'

function DocumentPreview() {
  return (
    <WebOfficeViewer
      fileUrl="documents/example.docx"
      fileName="示例文档.docx"
      fileType="docx"
      allowExport={false}
      allowPrint={false}
      watermarkText="内部资料"
    />
  )
}
```

---

## 🎨 参数说明

### doc/preview 参数

| 参数名 | 类型 | 必须 | 说明 |
|--------|------|------|------|
| `print` | int | 否 | 是否允许打印。1=允许，0=不允许 |
| `copy` | int | 否 | 是否允许复制。1=允许，0=不允许 |
| `export` | int | 否 | 是否允许导出为 PDF。1=允许，0=不允许 |
| `maxpage` | int | 否 | 最大渲染页数，取大于 0 的整数 |

### 水印参数

| 参数名 | 类型 | 必须 | 说明 |
|--------|------|------|------|
| `text` | string | 否 | 水印文字，需经过 URL Safe Base64 编码 |
| `size` | int | 否 | 水印字号，取大于 0 的整数 |
| `t` | int | 否 | 水印透明度，0-100，默认 100（不透明） |
| `color` | string | 否 | 水印颜色，RGB 格式，默认 #FFFFFF |
| `rotate` | int | 否 | 水印旋转角度，0-360，默认 0 |
| `type` | string | 否 | 水印字体，需经过 URL Safe Base64 编码 |

### 支持的字体

**中文字体**:
- 宋体（默认）
- 楷体

**英文字体**:
- Arial
- Georgia
- Tahoma
- Comic Sans MS
- Times New Roman
- Courier New
- Verdana

---

## 💰 计费说明

### 计费项

1. **OSS 请求费用**: 根据 GetObject 请求次数计费
2. **外网流出流量**: 如果通过外网访问，按流量计费
3. **IMM 文档预览费用**: 按 API 调用次数计费

### 费用估算

- **IMM 文档预览**: ¥0.01/次（2023年12月1日后创建的项目）
- **前 1000 次免费**
- **每月 10,000 次预览**: 约 ¥100

**官方定价**: https://www.aliyun.com/price/product#/oss/detail

---

## 🔍 测试方法

### 1. 访问测试页面

```
http://localhost:3001/test-preview
```

### 2. 测试 Office 文档预览

点击「Word 示例文档」，验证：
- [ ] 文档加载速度快（1-2秒）
- [ ] 显示水印（如果配置了）
- [ ] 底部显示「阿里云 WebOffice」提示
- [ ] 权限控制生效（禁止导出/打印/复制）

### 3. 查看生成的 URL

打开浏览器开发者工具，查看 Network 标签，找到预览请求，查看 URL 格式：

```
https://static.example.com/example.docx?x-oss-process=doc/preview,export_1,print_1,copy_1/watermark,text_xxx,size_30,t_100&x-oss-date=...&x-oss-signature=...
```

---

## ❓ 常见问题

### 1. 预览失败，提示「Bucket 未绑定 IMM Project」

**解决方法**:
- 确保已在 IMM 控制台创建 Project
- 确保 Project 与 Bucket 在同一地域
- 在 OSS 控制台绑定 IMM Project

### 2. 预览失败，提示「未配置自定义域名」

**解决方法**:
- 在 OSS 控制台绑定自定义域名
- 在 DNS 服务商添加 CNAME 记录
- 在 `.env.local` 中配置 `NEXT_PUBLIC_OSS_CUSTOM_DOMAIN`
- 在 `lib/oss.ts` 中设置 `cname: true`

### 3. 水印不显示

**解决方法**:
- 检查 `NEXT_PUBLIC_WEBOFFICE_WATERMARK_TEXT` 是否配置
- 检查水印透明度是否设置为 0
- 检查水印颜色是否与文档背景色相同

### 4. 文档加载慢

**解决方法**:
- 使用自定义域名（必须）
- 开启 CDN 加速
- 检查文件大小（建议 < 10MB）

### 5. 签名错误

**解决方法**:
- 确保使用 V4 签名算法
- 检查 AccessKey 和 SecretKey 是否正确
- 检查 Region 配置是否正确

---

## 📚 相关文档

- [阿里云 WebOffice 在线预览官方文档](https://help.aliyun.com/zh/oss/user-guide/online-object-preview)
- [OSS 签名版本 4](https://help.aliyun.com/zh/oss/developer-reference/signature-version-4)
- [智能媒体管理 IMM](https://help.aliyun.com/zh/imm/)
- [OSS 自定义域名](https://help.aliyun.com/zh/oss/access-buckets-via-custom-domain-names)

---

## 🎉 总结

使用阿里云 WebOffice 在线预览功能，你可以：

- ✅ 快速预览 Office 文档（1-2秒）
- ✅ 保护文档安全（水印、权限控制）
- ✅ 提升用户体验（无需下载）
- ✅ 降低服务器压力（OSS 直接处理）

**现在就开始配置吧！** 🚀

