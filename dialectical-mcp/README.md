# Dialectical MCP Server

A Model Context Protocol (MCP) server that transforms the "Team of Rivals" dialectical prompting technique into a stateful, orchestrated AI platform.

## What This Does

Instead of copy-pasting large prompts, this MCP server:
- Maintains consistent persona definitions
- Manages debate sessions with state
- Orchestrates multi-persona critiques
- Synthesizes diverse perspectives into superior solutions

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Claude    │────▶│  MCP Server │────▶│   LLM API   │
│   Desktop   │◀────│ (Dialectic) │◀────│             │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   Session    │
                    │  Management  │
                    └─────────────┘
```

## Installation

```bash
# From the dialectical-mcp directory
npm install
npm run build
```

## Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "dialectical": {
      "command": "node",
      "args": ["/path/to/dialectical-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## Available Tools

### 1. `critique`
Get a critique from a specific persona.

```typescript
{
  content: string,      // Code or idea to critique
  persona: string,      // 'helios' | 'selene' | 'prometheus' | 'cassandra' | 'gaia'
  sessionId?: string,   // Optional session for context
  context?: string      // Additional context
}
```

### 2. `team_debate`
Get critiques from all five personas at once.

```typescript
{
  content: string,      // Code or idea for debate
  sessionId?: string,   // Creates session if provided
  context?: string      // Additional context
}
```

### 3. `synthesize`
Combine all critiques into a final solution.

```typescript
{
  sessionId: string,              // Session with critiques
  additionalGuidance?: string     // Extra synthesis guidance
}
```

### 4. `create_session`
Start a new stateful debate session.

```typescript
{
  topic: string,        // Debate topic
  context?: string      // Initial context
}
```

### 5. `list_sessions`
View active debate sessions.

## The Five Personas

1. **🧑‍💻 Helios (Pragmatist)**: Simple, direct solutions with standard tools
2. **🏛️ Selene (Architect)**: Scalable, well-structured, pattern-based solutions  
3. **🚀 Prometheus (Innovator)**: Novel approaches and paradigm shifts
4. **🕵️ Cassandra (Risk Analyst)**: Security, edge cases, and failure modes
5. **❤️ Gaia (User Advocate)**: UX/DX, clarity, and documentation

## Usage Examples

### Quick Critique
```
Use the critique tool to get Cassandra's security analysis of this code:
[paste code]
```

### Full Team Debate
```
Use team_debate to analyze this architecture proposal:
[paste proposal]
```

### Stateful Discussion
```
1. Create a session for "API Design Review"
2. Get Selene's architectural critique
3. Get Helios's pragmatic take
4. Synthesize both perspectives
```

## Why This Matters

Traditional prompting:
- Stateless, requiring full context each time
- Inconsistent persona behavior
- High cognitive load on the AI
- Limited to single-shot interactions

MCP-powered approach:
- Stateful sessions maintain context
- Consistent, rich persona definitions
- Clean separation of system/user prompts
- Complex orchestration workflows
- Analytics and improvement over time

## Future Enhancements

- [ ] Direct LLM integration (currently returns prompts)
- [ ] Persona fine-tuning based on feedback
- [ ] Automated critique routing based on content type
- [ ] Webhook support for CI/CD integration
- [ ] Web UI for visual debate management
- [ ] Export debates as markdown reports

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Run directly
npm start
```

## Contributing

The personas can be enhanced by editing `src/personas/definitions.ts`. Each persona has:
- Core philosophy
- Specific approaches
- Communication style
- Focus areas
- Output format preferences

Feel free to add new personas or enhance existing ones!