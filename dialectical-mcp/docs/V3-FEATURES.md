# Dialectical Engine v3.0 - From Orchestrator to Intelligence

The Dialectical MCP server v3.0 transforms from a simple prompt orchestrator into an intelligent dialectical engine that actively participates in guiding debates toward superior solutions.

## Core Enhancements

### 1. Richer Persona Definitions

Each persona now includes:

- **Core Goal**: The fundamental objective driving their critiques
- **Values**: What they hold dear (e.g., Simplicity, Security, Innovation)
- **Biases**: 
  - **Toward**: Technologies and patterns they favor
  - **Against**: Practices they oppose
- **Interlocutor Relationships**: How they view other personas

Example from Selene's definition:
```typescript
interlocutorRelationships: {
  helios: "A necessary force for getting things done, but dangerously short-sighted.",
  prometheus: "Brilliant, but his ideas are often impractical.",
  cassandra: "A valuable ally in identifying risks, though her pessimism can stifle progress."
}
```

### 2. Contextual Prompt Building

The `ContextualPromptBuilder` dynamically analyzes code and injects relevant context:

#### Bias Detection
When code contains patterns a persona is biased against, they're explicitly prompted to address them:

```
Important: The code contains elements you are biased AGAINST: TODO pattern detected, 
Magic Numbers. Address these directly in your critique.
```

#### Relationship-Aware Sequential Debates
In sequential debates, personas are reminded of their relationships:

```
### Response to HELIOS's critique
Your perspective on helios: "A necessary force for getting things done, but dangerously short-sighted."
Keep this relationship in mind as you review their critique.
```

### 3. New Debate Workflows

#### Sequential Debate
Personas critique in order, each aware of previous critiques:

```
Use sequential_debate on this code:
```

Helios → Selene (responds to Helios) → Prometheus (responds to both) → etc.

#### Targeted Rebuttal
Direct confrontation between specific personas:

```
Use targeted_rebuttal with sourcePersona='helios' and targetPersona='selene'
```

#### Structured Audits
Get machine-readable audit results:

```
Use audit_code with auditType='security' on this:
```

Returns structured JSON like:
```json
{
  "auditType": "security",
  "results": {
    "vulnerabilities": [
      {
        "id": "SQL-001",
        "description": "SQL injection vulnerability",
        "severity": "Critical",
        "recommendation": "Use parameterized queries"
      }
    ]
  },
  "summary": "Found 3 vulnerabilities: 1 Critical, 2 High"
}
```

## Technical Architecture

### The Orchestrator
Central workflow manager that coordinates complex debate patterns:
- Manages workflow state
- Tracks step execution
- Enables multi-step debates

### Contextual Prompt Builder
Intelligent prompt enhancement:
- Scans for bias triggers
- Injects relationship context
- Adds audit-specific instructions

### Structured Output Parser
Ensures reliable JSON output:
- Validates against schemas
- Extracts JSON from mixed content
- Provides retry mechanisms

## Usage Examples

### 1. Bias-Aware Critique
```
Use critique with persona='selene' on this code:
// TODO: Fix this hack later
globalConfig.magicTimeout = 3000;
```

Selene will specifically address the TODO and magic number.

### 2. Sequential Philosophical Debate
```
Use sequential_debate on this architecture proposal:
[microservices design]
```

Watch as each persona builds on previous critiques, creating a rich dialogue.

### 3. Security Audit with Structured Output
```
Use audit_code with auditType='security' on:
[authentication code]
```

Get a programmatic list of vulnerabilities with severity ratings.

### 4. Helios vs Selene Showdown
```
First: Use critique with persona='helios'
Then: Use targeted_rebuttal with sourcePersona='helios' targetPersona='selene'
```

Watch Selene tear apart Helios's "ship it now" approach!

## What Makes This Powerful

1. **Reduced Cognitive Load**: The AI receives precisely crafted prompts with relevant context
2. **Authentic Interactions**: Personas respond based on their relationships and biases
3. **Actionable Output**: Structured audits enable automation and integration
4. **Dynamic Orchestration**: Complex workflows that would be impossible manually

## Future Vision

- **Learning System**: Track which biases lead to valuable insights
- **Persona Evolution**: Fine-tune models on each persona's output
- **Conflict Resolution**: AI mediator that finds common ground
- **Code Generation**: Synthesizer that produces code incorporating all feedback

The Dialectical Engine v3 is no longer just managing prompts—it's actively shaping the conversation to produce superior outcomes through intelligent orchestration.