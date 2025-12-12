# book-chat-v2 详细改进清单

## 📊 功能对比表

| 功能 | 改进前 | 改进后 | 说明 |
|------|--------|--------|------|
| **代码块** | 无样式 | 深色背景 + 高亮 | 更易阅读，支持滚动 |
| **表格** | 无样式 | 完整边框 + 表头 | 清晰的表格结构 |
| **引用块** | 无样式 | 蓝色竖线 + 斜体 | 视觉上突出引用 |
| **链接** | 无交互 | 可点击 + 新标签页 | 改进用户体验 |
| **标题** | 统一大小 | 分级显示 | H1-H3 不同大小 |
| **参考来源** | 简单按钮 | 渐变 + 圆形标记 | 更美观，更易识别 |
| **思考步骤位置** | 消息下方 | 顶部面板 | 始终可见，不混乱 |
| **步骤显示** | 会消失 | 始终存在 | 用户可随时查看 |
| **步骤折叠** | 无 | 可折叠 | 节省空间 |
| **步骤状态** | 简单显示 | 实时更新 | pending/running/done |

---

## 🎨 样式改进详情

### 代码块
```css
/* 内联代码 */
background: #f5f5f5;
border-radius: 6px;
padding: 2px 6px;
font-family: monospace;

/* 代码块 */
background: #1e1e1e;
color: #d4d4d4;
padding: 12px;
border-radius: 8px;
overflow: auto;
```

### 表格
```css
border-collapse: collapse;
width: 100%;
font-size: 0.875em;

/* 表头 */
background: #f9fafb;
font-weight: 600;

/* 单元格 */
border: 1px solid #e5e7eb;
padding: 8px 12px;
```

### 引用块
```css
border-left: 4px solid #3b82f6;
padding-left: 12px;
color: #6b7280;
font-style: italic;
```

---

## 🔧 技术实现

### Markdown 组件配置
- 使用 `@lobehub/ui` 的 Markdown 组件
- 通过 `style` prop 自定义各元素样式
- 通过 `onLinkClick` 处理链接点击事件

### 思考步骤面板
- 独立的顶部面板，不在消息列表中
- 使用 Collapsible 组件实现折叠功能
- 条件渲染: `isTyping || thinkingSteps.length > 0`
- 响应式设计: 小屏幕隐藏头像

---

## 📱 响应式设计

### 思考步骤面板
- **sm 以上**: 显示 AI 头像 (32px)
- **sm 以下**: 隐藏头像，节省空间
- **所有屏幕**: 步骤内容完整显示

### Markdown 内容
- 表格: 自动调整宽度
- 代码块: 支持水平滚动
- 链接: 自动换行

---

## ✅ 测试清单

- [ ] 代码块显示正确
- [ ] 表格边框完整
- [ ] 引用块有蓝色竖线
- [ ] 链接可点击
- [ ] 思考步骤在顶部显示
- [ ] 步骤可折叠/展开
- [ ] 小屏幕上响应式正确
- [ ] 参考来源按钮美观
- [ ] 步骤状态实时更新

