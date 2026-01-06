# Agent & Skill Design: BA, Orchestrator, and Documentation Automation

## Research Summary

### What Claude Code Provides (Built-in)
- **Explore Subagent**: Read-only, fast codebase exploration (Haiku)
- **Plan Subagent**: Research for plan mode (Sonnet)
- **General-Purpose Subagent**: Full tool access for complex tasks (Sonnet)

### Official Plugins Available
- `code-review@claude-plugins-official` - Code review
- `feature-dev@claude-plugins-official` - Feature development with code-reviewer, code-explorer, code-architect agents
- `security-guidance@claude-plugins-official` - Security review
- `agent-sdk-dev@claude-plugins-official` - Agent SDK development

### What We Need to Create
1. **Business Analyst Agent** - Requirements gathering and analysis
2. **Orchestrator Skill** - Project management and delegation
3. **Documentation Automation Skill** - MD ↔ JSON sync
4. **Continual Learning Integration** - Already designed

---

## Design Decisions

### 1. MD vs JSON for AI Consumption

| Format | Pros | Cons | Best For |
|--------|------|------|----------|
| **Markdown** | Human-readable, easy to edit, Git-friendly, Claude naturally reads well | Parsing for structured data requires pattern matching | Instructions, templates, documentation |
| **JSON** | Machine-parseable, strongly typed, compact, easy to validate | Less human-readable, harder to edit manually | Task tracking, metrics, learnings, state |

**Decision**: Use **both strategically**
- `.md` for: Skills, agents, templates, instructions, user-facing docs
- `.json` for: tasks.json, learnings.json, metrics.json, state files
- **Sync mechanism**: A `doc-sync` skill that validates consistency

### 2. Context Optimization Strategy

**Target**: Agents operate within 75-80% of 200K = **150K-160K tokens**

| Strategy | Implementation |
|----------|----------------|
| **Progressive Loading** | Only load what's needed for current task |
| **Compact Instructions** | Skills/agents under 500 lines, core content front-loaded |
| **JSON for Data** | Structured data in JSON is more token-efficient |
| **Just-in-Time Context** | Use @imports in CLAUDE.md, not inline content |
| **Task Scoping** | Clear, narrow task descriptions to agents |
| **Output Constraints** | Request concise outputs, not verbose explanations |

### 3. Agent vs Skill Decision Matrix

| Need | Agent | Skill | Rationale |
|------|-------|-------|-----------|
| **Business Analysis** | ✓ | - | Needs isolated context, specialized persona |
| **Orchestration** | - | ✓ | Runs in main context, needs full visibility |
| **Documentation Sync** | - | ✓ | Quick utility, doesn't need separate context |
| **Continual Learning** | - | ✓ + Hooks | Hooks for capture, skill for review/injection |

---

## 1. Business Analyst Agent Design

### Purpose
Gather, analyze, and document business requirements through structured discovery.

### Agent Definition

```markdown
---
name: business-analyst
description: Senior Business Analyst for requirements discovery and analysis. Use when gathering requirements, analyzing business processes, documenting user needs, or creating PRDs. Specializes in stakeholder interviews and requirement validation.
tools: Read, Write, WebSearch, WebFetch, Glob, Grep
model: opus
---

You are a senior Business Analyst with deep expertise in requirements engineering.

## Core Competencies
- Stakeholder interview and requirements elicitation
- Business process analysis and documentation
- User story creation with INVEST criteria
- Gap analysis and requirements validation
- PRD and specification writing

## Discovery Process
1. Understand business context and objectives
2. Identify stakeholders and their needs
3. Document current state (As-Is)
4. Define future state (To-Be)
5. Identify gaps and requirements
6. Validate with stakeholders
7. Prioritize using RICE/MoSCoW

## Output Standards
- Requirements must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- User stories must pass INVEST criteria
- All assumptions must be explicitly documented
- Dependencies must be identified and tracked

## Tools Usage
- WebSearch: Research industry standards, competitor analysis
- Read/Glob: Analyze existing documentation and code
- Write: Document requirements, create PRDs

## Quality Gates
Before completing any deliverable:
- [ ] All stakeholder questions answered
- [ ] Assumptions documented
- [ ] Dependencies identified
- [ ] Success criteria defined
- [ ] Acceptance criteria are testable
```

### When to Invoke
- User asks to gather requirements
- Starting a new feature/project
- Need to understand business context
- Creating PRD or specifications

---

## 2. Orchestrator Skill Design

### Purpose
Project management, task delegation, progress tracking, and multi-agent coordination.

### Skill Definition

```markdown
---
name: orchestrator
description: Project orchestration and management. Use for planning work, delegating to agents, tracking progress, managing sprints, and coordinating multi-step implementations. Helps break down complex work and ensure quality delivery.
allowed-tools: Read, Write, Bash, Glob, Grep, Task, TodoWrite
model: opus
---

# Orchestrator Skill

You are the project orchestrator responsible for planning, delegating, and tracking work.

## Core Responsibilities

### 1. Work Planning
- Break down epics into stories
- Break down stories into tasks
- Identify dependencies and critical path
- Estimate effort and assign priorities

### 2. Agent Delegation
Select the right agent for each task:

| Task Type | Agent | Why |
|-----------|-------|-----|
| Requirements gathering | business-analyst | Specialized in discovery |
| Code exploration | Explore (built-in) | Fast, read-only |
| Architecture design | architect | System design expertise |
| Implementation | General-Purpose | Full tool access |
| Code review | code-reviewer | Quality focus |
| Testing | test-writer | QA expertise |
| Debugging | debugger | Investigation skills |

### 3. Progress Tracking
- Maintain tasks.json with current status
- Update PROGRESS.md for human visibility
- Track blockers and dependencies
- Report status on request

### 4. Quality Assurance
Before marking any milestone complete:
- [ ] All tasks verified with evidence
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] No critical issues open

## Task Delegation Protocol

When delegating to agents:
1. Provide clear, scoped task description
2. Include relevant context files
3. Specify expected output format
4. Define success criteria
5. Set appropriate model (haiku for simple, sonnet for complex, opus for critical)

## Context Optimization

### For Agent Prompts
- Keep task descriptions under 500 tokens
- List only essential context files
- Use JSON for structured data requirements
- Request concise outputs

### For Progress Files
- tasks.json: Machine state, compact
- PROGRESS.md: Human summary, brief
- learnings.json: Compressed insights

## Workflow Commands

### `/orchestrate plan`
Create implementation plan for a feature/task

### `/orchestrate status`
Report current progress and blockers

### `/orchestrate delegate <task>`
Assign task to appropriate agent

### `/orchestrate verify`
Run verification on completed work
```

---

## 3. Documentation Sync Skill Design

### Purpose
Keep MD and JSON files in sync, validate consistency, generate from templates.

### Skill Definition

```markdown
---
name: doc-sync
description: Documentation automation and synchronization. Use to sync MD↔JSON files, validate documentation consistency, generate docs from templates, and update documentation after code changes.
allowed-tools: Read, Write, Bash, Glob, Grep
model: haiku
---

# Documentation Sync Skill

Automate documentation maintenance and ensure consistency.

## Core Functions

### 1. MD ↔ JSON Sync
Keep parallel documentation in sync:
- `PROGRESS.md` ↔ `tasks.json` (progress tracking)
- `learnings.md` ↔ `learnings.json` (continual improvement)
- `BACKLOG.md` ↔ `backlog.json` (product backlog)

### 2. Validation
Check documentation for:
- Broken internal links
- Missing required sections
- Outdated information
- Inconsistent formatting

### 3. Generation
Create documentation from:
- Code comments → API docs
- Templates → New documents
- JSON data → Markdown reports

## Sync Rules

### tasks.json → PROGRESS.md
```
tasks.json status changes → Update "## In Progress" and "## Completed" sections
tasks.json new tasks → Update "## Next Steps" section
tasks.json blockers → Update "## Blockers" section
```

### learnings.json → CLAUDE.md
```
High-confidence learnings → Inject into relevant CLAUDE.md sections
Pattern learnings → Update coding standards section
Anti-pattern learnings → Add to "## Avoid" section
```

## Usage

### `/doc-sync validate`
Check all documentation for consistency

### `/doc-sync update`
Sync all paired MD/JSON files

### `/doc-sync generate <template> <output>`
Generate document from template

## Token Efficiency
- Use structured JSON for data, readable MD for instructions
- JSON is ~30% more token-efficient for structured data
- Keep MD files focused, use @imports for details
```

---

## 4. JSON Schema Definitions

### tasks.json (Already created, optimized)
See `.claude/skills/project-planner/templates/tasks-template.json`

### learnings.json Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "version": { "type": "string" },
    "updated_at": { "type": "string", "format": "date-time" },
    "learnings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "type": { "enum": ["success", "failure", "optimization"] },
          "domain": { "type": "string" },
          "context": { "type": "string", "maxLength": 100 },
          "learning": { "type": "string", "maxLength": 200 },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "uses": { "type": "integer" },
          "last_used": { "type": "string", "format": "date-time" },
          "created_at": { "type": "string", "format": "date-time" }
        },
        "required": ["id", "type", "domain", "learning", "confidence"]
      }
    }
  }
}
```

### metrics.json Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "session_id": { "type": "string" },
    "started_at": { "type": "string", "format": "date-time" },
    "metrics": {
      "type": "object",
      "properties": {
        "tasks_completed": { "type": "integer" },
        "tasks_failed": { "type": "integer" },
        "agents_spawned": { "type": "integer" },
        "avg_agent_tokens": { "type": "integer" },
        "learnings_captured": { "type": "integer" },
        "learnings_applied": { "type": "integer" }
      }
    }
  }
}
```

---

## 5. Context Budget Allocation

### Per-Agent Token Budgets (of 200K)

| Agent | Max Input | Reserved Output | Buffer | Effective |
|-------|-----------|-----------------|--------|-----------|
| business-analyst | 120K | 30K | 10K | 160K |
| architect | 120K | 30K | 10K | 160K |
| code-reviewer | 100K | 20K | 10K | 130K |
| test-writer | 100K | 20K | 10K | 130K |
| debugger | 120K | 30K | 10K | 160K |
| doc-sync (haiku) | 80K | 15K | 5K | 100K |

### Context Loading Strategy

```
Priority 1 (Always Load):
- Task description (<500 tokens)
- Essential context files (<2K tokens per file)
- Relevant learnings (<500 tokens)

Priority 2 (Load if Needed):
- Related files via @imports
- Historical context
- Extended documentation

Priority 3 (Load on Demand):
- Full file contents
- Test outputs
- Logs
```

---

## Implementation Plan

### Phase 1: Core Agents & Skills
1. Create `business-analyst` agent
2. Create `orchestrator` skill
3. Create `doc-sync` skill

### Phase 2: JSON Infrastructure
1. Create `learnings.json` template
2. Create `metrics.json` template
3. Update hooks to use JSON format

### Phase 3: Integration
1. Wire hooks for learning capture
2. Integrate doc-sync with build process
3. Add orchestrator to main workflow

### Phase 4: Optimization
1. Measure actual token usage
2. Tune context budgets
3. Add token tracking to metrics

---

## Summary

| Component | Type | Model | Purpose |
|-----------|------|-------|---------|
| business-analyst | Agent | opus | Requirements discovery |
| architect | Agent | opus | System design (exists) |
| orchestrator | Skill | opus | Project management |
| doc-sync | Skill | haiku | Documentation automation |
| continual-learning | Skill + Hooks | - | Learning capture/injection |

This design optimizes for:
- **Context efficiency**: JSON for data, MD for instructions
- **Clear responsibilities**: Each agent/skill has focused purpose
- **Token budgets**: Stay within 75-80% of 200K
- **Automation**: Hooks + skills reduce manual work
