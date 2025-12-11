"""
实体关系提取器
从文档中提取实体和关系，存入 Neo4j 知识图谱
支持 GraphRAG：提取实体后生成向量嵌入
"""

import logging
import json
import hashlib
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

import httpx

from config import settings
from .knowledge_graph import Entity, Relation, Chapter, ResourceSection, get_kg_store
from .document_processor import get_embedding_model

logger = logging.getLogger(__name__)


@dataclass
class ExtractionResult:
    """提取结果"""
    entities: List[Entity]
    relations: List[Relation]
    raw_text: str


class EntityExtractor:
    """实体关系提取器（支持 GraphRAG 向量嵌入）"""

    def __init__(self):
        self.chat_model = settings.CHAT_MODEL
        self.embedding_model = get_embedding_model()

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

        # 为实体生成向量嵌入（GraphRAG）
        if all_entities:
            all_entities = await self._generate_entity_embeddings(all_entities)

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
                    f"{settings.DASHSCOPE_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"},
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

    async def _generate_entity_embeddings(self, entities: List[Entity]) -> List[Entity]:
        """
        为实体生成向量嵌入（GraphRAG）

        使用实体名称 + 类型作为嵌入文本
        """
        if not entities:
            return entities

        logger.info(f"开始为 {len(entities)} 个实体生成向量嵌入")

        try:
            # 构建嵌入文本：名称 + 类型
            texts = [f"{e.name} ({e.type})" for e in entities]

            # 批量生成 embedding
            batch_size = self.embedding_model.embed_batch_size
            all_embeddings = []

            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                embeddings = self.embedding_model.get_text_embedding_batch(batch)
                all_embeddings.extend(embeddings)
                logger.debug(f"嵌入批次 {i // batch_size + 1} 完成")

            # 将 embedding 附加到实体
            for entity, embedding in zip(entities, all_embeddings):
                entity.embedding = embedding

            logger.info(f"实体向量嵌入生成完成: {len(entities)} 个")
            return entities

        except Exception as e:
            logger.error(f"实体向量嵌入生成失败: {e}")
            # 失败时返回原实体（无 embedding）
            return entities

    async def save_to_neo4j(self, result: ExtractionResult) -> Dict[str, int]:
        """将提取结果保存到 Neo4j"""
        store = None
        try:
            store = await get_kg_store()
            entity_count = await store.add_entities_batch(result.entities)
            relation_count = await store.add_relations_batch(result.relations)
            logger.info(f"Neo4j 保存完成: {entity_count} 实体, {relation_count} 关系")
            return {"entities": entity_count, "relations": relation_count}
        except Exception as e:
            logger.error(f"Neo4j 保存失败: {e}")
            return {"entities": 0, "relations": 0, "error": str(e)}
        finally:
            if store:
                await store.close()


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

    store = None
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
                    f"{settings.DASHSCOPE_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"},
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
    finally:
        if store:
            await store.close()

    return result


async def extract_book_chapters(toc_text: str, book_id: str) -> List[Chapter]:
    """
    从教材目录文本中提取章节结构

    Args:
        toc_text: 目录文本（可以是 OCR 提取的目录页，或手动输入的目录）
        book_id: 教材 ID

    Returns:
        章节列表（带层级关系）
    """
    prompt = f"""从以下教材目录中提取章节结构。

目录内容:
{toc_text[:3000]}

请返回 JSON 格式的章节结构:
{{
  "chapters": [
    {{
      "title": "第1章 绪论",
      "level": 1,
      "order": 1,
      "start_page": 1,
      "children": [
        {{
          "title": "1.1 背景介绍",
          "level": 2,
          "order": 1,
          "start_page": 2,
          "children": []
        }}
      ]
    }}
  ]
}}

注意:
- level: 1=章, 2=节, 3=小节
- order: 同级别内的顺序
- start_page: 起始页码（如果有的话，没有则为 null）
- children: 子章节列表"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.DASHSCOPE_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"},
                json={
                    "model": settings.CHAT_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1
                }
            )
            result = response.json()["choices"][0]["message"]["content"]

            if "```" in result:
                result = result.split("```")[1].replace("json", "").strip()
            parsed = json.loads(result)

            # 递归转换为 Chapter 对象
            chapters = []

            def process_chapter(ch_data: Dict, parent_id: str = None, global_order: List[int] = None):
                if global_order is None:
                    global_order = [0]

                global_order[0] += 1
                chapter_id = hashlib.md5(f"{book_id}:{ch_data['title']}".encode()).hexdigest()[:16]

                chapter = Chapter(
                    id=chapter_id,
                    book_id=book_id,
                    title=ch_data.get("title", ""),
                    order_index=global_order[0],
                    level=ch_data.get("level", 1),
                    parent_id=parent_id,
                    start_page=ch_data.get("start_page"),
                    end_page=None
                )
                chapters.append(chapter)

                # 处理子章节
                for child in ch_data.get("children", []):
                    process_chapter(child, chapter_id, global_order)

            for ch in parsed.get("chapters", []):
                process_chapter(ch)

            logger.info(f"从目录提取了 {len(chapters)} 个章节")
            return chapters

    except Exception as e:
        logger.error(f"章节提取失败: {e}")
        return []


async def save_book_chapters(chapters: List[Chapter], book_id: str) -> Dict[str, Any]:
    """
    保存章节到 Neo4j 并构建层级关系
    """
    store = None
    try:
        store = await get_kg_store()

        # 1. 批量添加章节节点
        count = await store.add_chapters_batch(chapters)

        # 2. 构建层级关系
        hierarchy_count = await store.build_chapter_hierarchy(book_id)

        logger.info(f"保存章节完成: {count} 个节点, {hierarchy_count} 个层级关系")
        return {"chapters": count, "hierarchy_relations": hierarchy_count}

    except Exception as e:
        logger.error(f"保存章节失败: {e}")
        return {"chapters": 0, "hierarchy_relations": 0, "error": str(e)}
    finally:
        if store:
            await store.close()


async def analyze_resource_to_chapters(chunks: List[Dict], book_id: str,
                                       resource_id: str, resource_name: str = None) -> Dict[str, Any]:
    """
    分析学习资源与教材章节的关联（使用新的 Chapter 节点）

    1. 建立 BOOK_HAS_RESOURCE 关系
    2. 获取教材的章节结构
    3. 使用 LLM 分析资源内容与章节的关联
    4. 建立 RELATES_TO_CHAPTER 关系
    """
    result = {
        "book_resource_relation": False,
        "chapter_relations": [],
        "unlinked": False
    }

    store = None
    try:
        store = await get_kg_store()

        # 1. 建立教材-资源关系
        result["book_resource_relation"] = await store.add_book_resource_relation(
            book_id=book_id,
            resource_id=resource_id,
            resource_name=resource_name
        )

        # 2. 获取教材的章节
        chapters = await store.get_book_chapters(book_id)

        if not chapters:
            logger.info(f"教材 {book_id} 无章节，资源将作为未关联资源")
            result["unlinked"] = True
            return result

        if not chunks:
            logger.info(f"资源无内容块，跳过关联分析")
            result["unlinked"] = True
            return result

        # 3. 使用 LLM 分析关联
        resource_text = "\n".join([c.get("text", "")[:500] for c in chunks[:5]])
        chapter_list = [f"[{c['id'][:8]}] {c['title']}" for c in chapters[:30]]

        prompt = f"""分析以下学习资源内容与教材章节的关联。

学习资源内容摘要:
{resource_text[:2000]}

教材章节列表（格式: [ID] 章节名）:
{chr(10).join(chapter_list)}

请返回 JSON 格式，指出资源与哪些章节相关:
{{
  "related_chapters": [
    {{"chapter_id": "章节ID前8位", "chapter_title": "章节名", "relevance": "high|medium|low", "reason": "关联原因"}}
  ]
}}

注意:
- 只返回确实相关的章节，不要强行关联
- 如果资源内容与所有章节都无关，返回空数组
- chapter_id 使用方括号中的 ID"""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.DASHSCOPE_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"},
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
                related = parsed.get("related_chapters", [])

                if not related:
                    result["unlinked"] = True
                    logger.info(f"资源 {resource_id} 与章节无关联，保持为未关联状态")
                else:
                    # 找到完整的 chapter_id
                    chapter_ids = []
                    for rel in related:
                        short_id = rel.get("chapter_id", "")
                        matching = [c for c in chapters if c["id"].startswith(short_id)]
                        if matching:
                            chapter_ids.append(matching[0]["id"])
                            result["chapter_relations"].append({
                                "chapter_id": matching[0]["id"],
                                "chapter_title": matching[0]["title"],
                                "relevance": rel.get("relevance"),
                                "reason": rel.get("reason")
                            })

                    # 批量建立关联
                    if chapter_ids:
                        await store.link_resource_to_chapters_batch(resource_id, chapter_ids)

                logger.info(f"资源-章节关联分析完成: {len(result['chapter_relations'])} 个关联")

        except Exception as e:
            logger.warning(f"LLM 关联分析失败: {e}")
            result["unlinked"] = True

    except Exception as e:
        logger.error(f"资源关联分析失败: {e}")
    finally:
        if store:
            await store.close()

    return result


async def extract_resource_sections(chunks: List[Dict], resource_id: str) -> List[ResourceSection]:
    """
    从学习资料中提取结构部分

    Args:
        chunks: 文档块列表
        resource_id: 资料 ID

    Returns:
        资料结构部分列表
    """
    # 合并文本用于分析
    full_text = "\n".join([c.get("text", "")[:1000] for c in chunks[:15]])

    prompt = f"""分析以下学习资料的内容结构，提取主要的知识部分/章节/主题。

资料内容:
{full_text[:4000]}

请返回 JSON 格式的结构:
{{
  "sections": [
    {{
      "title": "部分标题/主题名称",
      "order": 1,
      "summary": "该部分的简要内容描述（50字以内）"
    }}
  ]
}}

注意:
- 提取资料中的主要知识点/章节/主题
- 每个部分应该是一个独立的知识单元
- 最多提取 10 个部分
- 如果资料没有明显结构，按内容主题划分"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.DASHSCOPE_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"},
                json={
                    "model": settings.CHAT_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1
                }
            )
            result = response.json()["choices"][0]["message"]["content"]

            if "```" in result:
                result = result.split("```")[1].replace("json", "").strip()
            parsed = json.loads(result)

            sections = []
            for sec in parsed.get("sections", []):
                section_id = hashlib.md5(f"{resource_id}:{sec['title']}".encode()).hexdigest()[:16]
                sections.append(ResourceSection(
                    id=section_id,
                    resource_id=resource_id,
                    title=sec.get("title", ""),
                    order_index=sec.get("order", len(sections) + 1),
                    content_summary=sec.get("summary"),
                    parent_id=None
                ))

            logger.info(f"从资料提取了 {len(sections)} 个结构部分")
            return sections

    except Exception as e:
        logger.error(f"资料结构提取失败: {e}")
        return []


async def analyze_sections_to_chapters(sections: List[ResourceSection], book_id: str,
                                       resource_id: str) -> Dict[str, Any]:
    """
    分析资料结构部分与教材章节的关联

    Returns:
        {"section_chapter_links": [{"section_id": "xxx", "chapter_id": "yyy", "chapter_title": "zzz"}], ...}
    """
    result = {
        "sections_saved": 0,
        "section_chapter_links": [],
        "unlinked_sections": []
    }

    if not sections:
        return result

    store = None
    try:
        store = await get_kg_store()

        # 1. 保存资料结构节点
        count = await store.add_resource_sections_batch(sections)
        result["sections_saved"] = count

        # 2. 构建 Resource -> Section 关系
        await store.build_resource_structure(resource_id)

        # 3. 获取教材章节
        chapters = await store.get_book_chapters(book_id)

        if not chapters:
            logger.info(f"教材 {book_id} 无章节，资料结构将不关联")
            result["unlinked_sections"] = [s.title for s in sections]
            return result

        # 4. 使用 LLM 分析每个资料部分与章节的关联
        section_titles = [f"[{s.id[:8]}] {s.title}" for s in sections]
        chapter_list = [f"[{c['id'][:8]}] {c['title']}" for c in chapters[:30]]

        prompt = f"""分析学习资料的各部分与教材章节的对应关系。

学习资料结构（格式: [ID] 部分名称）:
{chr(10).join(section_titles)}

教材章节列表（格式: [ID] 章节名）:
{chr(10).join(chapter_list)}

请返回 JSON 格式，指出每个资料部分对应哪个教材章节:
{{
  "mappings": [
    {{"section_id": "资料部分ID前8位", "chapter_id": "章节ID前8位", "reason": "关联原因"}}
  ]
}}

注意:
- 只返回确实相关的对应关系
- 一个资料部分可以对应多个章节
- 如果某部分与所有章节都无关，不要返回该部分"""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.DASHSCOPE_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"},
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

                # 5. 建立关联关系
                links = []
                linked_section_ids = set()

                for mapping in parsed.get("mappings", []):
                    sec_short_id = mapping.get("section_id", "")
                    ch_short_id = mapping.get("chapter_id", "")

                    # 找到完整 ID
                    matching_section = [s for s in sections if s.id.startswith(sec_short_id)]
                    matching_chapter = [c for c in chapters if c["id"].startswith(ch_short_id)]

                    if matching_section and matching_chapter:
                        section = matching_section[0]
                        chapter = matching_chapter[0]
                        links.append({
                            "section_id": section.id,
                            "chapter_id": chapter["id"]
                        })
                        linked_section_ids.add(section.id)
                        result["section_chapter_links"].append({
                            "section_id": section.id,
                            "section_title": section.title,
                            "chapter_id": chapter["id"],
                            "chapter_title": chapter["title"]
                        })

                # 批量建立关联
                if links:
                    await store.link_sections_to_chapters_batch(links)

                # 记录未关联的部分
                for s in sections:
                    if s.id not in linked_section_ids:
                        result["unlinked_sections"].append(s.title)

                logger.info(f"资料结构-章节关联完成: {len(links)} 个关联, {len(result['unlinked_sections'])} 个未关联")

        except Exception as e:
            logger.warning(f"LLM 结构关联分析失败: {e}")
            result["unlinked_sections"] = [s.title for s in sections]

    except Exception as e:
        logger.error(f"资料结构关联失败: {e}")
    finally:
        if store:
            await store.close()

    return result
