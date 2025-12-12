#!/usr/bin/env python
"""
Test script to verify Neo4j AsyncSession.run() parameter fixes
"""

import asyncio
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_knowledge_graph():
    """Test knowledge graph operations"""
    try:
        from modules.knowledge_graph import get_kg_store
        
        logger.info("=" * 60)
        logger.info("Testing Knowledge Graph Fixes")
        logger.info("=" * 60)
        
        # Get KG store instance
        kg_store = await get_kg_store()
        logger.info("✓ Knowledge graph store initialized successfully")
        
        # Test 1: Create a test entity
        logger.info("\n[Test 1] Creating test entity...")
        from modules.knowledge_graph import Entity
        
        test_entity = Entity(
            id="test_entity_001",
            name="Test Entity",
            type="Concept",
            book_id="test_book_001",
            properties={"description": "Test entity for validation"}
        )
        
        entity_id = await kg_store.add_entity(test_entity)
        logger.info(f"✓ Entity created: {entity_id}")
        
        # Test 2: Retrieve the entity
        logger.info("\n[Test 2] Retrieving entity...")
        retrieved = await kg_store.get_entity(entity_id)
        if retrieved:
            logger.info(f"✓ Entity retrieved: {retrieved['name']}")
        else:
            logger.error("✗ Failed to retrieve entity")
            return False
        
        # Test 3: Search entities
        logger.info("\n[Test 3] Searching entities...")
        results = await kg_store.search_entities(
            query="Test",
            book_id="test_book_001",
            limit=10
        )
        logger.info(f"✓ Search completed: found {len(results)} entities")
        
        # Test 4: Create a chapter
        logger.info("\n[Test 4] Creating test chapter...")
        from modules.knowledge_graph import Chapter
        
        test_chapter = Chapter(
            id="test_chapter_001",
            book_id="test_book_001",
            title="Test Chapter",
            order_index=1,
            level=1
        )
        
        chapter_id = await kg_store.add_chapter(test_chapter)
        logger.info(f"✓ Chapter created: {chapter_id}")
        
        # Test 5: Get book chapters
        logger.info("\n[Test 5] Getting book chapters...")
        chapters = await kg_store.get_book_chapters("test_book_001")
        logger.info(f"✓ Retrieved {len(chapters)} chapters")
        
        logger.info("\n" + "=" * 60)
        logger.info("✓ All tests passed! Neo4j fixes are working correctly.")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Test failed with error: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    success = asyncio.run(test_knowledge_graph())
    sys.exit(0 if success else 1)

