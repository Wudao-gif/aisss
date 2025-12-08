"""
测试 LangGraph Supervisor 流程
"""

import asyncio
import sys

# 设置 UTF-8 编码
sys.stdout.reconfigure(encoding='utf-8')


async def test_graph():
    """测试 Graph 创建和运行"""
    print("=" * 50)
    print("测试 LangGraph Supervisor")
    print("=" * 50)
    
    # 1. 测试导入
    print("\n[1] 测试导入...")
    try:
        from modules.langgraph import (
            AgentState,
            create_graph,
            compile_graph,
            run_graph,
            TaskType,
            EvidenceSource
        )
        print("    ✓ 导入成功")
    except Exception as e:
        print(f"    ✗ 导入失败: {e}")
        return
    
    # 2. 测试创建图
    print("\n[2] 测试创建图...")
    try:
        graph = create_graph()
        print("    ✓ Graph 创建成功")
        print(f"    节点: {list(graph.nodes.keys())}")
    except Exception as e:
        print(f"    ✗ 创建失败: {e}")
        return
    
    # 3. 测试编译图
    print("\n[3] 测试编译图...")
    try:
        compiled = compile_graph()
        print("    ✓ Graph 编译成功")
    except Exception as e:
        print(f"    ✗ 编译失败: {e}")
        return
    
    # 4. 测试运行图（简单查询）
    print("\n[4] 测试运行图...")
    print("    注意: 需要 Letta 服务和 DashVector 可用")
    
    try:
        result = await run_graph(
            query="什么是导数？",
            user_id="test_user",
            book_id="test_book",
            book_name="高等数学",
            book_subject="数学",
            history=[]
        )
        
        print("    ✓ Graph 运行成功")
        print(f"    任务类型: {result.get('task_type', 'N/A')}")
        print(f"    证据来源: {result.get('evidence_source', 'N/A')}")
        print(f"    回答长度: {len(result.get('answer', ''))} 字符")
        
        if result.get('error'):
            print(f"    ⚠ 警告: {result['error']}")
        
        # 显示回答预览
        answer = result.get('answer', '')
        if answer:
            print(f"\n    回答预览:")
            print(f"    {answer[:200]}...")
            
    except Exception as e:
        print(f"    ✗ 运行失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("测试完成")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(test_graph())

