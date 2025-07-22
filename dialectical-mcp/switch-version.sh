#!/bin/bash

# Script to switch between different versions of the Dialectical MCP server

VERSION=${1:-3}

case $VERSION in
  1)
    echo "Switching to v1 (basic prompts only)..."
    cp src/index-v1.ts src/index.ts
    ;;
  2)
    echo "Switching to v2 (direct LLM integration)..."
    cp src/index-v2.ts src/index.ts
    ;;
  3)
    echo "Switching to v3 (intelligent orchestration)..."
    cp src/index-v3.ts src/index.ts
    ;;
  *)
    echo "Usage: $0 [1|2|3]"
    echo "  1: Basic prompt orchestration"
    echo "  2: Direct LLM integration" 
    echo "  3: Intelligent dialectical engine"
    exit 1
    ;;
esac

echo "Version switched. Run 'npm run build' to compile."