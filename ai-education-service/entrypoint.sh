#!/bin/bash

# AI Education Service 启动脚本
# 在启动主应用前初始化数据库

set -e

echo "🚀 AI Education Service 启动脚本"
echo "=================================="

# 等待 PostgreSQL 就绪
echo "⏳ 等待 PostgreSQL 就绪..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if python -c "import psycopg2; psycopg2.connect(host='${POSTGRES_HOST:-127.0.0.1}', port=${POSTGRES_PORT:-5432}, user='${POSTGRES_USER:-postgres}', password='${POSTGRES_PASSWORD:-mysecretpassword}', database='${POSTGRES_DB:-user_auth_db}')" 2>/dev/null; then
        echo "✅ PostgreSQL 已就绪"
        break
    fi
    attempt=$((attempt + 1))
    echo "⏳ 等待 PostgreSQL... ($attempt/$max_attempts)"
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ PostgreSQL 连接超时"
    exit 1
fi

# 初始化数据库表
echo "🔧 初始化数据库表..."
python init_db.py

if [ $? -ne 0 ]; then
    echo "❌ 数据库初始化失败"
    exit 1
fi

echo "✅ 数据库初始化完成"
echo ""

# 启动主应用
echo "🚀 启动 AI Education Service..."
exec python main.py

