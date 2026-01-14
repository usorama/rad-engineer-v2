---
name: plan
description: Generate execution plans from user queries through intake, research, specification, and validation. Integrated with DecisionLearningIntegration for deterministic, self-learning planning. Use when user provides any query (vague to specific) and needs an executable plan for /execute skill.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, AskUserQuestion
model: claude-sonnet-4-20250514
---

# /plan Skill - Decision Learning Integrated Planning System

> **Version**: 2.0.0 (Decision Learning Integrated)
> **Status**: Active
> **Purpose**: Generate evidence-backed execution plans consumable by /execute skill with deterministic reasoning and outcome-based learning

---

## What's New in v2.0.0 (Decision Learning Integration)

### Core Integration with DecisionLearningIntegration

This skill is now integrated with the rad-engineer DecisionLearningIntegration module, enabling:

1. **Deterministic Planning**: Same context + same reasoning method = same planning decisions
2. **Self-Learning**: Track which planning approaches work best for which contexts
3. **Outcome-Based**: Align all planning decisions with business outcomes
4. **Reasoning Methods**: Apply BMAD elicitation methods (First Principles, 5 Whys, etc.) during research

### How It Works

```
User Query → Intake → enhancePrompt() → Research Agents → Specification → Plan Generation → recordOutcome()
                      ↓                   ↓                           ↓
                Business Outcomes    Reasoning Methods        Track Decisions
```

---

## Core Principles

1. **User-Centric**: Accept queries from vague to specific
2. **Evidence-Based**: All technical decisions traced to verified sources
3. **Parallel Research**: 2-3 concurrent agents (max 2-3 concurrent enforced by ResourceManager)
4. **Structured Output**: YAML metadata + tasks.json for /execute skill
5. **Fast Intake**: 5-10 questions max, <5 minutes for simple queries
6. **Deterministic**: Apply reasoning methods consistently based on context
7. **Self-Learning**: Track outcomes and improve planning quality over time

---

## Phase 0: Startup Protocol

### Required Context Loads

```bash
# Read skill configuration
cat .claude/skills/plan/SKILL.md

# Read rad-engineer components (understand execution capabilities)
cat rad-engineer/SYSTEM_ARCHITECTURE_COMPREHENSIVE.md
cat rad-engineer/README.md

# Read Q4 research (understand decision learning approach)
cat rad-engineer/Q4_RESEARCH_UPDATED.md

# Initialize DecisionLearningIntegration
import { getDecisionLearningIntegration } from 'rad-engineer/src/execute/index.js';
const planIntegration = getDecisionLearningIntegration({
  enableOutcomeInjection: true,
  enableMethodSelection: true,
  enableDecisionTracking: true,
  enableOutcomeLearning: true,
});
```

### Initial State

```
┌─────────────────────────────────────────────────────────────┐
│                    STARTUP STATE                           │
├─────────────────────────────────────────────────────────────┤
│  Input: User Query (vague to specific)                      │
│  Context: rad-engineer components + DecisionLearningIntegration │
│  Constraint: Max 2-3 concurrent agents                      │
│  Output: GRANULAR_EXECUTION_PLAN.md + tasks.json + ADRs     │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Intake (User Query → Structured Requirements)

### Step 1.1: Receive User Query

User provides query in natural language:

```
Examples:
- "build me notion like notes app"
- "add authentication to my API"
- "implement search functionality"
```

### Step 1.2: Ask Clarifying Questions (5-10 max)

Use `AskUserQuestion` tool to gather required information:

```javascript
AskUserQuestion({
  questions: [
    {
      question: "What is the main feature you want to build?",
      header: "Core Feature",
      multiSelect: false,
      options: [
        { label: "New feature from scratch", description: "Building something completely new" },
        { label: "Enhancement to existing", description: "Adding to/modifying existing code" },
        { label: "Bug fix", description: "Fixing a specific issue" }
      ]
    },
    {
      question: "What technical stack should we use?",
      header: "Tech Stack",
      multiSelect: false,
      options: [
        { label: "TypeScript/Node.js", description: "Recommended for rad-engineer projects" },
        { label: "Python/FastAPI", description: "For Python-based services" },
        { label: "Other (specify)", description: "Will use custom tech stack" }
      ]
    },
    {
      question: "What's the timeline for this feature?",
      header: "Timeline",
      multiSelect: false,
      options: [
        { label: "ASAP", description: "Urgent, prioritize speed" },
        { label: "This week", description: "Standard sprint timeline" },
        { label: "Flexible", description: "No specific deadline" }
      ]
    },
    {
      question: "What are the success criteria?",
      header: "Success Criteria",
      multiSelect: true,
      options: [
        { label: "Tests passing", description: "All tests must pass (≥80% coverage)" },
        { label: "TypeScript strict", description: "Zero typecheck errors" },
        { label: "Documentation", description: "Include inline documentation" },
        { label: "Working demo", description: "Runnable demonstration" }
      ]
    },
    {
      question: "What should we NOT include (scope boundaries)?",
      header: "Out of Scope",
      multiSelect: true,
      options: [
        { label: "Database schema changes", description: "No DB modifications" },
        { label: "API changes", description: "No breaking API changes" },
        { label: "UI/UX design", description: "Focus on backend only" },
        { label: "Performance optimization", description: "Functional requirements only" }
      ]
    }
  ]
})
```

### Step 1.3: Build StructuredRequirements

From user answers, construct:

```typescript
interface StructuredRequirements {
  query: string                    // Original user query
  coreFeature: string              // Main feature to build
  techStack: string                // Technology stack
  timeline: string                 // Timeline constraint
  successCriteria: string[]        // Success criteria
  outOfScope: string[]             // Explicitly excluded items
  complexity: 'simple' | 'medium' | 'complex'
  estimatedStories: number         // Rough story count
}
```

---

## Phase 2: Research (Parallel Agents with Decision Learning)

### Step 2.1: Enhance Research Prompts with Decision Learning

**CRITICAL INTEGRATION POINT**: Before spawning research agents, use DecisionLearningIntegration to enhance prompts with business outcomes and reasoning methods.

```typescript
// Import DecisionLearningIntegration
import { getDecisionLearningIntegration, type ExecutionContext } from 'rad-engineer/src/execute/index.js';

// Build execution context for planning
const planningContext: ExecutionContext = {
  storyId: `PLAN-${Date.now()}`,
  storyTitle: requirements.coreFeature,
  component: 'Planning',
  activity: 'research',
  complexity: requirements.complexity === 'simple' ? 0.3 : requirements.complexity === 'medium' ? 0.6 : 0.9,
  domain: detectDomain(requirements.coreFeature), // 'code' | 'creative' | 'reasoning' | 'analysis' | 'general'
  filesInScope: [],
  acceptanceCriteria: requirements.successCriteria,
};

// Enhance research prompt with business outcomes and reasoning methods
const enhanced = await planIntegration.enhancePrompt(
  `Research technical approaches for: ${requirements.coreFeature}\n\nTech Stack: ${requirements.techStack}\nTimeline: ${requirements.timeline}\nSuccess Criteria: ${requirements.successCriteria.join(', ')}`,
  planningContext
);

// enhanced.enhancedPrompt now includes:
// - Business outcomes to achieve (if any extracted)
// - Selected reasoning method (e.g., "First Principles Analysis", "5 Whys")
// - Injection context (domain, complexity, component, activity)
```

### Step 2.2: Spawn Enhanced Research Agents

**CRITICAL**: Use `run_in_background: true` for parallel execution (max 2-3)

```markdown
# Spawn 2-3 research agents in PARALLEL with enhanced prompts

Agent 1: Technical Feasibility (with reasoning method)
──────────────────────────────────────────────────────
Task: enhanced.enhancedPrompt

The reasoning method "${enhanced.reasoningMethod?.name || 'First Principles'}" has been selected for this planning task based on:
- Domain: ${enhanced.injectionContext.domain}
- Complexity: ${enhanced.injectionContext.complexity}
- Component: ${enhanced.injectionContext.component}
- Activity: ${enhanced.injectionContext.activity}

Apply this reasoning method during your research to ensure systematic, evidence-based analysis.

Research focus:
1. Technical feasibility (can this be built?)
2. Recommended approaches (2-3 options with pros/cons)
3. Potential blockers or risks
4. Estimated complexity (simple/medium/complex)
5. Business outcome alignment (how each approach serves the outcomes)

Output: JSON
{
  'feasible': boolean,
  'approaches': [{'name': string, 'pros': string[], 'cons': string[], 'confidence': number, 'outcomeAlignment': number}],
  'risks': [{'risk': string, 'mitigation': string}],
  'complexity': 'simple' | 'medium' | 'complex',
  'evidence': [{'claim': string, 'source': string, 'confidence': number}],
  'reasoningMethodApplied': string
}

Rules: Grep-first, LSP for navigation, JSON output"

Agent 2: Codebase Patterns (if enhancement)
────────────────────────────────────────────
Task: enhanced.enhancedPrompt

Apply reasoning method "${enhanced.reasoningMethod?.name || '5 Whys'}" to analyze existing patterns:
- Why are these patterns used? (5 Whys)
- What are the fundamental principles? (First Principles)
- How do they serve business outcomes?

Glob/Grep to find:
1. Similar existing features (pattern matching)
2. Codebase conventions (file structure, naming)
3. Integration points (where to connect)
4. Dependencies (what already exists)

Output: JSON
{
  'similarFeatures': [{'file': string, 'pattern': string, 'reusable': boolean}],
  'conventions': {'structure': string, 'naming': string, 'testing': string},
  'integrationPoints': [{'location': string, 'type': string, 'requirements': string[]}],
  'existingDependencies': string[],
  'evidence': [{'claim': string, 'source': string, 'confidence': number}],
  'reasoningMethodApplied': string
}

Rules: Grep-first, LSP for navigation, JSON output"

Agent 3: Best Practices (optional - for complex features)
──────────────────────────────────────────────────────────
Task: enhanced.enhancedPrompt

Apply reasoning method "${enhanced.reasoningMethod?.name || 'Socratic Questioning'}" to evaluate best practices:
- What makes this a "best practice"? (Socratic questioning)
- What evidence supports it?
- How does it align with our outcomes?

Context7 queries for:
1. Library documentation (if using specific libraries)
2. Framework best practices
3. Common pitfalls and anti-patterns
4. Security considerations

Output: JSON
{
  'bestPractices': [{'practice': string, 'reason': string, 'source': string, 'outcomeAlignment': number}],
  'pitfalls': [{'pitfall': string, 'consequence': string, 'avoidance': string}],
  'securityConsiderations': [{'risk': string, 'mitigation': string}],
  'evidence': [{'claim': string, 'source': string, 'confidence': number}],
  'reasoningMethodApplied': string
}

Rules: Use context7 for docs, web search for current patterns, JSON output"
```

### Step 2.3: Collect Research Results

```bash
# Wait for all research agents to complete
# Collect outputs via TaskOutput
# Each agent should report which reasoning method they applied
```

### Step 2.4: Consolidate Findings

Create `RESEARCH_FINDINGS.md`:

```markdown
# Research Findings

## Planning Context
- **Decision ID**: ${enhanced.decisionId}
- **Reasoning Method Selected**: ${enhanced.reasoningMethod?.name || 'Default'}
- **Domain**: ${enhanced.injectionContext.domain}
- **Complexity**: ${enhanced.injectionContext.complexity}

## Business Outcomes to Achieve
${enhanced.businessOutcomes.map(outcome => `
### ${outcome.title} (${outcome.category})
${outcome.description}
**Success Criteria**:
${outcome.successCriteria.map(c => `- ${c}`).join('\n')}
`).join('\n')}

## Feasibility
[From Agent 1]

## Technical Approaches
[From Agent 1 - ranked by confidence and outcome alignment]

## Codebase Analysis
[From Agent 2 - existing patterns]

## Best Practices
[From Agent 3 - verified patterns]

## Risk Assessment
[Consolidated from all agents]

## Evidence Sources
[All sources with confidence scores]

## Reasoning Methods Applied
- Agent 1: ${agent1Output.reasoningMethodApplied}
- Agent 2: ${agent2Output.reasoningMethodApplied}
- Agent 3: ${agent3Output.reasoningMethodApplied}
```

---

## Phase 3: Specification

### Step 3.1: Generate Component Specifications

For each major component:

```typescript
interface ComponentSpec {
  componentId: string
  name: string
  purpose: string
  dependencies: string[]
  api: {
    inputs: Record<string, {type: string, required: boolean}>
    outputs: Record<string, {type: string}>
  }
  dataModels: Array<{
    name: string
    fields: Record<string, {type: string, nullable: boolean}>
  }>
  evidence: string[]  // Links to research findings
  businessOutcomeAlignment: string[]  // How this component serves business outcomes
}
```

### Step 3.2: Create Integration Specifications

```typescript
interface IntegrationSpec {
  integrationId: string
  type: 'api' | 'database' | 'service' | 'ui'
  provider: string
  contract: {
    endpoint?: string
    method?: string
    protocol: string
  }
  requirements: string[]
  evidence: string[]
  businessOutcomeAlignment: string[]
}
```

### Step 3.3: Output Specification Files

Create `docs/planning/specs/` directory:

```
docs/planning/specs/
├── component-specs.md
├── integration-specs.md
└── data-models.md
```

---

## Phase 4: Execution Plan Generation

### Step 4.1: Break Down into Stories

From research + specs, generate stories:

```typescript
interface Story {
  id: string                   // STORY-XXX-Y
  waveId: string               // wave-N.M
  title: string
  description: string
  acceptanceCriteria: string[]
  filesInScope: string[]
  testRequirements: {
    unitTests: number
    integrationTests: number
    coverageTarget: number
  }
  estimatedMinutes: number
  model: 'haiku' | 'sonnet' | 'opus'
  dependencies: string[]       // Story IDs
  parallelGroup: number        // Stories in same group can run parallel
  businessOutcomeAlignment: string[]  // NEW: Which business outcomes this serves
}
```

### Step 4.2: Organize into Waves

```typescript
interface Wave {
  id: string                   // wave-N.M
  number: number               // N.M
  phase: 0 | 1 | 2 | 3        // 0=foundation, 1=features, 2=qa, 3=polish
  name: string
  dependencies: string[]       // Wave IDs
  estimatedMinutes: number
  parallelization: 'full' | 'partial' | 'sequential'
  maxConcurrent: number        // 2-3 enforced by ResourceManager
  stories: Story[]
}
```

### Step 4.3: Select Models per Story

Cost optimization strategy:

| Story Size | Model | Rationale |
|------------|-------|-----------|
| XS (<2hr) | haiku | Fast, cheap, sufficient |
| S (2-4hr) | haiku | Balanced |
| M (4-8hr) | sonnet | Higher quality |
| L (1-2d) | sonnet | Complex reasoning |
| XL (2-3d) | opus | Maximum quality |

### Step 4.4: Generate GRANULAR_EXECUTION_PLAN.md

**Location**: `docs/planning/execution/GRANULAR_EXECUTION_PLAN.md`

```yaml
# GRANULAR_EXECUTION_PLAN.md
execution_metadata:
  version: "2.0.0"
  schema: "rad-engineer-execution-metadata-v2"
  project: "[project-name]"
  created: "[YYYY-MM-DDTHH:mm:ssZ]"
  updated: "[YYYY-MM-DDTHH:mm:ssZ]"
  source: "/plan skill v2.0.0 (Decision Learning Integrated)"
  research_session_id: "[UUID]"
  planning_decision_id: "${enhanced.decisionId}"  # NEW: Track planning decision
  reasoning_method_applied: "${enhanced.reasoningMethod?.name || 'Default'}"  # NEW

requirements:
  query: "[original user query]"
  core_feature: "[from intake]"
  tech_stack: "[from intake]"
  timeline: "[from intake]"
  success_criteria: [from intake]
  out_of_scope: [from intake]
  business_outcomes:  # NEW: Business outcomes to achieve
    - title: "[outcome title]"
      category: "[category]"
      description: "[description]"
      success_criteria: [criteria]

waves:
  - id: "wave-0.1"
    number: 0.1
    phase: 0
    name: "Foundation Setup"
    dependencies: []
    estimated_minutes: 60
    parallelization: "full"
    max_concurrent: 2
    stories:
      - id: "STORY-001-1"
        wave_id: "wave-0.1"
        title: "Initialize Project Structure"
        description: "Set up base project with TypeScript, tests, and linting"
        agent_type: "developer"
        model: "haiku"
        estimated_minutes: 30
        dependencies: []
        parallel_group: 1
        business_outcome_alignment:  # NEW
          - "[outcome title]"
        acceptance_criteria:
          - criterion: "package.json exists with dependencies"
          - criterion: "tsconfig.json configured"
          - criterion: "Test setup working"
        files_in_scope:
          - "package.json"
          - "tsconfig.json"
          - "test/setup.ts"
        test_requirements:
          unit_tests: 3
          integration_tests: 0
          coverage_target: 80

integration_tests:
  - wave_id: "wave-0.1"
    tests:
      - name: "Verify project structure"
        test_file: "test/setup.test.ts"

quality_gates:
  - wave_id: "all"
    gates:
      - name: "TypeScript compilation"
        command: "pnpm typecheck"
        must_pass: true
      - name: "Lint"
        command: "pnpm lint"
        must_pass: true
      - name: "Tests"
        command: "pnpm test"
        threshold: "80%"
        must_pass: true
```

### Step 4.5: Generate tasks.json

**Location**: `docs/planning/tasks.json`

```json
{
  "version": "2.0",
  "schema": "rad-engineer-tasks-v2",
  "project": "[project-name]",
  "generatedAt": "[YYYY-MM-DDTHH:mm:ssZ]",
  "planningDecisionId": "${enhanced.decisionId}",  // NEW
  "reasoningMethodApplied": "${enhanced.reasoningMethod?.name || 'Default'}",  // NEW
  "stories": [
    {
      "id": "STORY-001-1",
      "waveId": "wave-0.1",
      "title": "Initialize Project Structure",
      "status": "pending",
      "model": "haiku",
      "estimatedMinutes": 30,
      "dependencies": [],
      "acceptanceCriteria": [
        "package.json exists with dependencies",
        "tsconfig.json configured",
        "Test setup working"
      ],
      "filesInScope": [
        "package.json",
        "tsconfig.json",
        "test/setup.ts"
      ],
      "testRequirements": {
        "unitTests": 3,
        "integrationTests": 0,
        "coverageTarget": 80
      },
      "businessOutcomeAlignment": ["[outcome title]"]  // NEW
    }
  ]
}
```

---

## Phase 5: Validation

### Step 5.1: Evidence Alignment Check

```typescript
// All claims must have evidence sources
function validateEvidenceAlignment(plan: ExecutionPlan): ValidationResult {
  const claims = extractAllClaims(plan);
  const evidence = plan.evidence || [];

  const unverifiedClaims = claims.filter(claim =>
    !evidence.some(ev => ev.claim === claim)
  );

  return {
    passed: unverifiedClaims.length === 0,
    issues: unverifiedClaims.map(claim => ({
      severity: 'error',
      message: `Claim "${claim}" has no evidence source`,
      location: 'research-findings'
    }))
  };
}
```

### Step 5.2: Completeness Check

```typescript
// All required fields must be present
function validateCompleteness(plan: ExecutionPlan): ValidationResult {
  const required = [
    'execution_metadata',
    'requirements',
    'waves',
    'quality_gates',
    'planning_decision_id',  // NEW: Required for decision learning
    'business_outcomes'      // NEW: Required for outcome alignment
  ];

  const missing = required.filter(field => !plan[field]);

  return {
    passed: missing.length === 0,
    issues: missing.map(field => ({
      severity: 'error',
      message: `Missing required field: ${field}`,
      location: field
    }))
  };
}
```

### Step 5.3: Dependency Validation

```typescript
// No circular dependencies
function validateDependencies(plan: ExecutionPlan): ValidationResult {
  const graph = buildDependencyGraph(plan.waves);
  const cycles = detectCycles(graph);

  return {
    passed: cycles.length === 0,
    issues: cycles.map(cycle => ({
      severity: 'error',
      message: `Circular dependency: ${cycle.join(' -> ')}`,
      location: 'waves'
    }))
  };
}
```

### Step 5.4: Parseability Check (CRITICAL)

```typescript
// /execute skill MUST be able to parse this
function validateParseability(plan: ExecutionPlan): ValidationResult {
  try {
    // Simulate /execute parsing
    const parsed = parseExecutionPlan(plan);
    const waveStructure = extractWaveStructure(parsed);
    const storyStructure = extractStoryStructure(parsed);

    return {
      passed: true,
      issues: []
    };
  } catch (error) {
    return {
      passed: false,
      issues: [{
        severity: 'critical',
        message: `Parse error: ${error.message}`,
        location: 'GRANULAR_EXECUTION_PLAN.md'
      }]
    };
  }
}
```

### Step 5.5: Business Outcome Alignment Check (NEW)

```typescript
// All stories should align with business outcomes
function validateOutcomeAlignment(plan: ExecutionPlan): ValidationResult {
  const businessOutcomes = plan.requirements.business_outcomes || [];
  const misalignedStories = [];

  for (const wave of plan.waves) {
    for (const story of wave.stories) {
      if (!story.business_outcome_alignment || story.business_outcome_alignment.length === 0) {
        misalignedStories.push(story.id);
      }
    }
  }

  return {
    passed: misalignedStories.length === 0,
    issues: misalignedStories.map(storyId => ({
      severity: 'warning',
      message: `Story ${storyId} has no business outcome alignment`,
      location: storyId
    }))
  };
}
```

### Step 5.6: Generate Validation Summary

**Location**: `docs/planning/VALIDATION_SUMMARY.md`

```markdown
# Validation Summary

## Overall Result: PASS ✓

## Evidence Alignment
- Verified claims: 42/42 (100%)
- Unverified claims: 0
- Result: ✓ PASS

## Completeness
- Required fields: 6/6 present (including decision learning fields)
- Optional fields: 8/10 present
- Result: ✓ PASS

## Dependencies
- Total waves: 5
- Dependency layers: 3
- Circular dependencies: 0
- Result: ✓ PASS

## Parseability
- YAML structure: ✓ Valid
- Schema compliance: ✓ Valid
- /execute compatibility: ✓ Valid
- Result: ✓ PASS

## Business Outcome Alignment (NEW)
- Stories with outcome alignment: 12/12 (100%)
- Stories without alignment: 0
- Result: ✓ PASS

## Decision Learning Integration (NEW)
- Planning Decision ID: ${enhanced.decisionId}
- Reasoning Method Applied: ${enhanced.reasoningMethod?.name || 'Default'}
- Business Outcomes Defined: ${enhanced.businessOutcomes.length}
- Result: ✓ PASS

## Issues
None

## Recommendations
Plan is ready for execution. Run /execute skill to begin implementation.

Decision learning has been applied to this planning session. The selected reasoning method and business outcomes will guide implementation.
```

---

## Phase 6: Record Planning Outcome (CRITICAL INTEGRATION POINT)

### Step 6.1: Record Planning Decision for Learning

**CRITICAL**: After plan generation and validation, record the planning outcome so DecisionLearningIntegration can learn from this planning session.

```typescript
// Determine planning success
const planningSuccess = validationResults.every(r => r.passed);
const planningQuality = calculatePlanningQuality(validationResults); // 0.0-1.0

// Record planning outcome for learning
await planIntegration.recordOutcome({
  decisionId: enhanced.decisionId,
  success: planningSuccess,
  quality: planningQuality,
  duration: Date.now() - planningStartTime,
  errors: validationResults.flatMap(r => r.issues),
  userFeedback: undefined, // User can provide feedback later
});

// This enables DecisionLearningIntegration to:
// 1. Learn which reasoning methods work best for which planning contexts
// 2. Improve future planning decisions
// 3. Build deterministic planning patterns
```

### Step 6.2: Present Plan Summary

```markdown
# Execution Plan Ready

## Overview
- **Project**: [project-name]
- **Stories**: 12 stories across 5 waves
- **Estimated time**: 6-8 hours
- **Complexity**: Medium

## Decision Learning Integration (NEW)
- **Planning Decision ID**: ${enhanced.decisionId}
- **Reasoning Method Applied**: ${enhanced.reasoningMethod?.name || 'Default'}
- **Business Outcomes**: ${enhanced.businessOutcomes.length} defined
- **Learning Status**: Recorded for future improvement

## Wave Structure
1. **Wave 0.1**: Foundation Setup (2 stories, 60 min)
2. **Wave 0.2**: Core Feature Implementation (4 stories, 180 min)
3. **Wave 0.3**: Testing & QA (3 stories, 90 min)
4. **Wave 0.4**: Documentation (2 stories, 60 min)
5. **Wave 0.5**: Integration (1 story, 30 min)

## Quality Gates
- TypeScript: 0 errors required
- Lint: Must pass
- Tests: ≥80% coverage required

## Evidence Summary
- Research sources: 8 verified
- Best practices: 12 applied
- Risk mitigations: 5 identified

## Validation Result
✓ All checks passed

## Business Outcomes (NEW)
${enhanced.businessOutcomes.map(outcome => `- **${outcome.title}**: ${outcome.description}`).join('\n')}

## Next Steps
1. Review the generated files:
   - docs/planning/execution/GRANULAR_EXECUTION_PLAN.md
   - docs/planning/tasks.json
   - docs/planning/VALIDATION_SUMMARY.md

2. Review planning decision:
   - Decision ID: ${enhanced.decisionId}
   - ADR will be created in docs/decisions/

3. If approved, run /execute to begin implementation

4. If changes needed, run /plan again with refinements

**Proceed with execution?**
```

---

## Quality Standards

### Evidence Quality

- **Verified**: Source URL or document reference
- **Confidence**: 0.0-1.0 score on claim reliability
- **Recency**: Prefer sources from last 12 months
- **Authority**: Official documentation > Blog posts > Forums

### Plan Quality

- **Completeness**: All required fields present (including decision learning fields)
- **Consistency**: No contradictions in plan
- **Feasibility**: Technical implementation possible
- **Traceability**: All decisions traceable to evidence
- **Outcome Alignment**: All stories serve defined business outcomes (NEW)

### YAML Quality

- **Valid YAML**: Must parse without errors
- **Schema Compliance**: Must match execution_metadata.schema
- **Human Readable**: Proper indentation and comments
- **Version Control**: Include version and timestamp

### Decision Learning Quality (NEW)

- **Deterministic**: Same context → same reasoning method selection
- **Tracked**: All planning decisions recorded with decision IDs
- **Aligned**: All planning decisions aligned with business outcomes
- **Learning**: Outcomes recorded for continuous improvement

---

## Integration with /execute Skill

### Handoff Protocol

When /plan completes successfully:

```bash
# /execute skill reads these files:
docs/planning/execution/GRANULAR_EXECUTION_PLAN.md  # Primary input (now with decision learning metadata)
docs/planning/tasks.json                             # Machine-readable (now with planning_decision_id)
docs/planning/VALIDATION_SUMMARY.md                  # Quality assurance (now with decision learning section)
```

### /execute Validation

/execute skill will:

1. Parse GRANULAR_EXECUTION_PLAN.md (including decision learning metadata)
2. Validate wave structure
3. Check story dependencies
4. Enforce maxConcurrent limits via ResourceManager
5. **Use planning_decision_id to link back to planning decisions** (NEW)
6. Execute stories via WaveOrchestrator
7. Enforce quality gates
8. **Record execution outcomes back to DecisionLearningIntegration** (NEW)

### Decision Learning Loop (NEW)

```
/plan enhances prompts → Research with reasoning methods → Plan generation → Record planning outcome
                                                                          ↓
                                                           Learn what works for planning
                                                                          ↓
                                              /execute receives plan → Execution → Record execution outcome
                                                                          ↓
                                                    Learn what works for implementation
                                                                          ↓
                                                         Both improve future decisions
```

---

## Error Handling

### Intake Errors

| Error | Recovery |
|-------|----------|
| No user query | Prompt for query |
| Q&A timeout | Use defaults, mark as assumption |
| Conflicting answers | Ask follow-up question |
| DecisionLearningIntegration error | Continue without decision learning, log warning |

### Research Errors

| Error | Recovery |
|-------|----------|
| Agent crash | Spawn replacement agent |
| Resource limit exceeded | Sequential research (slower) |
| No evidence found | Mark as assumption, flag risk |
| Reasoning method application failed | Continue without method, log warning |

### Validation Errors

| Error | Recovery |
|-------|----------|
| Parse error | Fix YAML, re-validate |
| Circular dependency | Re-organize waves |
| Missing field | Add field or mark optional |
| Outcome misalignment | Add outcome alignment or flag warning |

### Decision Learning Errors (NEW)

| Error | Recovery |
|-------|----------|
| enhancePrompt() failed | Continue without enhancement, log warning |
| recordOutcome() failed | Log error, planning succeeds but learning is lost |
| Decision tracking failed | Log error, continue without ADR creation |

---

## File Structure After /plan (v2.0)

```
project/
├── docs/
│   └── planning/
│       ├── execution/
│       │   └── GRANULAR_EXECUTION_PLAN.md (with decision learning metadata)
│       ├── specs/
│       │   ├── component-specs.md
│       │   ├── integration-specs.md
│       │   └── data-models.md
│       ├── tasks.json (with planning_decision_id)
│       ├── RESEARCH_FINDINGS.md (with reasoning methods applied)
│       └── VALIDATION_SUMMARY.md (with decision learning section)
├── docs/decisions/
│   └── ${enhanced.decisionId}_planning_decision.md (NEW: ADR created by DecisionTracker)
└── .claude/
    └── skills/
        └── plan/
            └── SKILL.md (v2.0.0 - Decision Learning Integrated)
```

---

## Performance Targets

| Phase | Target | Notes |
|-------|--------|-------|
| Intake (Q&A) | <5 minutes (simple), <15 minutes (complex) | Unchanged |
| Decision Learning Enhancement | <1 second | NEW |
| Research | <30 minutes (all agents) | May be slightly longer with reasoning methods |
| Specification | <10 minutes | Unchanged |
| Plan Generation | <10 minutes | Unchanged |
| Validation | <2 minutes | +0.5s for outcome alignment check |
| Outcome Recording | <1 second | NEW |
| **Total** | **<65 minutes** | +~2 seconds for decision learning |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-06 | Initial hybrid /plan skill |
| 2.0.0 | 2026-01-08 | **Decision Learning Integration** - deterministic planning, reasoning methods, outcome tracking, self-learning |

---

## Migration from v1.0.0

If you have been using v1.0.0 of /plan skill:

### What Changed
- Planning prompts are now enhanced with business outcomes and reasoning methods
- Research agents apply selected reasoning methods systematically
- Planning decisions are tracked and recorded for learning
- Business outcomes must be defined and aligned with stories
- Plans include planning_decision_id for traceability

### What Stayed the Same
- Intake process (questions, requirements gathering)
- Research phases (technical feasibility, codebase patterns, best practices)
- Plan structure (waves, stories, quality gates)
- File formats (GRANULAR_EXECUTION_PLAN.md, tasks.json)

### Backward Compatibility
- v1.0.0 plans can still be executed by /execute skill
- v2.0.0 plans are fully backward compatible with v1.0.0 structure
- Decision learning fields are optional in validation (warnings, not errors)

---

**Maintained by**: Rad Engineering Platform
**Last Updated**: 2026-01-08
**Status**: Active Development (Decision Learning Integrated)
**Decision Learning Module**: rad-engineer/src/execute/DecisionLearningIntegration.ts
