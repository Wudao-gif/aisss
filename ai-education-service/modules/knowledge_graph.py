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


@dataclass
class Relation:
    """关系"""
    source_id: str
    target_id: str
    type: str  # 如: RELATES_TO, PART_OF, DEFINES, EXPLAINS
    properties: Dict[str, Any] = None


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
            logger.info("Neo4j 索引创建完成")

    async def close(self):
        """关闭连接"""
        if self.driver:
            await self.driver.close()
            self._initialized = False

    # ============ 实体操作 ============

    async def add_entity(self, entity: Entity) -> str:
        """添加实体"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MERGE (e:Entity {id: $id})
                SET e.name = $name, e.type = $type, e.book_id = $book_id
                SET e += $properties
                RETURN e.id as id
                """,
                id=entity.id,
                name=entity.name,
                type=entity.type,
                book_id=entity.book_id,
                properties=entity.properties or {}
            )
            record = await result.single()
            return record["id"]

    async def add_entities_batch(self, entities: List[Entity]) -> int:
        """批量添加实体"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                UNWIND $entities as ent
                MERGE (e:Entity {id: ent.id})
                SET e.name = ent.name, e.type = ent.type, e.book_id = ent.book_id
                SET e += ent.properties
                RETURN count(e) as count
                """,
                entities=[{
                    "id": e.id, "name": e.name, "type": e.type,
                    "book_id": e.book_id, "properties": e.properties or {}
                } for e in entities]
            )
            record = await result.single()
            return record["count"]

    async def get_entity(self, entity_id: str) -> Optional[Dict]:
        """获取实体"""
        async with self.driver.session() as session:
            result = await session.run(
                "MATCH (e:Entity {id: $id}) RETURN e",
                id=entity_id
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
            result = await session.run(cypher, **params)
            records = await result.data()
            return [dict(r["e"]) for r in records]

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
                source_id=relation.source_id,
                target_id=relation.target_id,
                type=relation.type,
                properties=relation.properties or {}
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
                relations=[{
                    "source_id": r.source_id, "target_id": r.target_id,
                    "type": r.type, "properties": r.properties or {}
                } for r in relations]
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
            result = await session.run(cypher, **params)
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
                start=start_id, end=end_id
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
                id=entity_id
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
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
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
                book_id=book_id, book_name=book_name
            )
            
            # 确保 Resource 节点存在
            await session.run(
                """
                MERGE (r:Resource {id: $resource_id})
                SET r.name = COALESCE($resource_name, r.name, $resource_id)
                SET r.type = 'Resource'
                SET r.book_id = $book_id
                """,
                resource_id=resource_id, resource_name=resource_name, book_id=book_id
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
                book_id=book_id, resource_id=resource_id
            )
            record = await result.single()
            success = record["count"] > 0
            if success:
                logger.info(f"建立教材-资源关系: {book_id} -> {resource_id}")
            return success

    async def link_resource_to_chapter(self, resource_id: str, chapter_entity_id: str,
                                       relation_type: str = "RELATES_TO") -> bool:
        """将学习资源关联到教材章节实体"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (r:Resource {id: $resource_id})
                MATCH (c:Entity {id: $chapter_id})
                MERGE (r)-[rel:RELATES {type: $rel_type}]->(c)
                SET rel.created_at = datetime()
                RETURN count(rel) as count
                """,
                resource_id=resource_id, chapter_id=chapter_entity_id, rel_type=relation_type
            )
            record = await result.single()
            return record["count"] > 0

    async def get_book_resources(self, book_id: str) -> List[Dict]:
        """获取教材的所有学习资源"""
        async with self.driver.session() as session:
            result = await session.run(
                """
                MATCH (b:Book {id: $book_id})-[:HAS_RESOURCE]->(r:Resource)
                RETURN r
                """,
                book_id=book_id
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
                resource_id=resource_id
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
                book_id=book_id
            )
            record = await result.single()
            count = record["count"]
            logger.info(f"已删除书籍 {book_id} 的 {count} 个实体")
            return count


# ============ 单例 ============

_kg_store: Optional[KnowledgeGraphStore] = None


async def get_kg_store() -> KnowledgeGraphStore:
    """获取知识图谱存储单例"""
    global _kg_store
    if _kg_store is None:
        _kg_store = KnowledgeGraphStore()
        await _kg_store.initialize()
    return _kg_store
