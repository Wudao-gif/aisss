#!/usr/bin/env python
"""Verify Python syntax of knowledge_graph.py"""

import ast
import sys

try:
    with open('modules/knowledge_graph.py', 'r', encoding='utf-8') as f:
        code = f.read()
    
    ast.parse(code)
    print("✓ Syntax check passed: knowledge_graph.py is valid Python")
    sys.exit(0)
    
except SyntaxError as e:
    print(f"✗ Syntax error in knowledge_graph.py:")
    print(f"  Line {e.lineno}: {e.msg}")
    print(f"  {e.text}")
    sys.exit(1)
    
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

