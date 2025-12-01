# AI 教育资料处理服务

本服务用于处理教育资料文件，将其转换为向量并存储到向量数据库中，为 AI 大模型提供知识库支持。

## 🏗️ 系统架构

```
现有后端上传文件到 OSS
        ↓
调用 Python 服务 API (/api/process-document)
        ↓
┌─────────────────────────────────────────┐
│           Python 处理服务                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ OSS下载 │→│文档处理 │→│向量存储 │  │
│  └─────────┘  └─────────┘  └─────────┘  │
│       ↓           ↓           ↓         │
│   阿里云OSS   LlamaIndex   DashVector   │
│              OpenRouter                  │
└─────────────────────────────────────────┘
```

## 📁 项目结构

```
ai-education-service/
├── main.py              # 应用入口
├── requirements.txt     # Python 依赖
├── .env.example         # 环境变量示例
├── config/
│   ├── __init__.py
│   └── settings.py      # 配置管理
├── api/
│   ├── __init__.py
│   ├── routes.py        # API 路由
│   ├── schemas.py       # 请求/响应模型
│   └── dependencies.py  # 依赖注入
└── modules/
    ├── __init__.py
    ├── oss_downloader.py    # OSS 下载模块
    ├── document_processor.py # 文档处理模块
    ├── vector_store.py      # 向量存储模块
    └── pipeline.py          # 处理管道
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env 文件，填入实际配置值
```

### 3. 启动服务

```bash
# 开发模式
python main.py

# 或使用 uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 访问 API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📡 API 接口

### POST /api/process-document

处理文档（同步）

**请求头：**
```
X-API-Key: your-api-key
Content-Type: application/json
```

**请求体：**
```json
{
  "oss_key": "book-files/1234567890-abc123.pdf",
  "bucket": null,
  "metadata": {
    "book_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "高等数学（上册）"
  }
}
```

**响应：**
```json
{
  "success": true,
  "message": "文档处理成功",
  "data": {
    "status": "completed",
    "file_key": "book-files/1234567890-abc123.pdf",
    "chunks_count": 42,
    "vectors_stored": 42
  }
}
```

### POST /api/process-document/async

异步处理文档（立即返回，后台处理）

### GET /api/health

健康检查

## ⚙️ 配置说明

| 配置项 | 说明 | 必填 |
|--------|------|------|
| OSS_ACCESS_KEY_ID | 阿里云 AccessKey ID | ✅ |
| OSS_ACCESS_KEY_SECRET | 阿里云 AccessKey Secret | ✅ |
| OSS_BUCKET | OSS Bucket 名称 | ✅ |
| OPENROUTER_API_KEY | OpenRouter API Key | ✅ |
| DASHVECTOR_API_KEY | DashVector API Key | ✅ |
| DASHVECTOR_ENDPOINT | DashVector 服务地址 | ✅ |
| API_KEY | 服务认证密钥 | 可选 |

## 📄 支持的文件格式

- PDF (.pdf)
- Word (.doc, .docx)
- PowerPoint (.ppt, .pptx)
- 纯文本 (.txt)
- Markdown (.md)

## 🔧 现有后端集成示例

### Next.js/TypeScript 调用示例

```typescript
// 在文件上传成功后调用
async function processDocument(ossKey: string, metadata: object) {
  const response = await fetch('http://localhost:8000/api/process-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.AI_SERVICE_API_KEY
    },
    body: JSON.stringify({
      oss_key: ossKey,
      metadata: metadata
    })
  });
  
  return response.json();
}
```

