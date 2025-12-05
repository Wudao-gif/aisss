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
        """从文档块中提取实体和关系"""
        all_entities = []
        all_relations = []
        entity_map = {}  # name -> entity_id 映射，用于去重

        for i, chunk in enumerate(chunks):
            text = chunk.get("text", "")
            if len(text) < 50:  # 跳过太短的块
                continue

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

            except Exception as e:
                logger.warning(f"块 {i} 提取失败: {e}")
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
