"""
Human-in-the-loop (HITL) 处理模块

处理 Deep Agent 的中断请求，展示待审批操作给用户，
收集用户决策，并恢复 Agent 执行。
"""

import logging
from typing import Dict, Any, List, Optional
from langgraph.types import Command

logger = logging.getLogger(__name__)


def extract_interrupt_info(result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    从 Agent 结果中提取中断信息
    
    Args:
        result: Agent 的执行结果
        
    Returns:
        中断信息字典，如果没有中断则返回 None
    """
    if not result.get("__interrupt__"):
        return None
    
    try:
        interrupts = result["__interrupt__"][0].value
        action_requests = interrupts.get("action_requests", [])
        review_configs = interrupts.get("review_configs", [])
        
        # 创建工具名称到审查配置的映射
        config_map = {cfg["action_name"]: cfg for cfg in review_configs}
        
        return {
            "action_requests": action_requests,
            "review_configs": review_configs,
            "config_map": config_map,
        }
    except Exception as e:
        logger.error(f"提取中断信息失败: {e}")
        return None


def format_interrupt_for_display(interrupt_info: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    格式化中断信息用于前端展示
    
    Args:
        interrupt_info: 中断信息字典
        
    Returns:
        格式化后的操作列表
    """
    actions = []
    action_requests = interrupt_info.get("action_requests", [])
    config_map = interrupt_info.get("config_map", {})
    
    for idx, action in enumerate(action_requests):
        review_config = config_map.get(action["name"], {})
        
        actions.append({
            "index": idx,
            "tool_name": action["name"],
            "arguments": action.get("args", {}),
            "allowed_decisions": review_config.get("allowed_decisions", []),
            "description": review_config.get("description", ""),
        })
    
    return actions


def create_resume_command(decisions: List[Dict[str, Any]]) -> Command:
    """
    创建恢复执行的 Command
    
    Args:
        decisions: 用户决策列表
        
    Returns:
        LangGraph Command 对象
    """
    return Command(resume={"decisions": decisions})


def validate_decisions(
    decisions: List[Dict[str, Any]],
    action_requests: List[Dict[str, Any]],
    config_map: Dict[str, Dict[str, Any]]
) -> tuple[bool, Optional[str]]:
    """
    验证用户决策是否有效
    
    Args:
        decisions: 用户决策列表
        action_requests: 待审批的操作列表
        config_map: 工具配置映射
        
    Returns:
        (是否有效, 错误信息)
    """
    # 检查决策数量
    if len(decisions) != len(action_requests):
        return False, f"决策数量({len(decisions)})与操作数量({len(action_requests)})不匹配"
    
    # 验证每个决策
    for idx, (decision, action) in enumerate(zip(decisions, action_requests)):
        tool_name = action["name"]
        review_config = config_map.get(tool_name, {})
        allowed_decisions = review_config.get("allowed_decisions", [])
        
        decision_type = decision.get("type")
        
        # 检查决策类型是否被允许
        if decision_type not in allowed_decisions:
            return False, f"操作 {idx}({tool_name}): 决策类型 '{decision_type}' 不被允许。允许的类型: {allowed_decisions}"
        
        # 如果是 edit 决策，检查 edited_action
        if decision_type == "edit":
            if "edited_action" not in decision:
                return False, f"操作 {idx}: edit 决策必须包含 'edited_action'"
            
            edited_action = decision["edited_action"]
            if "name" not in edited_action or "args" not in edited_action:
                return False, f"操作 {idx}: edited_action 必须包含 'name' 和 'args'"
    
    return True, None

