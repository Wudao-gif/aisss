# 🔄 重构计划

## 📊 当前进度

```
第一阶段：基础架构      ████████████████████ 100% ✅
第二阶段：组件拆分      ████████████░░░░░░░░  60% 🔄
第三阶段：工程化配置    ░░░░░░░░░░░░░░░░░░░░   0% ⏳
```

---

## ✅ 已完成

### 第一阶段：基础架构
- [x] TypeScript 配置
- [x] 类型系统 (types/index.ts)
- [x] API 层 (lib/api/)
- [x] Zustand 状态管理 (stores/)
- [x] 错误处理 (ErrorBoundary)
- [x] 文档 (README, SETUP, MIGRATION)

### 第二阶段：组件拆分
- [x] 主页组件拆分
  - [x] Sidebar
  - [x] ChatInput
  - [x] BookshelfSection
  - [x] UserDropdown
- [x] 认证组件拆分
  - [x] LoginModal
  - [x] EmailLogin
  - [x] WeChatLogin

---

## 🔄 进行中

### 第二阶段：组件拆分（剩余）

#### 2.3 拆分 library 页面 (IN PROGRESS)
**目标**: 将 2446 行的 library/page.tsx 拆分成小组件

**需要创建的组件**:
1. `components/library/BookCard.tsx` - 书籍卡片
2. `components/library/BookDrawer.tsx` - 书籍详情抽屉
3. `components/library/SearchBar.tsx` - 搜索栏
4. `components/library/FilterBar.tsx` - 筛选栏（大学选择）
5. `components/library/Pagination.tsx` - 分页组件
6. `components/library/BookGrid.tsx` - 书籍网格

**UI 一致性要求**:
- ✅ 保持相同的卡片样式
- ✅ 保持相同的抽屉动画
- ✅ 保持相同的搜索交互
- ✅ 保持相同的分页样式

#### 2.4 创建共享组件库 (NOT STARTED)
**目标**: 抽离重复代码

**需要创建的组件**:
1. `components/shared/Header.tsx` - 顶部导航栏
2. `components/shared/NavTabs.tsx` - 5个选项卡导航
3. `components/shared/Logo.tsx` - Logo 组件
4. `components/shared/SearchInput.tsx` - 搜索输入框

#### 2.5 优化组件性能 (NOT STARTED)
**目标**: 添加性能优化

**优化项**:
- [ ] React.memo 包裹纯组件
- [ ] useCallback 优化回调函数
- [ ] useMemo 优化计算
- [ ] 虚拟滚动（对话列表）
- [ ] 图片懒加载

---

## ⏳ 待开始

### 第三阶段：工程化配置

#### 3.1 配置 ESLint + Prettier
- [ ] 安装依赖
- [ ] 配置规则
- [ ] 修复现有问题

#### 3.2 添加测试框架
- [ ] 安装 Vitest + Testing Library
- [ ] 编写组件测试
- [ ] 编写 API 测试

#### 3.3 添加 Git Hooks
- [ ] 安装 Husky
- [ ] 配置 lint-staged
- [ ] 提交前检查

#### 3.4 环境变量管理
- [x] 创建 .env 文件
- [ ] 文档化配置项

#### 3.5 完善文档
- [x] README.md
- [x] SETUP.md
- [x] MIGRATION.md
- [ ] API 文档
- [ ] 组件文档

---

## 🎯 下一步行动

### 立即执行（今天）
1. ✅ 创建 UI_CHECKLIST.md（确保 UI 一致性）
2. 🔄 拆分 library 页面组件
3. ⏳ 测试 library 页面功能

### 本周执行
1. 完成第二阶段所有组件拆分
2. 添加缺失的 UI 元素（5个选项卡导航等）
3. 确保新旧版本 UI 完全一致

### 下周执行
1. 开始第三阶段工程化配置
2. 添加测试
3. 准备对接后端

---

## ⚠️ 重要提醒

### UI 一致性原则
**代码可以完全重写，但 UI 必须完全一致！**

- ✅ 所有样式保持不变
- ✅ 所有交互保持不变
- ✅ 所有动画保持不变
- ✅ 所有布局保持不变

### 验收标准
- [ ] 用户无法区分新旧版本的外观
- [ ] 所有功能正常工作
- [ ] 代码质量显著提升
- [ ] 性能有所改善

---

## 📝 备注

- 旧版本保留在 `app/page.tsx` 和 `app/library/page.tsx`
- 新版本在 `app/new/page.tsx` 和 `app/library-new/page.tsx`
- 完成测试后再替换旧版本
- 保留旧版本作为备份（重命名为 .old.tsx）

---

**当前任务**: 拆分 library 页面 🔄
**预计完成时间**: 2-3 小时
**下一个任务**: 创建共享组件库

