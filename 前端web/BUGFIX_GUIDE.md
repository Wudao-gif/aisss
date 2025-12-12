# 🐛 问题修复指南

**修复时间**: 2025-11-10

---

## 📋 问题清单

### ❌ 问题 1: 封面未加载出来
**原因**: 使用了 Unsplash 图片，可能被墙

**解决方案**: 
- ✅ 更新 `scripts/seed-books.ts`
- ✅ 使用 `placeholder.com` 作为占位图（更稳定）
- ✅ 每本书使用不同颜色的占位图

---

### ❌ 问题 2: 添加书架失败 - "未提供认证令牌"
**原因**: 可能的原因
1. 用户未登录
2. Token 未正确存储在 localStorage
3. Token 已过期

**解决方案**:
1. **检查登录状态**
   ```javascript
   // 打开浏览器控制台，运行：
   localStorage.getItem('authToken')
   localStorage.getItem('loggedInUser')
   ```

2. **重新登录**
   - 退出登录
   - 重新登录
   - 检查 localStorage 中是否有 `authToken`

3. **调试步骤**
   ```javascript
   // 在浏览器控制台查看
   console.log('Token:', localStorage.getItem('authToken'))
   console.log('User:', localStorage.getItem('loggedInUser'))
   ```

---

### ❌ 问题 3: 电子教材资源列表还是虚拟数据
**原因**: BookDrawer 组件使用硬编码的示例数据

**解决方案**:
- ✅ 更新 `components/library/BookDrawer.tsx`
- ✅ 添加 `getBookResources` API 调用
- ✅ 添加加载状态
- ✅ 添加空状态提示
- ✅ 添加未登录提示

---

## 🔧 修复的文件

### 1. `scripts/seed-books.ts`
**修改内容**:
- 将 Unsplash 图片替换为 placeholder.com
- 每本书使用不同颜色

**示例**:
```typescript
coverUrl: 'https://via.placeholder.com/205x315/4A90E2/FFFFFF?text=高等数学'
```

---

### 2. `lib/api/books.ts`
**新增函数**:
```typescript
export async function getBookResources(bookId: string): Promise<any[]>
```

**功能**:
- 获取指定图书的资源列表
- 需要用户登录
- 根据用户大学返回对应资源

---

### 3. `components/library/BookDrawer.tsx`
**主要修改**:

1. **导入 API 函数**
```typescript
import { getBookResources } from '@/lib/api/books'
```

2. **添加状态**
```typescript
const [resources, setResources] = useState<any[]>([])
const [isLoadingResources, setIsLoadingResources] = useState(false)
```

3. **获取资源**
```typescript
useEffect(() => {
  if (isOpen && book && isAuthenticated) {
    const fetchResources = async () => {
      setIsLoadingResources(true)
      const data = await getBookResources(book.id)
      setResources(data)
      setIsLoadingResources(false)
    }
    fetchResources()
  }
}, [isOpen, book, isAuthenticated])
```

4. **显示状态**
- ✅ 加载中状态
- ✅ 未登录提示
- ✅ 空状态提示
- ✅ 资源列表

---

## 🚀 使用步骤

### 步骤 1: 清理旧数据（可选）
```bash
# 如果需要重新开始
npx prisma db push --force-reset
```

### 步骤 2: 添加图书数据
```bash
npx tsx scripts/seed-books.ts
```

**预期输出**:
```
🌱 开始添加图书测试数据...
✅ 成功添加 10 本图书！
```

### 步骤 3: 添加大学数据（如果还没有）
```bash
# 检查是否有大学数据
npx prisma studio
# 访问 http://localhost:5555
# 查看 universities 表
```

如果没有大学数据，需要先添加。

### 步骤 4: 添加图书资源数据
```bash
npx tsx scripts/seed-book-resources.ts
```

**预期输出**:
```
🌱 开始添加图书资源测试数据...
📚 找到 5 本图书
🏫 找到 X 所大学
✅ 成功添加 XX 个图书资源！
```

### 步骤 5: 启动开发服务器
```bash
npm run dev
```

### 步骤 6: 测试功能

1. **访问图书馆页面**
   ```
   http://localhost:3000/library-new
   ```

2. **检查封面**
   - ✅ 应该显示彩色占位图
   - ✅ 每本书颜色不同

3. **测试登录**
   - 点击"登录"按钮
   - 输入邮箱和密码
   - 登录成功后检查 localStorage

4. **测试添加书架**
   - 点击图书卡片的"+"按钮
   - 应该成功添加到书架
   - 如果失败，打开控制台查看错误

5. **测试资源列表**
   - 点击图书卡片打开详情抽屉
   - 应该显示资源列表
   - 如果未登录，显示"请先登录查看资源列表"
   - 如果已登录但无资源，显示"该图书暂无资源"

---

## 🔍 调试技巧

### 1. 检查 Token
```javascript
// 浏览器控制台
console.log('Token:', localStorage.getItem('authToken'))
console.log('User:', JSON.parse(localStorage.getItem('loggedInUser') || '{}'))
```

### 2. 检查 API 请求
打开浏览器开发者工具 → Network 标签页

**添加书架请求**:
```
POST /api/bookshelf
Headers:
  Authorization: Bearer <token>
Body:
  { "bookId": "xxx" }
```

**获取资源请求**:
```
GET /api/books/{bookId}/resources
Headers:
  Authorization: Bearer <token>
```

### 3. 查看数据库
```bash
npx prisma studio
```

访问 `http://localhost:5555` 查看：
- `books` 表 - 图书数据
- `book_resources` 表 - 资源数据
- `bookshelf_items` 表 - 书架数据
- `users` 表 - 用户数据

---

## ⚠️ 常见问题

### Q1: 封面还是不显示
**A**: 
1. 检查网络连接
2. 检查浏览器控制台是否有错误
3. 尝试使用本地图片

### Q2: 添加书架一直失败
**A**:
1. 检查是否已登录
   ```javascript
   localStorage.getItem('authToken')
   ```

2. 检查 Token 是否过期
   - 退出登录
   - 重新登录

3. 检查 API 响应
   - 打开 Network 标签页
   - 查看 `/api/bookshelf` 请求
   - 查看响应内容

### Q3: 资源列表为空
**A**:
1. 检查是否运行了 `seed-book-resources.ts`
2. 检查数据库中是否有资源数据
   ```bash
   npx prisma studio
   ```
3. 检查用户的大学是否有对应资源

### Q4: 资源列表显示"请先登录"
**A**:
1. 确认已登录
2. 检查 `isAuthenticated` 状态
3. 刷新页面重试

---

## 📊 数据流程

### 添加书架流程
```
用户点击"+"按钮
    ↓
检查登录状态
    ↓
调用 addToBookshelf(bookId)
    ↓
从 localStorage 获取 token
    ↓
POST /api/bookshelf
    ↓
后端验证 token
    ↓
添加到数据库
    ↓
返回成功/失败
    ↓
更新本地状态
```

### 获取资源流程
```
打开图书详情抽屉
    ↓
检查登录状态
    ↓
调用 getBookResources(bookId)
    ↓
从 localStorage 获取 token
    ↓
GET /api/books/{bookId}/resources
    ↓
后端验证 token
    ↓
获取用户大学
    ↓
查询该大学的资源
    ↓
返回资源列表
    ↓
显示在界面上
```

---

## 🎯 验证清单

完成修复后，请验证以下功能：

- [ ] 图书封面正常显示
- [ ] 登录功能正常
- [ ] Token 正确存储在 localStorage
- [ ] 添加书架成功
- [ ] 从书架移除成功
- [ ] 资源列表正常显示
- [ ] 未登录时显示提示
- [ ] 无资源时显示提示
- [ ] 加载状态正常显示

---

## 📝 下一步优化

1. **图片优化**
   - 上传真实封面到阿里云 OSS
   - 使用 Next.js Image 组件优化

2. **错误处理**
   - 添加全局错误提示
   - 添加重试机制

3. **性能优化**
   - 添加资源列表缓存
   - 实现虚拟滚动

4. **用户体验**
   - 添加骨架屏
   - 添加动画效果

---

**🎉 修复完成！如有问题，请查看上述调试技巧。**

