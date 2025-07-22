# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Dialectical Engine is a prompt engineering framework, not a traditional software project. It implements a "Team of Rivals" methodology for interacting with LLMs to produce more robust and creative solutions through structured debate.

## Core Concept

The framework uses a Hegelian dialectic approach:
1. **Thesis**: Initial problem or code
2. **Antithesis**: Critiques from 5 rival personas
3. **Synthesis**: Final solution integrating best insights

## The Five Personas

When implementing or discussing solutions, consider these perspectives:

- **🧑‍💻 Helios (Pragmatist)**: Simple, fast, direct solutions using battle-tested tools
- **🏛️ Selene (Architect)**: Robust, scalable, maintainable solutions with clean patterns
- **🚀 Prometheus (Innovator)**: Novel approaches, cutting-edge technology, first-principles thinking
- **🕵️ Cassandra (Risk Analyst)**: Security, edge cases, failure modes, vulnerabilities
- **❤️ Gaia (User Advocate)**: UX/DX, intuitive design, clear documentation

## Project Structure

This is a minimal project containing:
- `README.md`: Main documentation and philosophy
- `CLAUDE.md`: This file
- Missing components referenced in README:
  - `setup.sh`: Automated setup script (needs creation)
  - `rivals.yml`: Espanso configuration file (needs creation)

## Development Tasks

When asked to work on this project, common tasks include:

1. **Creating the setup.sh script**: Should install Espanso and configure text snippets
2. **Creating rivals.yml**: Espanso configuration with text expansion snippets
3. **Enhancing the framework**: Adding new personas or improving existing ones
4. **Documentation**: Explaining the methodology and providing examples

## Text Expansion Snippets

The framework relies on these text triggers:
- `:tor` - Full Team of Rivals master prompt
- `:synthesizer` - Synthesis step prompt
- `:helios`, `:selene`, `:prometheus`, `:cassandra`, `:gaia` - Individual persona critiques

## Important Notes

- This is a methodology/framework, not a software application
- Implementation depends on Espanso text expander
- The goal is to improve AI interactions through structured debate
- When creating scripts or configs, ensure cross-platform compatibility (macOS/Linux)