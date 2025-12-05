"""
实体关系提取器
从文档中提取实体和关系，存入 Neo4j 知识图谱
"""

import logging
import json
import hashlib
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

import httpx

from config import settings
from .knowledge_graph import Entity, Relation, get_kg_store

logger = logging.getLogger(__name__)


@dataclass
class ExtractionResult:
    """提取结果"""
    entities: List[Entity]
    relations: List[Relation]
    raw_text: str


class EntityExtractor:
    """实体关系提取器"""

    def __init__(self):
        self.chat_model = settings.CHAT_MODEL

    async def extract_from_chunks(self, chunks: List[Dict], book_id: str) -> ExtractionResult:
        """从文档块中提取实体和关系（优化版：合并 chunks 减少 LLM 调用）"""
        all_entities = []
        all_relations = []
        entity_map = {}  # name -> entity_id 映射，用于去重

        # 合并 chunks，每组最多 5000 字符，减少 LLM 调用次数
        merged_texts = []
        current_text = ""
        MAX_CHARS = 5000

        for chunk in chunks:
            text = chunk.get("text", "").strip()
            if len(text) < 50:  # 跳过太短的块
                continue

            if len(current_text) + len(text) > MAX_CHARS:
                if current_text:
                    merged_texts.append(current_text)
                current_text = text
            else:
                current_text += "\n\n" + text if current_text else text

        if current_text:
            merged_texts.append(current_text)

        logger.info(f"合并 {len(chunks)} 个 chunks 为 {len(merged_texts)} 个批次进行提取")

        for i, text in enumerate(merged_texts):
            try:
                entities, relations = await self._extract_from_text(text, book_id, i)

                # 去重并合并实体
                for e in entities:
                    if e.name not in entity_map:
                        entity_map[e.name] = e.id
                        all_entities.append(e)
                    else:
                        # 更新关系中的 ID
                        old_id = e.id
                        new_id = entity_map[e.name]
                        for r in relations:
                            if r.source_id == old_id:
                                r.source_id = new_id
                            if r.target_id == old_id:
                                r.target_id = new_id

                all_relations.extend(relations)
                logger.info(f"批次 {i+1}/{len(merged_texts)} 提取完成: {len(entities)} 实体, {len(relations)} 关系")

            except Exception as e:
                logger.warning(f"批次 {i} 提取失败: {e}")
                continue

        logger.info(f"提取完成: {len(all_entities)} 实体, {len(all_relations)} 关系")
        return ExtractionResult(
            entities=all_entities,
            relations=all_relations,
            raw_text=""
        )

    async def _extract_from_text(self, text: str, book_id: str, chunk_idx: int) -> Tuple[List[Entity], List[Relation]]:
        """从单个文本块提取实体和关系"""
        prompt = f"""从以下教育资料文本中提取关键实体和它们之间的关系。

文本:
{text[:1500]}

请提取（返回 JSON）:
{{
  "entities": [
    {{"name": "实体名", "type": "Concept|Person|Term|Formula|Theorem|Chapter"}}
  ],
  "relations": [
    {{"source": "实体A", "target": "实体B", "type": "DEFINES|EXPLAINS|PART_OF|RELATES_TO|EXAMPLE_OF|PREREQUISITE"}}
  ]
}}

注意:
- 只提取重要的概念、术语、定理、公式等
- 关系类型: DEFINES(定义), EXPLAINS(解释), PART_OF(属于), RELATES_TO(相关), EXAMPLE_OF(举例), PREREQUISITE(前置知识)
- 每个文本块最多提取 10 个实体和 15 个关系"""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                    json={
                        "model": self.chat_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1
                    }
                )
                result = response.json()["choices"][0]["message"]["content"]

                # 解析 JSON
                if "```" in result:
                    result = result.split("```")[1].replace("json", "").strip()
                parsed = json.loads(result)

                # 转换为 Entity 和 Relation 对象
                entities = []
                name_to_id = {}

                for e in parsed.get("entities", []):
                    name = e.get("name", "").strip()
                    if not name:
                        continue

                    # 生成稳定的 ID
                    entity_id = self._generate_id(book_id, name)
                    name_to_id[name] = entity_id

                    entities.append(Entity(
                        id=entity_id,
                        name=name,
                        type=e.get("type", "Concept"),
                        book_id=book_id,
                        properties={"chunk_idx": chunk_idx}
                    ))

                relations = []
                for r in parsed.get("relations", []):
                    source = r.get("source", "").strip()
                    target = r.get("target", "").strip()

                    if source not in name_to_id or target not in name_to_id:
                        continue

                    relations.append(Relation(
                        source_id=name_to_id[source],
                        target_id=name_to_id[target],
                        type=r.get("type", "RELATES_TO"),
                        properties={"book_id": book_id}
                    ))

                return entities, relations

        except Exception as e:
            logger.error(f"LLM 提取失败: {e}")
            return [], []

    def _generate_id(self, book_id: str, name: str) -> str:
        """生成稳定的实体 ID"""
        content = f"{book_id}:{name}"
        return hashlib.md5(content.encode()).hexdigest()[:16]

    async def save_to_neo4j(self, result: ExtractionResult) -> Dict[str, int]:
        """将提取结果保存到 Neo4j"""
        try:
            store = await get_kg_store()
            entity_count = await store.add_entities_batch(result.entities)
            relation_count = await store.add_relations_batch(result.relations)
            logger.info(f"Neo4j 保存完成: {entity_count} 实体, {relation_count} 关系")
            return {"entities": entity_count, "relations": relation_count}
        except Exception as e:
            logger.error(f"Neo4j 保存失败: {e}")
            return {"entities": 0, "relations": 0, "error": str(e)}


async def extract_and_save(chunks: List[Dict], book_id: str) -> Dict[str, Any]:
    """提取实体关系并保存到 Neo4j（便捷函数）"""
    extractor = EntityExtractor()
    result = await extractor.extract_from_chunks(chunks, book_id)
    save_result = await extractor.save_to_neo4j(result)
    return {
        "extracted": {"entities": len(result.entities), "relations": len(result.relations)},
        "saved": save_result
    }

async def analyze_resource_chapter_relations(chunks: List[Dict], book_id: str, 
                                              resource_id: str, resource_name: str = None) -> Dict[str, Any]:
    """
    分析学习资源与教材章节的关联
    
    1. 建立 BOOK_HAS_RESOURCE 关系
    2. 使用 LLM 分析资源内容与教材章节的关联
    3. 建立 RELATES_TO 关系
    """
    from .knowledge_graph import get_kg_store
    
    result = {
        "book_resource_relation": False,
        "chapter_relations": [],
        "entities_extracted": 0,
        "relations_extracted": 0
    }
    
    try:
        store = await get_kg_store()
        
        # 1. 建立教材-资源关系
        result["book_resource_relation"] = await store.add_book_resource_relation(
            book_id=book_id,
            resource_id=resource_id,
            resource_name=resource_name
        )
        
        # 2. 获取教材的章节实体
        book_entities = await store.search_entities(query="", book_id=book_id, limit=50)
        chapter_entities = [e for e in book_entities if e.get("type") in ["Chapter", "Concept", "Topic"]]
        
        if not chapter_entities or not chunks:
            logger.info(f"无章节实体或无内容块，跳过关联分析")
            return result
        
        # 3. 使用 LLM 分析关联
        extractor = EntityExtractor()
        
        # 合并资源内容
        resource_text = "\n".join([c.get("text", "")[:500] for c in chunks[:5]])
        chapter_names = [e.get("name", "") for e in chapter_entities[:20]]
        
        prompt = f"""分析以下学习资源内容与教材章节的关联。

学习资源内容摘要:
{resource_text[:2000]}

教材章节列表:
{', '.join(chapter_names)}

请返回 JSON 格式，指出资源与哪些章节相关:
{{
  "related_chapters": [
    {{"chapter_name": "章节名", "relevance": "high|medium|low", "reason": "关联原因"}}
  ]
}}

只返回确实相关的章节，不要强行关联。"""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                    json={
                        "model": settings.CHAT_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1
                    }
                )
                llm_result = response.json()["choices"][0]["message"]["content"]
                
                if "```" in llm_result:
                    llm_result = llm_result.split("```")[1].replace("json", "").strip()
                parsed = json.loads(llm_result)
                
                # 4. 建立关联关系
                for rel in parsed.get("related_chapters", []):
                    chapter_name = rel.get("chapter_name", "")
                    # 找到对应的章节实体
                    matching = [e for e in chapter_entities if chapter_name in e.get("name", "")]
                    if matching:
                        chapter_entity = matching[0]
                        success = await store.link_resource_to_chapter(
                            resource_id=resource_id,
                            chapter_entity_id=chapter_entity.get("id"),
                            relation_type=f"RELATES_TO_{rel.get('relevance', 'medium').upper()}"
                        )
                        if success:
                            result["chapter_relations"].append({
                                "chapter": chapter_name,
                                "relevance": rel.get("relevance"),
                                "reason": rel.get("reason")
                            })
                
                logger.info(f"资源-章节关联分析完成: {len(result['chapter_relations'])} 个关联")
                
        except Exception as e:
            logger.warning(f"LLM 关联分析失败: {e}")
        
        # 5. 同时提取资源中的实体
        extraction_result = await extract_and_save(chunks, book_id)
        result["entities_extracted"] = extraction_result.get("saved", {}).get("entities", 0)
        result["relations_extracted"] = extraction_result.get("saved", {}).get("relations", 0)
        
    except Exception as e:
        logger.error(f"资源关联分析失败: {e}")
    
    return result
