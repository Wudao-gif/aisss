"""
Deep Agents 官方示例
按照 https://docs.langchain.com/oss/python/deepagents/quickstart 步骤实现

步骤 1: 安装依赖 - pip install deepagents tavily-python (已完成)
步骤 2: 设置 API 密钥 - 使用 OpenRouter
步骤 3: 创建搜索工具
步骤 4: 创建深度代理
步骤 5: 运行代理
"""

import os
import sys
from typing import Literal

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config import settings

# ==================== 步骤 2: 设置 API 密钥 ====================
# 使用 OpenRouter API（通过环境变量）
os.environ["OPENROUTER_API_KEY"] = settings.OPENROUTER_API_KEY

# 如果有 Tavily API Key，设置它（可选，用于网络搜索）
# os.environ["TAVILY_API_KEY"] = "your-tavily-api-key"


# ==================== 步骤 3: 创建搜索工具 ====================
# 注意：这里我们先用一个简单的模拟搜索工具
# 后续会替换为你的 RAG 检索工具

def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
) -> str:
    """
    运行网络搜索（模拟版本）
    
    Args:
        query: 搜索查询
        max_results: 最大结果数
        topic: 主题类型
        include_raw_content: 是否包含原始内容
    
    Returns:
        搜索结果
    """
    # 模拟搜索结果
    return f"""
搜索结果 for "{query}":

1. LangGraph 是一个用于构建有状态、多参与者应用程序的框架
   - 支持循环和分支
   - 内置持久化
   - 人机协作支持

2. LangGraph 基于 LangChain 构建
   - 可以使用 LangChain 的所有组件
   - 提供更灵活的控制流

3. 主要特性
   - 状态管理
   - 检查点
   - 流式输出
"""


# ==================== 步骤 4: 创建深度代理 ====================
def create_research_agent():
    """创建研究型深度代理"""
    from deepagents import create_deep_agent
    from langchain_openai import ChatOpenAI

    # 使用 OpenRouter 模型（通过 OpenAI 兼容接口）
    model = ChatOpenAI(
        model="openai/gpt-4o-mini",
        api_key=settings.OPENROUTER_API_KEY,
        base_url=settings.OPENROUTER_BASE_URL,
    )
    
    # System prompt 引导代理成为专家研究员
    research_instructions = """你是一个专业的研究员。你的工作是进行深入研究并撰写精美的报告。

你可以使用网络搜索工具作为收集信息的主要手段。

## `internet_search`

使用此工具运行网络搜索。你可以指定返回的最大结果数、主题以及是否包含原始内容。

请用中文回答所有问题。
"""
    
    agent = create_deep_agent(
        model=model,
        tools=[internet_search],
        system_prompt=research_instructions
    )
    
    return agent


# ==================== 步骤 5: 运行代理 ====================
def run_demo():
    """运行演示"""
    print("=" * 60)
    print("Deep Agents 演示")
    print("=" * 60)
    
    # 创建代理
    print("\n正在创建深度代理...")
    agent = create_research_agent()
    print("代理创建成功！")
    
    # 运行代理
    print("\n正在运行代理...")
    result = agent.invoke({
        "messages": [{"role": "user", "content": "什么是 LangGraph？"}]
    })
    
    # 打印结果
    print("\n" + "=" * 60)
    print("代理回复:")
    print("=" * 60)
    print(result["messages"][-1].content)


if __name__ == "__main__":
    run_demo()

