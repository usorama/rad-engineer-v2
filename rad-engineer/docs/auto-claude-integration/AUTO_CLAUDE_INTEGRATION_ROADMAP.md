# Auto-Claude Integration Roadmap: Implementation Plan

**Date:** 2026-01-11
**Version:** 1.0
**Based On:** AUTO_CLAUDE_INTEGRATION_ANALYSIS.md

---

## Quick Reference

| Phase | Duration | Effort | Team Size | Deliverable |
|-------|----------|--------|-----------|-------------|
| Phase 0: PoC | 2 weeks | 40-60h | 1 engineer | Minimal viable UI |
| Phase 1: Core | 4 weeks | 80-120h | 1-2 engineers | Full task management |
| Phase 2: Plugins | 2 weeks | 50-70h | 1 engineer | QA/Spec/Merge automation |
| Phase 3: Advanced | 4 weeks | 60-80h | 1-2 engineers | Full feature parity |
| Phase 4: Polish | 4 weeks | 40-60h | 1 engineer | Production-ready |
| **Total** | **16 weeks** | **270-390h** | **1-2 engineers** | **Desktop App + Backend** |

---

## Phase 0: Proof of Concept (Week 1-2)

**Goal:** Validate integration approach with minimal risk investment

**Duration:** 2 weeks (10 business days)
**Effort:** 40-60 hours
**Team:** 1 engineer

### Tasks

#### Task 0.1: Repository Setup (4 hours)
- Fork Auto-Claude repository to your org/account
- Create `rad-engineer-integration` branch
- Review AGPL-3.0 license requirements
- Set up development environment

#### Task 0.2: Python Backend Removal (6 hours)
- Remove Auto-Claude's Python agent spawning logic
- Keep Electron main process intact (don't touch IPC handlers)
- Keep terminal management (PTY processes)
- Keep settings management
- Remove Python-specific imports
- Test: App should start but agents don't work yet

**Files to modify:**
- `apps/frontend/src/main/agent/agent-process.ts` (remove Python spawn)
- `apps/frontend/src/main/agent/agent-manager.ts` (stub agent lifecycle)

#### Task 0.3: Minimal IPC Adapter (20 hours)
- Create `rad-engineer/src/ui-adapter/` directory
- Implement `ElectronIPCAdapter.ts` with 3 core APIs:
  - `task:get-all` → return dummy tasks for testing
  - `task:create` → create rad-engineer wave stub
  - `task:start` → execute wave via WaveOrchestrator stub
- Create `FormatTranslator.ts` with basic Auto-Claude ↔ rad-engineer translation
- Test: Frontend can call APIs and get responses

**Deliverable:** TypeScript adapter that responds to IPC calls

#### Task 0.4: Integration Testing (10 hours)
- Modify Auto-Claude main process to load rad-engineer adapter
- Wire up IPC handlers to call adapter methods
- Test end-to-end: Create task in UI → Backend receives → Response shown
- Debug connection issues
- Document any blockers or surprises

**Success Criteria:**
- ✅ App starts without errors
- ✅ Can create task via Kanban UI
- ✅ Task appears in task list
- ✅ Clicking "Start" triggers adapter call (even if execution is stubbed)
- ✅ No Python errors (because Python is gone)

### Deliverables

1. Forked Auto-Claude repo with rad-engineer integration branch
2. ElectronIPCAdapter with 3 core APIs implemented
3. FormatTranslator for data format conversion
4. Integration test results document
5. Go/No-Go decision document for Phase 1

### Risk Assessment

**High Risks:**
- IPC API surface doesn't match expectations → Mitigation: Comprehensive logging, stub out missing APIs
- Data format incompatibility → Mitigation: Write translation tests first

**Medium Risks:**
- Electron build issues → Mitigation: Use Auto-Claude's existing build scripts
- TypeScript version conflicts → Mitigation: Match versions exactly

### Decision Gate

**Go to Phase 1 IF:**
- ✅ App starts and loads UI
- ✅ IPC communication works bidirectionally
- ✅ No showstopper technical blockers
- ✅ Data format translation is feasible

**No-Go IF:**
- ❌ IPC API mismatch is too large (>30% of APIs)
- ❌ Data format translation requires complex logic
- ❌ Electron packaging fails on target platforms

---

## Phase 1: Core Integration (Week 3-6)

**Goal:** Full task lifecycle with Auto-Claude UI + rad-engineer-v2 backend

**Duration:** 4 weeks (20 business days)
**Effort:** 80-120 hours
**Team:** 1-2 engineers

### Tasks

#### Task 1.1: Complete Task API (20 hours)
- Implement all task-related IPC APIs:
  - `task:get-all` (load from rad-engineer state)
  - `task:create` (create wave in rad-engineer)
  - `task:update` (update wave/story status)
  - `task:delete` (remove wave)
  - `task:start` (execute wave via WaveOrchestrator)
  - `task:stop` (kill agent via ResourceManager)
- Implement `onTaskUpdate` event broadcasting
- Test: Full task CRUD + execution

**Files to create:**
- `rad-engineer/src/ui-adapter/TaskAPIHandler.ts`
- Tests: `rad-engineer/test/ui-adapter/TaskAPIHandler.test.ts`

#### Task 1.2: WaveOrchestrator Integration (25 hours)
- Wire up `task:start` to WaveOrchestrator.executeWave()
- Implement story-to-subtask conversion
- Stream agent output to frontend via IPC events
- Handle execution errors and recovery
- Implement `task:stop` via ResourceManager.killAgent()
- Test: Task execution from start to completion

**Files to modify:**
- `rad-engineer/src/ui-adapter/ElectronIPCAdapter.ts`
- `rad-engineer/src/advanced/WaveOrchestrator.ts` (add event emitters)

#### Task 1.3: Real-Time Event Broadcasting (15 hours)
- Create `EventBroadcaster.ts` for IPC event emission
- Integrate with WaveOrchestrator for task status updates
- Integrate with agents for output streaming
- Implement terminal output streaming
- Test: Real-time updates in Kanban board

**Files to create:**
- `rad-engineer/src/ui-adapter/EventBroadcaster.ts`
- Tests: `rad-engineer/test/ui-adapter/EventBroadcaster.test.ts`

#### Task 1.4: Settings & Profile Management (10 hours)
- Implement `settings:get`, `settings:update` APIs
- Integrate with rad-engineer config system
- Implement `settings:get-profiles`, `settings:add-profile`, `settings:remove-profile`
- Store API keys securely
- Test: Settings persist across app restarts

**Files to create:**
- `rad-engineer/src/ui-adapter/SettingsAPIHandler.ts`

#### Task 1.5: Quality Gates Integration (15 hours)
- Add quality validation after task execution:
  - Run `pnpm typecheck` (must pass)
  - Run `pnpm lint` (should pass)
  - Run `pnpm test` (must pass ≥80% coverage)
- Display quality gate results in task detail modal
- Block merge if quality gates fail
- Test: Quality validation triggers on task completion

**Files to modify:**
- `rad-engineer/src/ui-adapter/TaskAPIHandler.ts` (add post-execution quality checks)

#### Task 1.6: Integration Testing & Bug Fixes (15 hours)
- End-to-end testing with Playwright
- Manual testing on Windows/macOS/Linux
- Fix bugs discovered during testing
- Performance optimization (if needed)
- Documentation updates

### Deliverables

1. Fully functional task management (create, start, stop, update, delete)
2. Real-time Kanban board updates
3. Agent terminal output streaming
4. Settings and profile management
5. Quality gate validation
6. Integration test suite (Playwright)
7. User guide (basic usage)

### Success Criteria

- ✅ Can create task via UI
- ✅ Can start task → Wave executes via WaveOrchestrator
- ✅ Agent output streams to terminal in real-time
- ✅ Task status updates in Kanban board
- ✅ Quality gates run after execution
- ✅ Can stop running task
- ✅ Settings persist across restarts
- ✅ No memory leaks or performance issues

### Risk Assessment

**High Risks:**
- Real-time streaming causes UI lag → Mitigation: Backpressure, buffer limits
- WaveOrchestrator concurrency conflicts → Mitigation: ResourceManager enforcement

---

## Phase 2: Python Plugin Integration (Week 7-8)

**Goal:** Adopt Auto-Claude's proven capabilities without rebuild effort

**Duration:** 2 weeks (10 business days)
**Effort:** 50-70 hours
**Team:** 1 engineer

### Tasks

#### Task 2.1: PythonPluginBridge (10 hours)
- Create `PythonPluginBridge.ts` for subprocess communication
- Implement JSON stdin/stdout protocol
- Add timeout handling
- Add error recovery
- Test: Can spawn Python subprocess and receive JSON response

**Files to create:**
- `rad-engineer/src/python-bridge/PythonPluginBridge.ts`
- Tests: `rad-engineer/test/python-bridge/PythonPluginBridge.test.ts`

#### Task 2.2: QA Loop Plugin (15-20 hours)
- Port Auto-Claude's `qa/qa_loop.py` to `python-plugins/qa_loop.py`
- Adapt for rad-engineer input/output format
- Integrate with TaskAPIHandler (call after task execution)
- Display QA results in task detail modal
- Test: QA loop runs automatically, detects issues, fixes applied

**Files to create:**
- `rad-engineer/python-plugins/qa_loop.py`
- `rad-engineer/src/ui-adapter/QAPluginIntegration.ts`

#### Task 2.3: Spec Generator Plugin (15-20 hours)
- Port Auto-Claude's `runners/spec_runner.py` to `python-plugins/spec_generator.py`
- Integrate with `/plan` skill (call from planner)
- Display spec generation progress in UI
- Test: Spec generation creates high-quality execution plan

**Files to create:**
- `rad-engineer/python-plugins/spec_generator.py`
- `rad-engineer/src/ui-adapter/SpecGenPluginIntegration.ts`

#### Task 2.4: AI Merge Plugin (10-15 hours)
- Port Auto-Claude's `merge/ai_resolver/resolver.py` to `python-plugins/ai_merge.py`
- Integrate with git merge workflow
- Call when merge conflicts detected
- Test: AI merge resolves conflicts automatically

**Files to create:**
- `rad-engineer/python-plugins/ai_merge.py`
- `rad-engineer/src/ui-adapter/AIMergePluginIntegration.ts`

#### Task 2.5: Plugin Testing & Deployment (10 hours)
- Create `python-plugins/requirements.txt` with dependencies
- Add plugin setup script (`setup-plugins.sh`)
- Test all plugins on Windows/macOS/Linux
- Add fallback behavior if Python plugins fail
- Documentation: Plugin architecture guide

### Deliverables

1. PythonPluginBridge for subprocess communication
2. QA Loop Plugin (automatic validation)
3. Spec Generator Plugin (8-phase pipeline)
4. AI Merge Plugin (conflict resolution)
5. Plugin setup and deployment scripts
6. Plugin architecture documentation

### Success Criteria

- ✅ QA loop runs after task execution
- ✅ QA results displayed in UI
- ✅ Spec generator creates high-quality plans
- ✅ AI merge resolves conflicts automatically
- ✅ Plugins work on all platforms (Windows/macOS/Linux)
- ✅ Graceful degradation if plugins fail

---

## Phase 3: Advanced Features (Week 9-12)

**Goal:** Full feature parity with Auto-Claude + rad-engineer enhancements

**Duration:** 4 weeks (20 business days)
**Effort:** 60-80 hours
**Team:** 1-2 engineers

### Tasks

#### Task 3.1: Roadmap UI Integration (15 hours)
- Implement roadmap API handlers
- Integrate with rad-engineer's `/plan` skill
- Display roadmap in UI (Kanban/list/timeline views)
- Feature creation workflow
- Test: Roadmap generation works end-to-end

#### Task 3.2: Insights Chat Integration (15 hours)
- Implement insights API handlers
- Integrate with DecisionLearningIntegration
- Chat interface with Claude SDK
- Session management
- Test: Can ask questions, get AI responses

#### Task 3.3: GitHub/GitLab Integration (15 hours)
- Implement GitHub/GitLab API handlers
- Issue sync and task conversion
- PR review workflow
- Worktree creation from PRs
- Test: Can sync issues, review PRs

#### Task 3.4: Context View (10 hours)
- Implement context API handlers
- Integrate with DecisionLearningStore
- Display ADRs and learning history
- Search and filter functionality
- Test: Context view shows historical decisions

#### Task 3.5: Git Worktree UI (10 hours)
- Implement worktree API handlers
- Visual worktree management
- Branch creation and switching
- Test: Can create/delete worktrees from UI

#### Task 3.6: Changelog Generation (5 hours)
- Implement changelog API handlers
- Parse git history with conventional commits
- Version suggestion
- Test: Changelog generation works

### Deliverables

1. Roadmap planning UI
2. Insights chat with DecisionLearningIntegration
3. GitHub/GitLab PR reviews
4. Context view with DecisionLearningStore
5. Git worktree visual management
6. Changelog generation

### Success Criteria

- ✅ All Auto-Claude features implemented
- ✅ rad-engineer decision learning integrated
- ✅ GitHub/GitLab workflows functional
- ✅ Context view shows ADRs and learnings

---

## Phase 4: Polish & Production-Ready (Week 13-16)

**Goal:** Production-grade quality, ready for users

**Duration:** 4 weeks (20 business days)
**Effort:** 40-60 hours
**Team:** 1 engineer

### Tasks

#### Task 4.1: Comprehensive Testing (15 hours)
- Unit tests for all new components
- Integration tests for IPC APIs
- E2E tests with Playwright
- Manual testing on all platforms
- Load testing (100+ tasks)

#### Task 4.2: Error Handling & Recovery (10 hours)
- Graceful degradation for plugin failures
- User-friendly error messages
- Automatic recovery from crashes
- Crash reporting integration

#### Task 4.3: Performance Optimization (10 hours)
- Lazy loading for UI components
- Caching for project index
- Memory leak detection and fixes
- Reduce app bundle size

#### Task 4.4: User Documentation (10 hours)
- User guide (getting started, features, troubleshooting)
- Developer guide (architecture, contributing)
- API reference
- Video tutorials (optional)

#### Task 4.5: CI/CD Setup (5 hours)
- GitHub Actions for auto-build
- Auto-release on tag push
- VirusTotal scanning
- SHA256 checksums

#### Task 4.6: Security Audit (5 hours)
- AGPL-3.0 license compliance
- No leaked secrets in code
- Secure API key storage
- Command injection prevention

### Deliverables

1. Comprehensive test suite (90%+ coverage)
2. Error handling and recovery
3. Performance optimizations
4. User documentation
5. CI/CD pipeline
6. Security audit report
7. Production-ready desktop app

### Success Criteria

- ✅ Test coverage ≥90%
- ✅ No critical bugs
- ✅ Startup time <3 seconds
- ✅ Memory usage <500MB
- ✅ Documentation complete
- ✅ CI/CD pipeline working
- ✅ Security audit passed

---

## Resource Requirements

### Team Structure

**Option A: 1 Full-Time Engineer (Slower but Lower Cost)**
- Duration: 16 weeks (sequential phases)
- Cost: $64,000-$78,000 (at $100/hour, 270-390h + overhead)
- Pros: Lower cost, single point of knowledge
- Cons: Longer timeline, no parallel work

**Option B: 2 Engineers (Faster, Higher Cost)**
- Duration: 10 weeks (parallel phases)
- Cost: $90,000-$120,000 (at $100/hour, more overhead)
- Pros: Faster delivery, parallel workstreams
- Cons: Higher cost, coordination overhead

**Recommended:** Option A (1 engineer) for Phase 0-2, Option B (2 engineers) for Phase 3-4 if budget allows

### Infrastructure Requirements

- GitHub organization for forked Auto-Claude repo
- CI/CD runners (GitHub Actions free tier sufficient)
- Test devices: Windows PC, macOS (Intel + Apple Silicon), Linux VM
- Claude API credits for testing
- Optional: Linear/Jira for task tracking

---

## Success Metrics

### Phase 0 (PoC) Success Metrics
- App starts without errors: ✅/❌
- IPC communication works: ✅/❌
- Data format translation feasible: ✅/❌
- No showstopper blockers: ✅/❌

### Phase 1 (Core) Success Metrics
- Task creation success rate: >95%
- Task execution success rate: >90%
- Real-time update latency: <100ms
- Quality gate pass rate: >80%

### Phase 2 (Plugins) Success Metrics
- QA loop defect detection rate: >80%
- Spec generation quality score: >0.7
- AI merge success rate: >70%
- Plugin crash rate: <5%

### Phase 3 (Advanced) Success Metrics
- Feature completion: 100%
- GitHub/GitLab sync success rate: >95%
- Chat response time: <2 seconds

### Phase 4 (Polish) Success Metrics
- Test coverage: ≥90%
- Critical bug count: 0
- Startup time: <3 seconds
- Memory usage: <500MB
- User satisfaction: >80% (NPS >40)

---

## Risk Mitigation Plan

### High-Risk Areas

1. **IPC API Mismatch**
   - Mitigation: Comprehensive API mapping in Phase 0
   - Contingency: Stub out missing APIs with TODO markers

2. **Data Format Incompatibility**
   - Mitigation: Write FormatTranslator tests first (TDD)
   - Contingency: Add compatibility layer for complex translations

3. **Python Plugin Instability**
   - Mitigation: Timeout handling, process monitoring
   - Contingency: Graceful degradation to rad-engineer-only features

4. **Real-Time Streaming Performance**
   - Mitigation: Backpressure, buffer limits, xterm.js tuning
   - Contingency: Batch updates if real-time causes issues

5. **Cross-Platform Packaging**
   - Mitigation: Use Auto-Claude's existing build scripts
   - Contingency: Focus on primary platform (macOS) first

---

## Decision Points

### After Phase 0
- **Go:** IPC works, data translation feasible, no showstoppers
- **No-Go:** Major technical blockers, consider alternative UI approach

### After Phase 1
- **Go:** Task management works, quality acceptable
- **Pivot:** If quality gates too restrictive, adjust thresholds

### After Phase 2
- **Go:** Python plugins work, QA automation valuable
- **Pivot:** If plugins unstable, rebuild in TypeScript (adds 150h)

### After Phase 3
- **Go:** All features working, proceed to polish
- **Defer Phase 4:** Ship as beta, gather user feedback first

---

## Next Steps

1. **Review this roadmap** with stakeholders
2. **Get approval** for Phase 0 budget (40-60h)
3. **Assign engineer** to Phase 0
4. **Fork Auto-Claude repo** and create integration branch
5. **Start Phase 0 (PoC)** - Week 1-2
6. **Review Phase 0 results** at end of Week 2
7. **Decide:** Go to Phase 1 or adjust plan

---

## Appendix: File Structure After Integration

```
rad-engineer-v2/
├── rad-engineer/
│   ├── src/
│   │   ├── sdk/                          # Phase 0 (existing)
│   │   ├── baseline/                     # Phase 0 (existing)
│   │   ├── core/                         # Phase 1 (existing)
│   │   ├── advanced/                     # Phase 1 (existing)
│   │   ├── integration/                  # Phase 1 (existing)
│   │   ├── decision/                     # Phase 1 (existing)
│   │   ├── reasoning/                    # Phase 1 (existing)
│   │   ├── plan/                         # Phase 1 (existing)
│   │   ├── execute/                      # Phase 1 (existing)
│   │   ├── ui-adapter/                   # Phase 0-1 (NEW)
│   │   │   ├── ElectronIPCAdapter.ts
│   │   │   ├── FormatTranslator.ts
│   │   │   ├── EventBroadcaster.ts
│   │   │   ├── TaskAPIHandler.ts
│   │   │   ├── SettingsAPIHandler.ts
│   │   │   ├── TerminalAPIHandler.ts
│   │   │   ├── AgentAPIHandler.ts
│   │   │   └── index.ts
│   │   ├── python-bridge/                # Phase 2 (NEW)
│   │   │   ├── PythonPluginBridge.ts
│   │   │   ├── QAPluginIntegration.ts
│   │   │   ├── SpecGenPluginIntegration.ts
│   │   │   ├── AIMergePluginIntegration.ts
│   │   │   └── index.ts
│   ├── python-plugins/                   # Phase 2 (NEW)
│   │   ├── qa_loop.py
│   │   ├── spec_generator.py
│   │   ├── ai_merge.py
│   │   ├── project_analyzer.py
│   │   ├── requirements.txt
│   │   ├── setup-plugins.sh
│   │   └── README.md
│   ├── test/
│   │   ├── ui-adapter/                   # Phase 1 (NEW)
│   │   ├── python-bridge/                # Phase 2 (NEW)
│   ├── docs/
│   │   ├── AUTO_CLAUDE_INTEGRATION_ANALYSIS.md  # Phase 0 (existing)
│   │   ├── AUTO_CLAUDE_INTEGRATION_ROADMAP.md   # Phase 0 (existing)
│   │   ├── UI_ADAPTER_ARCHITECTURE.md           # Phase 1 (NEW)
│   │   ├── PYTHON_PLUGIN_GUIDE.md               # Phase 2 (NEW)
│
├── Auto-Claude/ (forked)
│   ├── apps/
│   │   ├── frontend/                     # Keep mostly as-is
│   │   │   ├── src/
│   │   │   │   ├── main/
│   │   │   │   │   ├── index.ts          # Modify: Load rad-engineer adapter
│   │   │   │   │   ├── agent/
│   │   │   │   │   │   ├── agent-process.ts  # Modify: Remove Python spawn
│   │   │   │   ├── preload/              # Keep as-is
│   │   │   │   ├── renderer/             # Keep as-is
│   │   ├── backend/                      # Remove (replaced by rad-engineer)
```

---

**Version:** 1.0
**Status:** Ready for Phase 0 Approval
**Next Review:** After Phase 0 completion (Week 2)
