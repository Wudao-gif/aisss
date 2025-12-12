#!/usr/bin/env python
"""
Test script to verify Neo4j AsyncSession.run() parameter fixes
This test checks the syntax and structure without requiring environment variables
"""

import re
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_session_run_calls():
    """Check all session.run() calls in knowledge_graph.py"""
    
    try:
        with open('modules/knowledge_graph.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        logger.info("=" * 70)
        logger.info("Testing Knowledge Graph Neo4j AsyncSession.run() Fixes")
        logger.info("=" * 70)
        
        # Find all session.run() calls
        pattern = r'session\.run\((.*?)\)'
        matches = re.finditer(pattern, content, re.DOTALL)
        
        total_calls = 0
        correct_calls = 0
        incorrect_calls = 0
        
        for match in matches:
            total_calls += 1
            call_content = match.group(1)
            
            # Check if it uses dictionary parameters (correct)
            if '{' in call_content and ':' in call_content:
                correct_calls += 1
            # Check if it uses keyword arguments (incorrect)
            elif re.search(r'\w+\s*=\s*\w+', call_content):
                incorrect_calls += 1
                logger.warning(f"Found incorrect pattern: session.run({call_content[:60]}...)")
        
        logger.info(f"\n[Results]")
        logger.info(f"  Total session.run() calls: {total_calls}")
        logger.info(f"  ✓ Correct (dict params): {correct_calls}")
        logger.info(f"  ✗ Incorrect (keyword args): {incorrect_calls}")
        
        # Check for specific fixed methods
        logger.info(f"\n[Checking Key Methods]")
        
        methods_to_check = [
            ('search_entities', 'session.run(cypher, params)'),
            ('add_entity', 'session.run('),
            ('add_chapter', 'session.run('),
            ('add_relation', 'session.run('),
            ('get_relations', 'session.run(cypher, params)'),
        ]
        
        for method_name, expected_pattern in methods_to_check:
            if method_name in content:
                logger.info(f"  ✓ Method '{method_name}' found")
            else:
                logger.warning(f"  ✗ Method '{method_name}' not found")
        
        logger.info("\n" + "=" * 70)
        
        if incorrect_calls == 0:
            logger.info("✓ SUCCESS: All session.run() calls have been fixed!")
            logger.info("=" * 70)
            return True
        else:
            logger.error(f"✗ FAILURE: Found {incorrect_calls} incorrect calls")
            logger.info("=" * 70)
            return False
            
    except FileNotFoundError:
        logger.error("✗ File not found: modules/knowledge_graph.py")
        return False
    except Exception as e:
        logger.error(f"✗ Error: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    success = check_session_run_calls()
    sys.exit(0 if success else 1)

