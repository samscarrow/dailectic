# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Dialectical Engine is a multi-faceted project implementing the "Team of Rivals" methodology for AI interactions:
1. **Core Framework**: Prompt engineering methodology with text expansion snippets
2. **MCP Server** (`dialectical-mcp/`): Model Context Protocol server for stateful AI orchestration
3. **GitHub App** (`github-app-mvp/`): Automated PR reviewer using the dialectical methodology

## Architecture

```
dailectic/
├── dialectical-mcp/          # MCP server implementation
│   ├── src/
│   │   ├── llm/             # LLM provider integrations (Anthropic, OpenAI)
│   │   ├── personas/        # Persona definitions and types
│   │   ├── services/        # Core services (orchestrator, critique)
│   │   ├── sessions/        # Session management
│   │   ├── security/        # Security patterns and redaction
│   │   └── tools/           # MCP tool definitions
│   └── dist/                # Compiled output
└── github-app-mvp/          # GitHub PR reviewer app
    └── src/                 # Express server with GitHub webhooks
```

## Common Development Commands

### Dialectical MCP Server
```bash
cd dialectical-mcp

# Development
npm install              # Install dependencies
npm run dev             # Run with hot reload (MCP mode)
npm run dev:http        # Run HTTP server mode

# Building
npm run build           # TypeScript compilation (tsconfig.build.json)
npm run build:full      # Full TypeScript compilation

# Testing
npm test                # Run Jest tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report

# Production
npm start               # Run compiled MCP server
npm run start:http      # Run compiled HTTP server
```

### GitHub App MVP
```bash
cd github-app-mvp

# Development
npm install             # Install dependencies
npm run dev            # Run with hot reload

# Quality Checks
npm run type-check     # TypeScript type checking
npm run lint           # ESLint checks
npm test               # Run Jest tests

# Production
npm run build          # TypeScript compilation
npm start              # Run compiled server
```

## Key Architecture Concepts

### The Five Personas
Each persona has distinct characteristics and focuses:
- **🧑‍💻 Helios (Pragmatist)**: Battle-tested solutions, simplicity, shipping fast
- **🏛️ Selene (Architect)**: Clean architecture, patterns, scalability, maintainability
- **🚀 Prometheus (Innovator)**: Novel approaches, cutting-edge tech, paradigm shifts
- **🕵️ Cassandra (Risk Analyst)**: Security, edge cases, failure modes, vulnerabilities
- **❤️ Gaia (User Advocate)**: UX/DX, clarity, documentation, empathy

### MCP Server Architecture
- **Stateful Sessions**: Maintains context across multiple AI interactions
- **LLM Abstraction**: Provider-agnostic interface supporting Anthropic and OpenAI
- **HTTP/stdio Modes**: Can run as MCP server (for Claude Desktop) or HTTP API
- **Security Layer**: Pattern matching and redaction for sensitive data

### Integration Flow
1. **MCP Tools**: `critique`, `team_debate`, `synthesize`, `create_session`, `list_sessions`
2. **Session Management**: Tracks critiques and context for synthesis
3. **LLM Orchestration**: Parallel persona processing with proper prompt structuring

## Environment Variables

### Dialectical MCP Server
- `LLM_PROVIDER`: "anthropic" | "openai" | "mock"
- `LLM_API_KEY`: API key for chosen provider
- `MCP_HTTP_PORT`: Port for HTTP mode (default: 8080)

### GitHub App MVP
- `GITHUB_APP_ID`: GitHub App identifier
- `GITHUB_PRIVATE_KEY`: PEM-formatted private key
- `GITHUB_WEBHOOK_SECRET`: Webhook validation secret
- `MCP_SERVER_URL`: Dialectical MCP server URL (default: http://localhost:8080)

## Testing Strategy

### Unit Tests
- Located in `tests/` directories
- Use Jest with ts-jest for TypeScript support
- Mock external dependencies (LLM providers, GitHub API)

### Running Specific Tests
```bash
# Run a single test file
npm test -- path/to/test.spec.ts

# Run tests matching a pattern
npm test -- --testNamePattern="critique"

# Debug a test
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.spec.ts
```

## Docker Development

```bash
# Build and run all services
docker-compose up

# Individual services
docker build -t dialectical-mcp ./dialectical-mcp
docker build -t dialectical-github-app ./github-app-mvp
```

## Important Architectural Decisions

1. **MCP vs HTTP**: The MCP server supports both protocols for flexibility
2. **Stateful Design**: Sessions maintain context for complex dialectical workflows
3. **LLM Abstraction**: Provider switching without code changes
4. **Security First**: Built-in patterns for sensitive data handling
5. **Modular Personas**: Easy to add/modify personas in `personas/definitions.ts`

## Common Development Tasks

### Adding a New Persona
1. Edit `dialectical-mcp/src/personas/definitions.ts`
2. Add persona to `PERSONAS` object with philosophy, approach, style
3. Update types in `personas/types.ts` if needed
4. Test with `npm run dev` and use the `critique` tool

### Modifying LLM Behavior
1. LLM providers in `dialectical-mcp/src/llm/providers/`
2. Implement `LLMProvider` interface for new providers
3. Update factory in `llm/factory.ts`

### Debugging MCP Integration
1. Run MCP server with verbose logging: `DEBUG=* npm run dev`
2. Check Claude Desktop logs: `~/Library/Logs/Claude/` (macOS)
3. Test tools directly via HTTP: `curl http://localhost:8080/tools`

## Deployment Considerations

1. **MCP Server**: Needs LLM API access, consider rate limits
2. **GitHub App**: Requires public webhook endpoint (use ngrok for local dev)
3. **Security**: Never commit API keys; use environment variables
4. **Monitoring**: Both services log to stdout, integrate with your logging solution