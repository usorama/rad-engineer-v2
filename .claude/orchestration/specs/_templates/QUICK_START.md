# Research-First Specification System: Quick Start Guide

**Purpose**: Generate evidence-backed specifications for Smart Orchestrator components

**Validated On**: Phase 0 SDK Integration (2026-01-05)

**Status**: ✅ VALIDATED - Ready for scaling to remaining components

---

## Overview

The Research-First Specification System ensures **deterministic, evidence-based development** through:

1. **Research Phase**: Parallel research agents gather verified evidence
2. **Specification Phase**: Component and test specs written from evidence
3. **Validation Phase**: Specs validated for evidence alignment and completeness
4. **Implementation Phase**: Code written to validated specs

**Key Principle**: Every claim has evidence. Every number is verified. Every failure mode is documented.

---

## Workflow Summary

```
[Research Spec] → [Parallel Research Agents] → [Research Findings]
                                                ↓
                                      [Component Spec + Test Spec]
                                                ↓
                                          [Validation Summary]
                                                ↓
                                        [Ready to Implement]
```

**Time per Component**:

- Research: 2-3 hours (2 parallel agents)
- Specification: 1-2 hours (can parallelize component + test specs)
- Validation: 30 minutes
- **Total**: 4-6 hours per component

---

## Step-by-Step Instructions

### Phase 1: Setup Research Specification

**Step 1.1**: Create research spec from template

```bash
cd /Users/umasankr/Projects/pinglearn-PWA/.claude/orchestration/specs

# Create directory structure
mkdir -p phase-[X]-[phase-name]/[component-name]/evidence

# Copy template
cp _templates/research-spec.yaml.template \
   phase-[X]-[phase-name]/[component-name]/research-spec.yaml

# Edit template (replace all [placeholders])
nano phase-[X]-[phase-name]/[component-name]/research-spec.yaml
```

**Step 1.2**: Define research questions (3-5 questions)

Example:

```yaml
research_questions:
  - question_id: "RQ-001"
    question: "Does psutil support kernel_task CPU monitoring on macOS?"
    priority: "critical"
    success_criteria: "Verified via context7 or official docs"
    assigned_to: "Research Agent #1"
```

**Step 1.3**: Define parallel research streams (2-3 agents max)

```yaml
research_streams:
  stream_1:
    agent_type: "research"
    focus: "SDK capabilities, API documentation"
    questions: ["RQ-001"]
    deliverable: "evidence/[component]-capabilities.md"

  stream_2:
    agent_type: "research"
    focus: "System constraints, performance limits"
    questions: ["RQ-002"]
    deliverable: "evidence/[component]-constraints.md"
```

---

### Phase 2: Execute Research (Parallel Agents)

**Step 2.1**: Launch parallel research agents (max 2-3)

```bash
# Agent 1 prompt
Task(
  subagent_type: "research",
  description: "Research [component] capabilities",
  prompt: """
    Task: Research [research question from stream_1]
    Evidence Sources: context7, official documentation
    Output: evidence/[component]-capabilities.md
    Format: Markdown with verified claims table
    Rules: No speculation, every claim needs source URL
  """
)

# Agent 2 prompt (parallel)
Task(
  subagent_type: "research",
  description: "Research [component] constraints",
  prompt: """
    Task: Research [research question from stream_2]
    Evidence Sources: system measurements, codebase analysis
    Output: evidence/[component]-constraints.md
    Format: Markdown with verified claims table
    Rules: No speculation, every claim needs source
  """
)
```

**Step 2.2**: Wait for both agents to complete

**Step 2.3**: Review research findings for:

- ✅ All claims have verified sources
- ✅ Code examples included for API usage
- ✅ No prohibited patterns ("I think", "probably", etc.)
- ✅ References section complete with URLs

**Step 2.4**: Consolidate findings into single file

```bash
# Create consolidated research findings
cat > phase-[X]-[phase-name]/[component-name]/evidence/research-findings.md << 'EOF'
# Research Evidence: [Component Name]

**Research Date**: [YYYY-MM-DD]
**Component**: Phase [X] - [Component Name]
**Researchers**: Research Agent #1, Research Agent #2

## Evidence Summary

[Consolidate both agent findings here]

## Verified Claims Table

| Claim ID | Capability | Status | Evidence Source | Verified By |
| --- | --- | --- | --- | --- |
| CLAIM-001 | [capability] | ✅/❌ | [source URL] | [Agent] |

[Include all claims from both agents]

## Code Evidence

[Include code examples from both agents]

## References

[List all sources with URLs]

## Next Steps

1. ✅ Research complete - all claims verified
2. ⏳ Create component-spec.yaml (based on this evidence)
3. ⏳ Create test-spec.yaml (based on component-spec)

**Research Status**: COMPLETE
**Evidence Quality**: HIGH (all claims verified against primary sources)
**Ready for Specification**: YES
EOF
```

---

### Phase 3: Write Component Specification

**Step 3.1**: Create component spec from template

```bash
cp _templates/component-spec.yaml.template \
   phase-[X]-[phase-name]/[component-name]/component-spec.yaml

# Edit template (replace all [placeholders])
nano phase-[X]-[phase-name]/[component-name]/component-spec.yaml
```

**Step 3.2**: Define interface (class, methods, dependencies)

```yaml
interface:
  class_name: "[ClassName]"
  language: "TypeScript"
  runtime: "Node.js"
  dependencies:
    - name: "[dependency-name]"
      version: "[version]"
      evidence: "evidence/research-findings.md#[claim-id]"
```

**Step 3.3**: Define methods with failure modes

```yaml
methods:
  initSDK:
    signature: "async initSDK(config: SDKConfig): Promise<InitResult>"
    description: "[What this method does]"
    inputs: [define all inputs with evidence IDs]
    outputs: [define all outputs]
    failure_modes:
      - error: "API_KEY_MISSING"
        description: "[what went wrong]"
        detection: "[how to detect]"
        recovery: "[how to recover]"
        timeout: "30s"
    evidence_requirements:
      - id: "EVIDENCE-001"
        claim: "[specific claim]"
        source: "evidence/research-findings.md#[claim-id]"
        verification: "[how to verify]"
```

**Step 3.4**: Define success criteria (measurable, binary)

````yaml
success_criteria:
  phase_[x]_gate:
    criteria:
      - criterion: "[Measurable criterion 1]"
        measurement_method: |
          ```bash
          # Verification command
          ```
        threshold: "[Specific PASS/FAIL threshold]"
        evidence: "[What log proves this works]"
        status: "pending"
        priority: "critical"
````

---

### Phase 4: Write Test Specification

**Step 4.1**: Create test spec from template

```bash
cp _templates/test-spec.yaml.template \
   phase-[X]-[phase-name]/[component-name]/test-spec.yaml

# Edit template (replace all [placeholders])
nano phase-[X]-[phase-name]/[component-name]/test-spec.yaml
```

**Step 4.2**: Define unit tests (map to component methods)

```yaml
unit_tests:
  initSDK:
    description: "Test Claude Agent SDK initialization"
    file: ".claude/orchestration/sdk/__tests__/initSDK.test.ts"
    test_cases:
      - name: "initializes with valid API key"
        input:
          apiKey: "${ANTHROPIC_API_KEY}"
        expected:
          success: true
        assertions:
          - "client is not null"
          - "client.hasCapability('streaming') === true"
```

**Step 4.3**: Define integration tests (3+ scenarios)

```yaml
integration_tests:
  sdk_with_monitoring:
    description: "Test SDK integration with resource monitoring"
    file: "[path/to/integration/test.test.ts]"
    test_cases:
      - name: "spawns agent when resources available"
        setup: [define setup]
        steps: [define steps]
        expected: [define expected outcome]
        assertions: [define assertions]
```

**Step 4.4**: Define chaos tests (4+ scenarios)

```yaml
chaos_tests:
  test_cases:
    - name: "agent timeout during execution"
      setup: [define setup]
      chaos:
        type: "timeout"
        inject: "agent hangs for 10s"
      expected:
        timeoutDetected: true
      assertions: [define assertions]
```

---

### Phase 5: Validate Specifications

**Step 5.1**: Create validation summary

```bash
cp phase-0-poc/sdk-integration/VALIDATION_SUMMARY.md \
   phase-[X]-[phase-name]/[component-name]/VALIDATION_SUMMARY.md

# Edit to reflect your component's evidence
nano phase-[X]-[phase-name]/[component-name]/VALIDATION_SUMMARY.md
```

**Step 5.2**: Verify evidence alignment

Check:

- ✅ All claims in component-spec.yaml have evidence IDs
- ✅ All evidence IDs trace to research-findings.md
- ✅ All test requirements map to component methods
- ✅ All thresholds are verified numbers from research

**Step 5.3**: Verify completeness

Check:

- ✅ All sections present in component-spec.yaml (8 sections)
- ✅ All sections present in test-spec.yaml (8 sections)
- ✅ All failure modes have detection + recovery + timeout
- ✅ All success criteria are measurable (PASS/FAIL)

**Step 5.4**: Update validation summary with findings

```markdown
## Evidence Alignment Verification

| Evidence ID  | Claim   | Source                         | Status |
| ------------ | ------- | ------------------------------ | ------ |
| EVIDENCE-001 | [claim] | research-findings.md#[section] | ✅     |

[Include all evidence IDs]

## Completeness Check

| Section  | Required | Present | Status |
| -------- | -------- | ------- | ------ |
| Metadata | ✅       | ✅      | PASS   |

[Include all sections]

## Validation Result

**Component Spec**: ✅ APPROVED for implementation
**Test Spec**: ✅ APPROVED for implementation
**Evidence Quality**: HIGH (all claims verified)
```

---

## Template Reference

### Template Files Location

```
.claude/orchestration/specs/_templates/
├── research-spec.yaml.template      # Research phase template
├── component-spec.yaml.template     # Component spec template
├── test-spec.yaml.template          # Test spec template
└── QUICK_START.md                   # This file
```

### Template Usage Commands

```bash
# Copy and customize templates
cp _templates/research-spec.yaml.template [component]/research-spec.yaml
cp _templates/component-spec.yaml.template [component]/component-spec.yaml
cp _templates/test-spec.yaml.template [component]/test-spec.yaml

# Validate templates
grep -r "\[.*\]" [component]/  # Find remaining placeholders
```

---

## Remaining Components to Specify

From SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md:

### Phase 0: Prerequisites & Foundation (Week 1-4)

- ✅ **SDK Integration** - VALIDATED
- ⏳ **Baseline Measurement** - Ready to specify

### Phase 1: Core Orchestrator (Week 5-8)

- ⏳ **ResourceManager** - Resource limits, concurrent agent management
- ⏳ **PromptValidator** - Prompt size validation, sanitization
- ⏳ **ResponseParser** - Parse agent responses, extract outputs

### Phase 2: Advanced Features (Week 9-12)

- ⏳ **WaveOrchestrator** - Wave execution, dependency management
- ⏳ **StateManager** - State persistence, recovery, compaction

### Phase 3: Integration & Polish (Week 13-16)

- ⏳ **ErrorRecoveryEngine** - Retry logic, circuit breakers, saga pattern
- ⏳ **SecurityLayer** - Input sanitization, output scanning, audit logging

---

## Common Patterns

### Evidence ID Format

```
EVIDENCE-[XXX] where XXX is sequential (001, 002, 003, ...)
```

### Failure Mode Format

```yaml
- error: "ERROR_CODE"
  description: "[what went wrong]"
  detection: "[how to detect]"
  recovery: "[how to recover]"
  timeout: "[seconds or N/A]"
```

### Success Criteria Format

````yaml
- criterion: "[Measurable criterion]"
  measurement_method: |
    ```bash
    # Command to verify
    ```
  threshold: "[PASS/FAIL condition]"
  evidence: "[What log proves it works]"
  status: "pending"
  priority: "critical | high | medium"
````

### Test Case Format

```yaml
- name: "[Test name]"
  input:
    [param]: "[value]"
  expected:
    [result]: "[expected value]"
  assertions:
    - "[assertion description]"
```

---

## Quality Checklist

Before marking specs as "ready for implementation", verify:

### Research Evidence

- [ ] All claims have verified sources
- [ ] No prohibited patterns ("I think", "probably", etc.)
- [ ] Code examples included for API usage
- [ ] References section complete with URLs

### Component Spec

- [ ] All 8 sections present and complete
- [ ] All claims have evidence IDs
- [ ] All methods have failure modes (detection + recovery + timeout)
- [ ] All success criteria are measurable (PASS/FAIL)
- [ ] All constraints and prohibitions documented

### Test Spec

- [ ] All 8 sections present and complete
- [ ] All test requirements map to component methods
- [ ] All thresholds are verified numbers from research
- [ ] Success criteria match component-spec.yaml
- [ ] Coverage ≥80% specified

### Validation Summary

- [ ] Evidence alignment verified (all IDs trace to research)
- [ ] Completeness check passed (all sections present)
- [ ] Failure modes coverage verified
- [ ] Success criteria alignment verified
- [ ] Go/No-Go criteria documented

---

## Troubleshooting

### Problem: Research agents return speculative claims

**Solution**: Re-prompt with "Use context7 to verify this claim against official documentation"

### Problem: Can't find evidence for a claim

**Solution**: Mark claim as "unknown" or "assumption" - do not include in evidence requirements

### Problem: Component spec has methods without test coverage

**Solution**: Add unit tests for all methods in test-spec.yaml

### Problem: Success criteria are not measurable

**Solution**: Rewrite criteria with specific verification commands and PASS/FAIL thresholds

### Problem: Thresholds are guessed/estimated

**Solution**: Return to research phase and gather actual measurements from reliable sources

---

## References

- **Validated Example**: `specs/phase-0-poc/sdk-integration/` (complete validated specs)
- **Research Findings Example**: `specs/phase-0-poc/sdk-integration/evidence/research-findings.md`
- **Validation Example**: `specs/phase-0-poc/sdk-integration/VALIDATION_SUMMARY.md`
- **Integration Plan**: `docs/planning/SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md`
- **Phase Gate Pattern**: `docs/planning/PHASE_GATE_ITERATION_PATTERN.md`

---

**Status**: ✅ Research-First Specification System VALIDATED
**Next Step**: Apply templates to remaining components (ResourceManager, PromptValidator, etc.)
**Questions**: Refer to validated Phase 0 SDK Integration example for reference
