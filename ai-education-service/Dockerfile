# AI 教育资料处理服务 Dockerfile
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 安装编译依赖（用于某些需要编译的包）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 配置 pip 使用阿里云镜像源
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    pip config set global.trusted-host mirrors.aliyun.com

# 复制依赖文件
COPY requirements.txt .

# 升级 pip 并安装依赖
# 先安装 numpy 和 pandas 确保使用预编译版本
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir numpy>=1.24.0 pandas>=2.0.0 && \
    pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建临时文件目录
RUN mkdir -p /app/temp

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

