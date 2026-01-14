# rad-engineer UI Integration - Implementation Plan

> **Project**: rad-engineer-v2 UI Integration with Auto-Claude
> **Timeline**: 6 weeks, 16 waves, 30 stories
> **Effort**: 278-398 hours
> **Format**: /execute skill compatible
> **Status**: READY FOR EXECUTION

---

## Plan Metadata

**Original Plan**: `~/.claude/plans/stateless-petting-eclipse.md`
**Gap Analysis**: `docs/platform-foundation/UI-INTEGRATION-GAP-ANALYSIS.yaml`
**Contracts**: `docs/platform-foundation/UI-INTEGRATION-CONTRACTS.yaml`
**Memory Strategy**: `docs/platform-foundation/UI-INTEGRATION-MEMORY-STRATEGY.md`

**Execution Model**:
- TDD Protocol: Write test first → Implement → Verify
- Max 2-3 agents per wave
- Context management: /clear between waves, /compact at 70%
- Memory-keeper checkpoints: After each wave
- Quality gates: bun test only, flock serialization

---

## Wave 1: Critical Bug Fix (Week 1, Days 1-2)

**Duration**: 2 days
**Effort**: 12-16 hours
**Agents**: 1 developer
**Dependencies**: None
**Checkpoint**: After completion (first user-facing fix)

---

### Story 1: Fix Initialization Button Error Feedback

**Description**: Add error and success toast notifications to initialization dialog so users get feedback when initialization fails or succeeds.

**Current Bug**: Initialization button does nothing when clicked. Error is set at `useProjectSettings.ts:292` but never displayed to user.

**Evidence**:
- File: `apps/frontend/src/renderer/components/project-settings/GeneralSettings.tsx:65-79`
- Missing: `useToast` hook, error/setError props, useEffect for error display

#### Tasks

- **Task 1.1**: Add useToast hook and error display to GeneralSettings component
  - Import `useToast` from `../../hooks/use-toast`
  - Import `useEffect` from `react`
  - Add `error` and `setError` props to `GeneralSettingsProps` interface
  - Add `useEffect` to display error toast when error is set
  - Add `useEffect` to clear error after toast is shown

- **Task 1.2**: Add success toast to useProjectSettings hook
  - Import `useToast` hook in `useProjectSettings.ts`
  - Add success toast notification after initialization succeeds
  - Use i18n keys for toast messages

- **Task 1.3**: Add i18n translation keys for toast messages
  - File: `apps/frontend/src/shared/i18n/locales/en/settings.json`
  - Add `initializeErrorTitle`, `initializeSuccessTitle`, `initializeSuccessDescription`
  - Mirror changes in French: `apps/frontend/src/shared/i18n/locales/fr/settings.json`

- **Task 1.4**: Add backend logging for initialization flow
  - File: `apps/frontend/src/main/ipc-handlers/project-handlers.ts`
  - Add console.log statements at: IPC entry, project lookup, init start, init result, exceptions
  - Include context objects: projectId, projectPath, success status

#### Tests

**Test File**: `apps/frontend/src/renderer/components/project-settings/__tests__/GeneralSettings.test.tsx`

**TDD Protocol**:
1. Write test file FIRST (expect failures)
2. Run: `cd apps/frontend && bun test GeneralSettings.test.tsx` (expect FAIL)
3. Implement changes
4. Run: `cd apps/frontend && bun test GeneralSettings.test.tsx` (expect PASS)

**Test Cases**:
- [ ] Error toast appears when handleInitialize fails
  - Mock handleInitialize to set error
  - Expect toast with variant='destructive'
  - Expect toast title matches i18n key
- [ ] Success toast appears when initialization succeeds
  - Mock handleInitialize to return success
  - Expect toast with success variant
  - Expect toast title matches i18n key
- [ ] Error is cleared after toast displays
  - Set error, wait for effect
  - Expect setError(null) called
- [ ] Button loading state works
  - Set isUpdating=true
  - Expect button disabled
  - Expect button text shows "Initializing..."

**Manual Verification**:
- [ ] Create test directory without git: `mkdir /tmp/test-no-git`
- [ ] Add project in UI → Click "Initialize Auto-Build"
- [ ] Expected: Error toast appears with clear message
- [ ] Console shows `[IPC] PROJECT_INITIALIZE` logs
- [ ] Test with valid git repo: Success toast appears

#### Dependencies

- None (first story, unblocks user testing)

#### Wave Assignment

- **Wave**: 1
- **Agent**: developer-001
- **Priority**: CRITICAL (user-facing bug)

#### Acceptance Criteria

- ✅ Error toast displays for all failure scenarios (no git, permissions, etc.)
- ✅ Success toast displays on successful initialization
- ✅ Console logs show complete IPC execution flow
- ✅ Button loading state works correctly
- ✅ i18n keys exist for English and French
- ✅ Tests pass: `bun test GeneralSettings.test.tsx`
- ✅ TypeScript compiles: `bun run typecheck` (0 errors)

#### Contract Reference

See: `UI-INTEGRATION-CONTRACTS.yaml` → `story_1_initialization_bug_fix`

---

## Wave 2: Rebrand Configuration (Week 1, Day 3)

**Duration**: 1 day
**Effort**: 8-12 hours
**Agents**: 2 developers (parallel)
**Dependencies**: None (independent of Wave 1)
**Checkpoint**: After completion (prepare for asset rebrand)

---

### Story 2: Update Package Configuration

**Description**: Update all package.json files and HTML templates to use "rad-engineer" branding instead of "Auto-Claude".

**Files to Update**: 3 critical configuration files

#### Tasks

- **Task 2.1**: Update root package.json
  - File: `workspaces/Auto-Claude/package.json`
  - Line 2: `"name": "rad-engineer"` (was: "auto-claude-ui")
  - Line 6: `"productName": "rad-engineer"`
  - Lines 32-42: `"appId": "com.radengineer.app"` (was: "com.autoclaude.ui")
  - Update description: "Autonomous engineering platform from ideation to production"

- **Task 2.2**: Update frontend package.json
  - File: `workspaces/Auto-Claude/apps/frontend/package.json`
  - Line 2: `"name": "rad-engineer"`
  - Lines 143-145: Update build configuration appId

- **Task 2.3**: Update HTML template
  - File: `workspaces/Auto-Claude/apps/frontend/src/renderer/index.html`
  - Line 10: `<title>rad-engineer</title>` (was: "Auto Claude")

#### Tests

**Test File**: `workspaces/Auto-Claude/apps/frontend/__tests__/config.test.ts`

**Test Cases**:
- [ ] Root package.json has correct name and appId
- [ ] Frontend package.json has correct name
- [ ] HTML title tag contains "rad-engineer"
- [ ] No "auto-claude" or "Auto Claude" references in config files (grep verification)

**Manual Verification**:
- [ ] App launches with window title "rad-engineer"
- [ ] About dialog shows correct name
- [ ] macOS app bundle has correct identifier

#### Dependencies

- None

#### Wave Assignment

- **Wave**: 2
- **Agent**: developer-002
- **Priority**: HIGH (foundation for rebrand)

#### Acceptance Criteria

- ✅ All package.json files updated
- ✅ HTML template updated
- ✅ No "auto-claude" references in config files
- ✅ App launches successfully
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

### Story 3: Bulk i18n Replacement

**Description**: Replace all "Auto Claude" references with "rad-engineer" in i18n locales (English and French).

**Scope**: 127+ references across en/*.json and fr/*.json files

#### Tasks

- **Task 3.1**: Bulk replace in English locale files
  - Files: `apps/frontend/src/shared/i18n/locales/en/*.json`
  - Pattern: Find "Auto Claude" → Replace "rad-engineer"
  - Pattern: Find "Auto-Claude" → Replace "rad-engineer"
  - Create .bak backups before replacement
  - Verify JSON validity after replacement

- **Task 3.2**: Bulk replace in French locale files
  - Files: `apps/frontend/src/shared/i18n/locales/fr/*.json`
  - Same patterns as English
  - Create .bak backups
  - Verify JSON validity

- **Task 3.3**: Update specific locale keys
  - `en/common.json`: Lines 10, 244, 301
  - `en/settings.json`: 42+ references
  - `en/welcome.json`, `en/onboarding.json`
  - Mirror in French locale files

#### Tests

**Test File**: `apps/frontend/__tests__/i18n.test.ts`

**Test Cases**:
- [ ] No "Auto Claude" references in en/ locale files
- [ ] No "Auto-Claude" references in en/ locale files
- [ ] No "Auto Claude" references in fr/ locale files
- [ ] All JSON files are valid (can be parsed)
- [ ] Backup files exist (*.json.bak)
- [ ] i18n system loads without errors

**Manual Verification**:
- [ ] Launch app in English → All labels show "rad-engineer"
- [ ] Switch to French → All labels show "rad-engineer"
- [ ] No untranslated strings appear
- [ ] Settings panel shows correct branding

#### Dependencies

- None

#### Wave Assignment

- **Wave**: 2
- **Agent**: developer-003
- **Priority**: HIGH (visible branding)

#### Acceptance Criteria

- ✅ 0 "Auto Claude" references in locale files
- ✅ All JSON files valid
- ✅ Backups created
- ✅ English UI shows correct branding
- ✅ French UI shows correct branding
- ✅ Tests pass

---

## Wave 3: Rebrand Assets & Theme (Week 1-2, Days 4-5)

**Duration**: 2 days
**Effort**: 12-16 hours
**Agents**: 2 developers (parallel)
**Dependencies**: Wave 2 (config must be updated first)
**Checkpoint**: After completion (visual rebrand complete)

---

### Story 4: Update Theme Colors

**Description**: Replace Auto-Claude yellow theme (#D6D876) with rad-engineer blue (#0EA5E9) throughout the UI.

**Files**: `apps/frontend/src/renderer/styles/globals.css` (1711 lines)

#### Tasks

- **Task 4.1**: Update primary color variables
  - File: `apps/frontend/src/renderer/styles/globals.css`
  - Line 119: `:root --primary: #0EA5E9` (was: #A5A66A)
  - Line 119: `:root --primary-foreground: #FFFFFF`
  - Line 179: `.dark --primary: #38BDF8` (was: #D6D876)
  - Line 179: `.dark --primary-foreground: #0F172A`

- **Task 4.2**: Update yellow rgba values to blue
  - Lines 1076, 1186, 1218+
  - Find all rgba values with yellow tint
  - Replace with blue equivalents
  - Maintain alpha channel values

- **Task 4.3**: Update accent colors if needed
  - Check secondary, accent, muted colors
  - Ensure contrast ratios meet WCAG AA (4.5:1 for text)

#### Tests

**Test File**: `apps/frontend/__tests__/theme.test.ts`

**Test Cases**:
- [ ] Primary color is #0EA5E9 in light mode
- [ ] Primary color is #38BDF8 in dark mode
- [ ] No yellow hex codes (#D6D876, #A5A66A) in globals.css
- [ ] Contrast ratios meet WCAG AA standards
- [ ] Theme toggle switches colors correctly

**Manual Verification**:
- [ ] Launch app → Primary buttons are blue
- [ ] Switch to dark mode → Blue darkens appropriately
- [ ] All interactive elements use new color scheme
- [ ] No yellow artifacts remain

#### Dependencies

- Wave 2 complete (config updated)

#### Wave Assignment

- **Wave**: 3
- **Agent**: developer-004
- **Priority**: HIGH (visual identity)

#### Acceptance Criteria

- ✅ Primary colors are blue (#0EA5E9 light, #38BDF8 dark)
- ✅ No yellow hex codes in CSS
- ✅ WCAG AA contrast ratios met
- ✅ Dark mode works correctly
- ✅ Tests pass

---

### Story 5: Replace Logo & Icons

**Description**: Replace Auto-Claude logo and icons with rad-engineer branding across all sizes and platforms.

**Files**: `apps/frontend/resources/` (icon.png, icon.icns, icon.ico)

#### Tasks

- **Task 5.1**: Create rad-engineer logo
  - Option 1 (Quick): Text-based with emoji (⚙️ rad-engineer or 🔧 rad-engineer)
  - Option 2 (Production): Custom SVG with gear/circuit hybrid
  - Generate sizes: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512

- **Task 5.2**: Replace macOS icons
  - File: `apps/frontend/resources/icon.icns`
  - Generate from master logo using iconutil
  - Test on macOS (Finder, Dock, About dialog)

- **Task 5.3**: Replace Windows icons
  - File: `apps/frontend/resources/icon.ico`
  - Generate from master logo
  - Include multiple sizes (16, 32, 48, 256)

- **Task 5.4**: Replace Linux/PNG icons
  - File: `apps/frontend/resources/icon.png`
  - 512x512 PNG with transparency
  - Test on Linux window manager

- **Task 5.5**: Update marketing assets
  - Directory: `.github/assets/`
  - Rename screenshots: `Auto-Claude-*.png` → `rad-engineer-*.png`
  - Retake screenshots with new branding (defer to post-rebrand)

#### Tests

**Test File**: `apps/frontend/__tests__/assets.test.ts`

**Test Cases**:
- [ ] icon.png exists and is 512x512
- [ ] icon.icns exists and is valid
- [ ] icon.ico exists and contains multiple sizes
- [ ] No "auto-claude" in asset filenames
- [ ] Logo loads in app UI

**Manual Verification**:
- [ ] macOS: Icon appears in Finder, Dock, About dialog
- [ ] Windows: Icon appears in taskbar, title bar
- [ ] Linux: Icon appears in window manager
- [ ] Tray icon shows correctly

#### Dependencies

- Wave 2 complete (config updated)

#### Wave Assignment

- **Wave**: 3
- **Agent**: developer-005
- **Priority**: HIGH (visible identity)

#### Acceptance Criteria

- ✅ New logo created (SVG or emoji-based)
- ✅ All icon formats generated (.icns, .ico, .png)
- ✅ Icons display correctly on all platforms
- ✅ No Auto-Claude logo artifacts
- ✅ Tests pass

---

## Wave 4: Rebrand Code & Documentation (Week 2, Days 1-2)

**Duration**: 2 days
**Effort**: 12-16 hours
**Agents**: 2 developers (parallel)
**Dependencies**: Wave 3 (assets must exist first)
**Checkpoint**: After completion (rebrand 100% complete)

---

### Story 6: Component Code Rebrand

**Description**: Replace all "Auto Claude", "auto-claude", "autoClaude" references in TypeScript/React component code.

**Scope**: 127+ files in `apps/frontend/src/`

#### Tasks

- **Task 6.1**: Bulk search and replace in components
  - Find: "Auto Claude" → Replace: "rad-engineer" (string literals)
  - Find: Auto-Claude → Replace: rad-engineer (hyphenated)
  - Find: .auto-claude → Replace: .rad-engineer (CSS classes, paths)
  - Find: AUTO_CLAUDE → Replace: RAD_ENGINEER (constants)
  - Find: autoClaude → Replace: radEngineer (camelCase)
  - Find: AutoClaude → Replace: RadEngineer (PascalCase)

- **Task 6.2**: Update critical component files
  - `apps/frontend/src/main/index.ts` - Window title
  - `apps/frontend/src/main/config-paths.ts` - File paths
  - `apps/frontend/src/shared/constants.ts` - Constants
  - All IPC handlers (30+ files)

- **Task 6.3**: Update CSS class names
  - Find .auto-claude classes
  - Rename to .rad-engineer
  - Update references in components

#### Tests

**Test File**: `apps/frontend/__tests__/rebrand.test.ts`

**Test Cases**:
- [ ] No "Auto Claude" in src/ (except comments/docs)
- [ ] No "auto-claude" in class names
- [ ] No AUTO_CLAUDE constants
- [ ] Window title is "rad-engineer"
- [ ] Config paths use rad-engineer
- [ ] App launches without errors

**Manual Verification**:
- [ ] Launch app → Window title correct
- [ ] Check all major views (Kanban, Settings, Roadmap)
- [ ] No console errors about missing classes
- [ ] All features still work

#### Dependencies

- Wave 3 complete (assets updated)

#### Wave Assignment

- **Wave**: 4
- **Agent**: developer-006
- **Priority**: HIGH (code consistency)

#### Acceptance Criteria

- ✅ 0 "Auto Claude" references in TypeScript/React code
- ✅ All CSS classes renamed
- ✅ Window title correct
- ✅ App launches and functions correctly
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

### Story 7: Backend & Documentation Rebrand

**Description**: Update Python backend and all Markdown documentation to use rad-engineer branding.

**Scope**: Python files in `apps/backend/` and all `*.md` files

#### Tasks

- **Task 7.1**: Update Python backend references
  - Find all `.auto-claude` path references
  - Rename: `auto_claude_tools.py` → `rad_engineer_tools.py`
  - Update: `AUTO_CLAUDE_*` env vars → `RAD_ENGINEER_*`
  - Update comments and docstrings

- **Task 7.2**: Bulk replace in Markdown documentation
  - Pattern: `find . -name "*.md" -type f -exec grep -l "Auto Claude" {} \;`
  - Replace: "Auto Claude" → "rad-engineer"
  - Files: README.md, CLAUDE.md, all docs/*.md
  - Create .bak backups

- **Task 7.3**: Update specific documentation files
  - `README.md` - Line 1, descriptions, download links
  - `CONTRIBUTING.md` - Project name references
  - `docs/` folder - All guides and references

#### Tests

**Test File**: `apps/backend/__tests__/rebrand.test.py`

**Test Cases**:
- [ ] No "Auto Claude" in Python files
- [ ] No .auto-claude path references
- [ ] No AUTO_CLAUDE env vars
- [ ] No "Auto Claude" in Markdown files (except backups)
- [ ] Backend services start successfully
- [ ] Python imports work correctly

**Manual Verification**:
- [ ] Backend starts: `cd apps/backend && python run.py`
- [ ] No import errors
- [ ] README.md displays correctly on GitHub
- [ ] Documentation is consistent

#### Dependencies

- Wave 3 complete (assets updated)

#### Wave Assignment

- **Wave**: 4
- **Agent**: developer-007
- **Priority**: HIGH (documentation consistency)

#### Acceptance Criteria

- ✅ 0 "Auto Claude" references in Python code
- ✅ 0 "Auto Claude" references in Markdown docs
- ✅ All imports work
- ✅ Backend starts successfully
- ✅ Tests pass

---

## Wave 5: /plan UI - Intake & Research (Week 2-3, Days 3-5)

**Duration**: 3 days
**Effort**: 20-28 hours
**Agents**: 2 developers (parallel)
**Dependencies**: Wave 4 complete (rebrand done)
**Checkpoint**: After completion (planning foundation ready)

---

### Story 8: Planning Workflow Infrastructure

**Description**: Create planning workflow infrastructure including state machine, routing, and API handler registration.

**Files to Create**: 5 new files

#### Tasks

- **Task 8.1**: Create PlanningAPIHandler backend
  - File: `rad-engineer/src/ui-adapter/PlanningAPIHandler.ts`
  - Implement IPC handlers for /plan workflow
  - Methods: startIntake, submitAnswers, startResearch, generatePlan, validatePlan, savePlan
  - Integrate with IntakeHandler, ResearchCoordinator, ExecutionPlanGenerator

- **Task 8.2**: Register PlanningAPIHandler in adapter
  - File: `rad-engineer/src/ui-adapter/index.ts`
  - Export PlanningAPIHandler
  - Register in ElectronIPCAdapter

- **Task 8.3**: Add IPC channels in main process
  - File: `apps/frontend/src/main/ipc-handlers/rad-engineer-handlers.ts`
  - Register 10 new channels: plan:start-intake, plan:get-questions, etc.
  - Add error handling and logging

- **Task 8.4**: Expose IPC in preload
  - File: `apps/frontend/src/preload/index.ts`
  - Add planning methods to API surface
  - Type-safe interfaces

- **Task 8.5**: Create PlanningWorkflow root component
  - File: `apps/frontend/src/renderer/components/planning/PlanningWorkflow.tsx`
  - State machine for workflow steps: Intake → Research → Generate → Review
  - Route handling
  - Error boundaries

#### Tests

**Test Files**:
- `rad-engineer/src/ui-adapter/__tests__/PlanningAPIHandler.test.ts`
- `apps/frontend/src/renderer/components/planning/__tests__/PlanningWorkflow.test.tsx`

**Test Cases**:
- [ ] PlanningAPIHandler methods exist and return correct types
- [ ] IPC channels registered correctly
- [ ] Preload API exposes planning methods
- [ ] PlanningWorkflow renders without errors
- [ ] State machine transitions work
- [ ] Error boundaries catch errors

**Manual Verification**:
- [ ] Backend services start without errors
- [ ] IPC communication works (test with dev tools)
- [ ] Component renders in Storybook (optional)

#### Dependencies

- Wave 4 complete (rebrand done, clean codebase)

#### Wave Assignment

- **Wave**: 5
- **Agent**: developer-008, developer-009 (pair on infrastructure)
- **Priority**: HIGH (foundation for /plan feature)

#### Acceptance Criteria

- ✅ PlanningAPIHandler implemented
- ✅ IPC channels registered
- ✅ Preload API complete
- ✅ PlanningWorkflow component renders
- ✅ Tests pass (backend + frontend)
- ✅ TypeScript compiles (0 errors)

---

### Story 9: Intake Wizard Components

**Description**: Implement multi-step intake wizard UI for gathering user requirements through Q&A.

**Files to Create**: 3 components

#### Tasks

- **Task 9.1**: Create IntakeWizard component
  - File: `apps/frontend/src/renderer/components/planning/intake/IntakeWizard.tsx`
  - Multi-step form with progress indicator
  - Question display and answer collection
  - Navigation (Next, Back, Skip)

- **Task 9.2**: Create IntakeStep component
  - File: `apps/frontend/src/renderer/components/planning/intake/IntakeStep.tsx`
  - Individual question display
  - Input types: text, select, multi-select, textarea
  - Validation per question type

- **Task 9.3**: Create IntakeSummary component
  - File: `apps/frontend/src/renderer/components/planning/intake/IntakeSummary.tsx`
  - Review all answers before submission
  - Edit capability (go back to specific question)
  - Submit button with confirmation

- **Task 9.4**: Connect to backend IPC
  - Call plan:get-questions on mount
  - Call plan:submit-answers on submit
  - Handle loading and error states

#### Tests

**Test File**: `apps/frontend/src/renderer/components/planning/intake/__tests__/IntakeWizard.test.tsx`

**Test Cases**:
- [ ] IntakeWizard renders with questions
- [ ] Progress indicator shows current step
- [ ] Navigation buttons work (Next, Back)
- [ ] Answer validation works
- [ ] IntakeSummary displays all answers
- [ ] Submit calls IPC correctly
- [ ] Error states display correctly

**Manual Verification**:
- [ ] Launch app → New Task → Planning mode
- [ ] Intake wizard appears with questions
- [ ] Can navigate through questions
- [ ] Answers are saved
- [ ] Submit works and proceeds to research

#### Dependencies

- Story 8 complete (infrastructure exists)

#### Wave Assignment

- **Wave**: 5
- **Agent**: developer-010
- **Priority**: HIGH (user-facing feature)

#### Acceptance Criteria

- ✅ IntakeWizard component complete
- ✅ All input types work
- ✅ Validation works
- ✅ Submit triggers research phase
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

### Story 10: Research Dashboard Components

**Description**: Implement research dashboard showing real-time progress of parallel research agents.

**Files to Create**: 3 components

#### Tasks

- **Task 10.1**: Create ResearchDashboard component
  - File: `apps/frontend/src/renderer/components/planning/research/ResearchDashboard.tsx`
  - Grid layout for agent cards
  - Real-time updates via IPC events (plan:research-agent-update)
  - Overall progress indicator

- **Task 10.2**: Create ResearchAgentCard component
  - File: `apps/frontend/src/renderer/components/planning/research/ResearchAgentCard.tsx`
  - Agent status: pending, researching, complete
  - Current task display
  - Progress spinner
  - Findings preview

- **Task 10.3**: Create ResearchFindings component
  - File: `apps/frontend/src/renderer/components/planning/research/ResearchFindings.tsx`
  - Collapsible list of findings per agent
  - Markdown rendering for findings
  - Evidence links (expandable)

- **Task 10.4**: Subscribe to real-time events
  - Listen to: plan:research-agent-update
  - Update agent cards in real-time
  - Transition to plan generation when all agents complete

#### Tests

**Test File**: `apps/frontend/src/renderer/components/planning/research/__tests__/ResearchDashboard.test.tsx`

**Test Cases**:
- [ ] ResearchDashboard renders with agents
- [ ] Agent cards show correct status
- [ ] Real-time updates work (mock IPC events)
- [ ] Findings display correctly
- [ ] Markdown renders in findings
- [ ] Transition to next phase when complete

**Manual Verification**:
- [ ] Intake complete → Research dashboard appears
- [ ] See 2-3 agent cards updating
- [ ] Findings appear as agents complete
- [ ] Smooth transition to plan generation

#### Dependencies

- Story 8 complete (infrastructure exists)

#### Wave Assignment

- **Wave**: 5
- **Agent**: developer-011
- **Priority**: HIGH (visibility into research)

#### Acceptance Criteria

- ✅ ResearchDashboard complete
- ✅ Real-time updates work
- ✅ Findings display correctly
- ✅ Transitions to plan generation
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

## Wave 6: /plan UI - Visualizer & Editor (Week 3, Days 1-3)

**Duration**: 3 days
**Effort**: 20-28 hours
**Agents**: 2 developers (parallel)
**Dependencies**: Wave 5 complete (research foundation ready)
**Checkpoint**: After completion (/plan core complete)

---

### Story 11: Plan Visualizer

**Description**: Implement plan visualizer with dependency graph, wave timeline, and story list views.

**Files to Create**: 4 components

#### Tasks

- **Task 11.1**: Create PlanVisualizer container
  - File: `apps/frontend/src/renderer/components/planning/visualizer/PlanVisualizer.tsx`
  - Tab layout: Graph, Timeline, List
  - Load plan data from backend
  - Switch between views

- **Task 11.2**: Create DependencyGraph component
  - File: `apps/frontend/src/renderer/components/planning/visualizer/DependencyGraph.tsx`
  - Use React Flow or D3.js
  - Nodes = stories, edges = dependencies
  - Layout algorithm (dagre)
  - Interactive (zoom, pan, click to details)

- **Task 11.3**: Create WaveTimeline component
  - File: `apps/frontend/src/renderer/components/planning/visualizer/WaveTimeline.tsx`
  - Horizontal timeline
  - Waves as sections
  - Stories as cards within waves
  - Drag-to-reorder (optional)

- **Task 11.4**: Create StoryList component
  - File: `apps/frontend/src/renderer/components/planning/visualizer/StoryList.tsx`
  - Grouped by wave
  - Story cards with: title, tasks count, tests count, duration
  - Expand to see tasks
  - Click to edit in editor

#### Tests

**Test File**: `apps/frontend/src/renderer/components/planning/visualizer/__tests__/PlanVisualizer.test.tsx`

**Test Cases**:
- [ ] PlanVisualizer renders with tabs
- [ ] DependencyGraph displays nodes and edges
- [ ] Graph interactions work (zoom, pan)
- [ ] WaveTimeline shows waves correctly
- [ ] StoryList groups by wave
- [ ] Click on story opens editor

**Manual Verification**:
- [ ] Research complete → Plan visualizer appears
- [ ] Dependency graph renders correctly
- [ ] Timeline shows chronological order
- [ ] Can switch between views
- [ ] Click story → Opens in editor

#### Dependencies

- Story 8 complete (infrastructure exists)
- Story 10 complete (research generates plan)

#### Wave Assignment

- **Wave**: 6
- **Agent**: developer-012
- **Priority**: HIGH (plan visibility)

#### Acceptance Criteria

- ✅ PlanVisualizer complete with 3 views
- ✅ Dependency graph renders
- ✅ Timeline shows waves
- ✅ Story list works
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

### Story 12: YAML Editor & Validation

**Description**: Implement YAML editor with syntax highlighting, validation, and preview for plan editing.

**Files to Create**: 4 components

#### Tasks

- **Task 12.1**: Create PlanEditor container
  - File: `apps/frontend/src/renderer/components/planning/editor/PlanEditor.tsx`
  - Split pane: Editor on left, preview on right
  - Save button with IPC call (plan:update-plan)
  - Dirty state tracking

- **Task 12.2**: Create YAMLEditor component
  - File: `apps/frontend/src/renderer/components/planning/editor/YAMLEditor.tsx`
  - Monaco Editor integration
  - YAML syntax highlighting
  - Auto-complete for story keys
  - Line numbers, folding

- **Task 12.3**: Create ValidationPanel component
  - File: `apps/frontend/src/renderer/components/planning/editor/ValidationPanel.tsx`
  - Display validation errors
  - Warnings (missing tests, no dependencies)
  - Click error → Jump to line in editor
  - Real-time validation as user types

- **Task 12.4**: Create PlanPreview component
  - File: `apps/frontend/src/renderer/components/planning/editor/PlanPreview.tsx`
  - Formatted preview of YAML
  - Markdown rendering for descriptions
  - Syntax-highlighted code blocks

#### Tests

**Test File**: `apps/frontend/src/renderer/components/planning/editor/__tests__/PlanEditor.test.tsx`

**Test Cases**:
- [ ] PlanEditor renders with editor and preview
- [ ] YAMLEditor syntax highlighting works
- [ ] Validation catches errors (invalid YAML, missing keys)
- [ ] ValidationPanel displays errors
- [ ] Preview updates as editor changes
- [ ] Save calls IPC correctly

**Manual Verification**:
- [ ] Click "Edit Plan" → Editor appears
- [ ] YAML syntax highlighted correctly
- [ ] Type invalid YAML → Error appears
- [ ] Fix error → Validation passes
- [ ] Preview updates in real-time
- [ ] Save works

#### Dependencies

- Story 8 complete (infrastructure exists)
- Story 11 complete (visualizer generates editable plan)

#### Wave Assignment

- **Wave**: 6
- **Agent**: developer-013
- **Priority**: HIGH (plan editing)

#### Acceptance Criteria

- ✅ PlanEditor complete with split pane
- ✅ YAML editing works with syntax highlighting
- ✅ Validation catches errors
- ✅ Preview updates correctly
- ✅ Save functionality works
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

## Wave 7: /plan UI - Approval (Week 3, Day 4)

**Duration**: 1 day
**Effort**: 8-12 hours
**Agents**: 1 developer
**Dependencies**: Wave 6 complete (editor ready)
**Checkpoint**: After completion (/plan feature 100% complete)

---

### Story 13: Plan Approval Interface

**Description**: Implement final approval interface with summary, comments, and save-to-disk functionality.

**Files to Create**: 3 components

#### Tasks

- **Task 13.1**: Create PlanApproval container
  - File: `apps/frontend/src/renderer/components/planning/approval/PlanApproval.tsx`
  - Three sections: Summary, Comments, Actions
  - Approve button (saves plan)
  - Reject button (returns to editor)
  - Export button (download YAML)

- **Task 13.2**: Create PlanSummary component
  - File: `apps/frontend/src/renderer/components/planning/approval/PlanSummary.tsx`
  - Stats: Total stories, waves, estimated effort, timeline
  - Warnings: Stories with no tests, missing dependencies
  - Risk assessment (optional)

- **Task 13.3**: Create CommentsPanel component
  - File: `apps/frontend/src/renderer/components/planning/approval/CommentsPanel.tsx`
  - Text area for user comments
  - Optional: AI suggestions for improvements
  - Saved with plan metadata

- **Task 13.4**: Implement save functionality
  - Call plan:save-plan IPC
  - Save to: `.rad-engineer/plans/{sessionId}/PLAN.md`
  - Show success toast
  - Redirect to Kanban board with plan loaded

#### Tests

**Test File**: `apps/frontend/src/renderer/components/planning/approval/__tests__/PlanApproval.test.tsx`

**Test Cases**:
- [ ] PlanApproval renders with summary
- [ ] PlanSummary displays correct stats
- [ ] CommentsPanel saves comments
- [ ] Approve calls plan:save-plan
- [ ] Reject returns to editor
- [ ] Export downloads YAML file
- [ ] Success toast appears after save

**Manual Verification**:
- [ ] Complete planning workflow → Approval screen appears
- [ ] Summary shows correct stats
- [ ] Can add comments
- [ ] Approve → Plan saves to disk
- [ ] File exists at .rad-engineer/plans/{sessionId}/PLAN.md
- [ ] Redirects to Kanban board

#### Dependencies

- Wave 6 complete (editor and visualizer ready)

#### Wave Assignment

- **Wave**: 7
- **Agent**: developer-014
- **Priority**: HIGH (completes /plan feature)

#### Acceptance Criteria

- ✅ PlanApproval interface complete
- ✅ Summary displays correctly
- ✅ Approve saves plan to disk
- ✅ Reject returns to editor
- ✅ Export downloads YAML
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

## Wave 8: /execute UI - Dashboard & Waves (Week 4, Days 1-2)

**Duration**: 2 days
**Effort**: 16-20 hours
**Agents**: 2 developers (parallel)
**Dependencies**: Wave 7 complete (/plan feature ready)
**Checkpoint**: After completion (execution monitoring foundation)

---

### Story 14: Execution Dashboard Infrastructure

**Description**: Create execution dashboard infrastructure including API handler, IPC channels, and root component.

**Files to Create**: 4 files

#### Tasks

- **Task 14.1**: Create ExecutionAPIHandler backend
  - File: `rad-engineer/src/ui-adapter/ExecutionAPIHandler.ts`
  - Methods: getExecutionStatus, getWaveStatus, getAgentStatus, getQualityGates, getStateMachineStatus
  - Methods: retryWave, retryTask, restoreCheckpoint
  - Integrate with WaveOrchestrator, StateManager, ErrorRecoveryEngine

- **Task 14.2**: Register ExecutionAPIHandler
  - File: `rad-engineer/src/ui-adapter/index.ts`
  - Export handler
  - Register IPC channels (13 new)

- **Task 14.3**: Add IPC handlers in main process
  - File: `apps/frontend/src/main/ipc-handlers/rad-engineer-handlers.ts`
  - Register: execution:get-status, execution:get-wave-status, etc.

- **Task 14.4**: Create ExecutionDashboard component
  - File: `apps/frontend/src/renderer/components/execution/ExecutionDashboard.tsx`
  - Tab layout: Waves, Agents, Quality Gates, State Machine, Recovery, Timeline
  - Real-time updates via IPC events (execution:wave-started, etc.)

#### Tests

**Test Files**:
- `rad-engineer/src/ui-adapter/__tests__/ExecutionAPIHandler.test.ts`
- `apps/frontend/src/renderer/components/execution/__tests__/ExecutionDashboard.test.tsx`

**Test Cases**:
- [ ] ExecutionAPIHandler methods exist
- [ ] IPC channels registered
- [ ] ExecutionDashboard renders with tabs
- [ ] Real-time events update dashboard
- [ ] Error handling works

**Manual Verification**:
- [ ] Start task execution → Dashboard appears
- [ ] Tabs switch correctly
- [ ] Real-time updates work

#### Dependencies

- Wave 7 complete (/plan feature done)

#### Wave Assignment

- **Wave**: 8
- **Agent**: developer-015, developer-016 (pair on infrastructure)
- **Priority**: HIGH (foundation for /execute)

#### Acceptance Criteria

- ✅ ExecutionAPIHandler implemented
- ✅ IPC channels registered
- ✅ ExecutionDashboard renders
- ✅ Real-time updates work
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

### Story 15: Wave Dashboard

**Description**: Implement wave dashboard showing pending/running/completed waves with story status.

**Files to Create**: 2 components

#### Tasks

- **Task 15.1**: Create WaveDashboard component
  - File: `apps/frontend/src/renderer/components/execution/WaveDashboard.tsx`
  - Grid layout for wave cards
  - Columns: Pending, Running, Completed
  - Drag-to-reorder (optional)

- **Task 15.2**: Create WaveCard component
  - File: `apps/frontend/src/renderer/components/execution/WaveCard.tsx`
  - Wave info: ID, stories count, duration
  - Progress bar (stories completed / total)
  - Status badge: pending, running, completed, failed
  - Story list within wave
  - Click story → Show details

- **Task 15.3**: Connect to backend
  - Call execution:get-wave-status on mount
  - Subscribe to execution:wave-started, execution:wave-progress, execution:wave-completed
  - Update cards in real-time

#### Tests

**Test File**: `apps/frontend/src/renderer/components/execution/__tests__/WaveDashboard.test.tsx`

**Test Cases**:
- [ ] WaveDashboard renders with waves
- [ ] Wave cards show correct status
- [ ] Progress bars update correctly
- [ ] Real-time events work
- [ ] Click story shows details

**Manual Verification**:
- [ ] Execution starts → Wave dashboard shows waves
- [ ] See waves move through states (pending → running → completed)
- [ ] Progress updates in real-time

#### Dependencies

- Story 14 complete (infrastructure exists)

#### Wave Assignment

- **Wave**: 8
- **Agent**: developer-017
- **Priority**: HIGH (execution visibility)

#### Acceptance Criteria

- ✅ WaveDashboard complete
- ✅ Real-time updates work
- ✅ Progress tracking accurate
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

## Wave 9: /execute UI - Agents & Quality (Week 4, Days 3-4)

**Duration**: 2 days
**Effort**: 16-20 hours
**Agents**: 2 developers (parallel)
**Dependencies**: Wave 8 complete (dashboard foundation ready)
**Checkpoint**: After completion (execution monitoring complete)

---

### Story 16: Agent Monitor

**Description**: Implement real-time agent monitoring showing CPU, memory, and agent status.

**Files to Create**: 2 components

#### Tasks

- **Task 16.1**: Create AgentMonitor component
  - File: `apps/frontend/src/renderer/components/execution/AgentMonitor.tsx`
  - Grid of agent status cards
  - System resources summary: CPU, memory, active agents
  - Alert if approaching limits (e.g., >60% CPU)

- **Task 16.2**: Create AgentStatusCard component
  - File: `apps/frontend/src/renderer/components/execution/AgentStatusCard.tsx`
  - Agent info: ID, type (developer/test-writer), story assigned
  - Status: idle, researching, implementing, testing, verifying
  - Progress indicator
  - Resource usage: CPU %, memory MB
  - Logs preview (expandable)

- **Task 16.3**: Connect to backend
  - Call execution:get-agent-status on mount
  - Subscribe to execution:agent-started, execution:agent-progress, execution:agent-completed
  - Poll system resources every 2 seconds

#### Tests

**Test File**: `apps/frontend/src/renderer/components/execution/__tests__/AgentMonitor.test.tsx`

**Test Cases**:
- [ ] AgentMonitor renders with agents
- [ ] Agent cards show correct status
- [ ] Resource usage displays correctly
- [ ] Real-time updates work
- [ ] Alerts show when approaching limits

**Manual Verification**:
- [ ] Execution running → Agent monitor shows active agents
- [ ] See CPU/memory usage update
- [ ] Agent status changes (researching → implementing → testing)

#### Dependencies

- Story 14 complete (infrastructure exists)

#### Wave Assignment

- **Wave**: 9
- **Agent**: developer-018
- **Priority**: HIGH (system health visibility)

#### Acceptance Criteria

- ✅ AgentMonitor complete
- ✅ Real-time resource monitoring works
- ✅ Agent status updates correctly
- ✅ Alerts work
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

### Story 17: Quality Gates Panel

**Description**: Implement quality gates panel showing TypeScript/lint/test results in real-time.

**Files to Create**: 2 components

#### Tasks

- **Task 17.1**: Create QualityGatesPanel component
  - File: `apps/frontend/src/renderer/components/execution/QualityGatesPanel.tsx`
  - List of quality gates
  - Run history timeline
  - Retry button for failed gates

- **Task 17.2**: Create QualityGateResult component
  - File: `apps/frontend/src/renderer/components/execution/QualityGateResult.tsx`
  - Gate info: type (typecheck/lint/test), status, duration
  - Status badge: pending, running, passed, failed
  - Output preview (errors, warnings)
  - Expandable full output

- **Task 17.3**: Connect to backend
  - Call execution:get-quality-gates on mount
  - Subscribe to execution:quality-gate-started, execution:quality-gate-result
  - Support retry: execution:retry-quality-gate

#### Tests

**Test File**: `apps/frontend/src/renderer/components/execution/__tests__/QualityGatesPanel.test.tsx`

**Test Cases**:
- [ ] QualityGatesPanel renders with gates
- [ ] Gate results show correct status
- [ ] Output displays correctly
- [ ] Retry button works
- [ ] Real-time updates work

**Manual Verification**:
- [ ] Execution runs quality gates → Panel updates
- [ ] See typecheck, lint, test run sequentially
- [ ] Failed gate shows errors
- [ ] Retry works

#### Dependencies

- Story 14 complete (infrastructure exists)

#### Wave Assignment

- **Wave**: 9
- **Agent**: developer-019
- **Priority**: HIGH (quality visibility)

#### Acceptance Criteria

- ✅ QualityGatesPanel complete
- ✅ Real-time gate results work
- ✅ Output displays correctly
- ✅ Retry functionality works
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

## Wave 10: /execute UI - State & Recovery (Week 4, Day 5)

**Duration**: 1 day
**Effort**: 10-14 hours
**Agents**: 2 developers (parallel)
**Dependencies**: Wave 9 complete (monitoring complete)
**Checkpoint**: After completion (/execute feature 100% complete)

---

### Story 18: State Machine Visualizer

**Description**: Implement state machine visualizer showing execution state transitions.

**Files to Create**: 2 components

#### Tasks

- **Task 18.1**: Create StateMachineVisualizer component
  - File: `apps/frontend/src/renderer/components/execution/StateMachineVisualizer.tsx`
  - State diagram using D3.js or Cytoscape
  - Nodes = states (IDLE, RUNNING, VERIFYING, COMPLETED, FAILED)
  - Edges = transitions
  - Highlight current state

- **Task 18.2**: Create StateNode component
  - File: `apps/frontend/src/renderer/components/execution/StateNode.tsx`
  - Visual representation of state
  - Color-coded (green=completed, yellow=running, red=failed)
  - Transition history tooltip

- **Task 18.3**: Connect to backend
  - Call execution:get-state-machine-status on mount
  - Subscribe to execution:state-changed
  - Animate transitions

#### Tests

**Test File**: `apps/frontend/src/renderer/components/execution/__tests__/StateMachineVisualizer.test.tsx`

**Test Cases**:
- [ ] StateMachineVisualizer renders diagram
- [ ] States display correctly
- [ ] Current state highlighted
- [ ] Transitions animate
- [ ] Real-time updates work

**Manual Verification**:
- [ ] Execution runs → State machine updates
- [ ] See state transitions (IDLE → RUNNING → VERIFYING → COMPLETED)
- [ ] Visual feedback is clear

#### Dependencies

- Story 14 complete (infrastructure exists)

#### Wave Assignment

- **Wave**: 10
- **Agent**: developer-020
- **Priority**: MEDIUM (nice-to-have visualization)

#### Acceptance Criteria

- ✅ StateMachineVisualizer complete
- ✅ State transitions work
- ✅ Animations smooth
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

### Story 19: Error Recovery Panel

**Description**: Implement error recovery interface with retry, change provider, and checkpoint restore functionality.

**Files to Create**: 2 components

#### Tasks

- **Task 19.1**: Create ErrorRecoveryPanel component
  - File: `apps/frontend/src/renderer/components/execution/ErrorRecoveryPanel.tsx`
  - Shows failed stories/waves
  - Recovery options: Retry, Change Provider, Restore Checkpoint
  - Circuit breaker status

- **Task 19.2**: Create ErrorRecoveryAction component
  - File: `apps/frontend/src/renderer/components/execution/ErrorRecoveryAction.tsx`
  - Action buttons with confirmations
  - Provider selector (Anthropic, Ollama, GLM)
  - Checkpoint list (expandable)
  - Execute recovery action

- **Task 19.3**: Connect to backend
  - Call execution:get-error-recovery-status on mount
  - Actions: execution:retry-wave, execution:retry-task, execution:change-provider, execution:restore-checkpoint
  - Subscribe to execution:task-failed, execution:retry-scheduled, execution:circuit-breaker-state-changed

#### Tests

**Test File**: `apps/frontend/src/renderer/components/execution/__tests__/ErrorRecoveryPanel.test.tsx`

**Test Cases**:
- [ ] ErrorRecoveryPanel renders with failed items
- [ ] Retry button works
- [ ] Provider selector works
- [ ] Checkpoint list displays
- [ ] Restore checkpoint works
- [ ] Circuit breaker status shows

**Manual Verification**:
- [ ] Cause a failure (invalid TypeScript) → Recovery panel shows
- [ ] Click Retry → Task retries
- [ ] Change provider → Uses different provider
- [ ] Restore checkpoint → State reverts

#### Dependencies

- Story 14 complete (infrastructure exists)

#### Wave Assignment

- **Wave**: 10
- **Agent**: developer-021
- **Priority**: HIGH (critical for robustness)

#### Acceptance Criteria

- ✅ ErrorRecoveryPanel complete
- ✅ Retry works
- ✅ Provider change works
- ✅ Checkpoint restore works
- ✅ Tests pass
- ✅ TypeScript compiles (0 errors)

---

## Waves 11-16: VAC & Learning UI (Week 5-6)

**Note**: Waves 11-16 follow the same pattern as above. Due to length constraints, these are summarized below. Full details available in original plan (`stateless-petting-eclipse.md`).

---

### Wave 11: VAC UI - Explorer (Week 5, Days 1-2)
- Story 20: Verification Dashboard
- Story 21: Contract Explorer

### Wave 12: VAC UI - Verification & Drift (Week 5, Days 3-4)
- Story 22: Verification Runner
- Story 23: Drift Monitor

### Wave 13: VAC UI - Comparison (Week 5, Day 5)
- Story 24: AST Comparison Viewer

### Wave 14: Learning UI - Dashboard (Week 6, Days 1-2)
- Story 25: Learning Dashboard
- Story 26: Quality Trends & Charts

### Wave 15: Learning UI - Patterns (Week 6, Days 3-4)
- Story 27: Pattern Browser
- Story 28: Decision Timeline

### Wave 16: Learning UI - Methods (Week 6, Day 5)
- Story 29: Method Selector
- Story 30: Export Functionality

---

## Execution Protocol

### Prerequisites

1. **Read contracts**: `docs/platform-foundation/UI-INTEGRATION-CONTRACTS.yaml`
2. **Read memory strategy**: `docs/platform-foundation/UI-INTEGRATION-MEMORY-STRATEGY.md`
3. **Start session**: `mcp__memory-keeper__context_session_start(name="rad-engineer-ui-integration")`
4. **Verify environment**: `bun run typecheck && bun test` (baseline)

### Per-Story Protocol (TDD)

1. **Validate preconditions** (from contract)
2. **Write test FIRST** (expect FAIL)
3. **Run test**: `bun test <test-file>` (expect FAIL)
4. **Implement minimal code**
5. **Run test**: `bun test <test-file>` (expect PASS)
6. **Verify postconditions** (from contract)
7. **Capture evidence**: Save to memory-keeper
8. **Update progress**: Update YAML tracking file

### Per-Wave Protocol

1. **Before wave**:
   - Read wave stories
   - Assign agents (max 2-3)
   - Create checkpoint: `mcp__memory-keeper__context_checkpoint()`

2. **During wave**:
   - Spawn agents in parallel (max 2-3)
   - Monitor context: `/context` (compact at 70%)
   - Save progress: `mcp__memory-keeper__context_save()`

3. **After wave**:
   - Run quality gates: `bun run typecheck && bun run lint && bun test`
   - Verify all stories complete
   - Create checkpoint
   - Clear context: `/clear`
   - Update YAML tracking

### Quality Gates (Per Story)

```bash
cd rad-engineer && \
LOCK="/tmp/rad-engineer-quality-gate.lock" && \
flock -w 300 "$LOCK" sh -c 'bun run typecheck && bun run lint && bun test'
```

### Context Management

**Memory Hierarchy**:
- **GLOBAL** (500 tokens): Vision, architecture, constraints
- **TASK** (2K tokens): Current wave plan, story details
- **LOCAL** (5K tokens): File contents, test outputs (ephemeral)

**Compression Triggers**:
- LOCAL > 5K tokens → Summarize and discard
- TASK > 2K tokens → Compress old stories
- /context shows 70%+ → /compact

**Checkpoints**:
- After Wave 1 (bug fix)
- After Wave 4 (rebrand complete)
- After Wave 7 (/plan complete)
- After Wave 10 (/execute complete)
- After Wave 13 (VAC complete)
- After Wave 16 (Learning complete)

---

## Success Criteria

### Phase 1: Bug Fix (Wave 1)
- ✅ Initialization button works with error feedback
- ✅ Tests pass

### Phase 2: Rebrand (Waves 2-4)
- ✅ All "Auto-Claude" references replaced
- ✅ Theme colors are blue
- ✅ Logo/icons use rad-engineer branding
- ✅ App launches and functions correctly

### Phase 3: Features (Waves 5-16)
- ✅ /plan workflow fully functional
- ✅ /execute dashboard shows real-time execution
- ✅ VAC verification accessible in UI
- ✅ Decision learning insights visible
- ✅ All tests pass
- ✅ 0 TypeScript errors

### Production Ready
- ✅ E2E workflows verified
- ✅ Documentation updated
- ✅ User feedback collected

---

## Files Referenced

- **Original Plan**: `~/.claude/plans/stateless-petting-eclipse.md`
- **Gap Analysis**: `docs/platform-foundation/UI-INTEGRATION-GAP-ANALYSIS.yaml`
- **Contracts**: `docs/platform-foundation/UI-INTEGRATION-CONTRACTS.yaml`
- **Memory Strategy**: `docs/platform-foundation/UI-INTEGRATION-MEMORY-STRATEGY.md`
- **YAML Tracking**: `docs/platform-foundation/RAD-ENGINEER-UI-INTEGRATION-PLAN.yaml`

---

**Plan Version**: 2.0.0 (/execute compatible)
**Status**: READY FOR EXECUTION
**Generated**: 2026-01-13
