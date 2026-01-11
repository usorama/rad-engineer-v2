# Auto-Claude Integration Project: Workflow & Context

**Project:** Auto-Claude + rad-engineer-v2 Integration
**Version:** 1.0.0
**Created:** 2026-01-11
**Status:** Phase 0 - Ready to Start

---

## Purpose

This folder contains the complete integration project for combining Auto-Claude's UI with rad-engineer-v2's backend. This CLAUDE.md file serves as my (Claude's) operating manual for consistent execution across sessions.

---

## File Manifest

### **1. AUTO_CLAUDE_INTEGRATION_ANALYSIS.md** (42KB)
**Purpose:** Comprehensive technical analysis of Auto-Claude frontend and Python backend
**Contents:**
- Frontend architecture (Electron + React + Radix UI + Zustand)
- Backend capabilities analysis (12 major capabilities identified)
- Gap analysis (what we lose, what we must build)
- Integration architecture design
- Risk assessment with mitigations
- Hybrid strategy (TypeScript core + Python plugins)

**When to read:** Session start (for context), before making architectural decisions

### **2. AUTO_CLAUDE_INTEGRATION_ROADMAP.md** (20KB)
**Purpose:** Detailed implementation roadmap with effort estimates
**Contents:**
- 5 phases with task breakdowns
- Effort estimates (270-390 hours total)
- Team requirements and timeline
- Success metrics per phase
- Decision gates and verification protocols
- File-by-file implementation guide

**When to read:** Before starting each phase, for task sequencing

### **3. tasks.json** (Master Progress Tracker)
**Purpose:** Granular task tracking with status, dependencies, evidence
**Contents:**
- 78 tasks across 6 phases (Phases 0-5)
- Each task: ID, title, description, status, dependencies, effort, evidence
- Workflow protocols (sessionStart, beforeTask, duringTask, afterTask, phaseGate)

**When to read:** EVERY session start, EVERY task start, EVERY task completion

**How to update:**
```bash
# Before starting task
- Change status: "pending" → "in_progress"
- Add timestamp to notes

# After completing task
- Change status: "in_progress" → "completed"
- Add actual hours
- Add evidence (file paths, test results, screenshots)

# At phase gate
- Run verification task
- Document results in evidence/ folder
- Make Go/No-Go decision
```

### **4. CLAUDE.md** (This File)
**Purpose:** Workflow protocols and context for Claude
**Contents:**
- File manifest (what each file is for)
- Workflow protocols (how to execute tasks)
- Phase gate rules (verification before proceeding)
- Context management (how to resume work)
- Testing protocols (Phase 5 approach)
- Decision log (track key choices)

**When to read:** Session start (always), before making key decisions

### **5. evidence/** (Folder)
**Purpose:** Store test results, screenshots, logs, verification reports
**Structure:**
```
evidence/
├── phase0-verification.md
├── phase1-integration-tests.md
├── phase1-verification.md
├── phase2-qa-plugin-results.md
├── phase2-spec-gen-comparison.md
├── phase2-ai-merge-results.md
├── phase2-verification.md
├── phase3-integration-tests.md
├── phase3-verification.md
├── phase4-test-coverage-report.md
├── phase4-performance-optimization.md
├── phase4-security-audit.md
├── phase4-verification.md
├── phase5-e2e-bakery-build.md
├── phase5-sarah-ux-testing.md
├── phase5-observer-qa-report.md
├── phase5-runner-stress-test.md
├── phase5-workflow-verification.md
├── phase5-performance-benchmarks.md
├── phase5-refinement-iterations.md
├── phase5-final-verification.md
└── screenshots/ (optional)
```

---

## Parallel vs Sequential Execution Decision Framework

**MANDATORY PROTOCOL** - Always evaluate parallelization potential before spawning agents.

### Decision Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│  PARALLEL EXECUTION (2-3 agents concurrently)                   │
│  ────────────────────────────────────────────────────────────── │
│  Use when:                                                      │
│  ✓ Tasks have NO dependencies on each other                   │
│  ✓ Tasks operate on DIFFERENT files                            │
│  ✓ Tasks are within SAME phase with clear boundaries           │
│  ✓ Resource limit allows (2-3 max)                            │
│                                                                 │
│  Example: P1-001, P1-004, P1-006 can run in parallel          │
│           (Task API, Settings API, Terminal API)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SEQUENTIAL EXECUTION (one after another)                       │
│  ────────────────────────────────────────────────────────────── │
│  Use when:                                                      │
│  ✓ Task depends on output of previous task                    │
│  ✓ Task modifies SAME files as previous task                  │
│  ✓ Phase gate must complete before next phase                  │
│  ✓ Verification task depends on all prior tasks                │
│                                                                 │
│  Example: P0-001 → P0-002 → P0-003 → P0-004 → P0-005          │
│           (Repository Setup → Python Removal → IPC Adapter)    │
└─────────────────────────────────────────────────────────────────┘
```

### Execution Strategy Per Phase

| Phase | Parallelizable Tasks | Sequential Dependencies |
|-------|---------------------|------------------------|
| Phase 0 | None (linear flow) | P0-001 → P0-002 → P0-003 → P0-004 → P0-005 |
| Phase 1 | P1-001, P1-004, P1-006 | P1-001 → P1-002 → P1-003, P1-005 |
| Phase 2 | P2-002, P2-003, P2-004 (after P2-001) | P2-001 → (parallel plugins) → P2-005 → P2-006 |
| Phase 3 | P3-001, P3-002, P3-003, P3-004, P3-005, P3-006 | All → P3-007 → P3-008 |
| Phase 4 | P4-001, P4-002, P4-003, P4-004, P4-005, P4-006 | All → P4-007 |
| Phase 5 | P5-002, P5-003, P5-004 (after P5-001) | P5-001 → (parallel sims) → P5-005 → P5-006 → P5-007 → P5-008 |

### Decision Algorithm

```python
def should_parallelize(task_ids: List[str]) -> bool:
    """
    Returns True if tasks can run in parallel
    """
    # Check dependencies
    for task in task_ids:
        for other_task in task_ids:
            if task == other_task:
                continue
            if task in other_task.dependencies:
                return False  # Dependency found

    # Check file conflicts
    files_per_task = [get_files_in_scope(task) for task in task_ids]
    for i, files1 in enumerate(files_per_task):
        for j, files2 in enumerate(files_per_task):
            if i >= j:
                continue
            if set(files1) & set(files2):  # File overlap
                return False

    # Check resource limits
    if len(task_ids) > 3:
        return False  # Max 3 concurrent agents

    return True  # Safe to parallelize
```

---

## Outcomes to Be Achieved

**HIGH-LEVEL PROJECT OUTCOMES:**

1. **Unified UI/UX** - Professional desktop application with Auto-Claude's UI quality
2. **Deterministic Execution** - rad-engineer-v2's decision learning and reproducibility
3. **Best of Both Worlds** - Auto-Claude's proven Python plugins + rad-engineer's TypeScript core
4. **Production Ready** - 90%+ test coverage, <3s startup, <500MB memory, security audited
5. **Autonomous E2E** - From idea to production without human intervention

**PHASE-LEVEL OUTCOMES:**

### Phase 0: Proof of Concept
**Outcome:** Validate integration feasibility with minimal implementation
- App starts without errors
- IPC communication works bidirectionally
- Data format translation is feasible
- No showstopper technical blockers identified

### Phase 1: Core Integration
**Outcome:** Fully functional task management and execution system
- Users can create, start, stop tasks via UI
- Tasks execute via rad-engineer WaveOrchestrator
- Real-time status updates stream to UI
- Quality gates enforce code quality
- Terminal integration works seamlessly

### Phase 2: Python Plugin Integration
**Outcome:** Proven Auto-Claude capabilities integrated as Python plugins
- QA loop detects code quality issues automatically
- Spec generator creates high-quality execution plans
- AI merge resolves git conflicts automatically
- All plugins work cross-platform (Windows/macOS/Linux)

### Phase 3: Advanced Features
**Outcome:** Complete feature parity with Auto-Claude + rad-engineer enhancements
- Roadmap generation integrated with /plan skill
- Insights chat uses DecisionLearningIntegration
- GitHub/GitLab workflows fully functional
- Context view shows ADRs and learning history
- All Auto-Claude features implemented

### Phase 4: Polish & Production
**Outcome:** Production-ready system meeting all quality targets
- 90%+ test coverage
- Performance targets met (startup <3s, memory <500MB)
- User documentation complete
- CI/CD pipeline operational
- Security audit passed

### Phase 5: Overall Testing & Refinement
**Outcome:** Real-world validation with agent simulation and refinement
- E2E build success rate >90%
- UX validated by non-tech user simulation
- System stability validated by stress testing
- All workflows work end-to-end
- Performance benchmarks met

---

## Definition of Done (DoD)

**UNIVERSAL DOD** (applies to ALL tasks):

```
✓ Task subtasks 100% completed
✓ Evidence collected (file paths, test results, outputs)
✓ tasks.json updated (status, actualHours, evidence)
✓ No TypeScript errors (pnpm typecheck passes)
✓ No lint errors (pnpm lint passes)
✓ Git commit created with changes
```

**IMPLEMENTATION TASK DOD:**

```
✓ Universal DoD above
✓ Unit tests written (90%+ coverage for new code)
✓ Integration tests written (if API/component)
✓ Inline documentation (JSDoc for public APIs)
✓ Code follows existing patterns (grep for similar code)
```

**PLUGIN PORT TASK DOD:**

```
✓ Universal DoD above
✓ Python plugin ported to python-plugins/ directory
✓ TypeScript wrapper created in src/python-bridge/
✓ Input/output format adapted for rad-engineer
✓ Cross-platform testing (Windows/macOS/Linux if available)
✓ Comparison document created (new vs old quality)
```

**TESTING TASK DOD:**

```
✓ Universal DoD above
✓ All test cases written and executed
✓ Test results documented in evidence/ folder
✓ Success rate measured and documented
✓ Failed tests have issues filed or fixed
✓ Test coverage report generated
```

**VERIFICATION TASK DOD (PHASE GATES):**

```
✓ Universal DoD above
✓ All phase tasks completed (status = "completed")
✓ All verification subtasks executed
✓ Test results documented in evidence/phaseX-verification.md
✓ All success criteria evaluated (✓ or ✗)
✓ Go/No-Go decision documented with rationale
✓ If No-Go: Refinement tasks created
✓ If Go: Next phase tasks ready to start
```

**AGENT SIMULATION TASK DOD:**

```
✓ Universal DoD above
✓ Agent persona defined (Sarah, Observer, Runner)
✓ Agent task executed with transcript
✓ Observations documented (UX friction, bugs, performance)
✓ Issues prioritized (P0/P1/P2/P3)
✓ Refinement tasks created for P0/P1 issues
✓ Evidence documented in evidence/ folder
```

---

## Success Criteria

### Phase 0 (PoC)
- [ ] App starts without errors: ✓/✗
- [ ] IPC communication works: ✓/✗
- [ ] Data format translation feasible: ✓/✗
- [ ] No showstopper blockers: ✓/✗

### Phase 1 (Core)
- [ ] Task creation success rate: >95%
- [ ] Task execution success rate: >90%
- [ ] Real-time update latency: <100ms
- [ ] Quality gate pass rate: >80%

### Phase 2 (Plugins)
- [ ] QA loop defect detection rate: >80%
- [ ] Spec generation quality score: >0.7
- [ ] AI merge success rate: >70%
- [ ] Plugin crash rate: <5%

### Phase 3 (Advanced)
- [ ] Feature completion: 100%
- [ ] GitHub/GitLab sync success rate: >95%
- [ ] Chat response time: <2 seconds

### Phase 4 (Polish)
- [ ] Test coverage: ≥90%
- [ ] Critical bug count: 0
- [ ] Startup time: <3 seconds
- [ ] Memory usage: <500MB

### Phase 5 (Overall)
- [ ] E2E build success rate: >90%
- [ ] UX friction points: <5 critical
- [ ] Workflow success rate: >90%
- [ ] Performance benchmarks: All met

---

## Verification Criteria

**PHASE GATE VERIFICATION PROTOCOL:**

At each phase gate (P0-005, P1-008, P2-006, P3-008, P4-007, P5-008), execute the following verification protocol:

### 1. Pre-Verification Checklist
```
□ All phase tasks status = "completed"
□ All task evidence collected and documented
□ No outstanding P0/P1 bugs from previous phases
□ Integration tests pass (if applicable)
□ Unit tests pass with ≥80% coverage
□ TypeScript compilation 0 errors
□ Lint passes with 0 errors
```

### 2. Verification Execution
```
□ Run all integration tests for this phase
□ Run all E2E tests (if applicable)
□ Measure all success criteria from phase definition
□ Document actual vs target for each metric
□ Take screenshots/videos of working features
□ Collect performance metrics (if applicable)
```

### 3. Evidence Documentation
Create `evidence/phaseX-verification.md` with:
```markdown
# Phase X Verification Report

## Test Results
- Test 1: ✓/✗ [description]
- Test 2: ✓/✗ [description]

## Success Criteria
- Criterion 1: ✓/✗ [measurement]
- Criterion 2: ✓/✗ [measurement]

## Issues Found
- Issue 1: [P0/P1/P2/P3] [description] [status: fixed/deferred]

## Performance Metrics
- Metric 1: [actual] vs [target] ✓/✗
- Metric 2: [actual] vs [target] ✓/✗

## Go/No-Go Decision
Decision: GO / NO-GO
Rationale: [explain based on success criteria and issues]

## Next Steps
- [action items for next phase or refinement]
```

### 4. Go/No-Go Decision Matrix

**GO Decision** - Proceed to next phase if:
```
✓ All critical success criteria met (≥90% of targets)
✓ All P0 issues fixed
✓ ≥80% of P1 issues fixed or deferred with plan
✓ No architectural blockers identified
✓ Performance targets met (or within 10% with plan)
```

**NO-GO Decision** - Refine current phase if:
```
✗ <90% of critical success criteria met
✗ Any P0 issues remain unfixed
✗ Architectural blockers identified
✗ Performance targets missed by >20%
✗ Integration stability issues (crashes, data loss)
```

### 5. Post-Decision Actions

**If GO:**
```
1. Update tasks.json: phase status = "completed"
2. Tag git commit: phase-X-completed
3. Update PROGRESS.md in project root
4. Begin next phase execution
```

**If NO-GO:**
```
1. Create refinement tasks in tasks.json
2. Prioritize: P0 (blocker) > P1 (important) > P2 (nice) > P3 (low)
3. Execute refinement iteration loop
4. Re-run verification when refinements complete
5. Iterate until GO decision achieved
```

---

## Workflow Protocols

### **Session Start Protocol (MANDATORY)**

**Every time I (Claude) start a new session, I MUST:**

1. **Read tasks.json**
   ```bash
   Read /Users/umasankr/Projects/rad-engineer-v2/rad-engineer/docs/auto-claude-integration/tasks.json
   ```

2. **Find Next Task**
   - Filter tasks with `status: "pending"`
   - Check dependencies: all dependencies must be `status: "completed"`
   - Select first task with no blocking dependencies

3. **Read CLAUDE.md** (this file)
   - Refresh workflow protocols
   - Check decision log for recent choices

4. **Read Analysis/Roadmap** (if needed for context)
   - AUTO_CLAUDE_INTEGRATION_ANALYSIS.md for technical decisions
   - AUTO_CLAUDE_INTEGRATION_ROADMAP.md for phase sequencing

5. **Update TodoWrite** with current tasks
   - Add next 3-5 pending tasks to TodoWrite tool
   - Mark current task as in_progress in TodoWrite

### **Before Starting a Task**

1. **Read task details from tasks.json**
   - Understand: title, description, subtasks, dependencies, estimated hours

2. **Verify dependencies are completed**
   - Check: All tasks in `dependencies` array have `status: "completed"`
   - If not: Select different task or complete dependencies first

3. **Update tasks.json**
   ```json
   {
     "id": "P0-001",
     "status": "in_progress",  // Changed from "pending"
     "notes": "Started 2026-01-11T13:00:00Z"
   }
   ```

4. **Create evidence folder if needed**
   - If task requires evidence, create placeholder file in evidence/

### **During Task Execution**

1. **Follow subtasks sequentially**
   - Complete each subtask in order
   - Document progress in task notes

2. **Collect evidence as you work**
   - File paths created/modified
   - Test results (pass/fail, coverage %)
   - Screenshots of UI changes
   - Command outputs
   - Error messages and resolutions

3. **Update TodoWrite for visibility**
   - Mark subtasks as completed in TodoWrite
   - User can see progress in real-time

### **After Completing a Task**

1. **Verify task completion**
   - All subtasks completed ✓
   - Evidence collected ✓
   - Tests pass (if applicable) ✓

2. **Update tasks.json**
   ```json
   {
     "id": "P0-001",
     "status": "completed",  // Changed from "in_progress"
     "actualHours": 3.5,
     "evidence": [
       "Forked repo: https://github.com/your-org/Auto-Claude",
       "Created branch: rad-engineer-integration",
       "Dev environment setup: npm install succeeded",
       "Build test: npm run build succeeded"
     ],
     "notes": "Completed 2026-01-11T16:30:00Z. AGPL-3.0 compliance plan documented in evidence/phase0-verification.md"
   }
   ```

3. **Commit tasks.json**
   ```bash
   git add docs/auto-claude-integration/tasks.json
   git commit -m "chore: Update tasks.json - completed P0-001"
   ```

4. **Update TodoWrite**
   - Mark task as completed
   - Add next pending task

### **Phase Gate Protocol (MANDATORY)**

**At the end of each phase (P0-005, P1-008, P2-006, P3-008, P4-007, P5-008):**

1. **Run verification task**
   - Execute all verification subtasks
   - Document results in evidence/ folder

2. **Create verification report**
   - Template:
     ```markdown
     # Phase X Verification Report

     ## Test Results
     - Test 1: ✓/✗ [description]
     - Test 2: ✓/✗ [description]

     ## Success Criteria
     - Criterion 1: ✓/✗ [measurement]
     - Criterion 2: ✓/✗ [measurement]

     ## Issues Found
     - Issue 1: [severity] [description]

     ## Go/No-Go Decision
     Decision: GO / NO-GO
     Rationale: [explain]

     ## Next Steps
     - [action items]
     ```

3. **Make Go/No-Go decision**
   - **GO:** All success criteria met, proceed to next phase
   - **NO-GO:** Critical blockers exist, create refinement tasks

4. **Document decision**
   - Update tasks.json with decision rationale
   - If NO-GO, create refinement tasks before next phase

### **Context Management**

**To prevent context overflow (CRITICAL):**

1. **JIT (Just-In-Time) File Reading**
   - Don't read entire codebase upfront
   - Read files only when modifying them
   - Use Grep/Glob to find files, then read specific ones

2. **Compact at 60% context usage**
   ```bash
   /compact Keep: current task details, evidence collected, files being modified
   Summarize: research, old file contents, completed tasks
   ```

3. **Tasks.json survives compaction**
   - Always re-read tasks.json after /compact
   - Evidence files survive (stored in filesystem)

4. **Session continuity**
   - tasks.json = source of truth for progress
   - CLAUDE.md = source of truth for workflow
   - Evidence folder = proof of completion

### **Decision Log**

**Track key architectural decisions here:**

| Date | Decision | Rationale | Impact |
|------|----------|-----------|--------|
| 2026-01-11 | Keep Auto-Claude's Electron main process, replace agent spawning only | Minimizes rewrite effort (15-25h vs 80-120h), terminal/PTY management already works | HIGH |
| 2026-01-11 | Adopt Python plugins for QA loop, spec gen, AI merge | Saves 150 hours vs rebuilding in TypeScript, proven production capabilities | HIGH |
| 2026-01-11 | Use tasks.json as master progress tracker | Survives context compaction, enables cross-session continuity | MEDIUM |
| 2026-01-11 | Add Phase 5 (Overall Testing & Refinement) | Reality check with simulated users, automated workflows, performance benchmarking | MEDIUM |
| | | | |

**How to add decisions:**
- When making architectural choice, add row to table above
- Include: date, decision summary, rationale, impact (HIGH/MEDIUM/LOW)

---

## Phase 5: Overall Testing & Refinement Protocol

**Phase 5 is NOT just "polish" - it's REALITY TESTING with agents.**

### **E2E Build Test (P5-001)**
- **Goal:** Build real project (Sweet Dreams Bakery app) E2E using integrated system
- **Measure:** Success rate, execution time, error count, agent quality
- **Evidence:** Full logs, screenshots, video walkthrough

### **Agent Simulation: Non-Tech User (P5-002)**
- **Persona:** Sarah (bakery owner, 6-7/10 tech comfort)
- **Task:** Sarah uses system to create task, start build, check status, review results
- **Measure:** Where does Sarah get confused? What's unclear? Time to complete workflow
- **Evidence:** Transcript of Sarah's experience, UX friction points identified

### **Agent Simulation: Observer (P5-003)**
- **Persona:** QA Engineer
- **Task:** Watch build execution, identify issues proactively
- **Measure:** Issue detection rate, false positive rate
- **Evidence:** QA report with issues found, severity classification

### **Agent Simulation: Runner (P5-004)**
- **Persona:** DevOps Engineer
- **Task:** Execute 10 tasks in parallel, 100 tasks sequentially, stress test system
- **Measure:** Success rate, failure rate, avg execution time, system stability
- **Evidence:** Stress test results, performance under load

### **Automated Workflow Verification (P5-005)**
- **Goal:** Verify all key workflows work end-to-end without human intervention
- **Workflows:**
  - Idea → Roadmap → Plan → Execute → QA → Merge
  - GitHub issue → Task → Execute → PR
  - Chat → Suggestion → Task → Execute
  - Multi-project tabs → Switch → Execute different tasks
- **Measure:** Success rate per workflow (target >90%)
- **Evidence:** Workflow verification report

### **Performance Benchmarking (P5-006)**
- **Benchmarks:**
  - App startup time (target <3s)
  - Task creation time (target <1s)
  - Memory usage over 4 hours (target <500MB)
  - CPU usage during execution (target <50%)
  - Real-time update latency (target <100ms)
- **Compare:** Integrated system vs Auto-Claude alone vs rad-engineer CLI
- **Evidence:** Performance benchmark report

### **Refinement Iteration Loop (P5-007)**
- **Goal:** Fix issues found in P5-002 through P5-006, iterate until quality targets met
- **Process:**
  1. Collect all issues from testing
  2. Prioritize: P0 (blocker), P1 (important), P2 (nice-to-have), P3 (low)
  3. Fix P0/P1 issues
  4. Re-run tests
  5. Iterate until success rate >90%
- **Evidence:** Refinement iteration log

### **Final Verification (P5-008)**
- **Goal:** Production readiness checklist, release decision
- **Checklist:**
  - E2E build success rate >90% ✓/✗
  - UX friction points addressed ✓/✗
  - Observer found <5 critical issues ✓/✗
  - Stress test passed (100 tasks) ✓/✗
  - All workflows work end-to-end ✓/✗
  - Performance benchmarks met ✓/✗
  - All P0/P1 issues fixed ✓/✗
  - Security, Performance, UX, Documentation, CI/CD ✓/✗
- **Decision:** Ship / Defer / Cancel
- **Evidence:** Final verification report, release decision document

---

## Testing Protocols

### **Unit Testing**
- **Tool:** Vitest (for TypeScript) + pytest (for Python plugins)
- **Target:** 90%+ coverage for new components
- **Run:** `npm test` (TypeScript), `pytest` (Python)
- **Evidence:** Coverage report (HTML format)

### **Integration Testing**
- **Tool:** Vitest for API integration tests
- **Scope:** IPC API calls, adapter layer, format translation
- **Run:** `npm run test:integration`
- **Evidence:** Test results with pass/fail counts

### **E2E Testing**
- **Tool:** Playwright for end-to-end UI tests
- **Scope:** Full user workflows (create task → execute → verify)
- **Run:** `npm run test:e2e`
- **Evidence:** Screenshots, videos, test reports

### **Manual Testing**
- **Platforms:** Windows, macOS (Intel + Apple Silicon), Linux
- **Checklists:** Per-phase verification checklists in tasks.json
- **Evidence:** Manual test results in evidence/ folder

---

## Troubleshooting

### **Issue: Context overflow**
- **Solution:** Run `/compact` immediately, keep only current task details
- **Prevention:** Use JIT file reading, don't load entire codebase

### **Issue: Tasks.json out of sync**
- **Solution:** Always read tasks.json at session start, commit after updates
- **Prevention:** Make tasks.json updates atomic (before/after each task)

### **Issue: Blocked by dependencies**
- **Solution:** Check task dependencies in tasks.json, complete them first
- **Prevention:** Sequence tasks correctly, verify dependencies before starting

### **Issue: Phase gate fails**
- **Solution:** Document blockers, create refinement tasks, re-run verification
- **Prevention:** Run incremental testing during phase, catch issues early

### **Issue: Evidence missing**
- **Solution:** Recreate evidence if possible, document as "recreated"
- **Prevention:** Collect evidence during task execution, not after

---

## Success Metrics

### **Phase 0 (PoC)**
- App starts without errors: ✓/✗
- IPC communication works: ✓/✗
- Data format translation feasible: ✓/✗
- No showstopper blockers: ✓/✗

### **Phase 1 (Core)**
- Task creation success rate: >95%
- Task execution success rate: >90%
- Real-time update latency: <100ms
- Quality gate pass rate: >80%

### **Phase 2 (Plugins)**
- QA loop defect detection rate: >80%
- Spec generation quality score: >0.7
- AI merge success rate: >70%
- Plugin crash rate: <5%

### **Phase 3 (Advanced)**
- Feature completion: 100%
- GitHub/GitLab sync success rate: >95%
- Chat response time: <2 seconds

### **Phase 4 (Polish)**
- Test coverage: ≥90%
- Critical bug count: 0
- Startup time: <3 seconds
- Memory usage: <500MB

### **Phase 5 (Overall)**
- E2E build success rate: >90%
- UX friction points: <5 critical
- Workflow success rate: >90%
- Performance benchmarks: All met

---

## Quick Reference Commands

```bash
# Read current progress
cat docs/auto-claude-integration/tasks.json | jq '.phases'

# Find next pending task
cat docs/auto-claude-integration/tasks.json | jq '.tasks[] | select(.status == "pending" and (.dependencies | length == 0))'

# Update task status (manual edit)
# Edit tasks.json, change status field

# Commit progress
git add docs/auto-claude-integration/tasks.json
git commit -m "chore: Update tasks.json - completed [TASK-ID]"

# Create evidence file
touch docs/auto-claude-integration/evidence/phase0-verification.md

# Run tests
npm test                    # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e            # E2E tests (Playwright)
```

---

## Notes for Future Sessions

**If I (Claude) am resuming work in a new session:**

1. **Read this file first** (CLAUDE.md)
2. **Read tasks.json** to find current state
3. **Check decision log** for recent choices
4. **Find next pending task** with no blocking dependencies
5. **Update TodoWrite** with next tasks
6. **Begin execution** following workflow protocols

**Remember:**
- Tasks.json is source of truth for progress
- Evidence folder has proof of completion
- CLAUDE.md has workflow protocols
- Analysis/Roadmap have technical context

---

**Version:** 1.0.0
**Status:** Ready for Execution
**Next Task:** P0-001 (Repository Setup)
