# 🔌 图书馆页面 API 接入指南

**更新时间**: 2025-11-10

---

## ✅ 已完成的工作

### 1. 更新类型定义
- ✅ 更新 `types/index.ts` 中的 `Book` 接口
- ✅ 添加 `coverUrl`, `fileUrl`, `fileSize`, `allowReading` 字段
- ✅ 保持向后兼容（`cover`, `university`, `description`）

### 2. 更新重构版本图书馆页面
- ✅ 导入 `getBooks` API 函数
- ✅ 使用 `useEffect` 从API获取数据
- ✅ 添加加载状态处理
- ✅ 更新书架添加/移除逻辑（调用API）
- ✅ 更新 `BookCard` 组件支持新数据格式
- ✅ 更新 `BookDrawer` 组件支持新数据格式

### 3. 修复API路径
- ✅ 修复 `lib/api/books.ts` 中的API路径（`/api/books`）

---

## 📁 修改的文件

```
types/index.ts                      # 更新Book类型定义
app/library-new/page.tsx            # 接入真实API
components/library/BookCard.tsx     # 支持新数据格式
components/library/BookDrawer.tsx   # 支持新数据格式
lib/api/books.ts                    # 修复API路径
scripts/seed-books.ts               # 新增：图书数据初始化脚本
```

---

## 🚀 使用步骤

### 步骤 1: 确保数据库运行

```bash
# 检查PostgreSQL容器是否运行
docker ps | grep postgres

# 如果没有运行，启动容器
docker start my-auth-postgres
```

### 步骤 2: 添加测试数据（首次使用）

```bash
# 进入项目目录
cd C:\Users\daowu\Desktop\前端web

# 运行图书数据初始化脚本
npx tsx scripts/seed-books.ts
```

这会添加10本测试图书到数据库。

### 步骤 3: 启动开发服务器

```bash
npm run dev
```

### 步骤 4: 访问重构版本图书馆页面

打开浏览器访问：
```
http://localhost:3000/library-new
```

---

## 🔍 API 端点说明

### 1. 获取图书列表
```
GET /api/books?search=关键词
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "高等数学（第七版）上册",
      "isbn": "978-7-04-039766-6",
      "author": "同济大学数学系",
      "publisher": "高等教育出版社",
      "coverUrl": "https://...",
      "fileUrl": null,
      "fileSize": null,
      "allowReading": false,
      "createdAt": "2025-11-10T...",
      "updatedAt": "2025-11-10T..."
    }
  ]
}
```

### 2. 添加到书架
```
POST /api/bookshelf
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": "uuid"
}
```

### 3. 从书架移除
```
DELETE /api/bookshelf?bookId=uuid
Authorization: Bearer <token>
```

---

## 📊 数据流程

```
用户访问 /library-new
    ↓
useEffect 触发
    ↓
调用 getBooks() API
    ↓
GET /api/books
    ↓
Prisma 查询数据库
    ↓
返回图书列表
    ↓
更新 allBooks 状态
    ↓
渲染 BookGrid 组件
```

---

## 🎨 UI 特性

### 加载状态
- ✅ 显示加载动画
- ✅ 禁用交互

### 空状态
- ✅ 显示"未找到相关教材"
- ✅ 提示尝试其他关键词

### 搜索功能
- ✅ 支持按书名、ISBN、作者、出版社搜索
- ✅ 300ms 防抖优化
- ✅ 实时筛选

### 书架管理
- ✅ 未登录时提示登录
- ✅ 调用API添加/移除
- ✅ 本地状态同步
- ✅ 错误提示

---

## 🔧 调试技巧

### 1. 查看API请求

打开浏览器开发者工具 → Network 标签页，筛选 `books`

### 2. 查看数据库数据

```bash
npx prisma studio
```

访问 `http://localhost:5555` 查看数据库内容

### 3. 查看控制台日志

```javascript
// 在 app/library-new/page.tsx 中添加
console.log('获取到的图书:', books)
```

---

## ⚠️ 常见问题

### 问题 1: 页面显示"未找到相关教材"

**原因**: 数据库中没有图书数据

**解决**:
```bash
npx tsx scripts/seed-books.ts
```

### 问题 2: API 返回 500 错误

**原因**: 数据库连接失败

**解决**:
```bash
# 检查数据库容器
docker ps | grep postgres

# 重启容器
docker restart my-auth-postgres

# 测试连接
npx prisma db pull
```

### 问题 3: 图片不显示

**原因**: 使用了 Unsplash 图片，可能被墙

**解决**:
- 使用VPN
- 或上传图片到阿里云OSS，更新 `coverUrl`

### 问题 4: 添加到书架失败

**原因**: 未登录或token过期

**解决**:
- 先登录账号
- 检查 localStorage 中的 `authToken`

---

## 📝 下一步计划

### 短期（本周）
- [ ] 添加更多测试图书数据
- [ ] 实现服务端分页（提升性能）
- [ ] 添加图书详情页面
- [ ] 实现图书资源列表API

### 中期（本月）
- [ ] 上传真实图书封面到OSS
- [ ] 实现图书文件上传
- [ ] 添加图书资源管理
- [ ] 实现按大学筛选资源

### 长期（下月）
- [ ] 实现图书推荐算法
- [ ] 添加图书评分功能
- [ ] 实现图书笔记功能
- [ ] 添加图书阅读进度

---

## 🎯 性能优化建议

### 1. 服务端分页
当前是客户端分页（一次性加载所有数据），建议改为服务端分页：

```typescript
// API: GET /api/books?page=1&pageSize=15
const { books, total, totalPages } = await getBooks({ page: 1, pageSize: 15 })
```

### 2. 图片懒加载
使用 Next.js Image 组件：

```tsx
import Image from 'next/image'

<Image 
  src={coverUrl} 
  alt={book.name}
  width={205}
  height={315}
  loading="lazy"
/>
```

### 3. 搜索防抖
已实现（300ms），可根据需要调整

### 4. 缓存策略
使用 SWR 或 React Query 缓存API数据

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. ✅ 数据库是否运行
2. ✅ 是否运行了seed脚本
3. ✅ API路径是否正确
4. ✅ 浏览器控制台是否有错误

---

## 🎉 完成！

现在你的图书馆页面已经成功接入真实API！

访问 `http://localhost:3000/library-new` 查看效果。

