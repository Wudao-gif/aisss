#!/usr/bin/env python
"""
Test script to verify Neo4j AsyncSession.run() parameter fixes
"""

import re
import sys

def check_knowledge_graph_file():
    """Check if knowledge_graph.py has been fixed"""
    try:
        with open('ai-education-service/modules/knowledge_graph.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for incorrect patterns (keyword arguments)
        # Pattern: session.run(..., param=value)
        incorrect_patterns = re.findall(
            r'session\.run\(\s*["\'].*?["\'],\s*\w+\s*=',
            content,
            re.DOTALL
        )
        
        # Check for correct patterns (dictionary parameters)
        # Pattern: session.run(..., {...)
        correct_patterns = re.findall(
            r'session\.run\(\s*["\'].*?["\'],\s*\{',
            content,
            re.DOTALL
        )
        
        print(f"✓ File found: ai-education-service/modules/knowledge_graph.py")
        print(f"  - Incorrect patterns (keyword args): {len(incorrect_patterns)}")
        print(f"  - Correct patterns (dict params): {len(correct_patterns)}")
        
        if incorrect_patterns:
            print("\n⚠ WARNING: Found incorrect patterns:")
            for i, pattern in enumerate(incorrect_patterns[:3], 1):
                print(f"  {i}. {pattern[:80]}...")
            return False
        else:
            print("\n✓ All session.run() calls appear to be fixed!")
            return True
            
    except FileNotFoundError:
        print("✗ File not found: ai-education-service/modules/knowledge_graph.py")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = check_knowledge_graph_file()
    sys.exit(0 if success else 1)

