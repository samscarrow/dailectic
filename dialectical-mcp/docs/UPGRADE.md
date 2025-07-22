# Upgrading to v2.0 - Direct LLM Integration

The Dialectical MCP server v2.0 adds direct LLM integration, making it a fully autonomous system that can execute critiques and synthesis without returning prompts to the client.

## Key Changes

### 1. LLM Provider Support
- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude 3)
- **Mock** provider for testing

### 2. Environment Configuration
```bash
# Required for OpenAI
export LLM_PROVIDER=openai
export LLM_API_KEY=sk-...
export LLM_MODEL=gpt-4-turbo-preview  # optional

# Required for Anthropic
export LLM_PROVIDER=anthropic
export LLM_API_KEY=sk-ant-...
export LLM_MODEL=claude-3-sonnet-20240229  # optional

# For testing (no API key needed)
export LLM_PROVIDER=mock
```

### 3. Enhanced Features

#### Parallel Execution
The `team_debate` tool now executes all five critiques in parallel by default:
```
Use team_debate to analyze this code:
[code]
```

#### Structured Output
Request JSON-formatted critiques:
```
Use critique with persona='cassandra' and outputFormat='json' on this:
[code]
```

#### Richer Session Details
Sessions now track:
- All critiques with full content
- Synthesis results
- Token usage (when available)
- Last activity snippets

### 4. New Tools

#### `get_session`
View complete session details including all critiques:
```
Use get_session with sessionId='debate-123'
```

### 5. Architecture Improvements

- **CritiqueService**: Handles all LLM interactions
- **Provider abstraction**: Easy to add new LLM providers
- **Error handling**: Graceful fallbacks for API failures
- **Mock provider**: Test without API keys

## Migration Guide

1. **Update package.json dependencies**:
```bash
npm install
```

2. **Set environment variables**:
```bash
export LLM_PROVIDER=anthropic  # or openai
export LLM_API_KEY=your-key-here
```

3. **Update Claude Desktop config** to use `index-v2.js`:
```json
{
  "mcpServers": {
    "dialectical": {
      "command": "node",
      "args": ["/path/to/dialectical-mcp/dist/index-v2.js"],
      "env": {
        "LLM_PROVIDER": "anthropic",
        "LLM_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

4. **Build the project**:
```bash
npm run build
```

## Benefits

1. **True Autonomy**: The server handles everything - no more prompt juggling
2. **Parallel Processing**: Team debates are 5x faster
3. **Stateful Context**: Sessions maintain full critique history
4. **Production Ready**: Proper error handling and provider abstraction

## What's Next

- Streaming support for real-time critique display
- Persistent storage with Redis/SQLite
- Web UI for visual debate management
- Fine-tuned persona models