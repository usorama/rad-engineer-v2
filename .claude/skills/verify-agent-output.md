---
name: verify-agent-output
description: Run after ANY agent returns code to verify compliance. Use when user asks to verify agent work, check agent output, or validate implementation. Runs typecheck, lint, tests and checks for evidence of actual verification (not just claims).
---

# Verify Agent Output Skill

> Run this after ANY agent returns code to verify compliance

## Invocation

```
/verify-agent-output
```

## What This Skill Does

1. **Runs Quality Gates**

   ```bash
   pnpm typecheck  # MUST: 0 errors
   pnpm lint       # MUST: all pass
   pnpm test       # MUST: all pass
   ```

2. **Checks Evidence Requirements**
   - Did agent modify test files? → Verify src/test/setup.ts was read
   - Did agent create mocks? → Check for conflicts with existing mocks
   - Did agent change implementation? → Verify corresponding tests exist

3. **Rejects Non-Compliant Code**
   - If any quality gate fails → Report failure, DO NOT accept code
   - If evidence missing → Report what's missing

## Enforcement Protocol

When orchestrator receives code from implementation agent:

```
1. DO NOT merge/accept code immediately
2. Run: /verify-agent-output
3. IF verification fails:
   a. Log the failure reason
   b. Either:
      - Spawn fix agent with specific failure
      - Return to original agent with rejection
4. ONLY accept after verification passes
```

## Usage in Orchestration

```python
# Pseudo-code for orchestrator workflow
def orchestrate_implementation(task):
    # Phase 1: Implementation
    result = spawn_agent("developer", task)

    # Phase 2: MANDATORY Verification (non-negotiable)
    verification = spawn_agent("verifier", {
        "type": "verify-agent-output",
        "code_changes": result.files_modified,
    })

    if verification.failed:
        # Phase 3: Rejection + Fix Cycle
        while verification.failed and attempts < 3:
            fix_result = spawn_agent("developer", {
                "task": "fix verification failures",
                "failures": verification.failures,
            })
            verification = spawn_agent("verifier", fix_result)

        if verification.failed:
            raise QualityGateFailure("Code rejected after 3 attempts")

    return result  # Only reached if all gates pass
```

## Key Insight

This makes verification **MANDATORY in the workflow**, not optional in the prompt.
The orchestrator (you) MUST run this skill before accepting any code.

## Evidence Required from Implementation Agent

Before returning code, implementation agent MUST include:

```markdown
## Verification Evidence

### Quality Gate Results

- [ ] `pnpm typecheck`: [paste output showing 0 errors]
- [ ] `pnpm lint`: [paste output showing pass]
- [ ] `pnpm test`: [paste output showing pass]

### Required Reading Confirmation

- [ ] Read src/test/setup.ts: [yes/no, list mocks found]
- [ ] Checked for existing mocks: [grep results]
- [ ] Tests written BEFORE implementation: [yes/no]
```

If this section is missing or incomplete, REJECT the code.
