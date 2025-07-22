# Getting Started with Dialectical Engine v4.0

Welcome to the Dialectical Engine v4.0! This guide will help you understand, set up, and start using the Team of Rivals AI orchestration system. Whether you're a new team member or transitioning from v3.0, this guide provides everything you need to get productive quickly.

## What Is the Dialectical Engine?

The Dialectical Engine implements a "Team of Rivals" methodology for AI interactions, where five distinct AI personas engage in structured debates to produce more robust and creative solutions. Think of it as having a diverse expert panel review every decision.

### The Five Personas

Meet your AI team members:

- **🧑‍💻 Helios (The Pragmatist)**: *"Ship working code today, optimize tomorrow"*
  - Values: Simplicity, Velocity, Clarity
  - Strengths: Fast implementation, practical solutions
  - When to use: Quick prototypes, debugging, simple solutions

- **🏛️ Selene (The Architect)**: *"Design for the system you'll need in two years"*
  - Values: Robustness, Scalability, Maintainability
  - Strengths: System design, long-term thinking
  - When to use: Architecture decisions, scaling challenges

- **🚀 Prometheus (The Innovator)**: *"Question everything. What if we approached this from first principles?"*
  - Values: Novelty, Disruption, Progress
  - Strengths: Creative solutions, emerging technologies
  - When to use: Breakthrough thinking, research, innovation

- **🕵️ Cassandra (The Risk Analyst)**: *"Every system fails. The question is how, when, and what happens next"*
  - Values: Security, Resilience, Preparedness
  - Strengths: Risk identification, security analysis
  - When to use: Security reviews, failure analysis, risk assessment

- **❤️ Gaia (The User Advocate)**: *"Technology should delight and empower. If users struggle, we've failed"*
  - Values: Clarity, Empathy, Accessibility
  - Strengths: UX/DX insights, user empathy
  - When to use: User experience decisions, documentation, accessibility

### The Dialectical Process

```
📝 Problem Statement
     ↓
🧑‍💻 Helios Critique → "Just use a for loop, it works"
     ↓
🏛️ Selene Critique → "Consider the Open-Closed Principle..."
     ↓
🚀 Prometheus Critique → "But WHY are we using loops at all?"
     ↓
🕵️ Cassandra Critique → "What happens when this fails?"
     ↓
❤️ Gaia Critique → "A new developer would be confused by this"
     ↓
🎯 Synthesis → Balanced solution incorporating best insights
```

## Quick Setup (5 Minutes)

### Prerequisites
- **Node.js** 18+ and npm
- **Git** for version control
- **VS Code** (recommended) with TypeScript extension

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd dialectical-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Set Up Environment
```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys (see API Keys section below)
code .env
```

### 3. Run Your First Debate
```bash
# Start the development server
npm run dev

# In another terminal, test the system
npm test -- --testPathPattern=basic
```

## API Keys Configuration

The Dialectical Engine needs API keys for AI providers. Here's how to set them up:

### Option 1: Using 1Password (Recommended)
```bash
# Install 1Password CLI
brew install --cask 1password/tap/1password-cli

# Get API key from your vault
op item get "Anthropic API Key" --field credential

# Set in environment
export ANTHROPIC_API_KEY=$(op item get "Anthropic API Key" --field credential)
```

### Option 2: Manual Configuration
```bash
# Edit .env file
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# For security, never commit .env to git
echo ".env" >> .gitignore
```

### Option 3: Environment Variables
```bash
# Set directly in your shell
export ANTHROPIC_API_KEY=sk-ant-your-key-here
export OPENAI_API_KEY=sk-your-openai-key-here

# Add to your shell profile (.bashrc, .zshrc, etc.)
echo 'export ANTHROPIC_API_KEY=sk-ant-your-key-here' >> ~/.zshrc
```

## Database Setup

The v4.0 Knowledge Store requires two databases:

### Neo4j (Graph Database) - For Persona Relationships
```bash
# Install Neo4j Community Edition
brew install neo4j

# Start Neo4j
neo4j start

# Access browser interface
open http://localhost:7474

# Default login: neo4j / neo4j (you'll be prompted to change)
```

### MongoDB (Document Database) - For Session Storage
```bash
# Install MongoDB Community Edition
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
mongosh --eval "db.adminCommand('ismaster')"
```

## Your First Dialectical Session

Let's create a simple example to see the system in action:

### 1. Create a Test File
```typescript
// test-debate.ts
import { createDialecticalEngine } from './src/index.js';

async function runSimpleDebate() {
  // Initialize the engine
  const engine = await createDialecticalEngine({
    apiKey: process.env.ANTHROPIC_API_KEY,
    knowledgeStore: {
      graph: { host: 'localhost', port: 7687 },
      documents: { host: 'localhost', port: 27017 }
    }
  });

  // Start a debate
  const result = await engine.startDebate({
    topic: 'Should we use TypeScript or JavaScript for our new API?',
    context: 'We need to build a REST API quickly but also maintain it long-term',
    participants: ['helios', 'selene', 'cassandra'] // Subset for quick test
  });

  // Display results
  console.log('🎯 Final Recommendation:');
  console.log(result.synthesis.content);
  
  console.log('\n📊 Key Insights:');
  result.synthesis.keyInsights.forEach(insight => console.log(`• ${insight}`));
  
  console.log('\n⚖️ Trade-offs:');
  result.synthesis.tradeoffs.forEach(tradeoff => console.log(`• ${tradeoff}`));
}

runSimpleDebate().catch(console.error);
```

### 2. Run the Debate
```bash
# Run your first debate
npx tsx test-debate.ts

# Expected output:
# 🎯 Final Recommendation:
# Start with TypeScript for the API core, but allow JavaScript for rapid prototyping...
#
# 📊 Key Insights:
# • TypeScript provides better long-term maintainability (Selene)
# • Quick iteration is possible with proper tooling (Helios)
# • Type safety prevents runtime errors (Cassandra)
#
# ⚖️ Trade-offs:
# • Initial setup complexity for faster development velocity
# • Learning curve investment for better code quality
```

## Understanding the Codebase

### Project Structure
```
dialectical-mcp/
├── src/
│   ├── personas/           # AI persona definitions
│   ├── services/          # Core orchestration logic
│   ├── knowledge-store/   # Persistent storage layer
│   ├── security/         # PII/IP redaction & compliance
│   └── index.ts          # Main entry point
├── tests/                # Comprehensive test suite
├── docs/                 # Documentation & guides
└── package.json         # Dependencies & scripts
```

### Key Files to Understand

#### 1. Persona Definitions (`src/personas/definitions.ts`)
```typescript
export const HELIOS: Persona = {
  id: 'helios',
  name: 'Helios',
  emoji: '🧑‍💻',
  role: 'The Pragmatic Engineer',
  philosophy: 'Ship working code today, optimize tomorrow',
  coreGoal: 'To deliver a functional solution as quickly as possible',
  values: ['Simplicity', 'Velocity', 'Clarity'],
  // ... detailed personality configuration
};
```

#### 2. Main Service (`src/services/orchestrator.ts`)
```typescript
export class Orchestrator {
  async runSequentialDebate(content, sessionId, personas) {
    // Orchestrates personas in sequence, each building on previous critiques
  }

  async runTargetedRebuttal(content, sessionId, source, target) {
    // Enables direct persona-to-persona debates
  }

  async runAuditWorkflow(content, sessionId, auditType) {
    // Runs specialized audits (security, architecture, UX)
  }
}
```

#### 3. Knowledge Store (`src/knowledge-store/knowledge-store.ts`)
```typescript
export class KnowledgeStore {
  constructor(
    public readonly graph: IGraphRepository,    // Neo4j for relationships
    public readonly documents: IDocumentRepository // MongoDB for sessions
  ) {}

  async learnFromSession(sessionId: string) {
    // Extracts insights from completed debates
    // Updates persona expertise and conflict relationships
  }
}
```

#### 4. Security Layer (`src/security/redaction-service.ts`)
```typescript
export class RedactionService {
  async redactContent(content, sessionId, userId) {
    // Automatically detects and redacts PII/IP
    // Queues sensitive content for human review
    // Returns redacted content safe for AI processing
  }
}
```

### Configuration System

The engine uses a layered configuration approach:

#### Environment Configuration (`.env`)
```bash
# AI Provider Settings
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Database Settings
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
MONGODB_URI=mongodb://localhost:27017/dialectical

# Security Settings
ENABLE_PII_REDACTION=true
REQUIRE_HUMAN_APPROVAL=false
HUMAN_REVIEW_THRESHOLD=HIGH
```

#### Runtime Configuration
```typescript
const config: DialecticalConfig = {
  personas: {
    enabled: ['helios', 'selene', 'prometheus', 'cassandra', 'gaia'],
    defaultWorkflow: 'sequential'
  },
  ai: {
    provider: 'anthropic',
    model: 'claude-3-sonnet',
    temperature: 0.7,
    maxTokens: 4000
  },
  knowledge: {
    enableLearning: true,
    learningThreshold: 0.8,
    maxSessionHistory: 1000
  },
  security: {
    enableRedaction: true,
    riskThreshold: 'HIGH',
    auditCompliance: ['GDPR', 'CCPA']
  }
};
```

## Common Use Cases

### 1. Code Review
```typescript
const codeReview = await engine.auditCode({
  code: `
    function processPayment(amount, cardNumber) {
      // Process the payment
      console.log("Processing:", cardNumber);
      return { success: true };
    }
  `,
  auditType: 'security' // Cassandra will focus on security issues
});

// Output will include security vulnerabilities, logging concerns, etc.
```

### 2. Architecture Decisions
```typescript
const architectureDebate = await engine.startDebate({
  topic: 'Microservices vs Monolith for our e-commerce platform',
  context: 'Team of 8 developers, expecting 10x growth in 2 years',
  participants: ['helios', 'selene', 'prometheus'], // Architecture-focused team
  workflowType: 'sequential'
});
```

### 3. UX/DX Improvements
```typescript
const uxReview = await engine.auditCode({
  code: 'Our new user onboarding flow component',
  auditType: 'ux' // Gaia will focus on user experience
});
```

### 4. Innovation Brainstorming
```typescript
const innovation = await engine.startDebate({
  topic: 'How can we use AI to improve our customer support?',
  participants: ['prometheus', 'gaia'], // Innovation + User focus
  workflowType: 'collaborative'
});
```

## Integration Patterns

### With Your Existing Workflow

#### CI/CD Integration
```yaml
# .github/workflows/dialectical-review.yml
name: Dialectical Code Review
on: [pull_request]

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Dialectical Engine
        run: npm install @dailectic/dialectical-mcp
      
      - name: Run Security Audit
        run: |
          npx dialectical audit \
            --type security \
            --files "src/**/*.ts" \
            --output security-report.json
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Comment PR with Results
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('security-report.json'));
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🕵️ **Cassandra's Security Review**\n\n${report.summary}`
            });
```

#### VS Code Extension Integration
```json
{
  "dialectical.enableInlineReviews": true,
  "dialectical.defaultPersona": "helios",
  "dialectical.autoTriggerOnSave": false,
  "dialectical.reviewTypes": ["security", "architecture", "ux"]
}
```

#### CLI Usage
```bash
# Quick code review
dialectical review src/api/user.ts --persona cassandra

# Full team debate on architecture
dialectical debate "Should we migrate to microservices?" \
  --context "Monolithic Node.js app, 50k users" \
  --team full

# Batch audit entire codebase
dialectical audit src/ --type security --output audit-report.json
```

### With Popular Frameworks

#### Express.js API Integration
```typescript
import express from 'express';
import { createDialecticalMiddleware } from '@dailectic/express';

const app = express();

// Add dialectical review to sensitive endpoints
app.post('/api/payment', 
  dialecticalMiddleware.auditSecurity(),
  (req, res) => {
    // Your payment processing logic
  }
);

app.listen(3000);
```

#### React Component Reviews
```typescript
import { useDialecticalReview } from '@dailectic/react-hooks';

function PaymentForm() {
  const { reviewComponent } = useDialecticalReview();
  
  const handleSubmit = async (data) => {
    // Get UX review before processing
    const uxReview = await reviewComponent({
      component: 'PaymentForm',
      userFlow: data,
      persona: 'gaia'
    });
    
    if (uxReview.concerns.length > 0) {
      console.warn('UX concerns:', uxReview.concerns);
    }
    
    // Process payment
  };
  
  return <form onSubmit={handleSubmit}>/* form fields */</form>;
}
```

## Development Workflow

### Daily Development Tasks

#### 1. Start Your Day
```bash
# Check system health
npm run health-check

# Pull latest persona updates
npm run personas:update

# Review pending human approvals (if applicable)
npm run security:review-queue
```

#### 2. During Development
```bash
# Quick pragmatic review (Helios)
dialectical review --quick src/components/UserProfile.tsx

# Architecture check before major changes (Selene)
dialectical audit --type architecture src/

# Security check before commit (Cassandra)
dialectical audit --type security --changed-files
```

#### 3. Before Commits
```bash
# Pre-commit hook integration
npm run pre-commit  # Runs dialectical security audit

# Manual comprehensive review
dialectical debate "Is this change ready for production?" \
  --context "$(git diff --cached)"
```

### Team Collaboration

#### Code Review Process
```markdown
## PR Template with Dialectical Review

### Changes Made
- [Describe your changes]

### Dialectical Review Results
<!-- Run: dialectical debate "Should we merge this PR?" --context "$(git diff main)" -->

**🧑‍💻 Helios (Pragmatist):** [Paste Helios's critique]
**🏛️ Selene (Architect):** [Paste Selene's critique]
**🕵️ Cassandra (Security):** [Paste Cassandra's critique]

### Synthesis
[Paste the final synthesis and decision]

### Action Items
- [ ] Address Cassandra's security concerns
- [ ] Consider Selene's scalability suggestions
- [ ] Implement Helios's simplification ideas
```

#### Team Conventions
```typescript
// Team agreed-upon persona usage patterns

// For new features: Always include Gaia (UX)
const newFeatureReview = ['helios', 'selene', 'gaia'];

// For security-sensitive changes: Always include Cassandra
const securityReview = ['cassandra', 'selene'];

// For architecture decisions: Full team
const architectureDecision = ['helios', 'selene', 'prometheus', 'cassandra', 'gaia'];

// For quick fixes: Helios only
const quickFix = ['helios'];
```

## Testing Your Understanding

Try these exercises to validate your setup and understanding:

### Exercise 1: Basic Persona Interaction
```typescript
// Create a simple debate and observe persona differences
const result = await engine.startDebate({
  topic: 'Should we add more unit tests or focus on integration tests?',
  participants: ['helios', 'selene'],
  workflowType: 'targeted' // Direct debate between two personas
});

// Question: How do Helios and Selene's perspectives differ?
// Expected: Helios focuses on pragmatic testing, Selene on comprehensive coverage
```

### Exercise 2: Security Detection
```typescript
const sensitiveCode = `
  const apiKey = "sk-1234567890abcdef";
  const userEmail = "john.doe@company.com";
  const password = "secretpassword123";
`;

const auditResult = await engine.auditCode({
  code: sensitiveCode,
  auditType: 'security'
});

// Question: What security issues does Cassandra identify?
// Expected: API key exposure, hardcoded credentials, potential PII
```

### Exercise 3: Knowledge Learning
```typescript
// Run multiple sessions and observe learning
for (let i = 0; i < 3; i++) {
  await engine.startDebate({
    topic: `React performance optimization - session ${i + 1}`,
    participants: ['helios', 'prometheus']
  });
}

// Check learned expertise
const heliosPerformance = await engine.getPersonaPerformance('helios');

// Question: How does Helios's expertise in React performance evolve?
// Expected: Confidence scores and expertise areas should update
```

## Troubleshooting

### Common Issues and Solutions

#### "API Key Not Found" Error
```bash
# Check environment variables
echo $ANTHROPIC_API_KEY

# Verify .env file
cat .env | grep ANTHROPIC

# Test API connection
npm run test:api-connection
```

#### Database Connection Issues
```bash
# Check Neo4j status
neo4j status

# Check MongoDB status
brew services list | grep mongodb

# Test database connections
npm run test:databases
```

#### High Response Times
```typescript
// Check system performance
const health = await engine.healthCheck();
console.log('Performance metrics:', health.performance);

// Common causes:
// 1. Too many concurrent requests
// 2. Database connection issues
// 3. Large context sizes
// 4. Network latency to AI providers
```

#### Memory Issues
```bash
# Monitor memory usage
node --max-old-space-size=4096 your-script.js

# Common causes:
# 1. Large session histories not being archived
# 2. Memory leaks in persona state
# 3. Unoptimized database queries
```

### Debug Mode
```typescript
const engine = await createDialecticalEngine({
  ...config,
  debug: true,
  logging: {
    level: 'debug',
    includePersonaThinking: true,
    includeQueryPerformance: true
  }
});

// This will output detailed logs of:
// - Persona decision-making processes
// - Database query performance
// - AI API request/response times
// - Security redaction details
```

### Getting Help

#### Community Resources
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive guides in `/docs`
- **Examples**: Real-world usage patterns in `/examples`
- **Tests**: Test files show expected usage patterns

#### Support Channels
- **Slack**: #dialectical-engine (internal team)
- **Email**: dialectical-support@company.com
- **Office Hours**: Tuesdays 2-3pm PST

#### Self-Service Debugging
```bash
# Run diagnostic suite
npm run diagnose

# Check system compatibility
npm run compatibility-check

# Validate configuration
npm run validate-config
```

## Next Steps

### Immediate Next Steps (Today)
1. ✅ Complete the Quick Setup
2. ✅ Run your first debate
3. ✅ Try each persona individually
4. ✅ Set up your development environment

### This Week
1. 📝 Integrate with your current project
2. 🔧 Configure persona preferences for your team
3. 🛡️ Set up security policies appropriate for your data
4. 📊 Establish team conventions for persona usage

### This Month
1. 🎯 Customize personas for your domain expertise
2. 🤖 Set up CI/CD integration
3. 📈 Analyze usage patterns and optimize workflows
4. 🔄 Train team members on advanced features

### Advanced Features to Explore
- **Custom Persona Creation**: Define domain-specific experts
- **Workflow Orchestration**: Complex multi-step debates
- **Learning Analytics**: Persona performance optimization
- **Enterprise Security**: Advanced compliance and governance

## Feedback & Contribution

Your experience as a new user is valuable! Please share:

### What's Working Well
- Which parts of this guide were most helpful?
- What features did you find immediately valuable?
- Which personas do you use most often?

### What Could Be Better
- Where did you get stuck during setup?
- What concepts need better explanation?
- What features are you missing?

### Contributing Back
```bash
# Report issues
git checkout -b issue/describe-the-problem
# Document your issue and solution

# Suggest improvements
git checkout -b feature/improve-getting-started
# Make your improvements to this guide

# Share examples
git checkout -b example/your-use-case
# Add real-world usage examples
```

## Conclusion

You now have everything needed to start using the Dialectical Engine v4.0 effectively! The key to success is:

1. **Start Simple**: Begin with basic persona interactions
2. **Understand Each Persona**: Learn their unique perspectives and strengths
3. **Use the Right Tool**: Match personas to your specific needs
4. **Learn from Results**: Pay attention to the synthesis and insights
5. **Iterate and Improve**: Use the knowledge store to build expertise over time

Remember: The Dialectical Engine is designed to make you a more thoughtful and comprehensive developer by providing multiple expert perspectives on every decision. Think of it as your personal expert advisory board, available 24/7.

Happy coding with your Team of Rivals! 🚀