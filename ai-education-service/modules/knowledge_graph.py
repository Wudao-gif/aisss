"""
Neo4j 知识图谱模块
实现实体和关系的存储、查询
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from contextlib import asynccontextmanager

from neo4j import AsyncGraphDatabase, AsyncDriver
import httpx

from config import settings

logger = logging.getLogger(__name__)


@dataclass
class Entity:
    """实体"""
    id: str
    name: str
    type: str  # 如: Person, Concept, Book, Chapter
    properties: Dict[str, Any] = None
    book_id: Optional[str] = None  # 来源书籍
    embedding: Optional[List[float]] = None  # 向量嵌入


@dataclass
class Relation:
    """关系"""
    source_id: str
    target_id: str
    type: str  # 如: RELATES_TO, PART_OF, DEFINES, EXPLAINS
    properties: Dict[str, Any] = None


@dataclass
class Chapter:
    """章节"""
    id: str
    book_id: str
    title: str
    order_index: int  # 排序索引
    level: int = 1  # 层级: 1=章, 2=节, 3=小节
    parent_id: Optional[str] = None  # 父章节ID
    start_page: Optional[int] = None  # 起始页码
    end_page: Optional[int] = None  # 结束页码


@dataclass
class ResourceSection:
    """学习资料的结构部分"""
    id: str
    resource_id: str
    title: str
    order_index: int  # 排序索引
    content_summary: Optional[str] = None  # 内容摘要
    parent_id: Optional[str] = None  # 父部分ID（支持嵌套）


class KnowledgeGraphStore:
    """Neo4j 知识图谱存储"""

    def __init__(self):
        self.driver: Optional[AsyncDriver] = None
        self._initialized = False

    async def initialize(self):
        """初始化连接"""
        if self._initialized:
            return

        try:
            self.driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            # 验证连接
            async with self.driver.session() as session:
                await session.run("RETURN 1")

            # 创建索引
            await self._create_indexes()
            self._initialized = True
            logger.info("Neo4j 知识图谱连接成功")
        except Exception as e:
            logger.error(f"Neo4j 连接失败: {e}")
            raise

    async def _create_indexes(self):
        """创建索引以提高查询性能"""
        async with self.driver.session() as session:
            # 实体名称索引
            await session.run(
                "CREATE INDEX entity_name IF NOT EXISTS FOR (e:Entity) ON (e.name)"
            )
            # 实体类型索引
            await session.run(
                "CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)"
            )
            # 书籍ID索引
            await session.run(
                "CREATE INDEX entity_book IF NOT EXISTS FOR (e:Entity) ON (e.book_id)"
            )
            # 章节索引
            await session.run(
                "CREATE INDEX chapter_book IF NOT EXISTS FOR (c:Chapter) ON (c.book_id)"
            )
            await session.run(
                "CREATE INDEX chapter_title IF NOT EXISTS FOR (c:Chapter) ON (c.title)"
            )

            # 向量索引（Neo4j 5.11+ 支持）
            try:
                await session.run(
                    """
                    CREATE VECTOR INDEX entity_embedding IF NOT EXISTS
                    FOR (e:Entity) ON (e.embedding)
                    OPTIONS {indexConfig: {
                        `vector.dimensions`: $dimensions,
                        `vector.similarity_function`: 'cosine'
                    }}
                    """,
                    dimensions=settings.EMBEDDING_DIMENSION
                )
                logger.info("Neo4j 向量索引创建完成")
            except Exception as e:
                logger.warning(f"向量索引创建失败（可能已存在或版本不支持）: {e}")

            logger.info("Neo4j 索引创建完成")

    async def close(self):
        """关闭连接"""
        if self.driver:
            await self.driver.close()
            self._initialized = False

    # ============ 实体操作 ============

    async def add_entity(self, entity: Entity) -> str:
        """添加实体（含向量嵌入）"""
        async with self.driver.session() as session:
            # 如果有 embedding，一起存储
            if entity.embedding:
                result = await session.run(
                    """
                    MERGE (e:Entity {id: $id})
                    SET e.name = $name, e.type = $type, e.book_id = $book_id,
                        e.embedding = $embedding
                    SET e += $properties
                    RETURN e.id as id
                    """,
                    {
                        "id": entity.id,
                        "name": entity.name,
                        "type": entity.type,
                        "book_id": entity.book_id,
                        "embedding": entity.embedding,
                        "properties": entity.properties or {}
                    }
                )
            else:
                result = await session.run(
                    """
                    MERGE (e:Entity {id: $id})
                    SET e.name = $name, e.type = $type, e.book_id = $book_id
                    SET e += $properties
                    RETURN e.id as id
                    """,
                    {
                        "id": entity.id,
                        "name": entity.name,
                        "type": entity.type,
                        "book_id": entity.book_id,
                        "properties": entity.properties or {}
                    }
                )
            record = await result.single()
            return record["id"]

    async def add_entities_batch(self, entities: List[Entity]) -> int:
        """批量添加实体（含向量嵌入）"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $entities as ent
                MERGE (e:Entity {id: ent.id})
                SET e.name = ent.name, e.type = ent.type, e.book_id = ent.book_id
                SET e += ent.properties
                FOREACH (emb IN CASE WHEN ent.embedding IS NOT NULL THEN [ent.embedding] ELSE [] END |
                    SET e.embedding = emb
                )
                RETURN count(e) as count
                """,
                {
                    "entities": [{
                        "id": e.id, "name": e.name, "type": e.type,
                        "book_id": e.book_id, "properties": e.properties or {},
                        "embedding": e.embedding
                    } for e in entities]
                }
            )
            record = await result.single()
            return record["count"]

    async def get_entity(self, entity_id: str) -> Optional[Dict]:
        """获取实体"""
        async with self.driver.session() as session:
            result = await session.run(
                "MATCH (e:Entity {id: $id}) RETURN e",
                {"id": entity_id}
            )
            record = await result.single()
            return dict(record["e"]) if record else None

    async def search_entities(self, query: str, entity_type: str = None,
                             book_id: str = None, limit: int = 10) -> List[Dict]:
        """搜索实体"""
        cypher = "MATCH (e:Entity)"
        params = {"limit": limit}
        conditions = []

        if query:
            conditions.append("e.name CONTAINS $query")
            params["query"] = query

        if entity_type:
            conditions.append("e.type = $type")
            params["type"] = entity_type

        if book_id:
            conditions.append("e.book_id = $book_id")
            params["book_id"] = book_id

        if conditions:
            cypher += " WHERE " + " AND ".join(conditions)

        cypher += " RETURN e LIMIT $limit"

        async with self.driver.session() as session:
            result = await session.run(cypher, params)
            records = await result.data()
            return [dict(r["e"]) for r in records]

    async def search_entities_by_vector(
        self,
        query_embedding: List[float],
        book_id: str = None,
        limit: int = 10,
        min_score: float = 0.7
    ) -> List[Dict]:
        """
        向量相似度检索实体

        Args:
            query_embedding: 查询向量
            book_id: 可选，限制书籍范围
            limit: 返回数量
            min_score: 最小相似度阈值

        Returns:
            实体列表，包含相似度分数
        """
        async with self.driver.session() as session:
            if book_id:
                result = await session.run(
                    """
                    CALL db.index.vector.queryNodes('entity_embedding', $limit, $embedding)
                    YIELD node, score
                    WHERE node.book_id = $book_id AND score >= $min_score
                    RETURN node, score
                    ORDER BY score DESC
                    """,
                    {
                        "embedding": query_embedding,
                        "book_id": book_id,
                        "limit": limit * 2,  # 多查一些，因为要过滤
                        "min_score": min_score
                    }
                )
            else:
                result = await session.run(
                    """
                    CALL db.index.vector.queryNodes('entity_embedding', $limit, $embedding)
                    YIELD node, score
                    WHERE score >= $min_score
                    RETURN node, score
                    ORDER BY score DESC
                    """,
                    {
                        "embedding": query_embedding,
                        "limit": limit,
                        "min_score": min_score
                    }
                )

            records = await result.data()
            return [{"entity": dict(r["node"]), "score": r["score"]} for r in records[:limit]]

    async def search_with_graph_expansion(
        self,
        query_embedding: List[float],
        book_id: str = None,
        limit: int = 5,
        expansion_depth: int = 1
    ) -> Dict[str, Any]:
        """
        GraphRAG: 向量检索 + 图遍历扩展

        1. 向量检索找到相关实体
        2. 图遍历扩展关联实体
        3. 返回结构化知识上下文
        """
        # 1. 向量检索
        vector_results = await self.search_entities_by_vector(
            query_embedding=query_embedding,
            book_id=book_id,
            limit=limit
        )

        if not vector_results:
            return {"entities": [], "relations": [], "context": ""}

        # 2. 图遍历扩展
        entity_ids = [r["entity"]["id"] for r in vector_results]
        expanded_entities = []
        relations = []

        async with self.driver.session() as session:
            for entity_id in entity_ids:
                # 获取关联实体
                result = await session.run(
                    f"""
                    MATCH (e:Entity {{id: $id}})-[r]-(related:Entity)
                    RETURN e, r, related
                    LIMIT {expansion_depth * 5}
                    """,
                    {"id": entity_id}
                )
                records = await result.data()

                for record in records:
                    related = dict(record["related"])
                    if related["id"] not in [e.get("id") for e in expanded_entities]:
                        expanded_entities.append(related)

                    rel = record["r"]
                    relations.append({
                        "source": record["e"]["name"],
                        "target": related["name"],
                        "type": rel.get("type", "RELATES_TO")
                    })

        # 3. 构建上下文
        primary_entities = [r["entity"] for r in vector_results]
        all_entities = primary_entities + expanded_entities

        context_parts = []
        for e in primary_entities:
            context_parts.append(f"【{e.get('type', '概念')}】{e.get('name', '')}")

        if relations:
            context_parts.append("\n关联知识：")
            for rel in relations[:10]:
                context_parts.append(f"  - {rel['source']} --[{rel['type']}]--> {rel['target']}")

        return {
            "entities": all_entities,
            "relations": relations,
            "context": "\n".join(context_parts),
            "scores": {r["entity"]["id"]: r["score"] for r in vector_results}
        }

    # ============ 章节操作 ============

    async def add_chapter(self, chapter: Chapter) -> str:
        """添加章节节点"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MERGE (c:Chapter {id: $id})
                SET c.book_id = $book_id,
                    c.title = $title,
                    c.order_index = $order_index,
                    c.level = $level,
                    c.parent_id = $parent_id,
                    c.start_page = $start_page,
                    c.end_page = $end_page
                RETURN c.id as id
                """,
                {
                    "id": chapter.id,
                    "book_id": chapter.book_id,
                    "title": chapter.title,
                    "order_index": chapter.order_index,
                    "level": chapter.level,
                    "parent_id": chapter.parent_id,
                    "start_page": chapter.start_page,
                    "end_page": chapter.end_page
                }
            )
            record = await result.single()
            return record["id"]

    async def add_chapters_batch(self, chapters: List[Chapter]) -> int:
        """批量添加章节"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $chapters as ch
                MERGE (c:Chapter {id: ch.id})
                SET c.book_id = ch.book_id,
                    c.title = ch.title,
                    c.order_index = ch.order_index,
                    c.level = ch.level,
                    c.parent_id = ch.parent_id,
                    c.start_page = ch.start_page,
                    c.end_page = ch.end_page
                RETURN count(c) as count
                """,
                {
                    "chapters": [{
                        "id": c.id, "book_id": c.book_id, "title": c.title,
                        "order_index": c.order_index, "level": c.level,
                        "parent_id": c.parent_id, "start_page": c.start_page,
                        "end_page": c.end_page
                    } for c in chapters]
                }
            )
            record = await result.single()
            return record["count"]

    async def build_chapter_hierarchy(self, book_id: str) -> int:
        """构建章节层级关系 (Book -> Chapter, Chapter -> 子Chapter)"""
        async with self.driver.session() as session:
            # 1. Book -> 顶级章节 (HAS_CHAPTER)
            # 条件：level=1 或 parent_id 为空（NULL、空字符串、不存在）
            result1 = await session.run(
                """
                MATCH (b:Book {id: $book_id})
                MATCH (c:Chapter {book_id: $book_id})
                WHERE c.level = 1 OR c.parent_id IS NULL OR c.parent_id = ''
                MERGE (b)-[:HAS_CHAPTER]->(c)
                RETURN count(*) as count
                """,
                {"book_id": book_id}
            )
            record1 = await result1.single()
            chapter_count = record1["count"] if record1 else 0
            logger.info(f"构建 Book->Chapter 关系: {chapter_count} 个")

            # 2. 父章节 -> 子章节 (HAS_SECTION)
            result = await session.run(
                """
                MATCH (parent:Chapter {book_id: $book_id})
                MATCH (child:Chapter {book_id: $book_id})
                WHERE child.parent_id = parent.id AND child.parent_id IS NOT NULL AND child.parent_id <> ''
                MERGE (parent)-[:HAS_SECTION]->(child)
                RETURN count(*) as count
                """,
                {"book_id": book_id}
            )
            record = await result.single()
            count = record["count"]
            logger.info(f"构建章节层级关系: {book_id}, {count} 个父子关系")
            return count

    async def get_book_chapters(self, book_id: str) -> List[Dict]:
        """获取教材的所有章节（按层级排序）"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (c:Chapter {book_id: $book_id})
                RETURN c
                ORDER BY c.level, c.order_index
                """,
                {"book_id": book_id}
            )
            records = await result.data()
            return [dict(r["c"]) for r in records]

    async def get_chapter_tree(self, book_id: str) -> List[Dict]:
        """获取教材的章节树结构"""
        chapters = await self.get_book_chapters(book_id)

        # 构建树结构
        chapter_map = {c["id"]: {**c, "children": []} for c in chapters}
        root_chapters = []

        for c in chapters:
            if c.get("parent_id") and c["parent_id"] in chapter_map:
                chapter_map[c["parent_id"]]["children"].append(chapter_map[c["id"]])
            else:
                root_chapters.append(chapter_map[c["id"]])

        return root_chapters

    # ============ 资料结构操作 ============

    async def add_resource_section(self, section: ResourceSection) -> str:
        """添加资料结构节点"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MERGE (s:ResourceSection {id: $id})
                SET s.resource_id = $resource_id,
                    s.title = $title,
                    s.order_index = $order_index,
                    s.content_summary = $content_summary,
                    s.parent_id = $parent_id
                RETURN s.id as id
                """,
                {
                    "id": section.id,
                    "resource_id": section.resource_id,
                    "title": section.title,
                    "order_index": section.order_index,
                    "content_summary": section.content_summary,
                    "parent_id": section.parent_id
                }
            )
            record = await result.single()
            return record["id"]

    async def add_resource_sections_batch(self, sections: List[ResourceSection]) -> int:
        """批量添加资料结构节点"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $sections as sec
                MERGE (s:ResourceSection {id: sec.id})
                SET s.resource_id = sec.resource_id,
                    s.title = sec.title,
                    s.order_index = sec.order_index,
                    s.content_summary = sec.content_summary,
                    s.parent_id = sec.parent_id
                RETURN count(s) as count
                """,
                {
                    "sections": [{
                        "id": s.id, "resource_id": s.resource_id, "title": s.title,
                        "order_index": s.order_index, "content_summary": s.content_summary,
                        "parent_id": s.parent_id
                    } for s in sections]
                }
            )
            record = await result.single()
            return record["count"]

    async def build_resource_structure(self, resource_id: str) -> int:
        """构建资料结构关系 (Resource -> ResourceSection)"""
        async with self.driver.session() as session:
            # Resource -> ResourceSection (HAS_SECTION)
            result = await session.run(
                """
                MATCH (r:Resource {id: $resource_id})
                MATCH (s:ResourceSection {resource_id: $resource_id})
                MERGE (r)-[:HAS_SECTION]->(s)
                RETURN count(*) as count
                """,
                {"resource_id": resource_id}
            )
            record = await result.single()
            count = record["count"] if record else 0
            logger.info(f"构建 Resource->Section 关系: {count} 个")
            return count

    async def link_section_to_chapter(self, section_id: str, chapter_id: str) -> bool:
        """将资料结构部分关联到教材章节"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (s:ResourceSection {id: $section_id})
                MATCH (c:Chapter {id: $chapter_id})
                MERGE (s)-[rel:RELATES_TO_CHAPTER]->(c)
                SET rel.created_at = datetime()
                RETURN count(rel) as count
                """,
                {"section_id": section_id, "chapter_id": chapter_id}
            )
            record = await result.single()
            return record["count"] > 0

    async def link_sections_to_chapters_batch(self, links: List[Dict]) -> int:
        """批量关联资料结构到章节
        links: [{"section_id": "xxx", "chapter_id": "yyy"}, ...]
        """
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $links as link
                MATCH (s:ResourceSection {id: link.section_id})
                MATCH (c:Chapter {id: link.chapter_id})
                MERGE (s)-[rel:RELATES_TO_CHAPTER]->(c)
                SET rel.created_at = datetime()
                RETURN count(rel) as count
                """,
                {"links": links}
            )
            record = await result.single()
            return record["count"]

    async def get_resource_sections(self, resource_id: str) -> List[Dict]:
        """获取资料的所有结构部分"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (s:ResourceSection {resource_id: $resource_id})
                RETURN s
                ORDER BY s.order_index
                """,
                {"resource_id": resource_id}
            )
            records = await result.data()
            return [dict(r["s"]) for r in records]

    # ============ 关系操作 ============

    async def add_relation(self, relation: Relation) -> bool:
        """添加关系"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (a:Entity {id: $source_id})
                MATCH (b:Entity {id: $target_id})
                MERGE (a)-[r:RELATES {type: $type}]->(b)
                SET r += $properties
                RETURN count(r) as count
                """,
                {
                    "source_id": relation.source_id,
                    "target_id": relation.target_id,
                    "type": relation.type,
                    "properties": relation.properties or {}
                }
            )
            record = await result.single()
            return record["count"] > 0

    async def add_relations_batch(self, relations: List[Relation]) -> int:
        """批量添加关系"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $relations as rel
                MATCH (a:Entity {id: rel.source_id})
                MATCH (b:Entity {id: rel.target_id})
                MERGE (a)-[r:RELATES {type: rel.type}]->(b)
                SET r += rel.properties
                RETURN count(r) as count
                """,
                {
                    "relations": [{
                        "source_id": r.source_id, "target_id": r.target_id,
                        "type": r.type, "properties": r.properties or {}
                    } for r in relations]
                }
            )
            record = await result.single()
            return record["count"]

    async def get_relations(self, entity_id: str, direction: str = "both",
                           relation_type: str = None) -> List[Dict]:
        """获取实体的关系"""
        if direction == "out":
            pattern = "(e)-[r]->(other)"
        elif direction == "in":
            pattern = "(e)<-[r]-(other)"
        else:
            pattern = "(e)-[r]-(other)"

        cypher = f"MATCH (e:Entity {{id: $id}}), {pattern}"
        params = {"id": entity_id}

        if relation_type:
            cypher = cypher.replace("[r]", "[r {type: $rel_type}]")
            params["rel_type"] = relation_type

        cypher += " RETURN e, r, other"

        async with self.driver.session() as session:
            result = await session.run(cypher, params)
            records = await result.data()
            return [{
                "source": dict(r["e"]),
                "relation": dict(r["r"]),
                "target": dict(r["other"])
            } for r in records]

    # ============ 图查询 ============

    async def find_path(self, start_id: str, end_id: str, max_depth: int = 5) -> List[Dict]:
        """查找两个实体之间的路径"""
        async with self.driver.session() as session:
            result = await session.run(
                f"""
                MATCH path = shortestPath(
                    (a:Entity {{id: $start}})-[*1..{max_depth}]-(b:Entity {{id: $end}})
                )
                RETURN path
                """,
                {"start": start_id, "end": end_id}
            )
            records = await result.data()
            if not records:
                return []

            # 解析路径
            path_data = []
            for r in records:
                path = r["path"]
                path_data.append({
                    "nodes": [dict(n) for n in path.nodes],
                    "relationships": [{"type": rel.type, **dict(rel)} for rel in path.relationships]
                })
            return path_data

    async def get_subgraph(self, entity_id: str, depth: int = 2, limit: int = 50) -> Dict:
        """获取实体周围的子图"""
        async with self.driver.session() as session:
            result = await session.run(
                f"""
                MATCH (center:Entity {{id: $id}})
                CALL apoc.path.subgraphAll(center, {{maxLevel: {depth}, limit: {limit}}})
                YIELD nodes, relationships
                RETURN nodes, relationships
                """,
                {"id": entity_id}
            )
            record = await result.single()
            if not record:
                return {"nodes": [], "relationships": []}

            return {
                "nodes": [dict(n) for n in record["nodes"]],
                "relationships": [{"type": r.type, **dict(r)} for r in record["relationships"]]
            }

    async def query_by_pattern(self, query: str, book_id: str = None) -> List[Dict]:
        """根据自然语言查询知识图谱（使用 LLM 生成 Cypher）"""
        # 生成 Cypher 查询
        cypher = await self._generate_cypher(query, book_id)
        if not cypher:
            return []

        try:
            async with self.driver.session() as session:
                result = await session.run(cypher)
                records = await result.data()
                return records
        except Exception as e:
            logger.error(f"Cypher 执行失败: {e}, 查询: {cypher}")
            return []

    async def _generate_cypher(self, query: str, book_id: str = None) -> Optional[str]:
        """用 LLM 生成 Cypher 查询"""
        book_filter = f"AND e.book_id = '{book_id}'" if book_id else ""

        prompt = f"""将自然语言转换为 Neo4j Cypher 查询。

数据模型:
- 节点: (e:Entity) 属性: id, name, type, book_id
- 关系: [r:RELATES] 属性: type

用户问题: {query}
{f"限制书籍: {book_id}" if book_id else ""}

只返回 Cypher 查询语句，不要解释。如果无法转换返回空。
示例:
- "微积分的定义" -> MATCH (e:Entity) WHERE e.name CONTAINS '微积分' {book_filter} RETURN e LIMIT 10
- "A和B的关系" -> MATCH (a:Entity)-[r]-(b:Entity) WHERE a.name CONTAINS 'A' AND b.name CONTAINS 'B' RETURN a,r,b
"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.DASHSCOPE_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"},
                    json={
                        "model": settings.CHAT_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1
                    }
                )
                result = response.json()["choices"][0]["message"]["content"].strip()

                # 清理结果
                if result.startswith("```"):
                    result = result.split("```")[1].replace("cypher", "").strip()

                # 安全检查
                dangerous = ["DELETE", "REMOVE", "DROP", "CREATE INDEX", "SET"]
                if any(d in result.upper() for d in dangerous):
                    logger.warning(f"危险 Cypher 被拦截: {result}")
                    return None

                return result if result and "MATCH" in result.upper() else None
        except Exception as e:
            logger.error(f"Cypher 生成失败: {e}")
            return None

    # ============ 删除操作 ============


    # ============ 资源关系操作 ============

    async def add_book_resource_relation(self, book_id: str, resource_id: str,
                                         book_name: str = None, resource_name: str = None) -> bool:
        """建立教材与学习资源的关系 (BOOK_HAS_RESOURCE)"""
        async with self.driver.session() as session:
            # 确保 Book 节点存在
            await session.run(
                """
                MERGE (b:Book {id: $book_id})
                SET b.name = COALESCE($book_name, b.name, $book_id)
                SET b.type = 'Book'
                """,
                {"book_id": book_id, "book_name": book_name}
            )

            # 确保 Resource 节点存在
            await session.run(
                """
                MERGE (r:Resource {id: $resource_id})
                SET r.name = COALESCE($resource_name, r.name, $resource_id)
                SET r.type = 'Resource'
                SET r.book_id = $book_id
                """,
                {"resource_id": resource_id, "resource_name": resource_name, "book_id": book_id}
            )
            
            # 建立关系
            result = await session.run(
                """
                MATCH (b:Book {id: $book_id})
                MATCH (r:Resource {id: $resource_id})
                MERGE (b)-[rel:HAS_RESOURCE]->(r)
                SET rel.created_at = datetime()
                RETURN count(rel) as count
                """,
                {"book_id": book_id, "resource_id": resource_id}
            )
            record = await result.single()
            success = record["count"] > 0
            if success:
                logger.info(f"建立教材-资源关系: {book_id} -> {resource_id}")
            return success

    async def link_resource_to_chapter(self, resource_id: str, chapter_id: str,
                                       relation_type: str = "RELATES_TO") -> bool:
        """将学习资源关联到章节节点"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (r:Resource {id: $resource_id})
                MATCH (c:Chapter {id: $chapter_id})
                MERGE (r)-[rel:RELATES_TO_CHAPTER]->(c)
                SET rel.type = $rel_type,
                    rel.created_at = datetime()
                RETURN count(rel) as count
                """,
                {"resource_id": resource_id, "chapter_id": chapter_id, "rel_type": relation_type}
            )
            record = await result.single()
            return record["count"] > 0

    async def link_resource_to_chapters_batch(self, resource_id: str, chapter_ids: List[str],
                                              relation_type: str = "RELATES_TO") -> int:
        """批量将学习资源关联到多个章节"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (r:Resource {id: $resource_id})
                UNWIND $chapter_ids as ch_id
                MATCH (c:Chapter {id: ch_id})
                MERGE (r)-[rel:RELATES_TO_CHAPTER]->(c)
                SET rel.type = $rel_type,
                    rel.created_at = datetime()
                RETURN count(rel) as count
                """,
                {"resource_id": resource_id, "chapter_ids": chapter_ids, "rel_type": relation_type}
            )
            record = await result.single()
            return record["count"]

    async def get_chapter_resources(self, chapter_id: str) -> List[Dict]:
        """获取章节关联的所有学习资源"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (r:Resource)-[:RELATES_TO_CHAPTER]->(c:Chapter {id: $chapter_id})
                RETURN r
                """,
                {"chapter_id": chapter_id}
            )
            records = await result.data()
            return [dict(r["r"]) for r in records]

    async def get_resource_chapters(self, resource_id: str) -> List[Dict]:
        """获取学习资源关联的所有章节"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (r:Resource {id: $resource_id})-[:RELATES_TO_CHAPTER]->(c:Chapter)
                RETURN c
                ORDER BY c.level, c.order_index
                """,
                {"resource_id": resource_id}
            )
            records = await result.data()
            return [dict(r["c"]) for r in records]

    async def get_unlinked_resources(self, book_id: str) -> List[Dict]:
        """获取教材下未关联到任何章节的学习资源"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (b:Book {id: $book_id})-[:HAS_RESOURCE]->(r:Resource)
                WHERE NOT (r)-[:RELATES_TO_CHAPTER]->(:Chapter)
                RETURN r
                """,
                {"book_id": book_id}
            )
            records = await result.data()
            return [dict(r["r"]) for r in records]

    async def get_book_resources(self, book_id: str) -> List[Dict]:
        """获取教材的所有学习资源"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (b:Book {id: $book_id})-[:HAS_RESOURCE]->(r:Resource)
                RETURN r
                """,
                {"book_id": book_id}
            )
            records = await result.data()
            return [dict(r["r"]) for r in records]

    async def get_resource_related_entities(self, resource_id: str) -> List[Dict]:
        """获取学习资源关联的教材实体"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (r:Resource {id: $resource_id})-[rel:RELATES]->(e:Entity)
                RETURN e, rel.type as relation_type
                """,
                {"resource_id": resource_id}
            )
            records = await result.data()
            return [{"entity": dict(r["e"]), "relation": r["relation_type"]} for r in records]


    async def delete_by_book(self, book_id: str) -> int:
        """删除某本书的所有实体和关系"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (e:Entity {book_id: $book_id})
                DETACH DELETE e
                RETURN count(e) as count
                """,
                {"book_id": book_id}
            )
            record = await result.single()
            count = record["count"]
            logger.info(f"已删除书籍 {book_id} 的 {count} 个实体")
            return count


# ============ 工厂函数 ============

async def get_kg_store() -> KnowledgeGraphStore:
    """
    获取知识图谱存储实例

    注意：由于后台任务在新的事件循环中运行，
    Neo4j AsyncDriver 不能跨事件循环共享，
    因此每次调用都创建新实例。
    """
    kg_store = KnowledgeGraphStore()
    await kg_store.initialize()
    return kg_store
