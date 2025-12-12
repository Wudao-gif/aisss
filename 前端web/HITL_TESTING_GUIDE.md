# 前端 HITL 功能测试指南

## 🧪 测试环境准备

### 1. 后端服务
确保后端 Deep Agent 已启用 HITL：
```bash
cd ai-education-service
python test_hitl.py  # 验证后端 HITL 功能
```

### 2. 前端依赖
确保已安装所有依赖：
```bash
cd 前端web
npm install  # 或 pnpm install
```

## 📋 测试场景

### 场景 1: 基础中断检测

**目标**: 验证前端能正确检测 HITL 中断

**步骤**:
1. 启动前端: `npm run dev`
2. 登录系统
3. 进入 book-chat-v2 页面
4. 发送一条会触发 memory_write 的消息
5. 观察是否显示 HITL 审批模态框

**预期结果**:
- ✅ 模态框显示
- ✅ 显示待审批的操作
- ✅ 显示操作参数

### 场景 2: 批准决策

**目标**: 验证批准决策的完整流程

**步骤**:
1. 在场景 1 的基础上
2. 点击"批准"按钮
3. 点击"提交决策"
4. 观察 AI 继续执行

**预期结果**:
- ✅ 模态框关闭
- ✅ AI 继续生成回复
- ✅ 操作被执行

### 场景 3: 拒绝决策

**目标**: 验证拒绝决策的流程

**步骤**:
1. 在场景 1 的基础上
2. 点击"拒绝"按钮
3. 点击"提交决策"
4. 观察 AI 跳过操作

**预期结果**:
- ✅ 模态框关闭
- ✅ 操作被跳过
- ✅ AI 继续执行其他操作

### 场景 4: 编辑决策

**目标**: 验证编辑参数后执行

**步骤**:
1. 在场景 1 的基础上
2. 点击"编辑"按钮
3. 修改 JSON 参数
4. 点击"保存编辑"
5. 点击"提交决策"

**预期结果**:
- ✅ 参数被修改
- ✅ 修改后的参数被执行
- ✅ AI 继续执行

### 场景 5: 多个操作

**目标**: 验证多个待审批操作的处理

**步骤**:
1. 发送会触发多个操作的消息
2. 为每个操作做出决策
3. 提交所有决策

**预期结果**:
- ✅ 显示所有操作
- ✅ 必须为每个操作做出决策
- ✅ 决策顺序正确

## 🔍 调试技巧

### 1. 浏览器控制台
```javascript
// 查看 HITL 状态
console.log('HITL State:', hitlState)

// 查看中断信息
console.log('Interrupt Info:', hitlState.interruptInfo)

// 查看格式化的操作
console.log('Formatted Actions:', hitlState.formattedActions)
```

### 2. 网络标签
- 查看 `/api/ai/chat` 请求的响应
- 查看 `/api/ai/chat/resume` 请求的响应
- 检查 SSE 事件流

### 3. 日志输出
```typescript
// 在 useHITL 中添加日志
console.log('🛑 中断检测:', interruptInfo)
console.log('📋 格式化操作:', formattedActions)
console.log('✅ 决策提交:', decisions)
```

## ✅ 测试检查清单

### 前端组件
- [ ] useHITL Hook 正确初始化
- [ ] HITLApprovalModal 正确显示
- [ ] 决策按钮正确响应
- [ ] 编辑功能正常工作

### 中断检测
- [ ] 能正确检测 `__interrupt__` 字段
- [ ] 能正确提取中断信息
- [ ] 能正确格式化操作

### 决策处理
- [ ] 能正确创建决策对象
- [ ] 能正确验证决策
- [ ] 能正确提交决策

### API 集成
- [ ] `/api/ai/chat` 返回中断信息
- [ ] `/api/ai/chat/resume` 接收决策
- [ ] 恢复后继续流式输出

### 用户体验
- [ ] 模态框显示清晰
- [ ] 操作参数易读
- [ ] 决策按钮易用
- [ ] 错误提示清楚

## 🐛 常见问题

### Q1: 模态框不显示
**原因**: 中断检测失败
**解决**:
1. 检查 SSE 数据格式
2. 检查 `__interrupt__` 字段
3. 查看浏览器控制台错误

### Q2: 决策提交失败
**原因**: 决策验证失败
**解决**:
1. 检查决策数量是否匹配
2. 检查决策类型是否被允许
3. 检查 edited_action 格式

### Q3: 恢复后没有响应
**原因**: API 调用失败
**解决**:
1. 检查 thread_id 是否正确
2. 检查网络请求
3. 查看后端日志

## 📊 性能测试

### 测试项目
- [ ] 中断检测延迟 < 100ms
- [ ] 模态框显示延迟 < 200ms
- [ ] 决策提交延迟 < 500ms
- [ ] 恢复执行延迟 < 1s

## 📞 相关文档

- `HITL_INTEGRATION_GUIDE.md` - 集成指南
- `HITL_INTEGRATION_EXAMPLE.tsx` - 代码示例
- `lib/hitl-utils.ts` - 工具函数
- `hooks/useHITL.ts` - Hook 实现

