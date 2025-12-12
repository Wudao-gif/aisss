# 阿里云 OSS 配置指南

本指南将帮助您配置阿里云对象存储服务（OSS），用于存储图书封面、图书文件和资源文件。

## 📋 前置准备

1. 阿里云账号
2. 已开通 OSS 服务

---

## 🚀 步骤 1: 创建 OSS Bucket

1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)
2. 点击「创建 Bucket」
3. 配置 Bucket：
   - **Bucket 名称**: 例如 `brillance-files`（全局唯一）
   - **地域**: 选择离您最近的地域，例如 `华东1（杭州）`
   - **存储类型**: 标准存储
   - **读写权限**: 
     - 如果文件需要公开访问：选择「公共读」
     - 如果文件需要私密访问：选择「私有」（推荐）
   - **服务端加密**: 可选
4. 点击「确定」创建

---

## 🔑 步骤 2: 创建 AccessKey

1. 进入 [RAM 访问控制台](https://ram.console.aliyun.com/)
2. 点击「用户」→「创建用户」
3. 填写用户信息：
   - **登录名称**: 例如 `brillance-oss`
   - **访问方式**: 勾选「OpenAPI 调用访问」
4. 点击「确定」
5. **重要**: 保存显示的 AccessKey ID 和 AccessKey Secret（只显示一次）

---

## 🛡️ 步骤 3: 授权 OSS 权限

1. 在 RAM 控制台，找到刚创建的用户
2. 点击「添加权限」
3. 选择权限策略：
   - 搜索并添加 `AliyunOSSFullAccess`（完全权限）
   - 或者创建自定义策略（仅授予特定 Bucket 的权限）
4. 点击「确定」

### 自定义权限策略示例（推荐）

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject",
        "oss:ListObjects"
      ],
      "Resource": [
        "acs:oss:*:*:brillance-files/*"
      ]
    }
  ]
}
```

---

## ⚙️ 步骤 4: 配置环境变量

1. 复制 `.env.example` 为 `.env.local`：
   ```bash
   cp .env.example .env.local
   ```

2. 编辑 `.env.local`，填入 OSS 配置：

```env
# 阿里云 OSS 配置
NEXT_PUBLIC_OSS_REGION="oss-cn-hangzhou"  # 您的 Bucket 地域
NEXT_PUBLIC_OSS_BUCKET="brillance-files"   # 您的 Bucket 名称
OSS_ACCESS_KEY_ID="LTAI5t..."              # 您的 AccessKey ID
OSS_ACCESS_KEY_SECRET="xxx..."             # 您的 AccessKey Secret
```

### 地域代码对照表

| 地域 | Region ID |
|------|-----------|
| 华东1（杭州） | oss-cn-hangzhou |
| 华东2（上海） | oss-cn-shanghai |
| 华北1（青岛） | oss-cn-qingdao |
| 华北2（北京） | oss-cn-beijing |
| 华北3（张家口） | oss-cn-zhangjiakou |
| 华南1（深圳） | oss-cn-shenzhen |

---

## 📦 步骤 5: 安装依赖

安装阿里云 OSS SDK：

```bash
npm install ali-oss
```

---

## 🧪 步骤 6: 测试上传

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 登录管理员账号（test@example.com）

3. 进入「图书管理」页面

4. 点击「添加图书」

5. 尝试上传封面图片和图书文件

6. 检查阿里云 OSS 控制台，确认文件已上传

---

## 🔒 安全建议

### 1. 使用 RAM 子账号
- ❌ 不要使用主账号的 AccessKey
- ✅ 创建专门的 RAM 子账号，仅授予 OSS 权限

### 2. 最小权限原则
- ❌ 不要授予 `AliyunOSSFullAccess`
- ✅ 创建自定义策略，仅授予必要的权限

### 3. 定期轮换密钥
- 定期更换 AccessKey
- 禁用不再使用的 AccessKey

### 4. 使用 STS 临时凭证（高级）
- 对于客户端直传场景，使用 STS 临时凭证
- 避免在客户端暴露永久 AccessKey

### 5. 配置 CORS（如需客户端直传）
在 OSS 控制台配置 CORS 规则：
- **来源**: `http://localhost:3000`（开发环境）或您的域名
- **允许 Methods**: GET, POST, PUT, DELETE, HEAD
- **允许 Headers**: *
- **暴露 Headers**: ETag, x-oss-request-id

---

## 📁 文件组织结构

上传的文件将按以下结构组织：

```
brillance-files/
├── covers/          # 图书封面
│   ├── 1234567890-abc123.jpg
│   └── ...
├── books/           # 图书文件（PDF等）
│   ├── 1234567890-def456.pdf
│   └── ...
└── resources/       # 图书资源
    ├── 1234567890-ghi789.pdf
    └── ...
```

---

## 🐛 常见问题

### 1. 上传失败：AccessDenied
- 检查 AccessKey 是否正确
- 检查 RAM 用户是否有 OSS 权限
- 检查 Bucket 名称和地域是否正确

### 2. 上传失败：NoSuchBucket
- 检查 Bucket 名称是否正确
- 检查 Bucket 是否在指定的地域

### 3. 文件无法访问
- 如果 Bucket 是私有的，需要使用签名 URL
- 检查 Bucket 的读写权限设置

### 4. CORS 错误
- 在 OSS 控制台配置 CORS 规则
- 确保允许您的域名访问

---

## 💰 费用说明

OSS 按使用量计费，主要包括：
- **存储费用**: 按存储空间大小计费
- **流量费用**: 按下载流量计费
- **请求费用**: 按 API 请求次数计费

**建议**:
- 开启 OSS 的费用预警
- 定期清理不需要的文件
- 使用 CDN 加速，降低流量费用

---

## 📚 相关文档

- [阿里云 OSS 官方文档](https://help.aliyun.com/product/31815.html)
- [OSS Node.js SDK](https://help.aliyun.com/document_detail/32068.html)
- [RAM 访问控制](https://help.aliyun.com/product/28625.html)

---

## ✅ 配置完成

配置完成后，您可以：
- ✅ 上传图书封面
- ✅ 上传图书文件（PDF等）
- ✅ 为图书添加资源文件
- ✅ 管理和删除文件

如有问题，请查看控制台日志或联系技术支持。

