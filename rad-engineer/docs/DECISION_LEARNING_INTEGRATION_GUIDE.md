# Decision Learning Integration Guide

> **Version**: 1.0.0
> **Date**: 2026-01-08
> **Status**: Complete - Q4 Phase 1-2 Integrated

---

## Overview

This guide explains how to use the Decision Learning Integration in rad-engineer projects. The integration enables **deterministic, self-learning, self-improving** planning and execution.

### What Is Decision Learning Integration?

Decision Learning Integration is the **CORE MECHANISM** that makes the rad-engineer platform:
- **Deterministic**: Same input + same reasoning method = same decision
- **Self-Learning**: Track which approaches work best for which contexts
- **Self-Improving**: Learn from outcomes to improve future decisions

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Decision Learning Integration                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ /plan skill   │───▶│ enhancePrompt │◀───│Business      │    │
│  │ (v2.0.0)      │    │              │    │Outcomes      │    │
│  └───────────────┘    └──────────────┘    └──────────────┘    │
│         │                    │                   │             │
│         ▼                    ▼                   ▼             │
│  ┌───────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ Research with │    │ Reasoning    │    │ Decision     │    │
│  │ Enhanced      │    │ Methods      │    │ Tracker      │    │
│  │ Prompts       │    │ (BMAD)       │    │ (ADR)        │    │
│  └───────────────┘    └──────────────┘    └──────────────┘    │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ /execute skill│───▶│ recordOutcome│◀───│ Execution    │    │
│  │ (Enhanced)    │    │              │    │ Results      │    │
│  └───────────────┘    └──────────────┘    └──────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. DecisionLearningIntegration Module

**Location**: `rad-engineer/src/execute/DecisionLearningIntegration.ts`

**Key Methods**:
- `enhancePrompt(originalPrompt, context)` - Inject business outcomes and reasoning methods
- `recordOutcome(outcome)` - Track execution outcomes for learning
- `getStatistics()` - Get decision learning metrics

**TypeScript Interface**:

```typescript
import {
  getDecisionLearningIntegration,
  type ExecutionContext,
  type EnhancedPrompt,
  type ExecutionOutcome,
  type DecisionLearningConfig
} from 'rad-engineer/src/execute/index.js';

// Initialize integration
const integration = getDecisionLearningIntegration({
  enableOutcomeInjection: true,
  enableMethodSelection: true,
  enableDecisionTracking: true,
  enableOutcomeLearning: true,
});

// Use integration
const enhanced = await integration.enhancePrompt(originalPrompt, context);
await integration.recordOutcome({ decisionId, success, quality, errors });
```

### 2. Integrated /plan Skill

**Location**: `rad-engineer/.claude/skills/plan/SKILL.md` (v2.0.0)

**What's New**:
- Research prompts enhanced with reasoning methods
- Business outcomes extracted and injected
- Planning decisions tracked in ADRs
- Planning outcomes recorded for learning

**Usage**:
```
User: /plan build me a notes app

/plan skill:
1. Intake: Ask clarifying questions
2. Enhance: Apply reasoning methods (First Principles, 5 Whys, etc.)
3. Research: Agents use enhanced prompts
4. Plan: Generate execution plan with outcome alignment
5. Record: Save planning outcome for learning
```

### 3. DecisionLearningStore

**Location**: `rad-engineer/src/decision/DecisionLearningStore.ts`

**Purpose**: Persistent storage for decision learning data

**Features**:
- EWC (Elastic Weight Consolidation) learning
- Version tracking with snapshots
- Method effectiveness tracking
- Confidence intervals

### 4. DecisionTracker

**Location**: `rad-engineer/src/decision/DecisionTracker.ts`

**Purpose**: Create and manage Architecture Decision Records (ADRs)

**Features**:
- MADR template support
- Knowledge graph integration (Qdrant)
- Automatic status updates based on outcomes
- Multi-format export (Markdown, JSON)

### 5. BMAD Methods

**Location**: `rad-engineer/src/outcome/` (via OutcomeInjector)

**Purpose**: 50 elicitation methods for better decision-making

**Categories**:
- Core: First Principles, 5 Whys, Socratic Questioning
- Advanced: Tree of Thoughts, Self-Consistency, Chain of Thought
- Risk: Pre-mortem Analysis, Failure Mode Analysis
- Competitive: Red Team vs Blue Team, Devil's Advocate
- Research: Comparative Analysis, Thesis Defense

---

## Integration Patterns

### Pattern 1: Planning with Decision Learning

**Use Case**: /plan skill generates execution plan

**Code**:

```typescript
// In /plan skill (Phase 2: Research)

import { getDecisionLearningIntegration, type ExecutionContext } from 'rad-engineer/src/execute/index.js';

// Build execution context for planning
const planningContext: ExecutionContext = {
  storyId: `PLAN-${Date.now()}`,
  storyTitle: requirements.coreFeature,
  component: 'Planning',
  activity: 'research',
  complexity: requirements.complexity === 'simple' ? 0.3 : 0.6 : 0.9,
  domain: detectDomain(requirements.coreFeature),
  filesInScope: [],
  acceptanceCriteria: requirements.successCriteria,
};

// Enhance research prompt with business outcomes and reasoning methods
const enhanced = await planIntegration.enhancePrompt(
  `Research technical approaches for: ${requirements.coreFeature}`,
  planningContext
);

// Spawn research agents with enhanced prompt
const agents = await spawnResearchAgents({
  prompt: enhanced.enhancedPrompt,  // Includes reasoning method guidance
  reasoningMethod: enhanced.reasoningMethod?.name,
  businessOutcomes: enhanced.businessOutcomes,
});

// After plan generation, record outcome
await planIntegration.recordOutcome({
  decisionId: enhanced.decisionId,
  success: validationResults.every(r => r.passed),
  quality: calculateQuality(validationResults),
  duration: Date.now() - startTime,
  errors: validationResults.flatMap(r => r.issues),
});
```

**Result**:
- Research agents apply structured reasoning methods
- Planning decisions are tracked with ADRs
- System learns which reasoning methods work best for which contexts

### Pattern 2: Execution with Decision Learning

**Use Case**: /execute skill runs implementation stories

**Code**:

```typescript
// In /execute skill (before spawning implementation agent)

import { getDecisionLearningIntegration, type ExecutionContext } from 'rad-engineer/src/execute/index.js';

// Build execution context from story
const executionContext: ExecutionContext = {
  storyId: story.id,
  storyTitle: story.title,
  component: story.component || 'Implementation',
  activity: story.activity || 'implementation',
  complexity: calculateComplexity(story),
  domain: detectDomain(story.filesInScope),
  filesInScope: story.filesInScope,
  acceptanceCriteria: story.acceptanceCriteria,
};

// Enhance agent prompt with business outcomes and reasoning methods
const enhanced = await executeIntegration.enhancePrompt(
  buildAgentPrompt(story),
  executionContext
);

// Spawn implementation agent with enhanced prompt
const agentResult = await spawnDeveloperAgent({
  prompt: enhanced.enhancedPrompt,  // Includes reasoning method guidance
  storyId: story.id,
  filesInScope: story.filesInScope,
});

// After agent completes, record outcome
await executeIntegration.recordOutcome({
  decisionId: enhanced.decisionId,
  success: agentResult.qualityGatesPassed,
  quality: agentResult.qualityScore,
  duration: agentResult.duration,
  errors: agentResult.errors,
});
```

**Result**:
- Implementation agents apply structured reasoning methods
- Execution decisions are tracked with ADRs
- System learns which approaches work best for implementation

### Pattern 3: Custom Integration

**Use Case**: Custom workflow needs decision learning

**Code**:

```typescript
import { getDecisionLearningIntegration, type ExecutionContext } from 'rad-engineer/src/execute/index.js';

// Initialize with custom config
const customIntegration = getDecisionLearningIntegration({
  enableOutcomeInjection: true,
  enableMethodSelection: true,
  enableDecisionTracking: true,
  enableOutcomeLearning: true,
  decisionStorePath: '~/.config/my-project/decision-store.yaml',
});

// Use in your workflow
const context: ExecutionContext = {
  storyId: 'CUSTOM-001',
  storyTitle: 'Custom Task',
  component: 'CustomComponent',
  activity: 'customActivity',
  complexity: 0.5,
  domain: 'code',
  filesInScope: [],
  acceptanceCriteria: [],
};

const enhanced = await customIntegration.enhancePrompt(originalPrompt, context);
// ... do your work ...
await customIntegration.recordOutcome({ decisionId, success, quality, errors });
```

---

## Configuration

### DecisionLearningConfig

```typescript
interface DecisionLearningConfig {
  // Enable/disable outcome injection
  enableOutcomeInjection: boolean;

  // Enable/disable reasoning method selection
  enableMethodSelection: boolean;

  // Enable/disable decision tracking (ADRs)
  enableDecisionTracking: boolean;

  // Enable/disable outcome learning
  enableOutcomeLearning: boolean;

  // Path to decision store (optional)
  decisionStorePath?: string;
}
```

### Domain Classification

Valid domains for `ExecutionContext.domain`:
- `'code'` - Programming and implementation
- `'creative'` - Design, UX/UI, content creation
- `'reasoning'` - Complex problem solving, algorithms
- `'analysis'` - Data analysis, investigation, debugging
- `'general'` - General tasks (default)

### Complexity Scoring

Complexity is a number between 0.0 and 1.0:
- `0.0 - 0.3`: Simple (straightforward, well-known patterns)
- `0.4 - 0.6`: Medium (some complexity, requires thought)
- `0.7 - 1.0`: Complex (challenging, novel, high risk)

---

## Testing

### Unit Tests

```bash
# Run DecisionLearningIntegration tests
bun test rad-engineer/test/execute/DecisionLearningIntegration.test.ts

# Expected: 12/12 passing
```

### E2E Tests

```bash
# Run decision learning E2E tests
bun test rad-engineer/test/integration/DecisionLearningE2E.test.ts

# Expected: 8/8 passing
```

### Full Test Suite

```bash
# Run all tests
bun test

# Expected: 717+ passing
```

---

## Troubleshooting

### Issue: "No reasoning method selected"

**Cause**: DecisionLearningStore has no prior data for this context

**Solution**:
- This is expected for fresh installations
- System will use default approach
- Learning will improve over time

### Issue: "enhancePrompt() is slow"

**Cause**: Large prompt or many business outcomes

**Solution**:
- Reduce prompt size (<500 chars recommended)
- Limit business outcomes to top 5
- Check if DecisionLearningStore is too large

### Issue: "recordOutcome() failed"

**Cause**: Invalid decision ID or DecisionLearningStore error

**Solution**:
- Ensure decisionId from enhancePrompt() is used
- Check DecisionLearningStore file permissions
- Check error logs for specific issue

### Issue: "ADR not created"

**Cause**: DecisionTracker failed or was disabled

**Solution**:
- Check if enableDecisionTracking is true
- Verify storage path exists
- Check DecisionTracker logs

---

## Best Practices

### DO ✅

1. **Always use enhancePrompt() before agent spawning**
   - Ensures consistent reasoning methods
   - Tracks decisions for learning

2. **Always record outcomes after completion**
   - Enables system learning
   - Improves future decisions

3. **Use appropriate domain classification**
   - Correct domain → better reasoning method selection
   - See domain list above

4. **Set realistic complexity scores**
   - Affects reasoning method selection
   - Use 0.0-1.0 scale

5. **Check decision learning statistics periodically**
   - ```typescript
     const stats = await integration.getStatistics();
     console.log(`Total: ${stats.totalDecisions}, Avg Quality: ${stats.averageQuality}`);
     ```

### DON'T ❌

1. **Don't skip enhancePrompt()**
   - Agents won't have reasoning method guidance
   - Decisions won't be tracked

2. **Don't forget to record outcomes**
   - System can't learn without outcomes
   - Future decisions won't improve

3. **Don't use invalid domains**
   - Must be: 'code', 'creative', 'reasoning', 'analysis', 'general'
   - Invalid domains cause errors

4. **Don't hardcode reasoning methods**
   - Let system select based on context
   - Override only if you have specific reason

5. **Don't ignore error logs**
   - Errors indicate issues with learning
   - Fix errors to ensure continuous improvement

---

## Performance Considerations

### Memory

- DecisionLearningStore: ~1MB per 1000 decisions
- ADR storage: ~10KB per decision
- Typical usage: <100MB for active projects

### CPU

- enhancePrompt(): <100ms for typical usage
- recordOutcome(): <50ms for typical usage
- Statistics calculation: <200ms

### Storage

- Decision store: `~/.config/rad-engineer/decision-store.yaml`
- ADR storage: `./docs/decisions/` (by default)
- Auto-save enabled by default

---

## Future Enhancements

### Phase 3: Advanced Reasoning (DEFERRED)

- CriticalReasoningEngine (CBR + LLM integration)
- AgentPromptEnhancer (all 12 specialized agents)
- Advanced determinism techniques

**Trigger**: When CBR+LLM research has production-ready patterns

---

## References

### Research Documents
- `rad-engineer/Q4_RESEARCH_UPDATED.md` - Q4 decision learning research
- `rad-engineer/ARCHITECTURE.md` - System architecture
- `rad-engineer/README.md` - Project overview

### Source Code
- `rad-engineer/src/execute/DecisionLearningIntegration.ts` - Main integration module
- `rad-engineer/src/decision/DecisionLearningStore.ts` - Decision learning storage
- `rad-engineer/src/decision/DecisionTracker.ts` - ADR management
- `rad-engineer/src/plan/BusinessOutcomeExtractor.ts` - Outcome extraction
- `rad-engineer/src/outcome/OutcomeInjector.ts` - Reasoning method injection

### Skills
- `rad-engineer/.claude/skills/plan/SKILL.md` - Integrated /plan skill (v2.0.0)
- `.claude/skills/plan/SKILL.md` - Original /plan skill (v1.0.0)
- `.claude/skills/execute/SKILL.md` - /execute skill

---

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review test files for examples
3. Check DecisionLearningStore logs
4. Review ADR files for decision history

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-08
**Maintained By**: Rad Engineering Platform
