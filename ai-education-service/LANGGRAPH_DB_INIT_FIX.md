# LangGraph 数据库初始化修复

## 问题描述

当前端发送 AI 对话请求时，后端出现错误：
```
ERROR - Deep Agent 流式运行失败: relation "checkpoints" does not exist at character 919
```

**根本原因**：
- LangGraph 需要在 PostgreSQL 中创建 `checkpoints` 表来存储对话状态
- 应用启动时的数据库初始化可能失败或不完整
- 当 Deep Agent 尝试访问不存在的表时，导致错误

## 解决方案

### 1. 创建数据库初始化脚本 ✅
**文件**: `init_db.py`

独立的初始化脚本，在应用启动前运行，确保所有必要的表都已创建：
- 初始化 `AsyncPostgresStore`（长期记忆）
- 初始化 `AsyncPostgresSaver`（短期记忆）
- 创建所有必要的数据库表

### 2. 创建启动脚本 ✅
**文件**: `entrypoint.sh`

Docker 容器启动脚本，执行以下步骤：
1. 等待 PostgreSQL 就绪（最多 30 秒）
2. 运行 `init_db.py` 初始化数据库
3. 启动主应用 `main.py`

### 3. 更新 Dockerfile ✅
**修改**:
- 复制 `entrypoint.sh` 到容器
- 设置执行权限
- 使用 `ENTRYPOINT` 而不是 `CMD`

## 修复完成清单

- [x] 创建 `init_db.py` 初始化脚本
- [x] 创建 `entrypoint.sh` 启动脚本
- [x] 更新 `Dockerfile` 使用启动脚本
- [x] 添加 PostgreSQL 就绪检查
- [x] 添加错误处理和日志

## 部署步骤

### 1. 重建 Docker 镜像
```bash
cd ai-education-service
docker build -t ai-education-service:latest .
```

### 2. 重启容器
```bash
docker-compose down
docker-compose up -d
```

### 3. 验证初始化
查看容器日志：
```bash
docker logs ai-education-service
```

应该看到：
```
✅ Store 初始化完成
✅ Checkpointer 初始化完成
✅ 数据库初始化成功！
🚀 启动 AI Education Service...
```

## 数据库表说明

LangGraph 创建的表：

| 表名 | 用途 |
|------|------|
| `checkpoint_migrations` | 迁移版本跟踪 |
| `checkpoints` | 对话状态快照 |
| `checkpoint_blobs` | 大型数据块存储 |
| `checkpoint_writes` | 写入操作日志 |
| `store_*` | 长期记忆存储 |

## 故障排除

### 问题：PostgreSQL 连接超时
```
❌ PostgreSQL 连接超时
```

**解决方案**：
1. 检查 PostgreSQL 容器是否运行：`docker ps | grep postgres`
2. 检查网络连接：`docker network ls`
3. 增加等待时间（修改 `entrypoint.sh` 中的 `max_attempts`）

### 问题：权限错误
```
ERROR: permission denied for schema public
```

**解决方案**：
1. 确保 PostgreSQL 用户有创建表的权限
2. 运行：`ALTER USER postgres CREATEDB;`

### 问题：表已存在
```
ERROR: relation "checkpoints" already exists
```

**解决方案**：
这是正常的，脚本使用 `CREATE TABLE IF NOT EXISTS`，不会重复创建。

## 相关文件

- `init_db.py` - 数据库初始化脚本
- `entrypoint.sh` - Docker 启动脚本
- `Dockerfile` - 容器配置
- `main.py` - 主应用（已有初始化代码）

## 验证修复

1. **启动应用**
   ```bash
   docker-compose up -d
   ```

2. **发送 AI 对话请求**
   ```bash
   curl -X POST http://localhost:8000/api/v4/chat \
     -H "Content-Type: application/json" \
     -d '{"question": "你好", "user_id": "test", "book_id": "test"}'
   ```

3. **检查日志**
   ```bash
   docker logs ai-education-service
   ```

应该不再出现 `relation "checkpoints" does not exist` 错误。

