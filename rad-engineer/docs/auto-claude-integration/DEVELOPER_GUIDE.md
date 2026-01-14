# rad-engineer Integration - Developer Guide

> **Contributing and Extending the rad-engineer Auto-Claude Integration**

This guide helps developers understand the architecture, contribute code, add new handlers, and maintain the codebase.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Code Style and Patterns](#code-style-and-patterns)
4. [Adding New Handlers](#adding-new-handlers)
5. [Testing Guidelines](#testing-guidelines)
6. [Performance Optimization](#performance-optimization)
7. [Debugging](#debugging)
8. [Contributing](#contributing)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Auto-Claude Frontend (Electron Renderer)                      │
│  - React + Radix UI                                            │
│  - Zustand state management                                     │
└─────────────────────────┬────────────────────────────────────────┘
                          │ IPC (Electron)
┌─────────────────────────┴────────────────────────────────────────┐
│  ElectronIPCAdapter                                             │
│  - IPC channel registration                                     │
│  - Event routing                                                │
└─────────────────────────┬────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────┴────┐ ┌────────┴────┐ ┌───────┴────────┐
│ Task API     │ │ Roadmap API │ │ Insights API   │
│ Handler      │ │ Handler     │ │ Handler        │
└─────────┬────┘ └────────┬────┘ └───────┬────────┘
          │               │               │
     ┌────┴────┐     ┌────┴────┐     ┌───┴────┐
     │ State   │     │ /plan   │     │ AI SDK │
     │ Manager │     │ skill   │     │        │
     └─────────┘     └─────────┘     └────────┘
```

### Core Components

#### 1. ElectronIPCAdapter

**Responsibility**: Central IPC hub for communication between frontend and backend.

**Key Features**:
- IPC channel registration
- Event routing to handlers
- Multi-window broadcasting support
- Error handling and recovery

**Location**: `src/ui-adapter/ElectronIPCAdapter.ts`

#### 2. API Handlers

Each handler manages a specific domain:

| Handler | Domain | Persistence | Dependencies |
|---------|--------|-------------|--------------|
| TaskAPIHandler | Task CRUD & execution | StateManager | WaveOrchestrator, ResourceManager |
| RoadmapAPIHandler | Roadmap generation | StateManager | IntakeHandler, ExecutionPlanGenerator |
| InsightsAPIHandler | AI chat | StateManager | DecisionLearningIntegration, Anthropic SDK |
| GitHubAPIHandler | GitHub sync | None | TaskAPIHandler, AIMergeIntegration |
| ContextAPIHandler | Decision memory | DecisionLearningStore | DecisionLearningStore |
| WorktreeAPIHandler | Git worktrees | None | execFileNoThrow |
| ChangelogAPIHandler | Changelog gen | None | execFileNoThrow |
| SettingsAPIHandler | Settings | StateManager | None |
| TerminalAPIHandler | Terminal PTY | None | node-pty |

#### 3. StateManager

**Responsibility**: Persistent storage for application state.

**Key Features**:
- Checkpoint-based persistence
- JSON serialization
- Atomic writes
- Version control

**Storage Location**: `<projectDir>/.auto-claude-integration/`

**Checkpoint Format**:
```typescript
interface Checkpoint extends WaveState {
  waveNumber: number;
  completedTasks: string[];
  failedTasks: string[];
  timestamp: string;
  // Domain-specific data
  [key: string]: any;
}
```

#### 4. EventBroadcaster

**Responsibility**: Real-time event streaming with backpressure handling.

**Key Features**:
- Multi-window broadcasting
- Throttling/debouncing (10 events/sec for terminal, 5 for progress)
- Automatic backpressure handling
- Event buffering

**Event Types**:
- `task:progress` - Task progress updates (debounced 200ms)
- `task:status` - Task status changes (immediate)
- `agent:output` - Agent output streaming (throttled 100ms)
- `terminal:output` - Terminal output streaming (throttled 100ms)

#### 5. FormatTranslator

**Responsibility**: Convert between Auto-Claude and rad-engineer formats.

**Key Conversions**:
- `AutoClaudeTaskSpec` → `Wave` (rad-engineer execution format)
- `AutoClaudeTask` ← `WaveResult` (execution results)

### Design Patterns

#### EventEmitter Pattern

All handlers extend `EventEmitter` for loose coupling:

```typescript
class TaskAPIHandler extends EventEmitter {
  async createTask(spec: AutoClaudeTaskSpec): Promise<AutoClaudeTask> {
    // Create task
    const task = { ... };

    // Emit event for listeners (UI, logging, etc.)
    this.emit("task-updated", task);

    return task;
  }
}
```

**Benefits**:
- Decoupled components
- Easy UI updates
- Extensible (add listeners without modifying handler)
- Testable (mock event listeners)

#### Checkpoint Pattern

StateManager uses checkpoint-based persistence:

```typescript
// Load checkpoint
const checkpoint = await stateManager.loadCheckpoint("tasks");

// Modify data
checkpoint.tasks.push(newTask);

// Save atomically
await stateManager.saveCheckpoint("tasks", checkpoint);
```

**Benefits**:
- Atomic writes (no partial state)
- Version control (checkpoint history)
- Recovery (rollback to previous checkpoint)
- Cross-session continuity

#### Caching Layer

Handlers implement caching for performance:

```typescript
class RoadmapAPIHandler {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private invalidateCache(): void {
    this.cache.clear();
  }
}
```

**Benefits**:
- Reduced disk I/O
- Faster responses (60s TTL typical)
- Invalidation on mutation

### Data Flow

#### Task Execution Flow

```
1. User creates task (TaskAPIHandler.createTask)
   ↓
2. Task stored in StateManager checkpoint
   ↓
3. User starts task (TaskAPIHandler.startTask)
   ↓
4. Task converted to Wave (FormatTranslator.toRadEngineerWave)
   ↓
5. Wave executed (WaveOrchestrator.executeWave)
   ↓
6. Progress events emitted (EventBroadcaster.broadcastTaskUpdate)
   ↓
7. Quality gates run (TaskAPIHandler.runQualityGates)
   ↓
8. Final status saved (StateManager.saveCheckpoint)
   ↓
9. Status event broadcast (EventBroadcaster.broadcastTaskStatus)
```

#### Insights Chat Flow

```
1. User sends message (InsightsAPIHandler.sendMessage)
   ↓
2. Gather decision context (DecisionLearningStore.getDecisions)
   ↓
3. Build API messages with context
   ↓
4. Stream from Anthropic API (SDK.messages.create)
   ↓
5. Emit chunks (EventEmitter.emit "message-chunk")
   ↓
6. Save message to session (StateManager.saveCheckpoint)
```

---

## Development Setup

### Prerequisites

- **Node.js 20+**
- **Bun 1.0+** (for testing)
- **Python 3.10+** (for Python plugins)
- **Git**

### Clone and Install

```bash
git clone https://github.com/your-org/rad-engineer-v2.git
cd rad-engineer-v2/rad-engineer
bun install
```

### Environment Variables

Create `.env`:

```bash
# Required for AI features
ANTHROPIC_API_KEY=sk-ant-...

# Optional for GitHub integration
GITHUB_TOKEN=ghp_...

# Optional for testing
TEST_PROJECT_DIR=/tmp/test-project
```

### Verify Setup

```bash
# TypeScript compilation
bun run typecheck  # Should show 0 errors

# Linting
bun run lint       # Should pass

# Tests
bun test           # All tests should pass

# Coverage
bun test --coverage  # Should be 80%+ for new code
```

### IDE Setup

#### VS Code

Recommended extensions:
- **ESLint**: `dbaeumer.vscode-eslint`
- **Prettier**: `esbenp.prettier-vscode`
- **TypeScript**: Built-in

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.validate": ["typescript"]
}
```

#### WebStorm

1. Enable ESLint: `Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint`
2. Enable Prettier: `Preferences → Languages & Frameworks → JavaScript → Prettier`
3. Enable TypeScript: `Preferences → Languages & Frameworks → TypeScript`

---

## Code Style and Patterns

### TypeScript Style

#### Strict Types (No `any`)

```typescript
// ❌ BAD: Using any
function process(data: any): any {
  return data.value;
}

// ✅ GOOD: Proper types
function process(data: { value: string }): string {
  return data.value;
}
```

#### Type Imports

```typescript
// ✅ GOOD: Use type imports for types
import type { AutoClaudeTask, TaskProgressEvent } from "./types.js";

// ✅ GOOD: Regular imports for implementations
import { EventEmitter } from "events";
```

#### Explicit Return Types

```typescript
// ✅ GOOD: Explicit return type
async function loadCheckpoint(): Promise<TaskCheckpoint> {
  // Implementation
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `TaskAPIHandler` |
| Interfaces | PascalCase | `TaskCheckpoint` |
| Functions | camelCase | `loadCheckpoint` |
| Variables | camelCase | `taskIdCounter` |
| Constants | UPPER_SNAKE_CASE | `CACHE_TTL` |
| Private fields | camelCase with `private` | `private cache` |

### File Organization

```typescript
/**
 * File header with purpose
 */

// 1. Type imports
import type { SomeType } from "./types.js";

// 2. Implementation imports
import { SomeClass } from "./SomeClass.js";

// 3. Type definitions
export interface HandlerConfig {
  // ...
}

// 4. Class implementation
export class Handler extends EventEmitter {
  // 4a. Private fields
  private readonly config: HandlerConfig;
  private cache: Map<string, any>;

  // 4b. Constructor
  constructor(config: HandlerConfig) {
    super();
    // ...
  }

  // 4c. Public methods
  async publicMethod(): Promise<void> {
    // ...
  }

  // 4d. Private methods
  private privateMethod(): void {
    // ...
  }
}
```

### Error Handling Pattern

```typescript
async createTask(spec: AutoClaudeTaskSpec): Promise<AutoClaudeTask> {
  try {
    // Main logic
    const task = { ... };
    await this.saveCheckpoint(checkpoint);
    this.emit("task-updated", task);
    return task;
  } catch (error) {
    // Emit structured error event
    this.emit('error', {
      code: 'CREATE_TASK_ERROR',
      message: 'Failed to create task',
      action: 'Check that project directory is writable',
      details: error instanceof Error ? error.message : String(error)
    });
    throw error; // Re-throw for caller
  }
}
```

**Error Event Structure**:
```typescript
interface HandlerErrorEvent {
  code: string;        // Error code for categorization
  message: string;     // User-friendly message
  action: string;      // Actionable guidance
  details: string;     // Technical details
}
```

### Documentation Pattern

```typescript
/**
 * Create a new task
 *
 * Process:
 * 1. Generate unique task ID
 * 2. Create task object with initial state
 * 3. Load checkpoint from StateManager
 * 4. Add task to checkpoint
 * 5. Save checkpoint
 * 6. Emit task-updated event
 *
 * @param spec - Task specification from frontend
 * @returns Created Auto-Claude task
 * @throws Error if task creation fails (after emitting error event)
 *
 * @example
 * ```ts
 * const task = await handler.createTask({
 *   title: "Implement feature X",
 *   description: "Add authentication to API",
 * });
 * ```
 */
async createTask(spec: AutoClaudeTaskSpec): Promise<AutoClaudeTask> {
  // Implementation
}
```

---

## Adding New Handlers

### Step 1: Define Types

Create types in `src/ui-adapter/types.ts` or handler file:

```typescript
// Handler configuration
export interface MyHandlerConfig {
  projectDir: string;
  stateManager: StateManager;
  debug?: boolean;
}

// Domain-specific types
export interface MyData {
  id: string;
  value: string;
  timestamp: string;
}

// Checkpoint format
interface MyCheckpoint extends WaveState {
  data: MyData[];
  metadata: {
    version: string;
    lastUpdated: string;
  };
}
```

### Step 2: Implement Handler

Create `src/ui-adapter/MyHandler.ts`:

```typescript
import { EventEmitter } from "events";
import { StateManager } from "@/advanced/StateManager.js";
import type { WaveState } from "@/advanced/StateManager.js";

export class MyHandler extends EventEmitter {
  private readonly config: MyHandlerConfig;
  private readonly stateManager: StateManager;
  private readonly checkpointName = "my-handler-checkpoint";

  // Caching layer
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_TTL = 60000;

  constructor(config: MyHandlerConfig) {
    super();
    this.config = config;
    this.stateManager = config.stateManager;

    if (this.config.debug) {
      console.log(`[MyHandler] Initialized for project: ${config.projectDir}`);
    }
  }

  // Private: Load checkpoint
  private async loadCheckpoint(): Promise<MyCheckpoint> {
    const state = await this.stateManager.loadCheckpoint(this.checkpointName);

    if (!state) {
      return {
        waveNumber: 0,
        completedTasks: [],
        failedTasks: [],
        timestamp: new Date().toISOString(),
        data: [],
        metadata: {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    return state as unknown as MyCheckpoint;
  }

  // Private: Save checkpoint
  private async saveCheckpoint(checkpoint: MyCheckpoint): Promise<void> {
    checkpoint.metadata.lastUpdated = new Date().toISOString();
    checkpoint.timestamp = new Date().toISOString();

    await this.stateManager.saveCheckpoint(
      this.checkpointName,
      checkpoint as unknown as WaveState
    );

    if (this.config.debug) {
      console.log(`[MyHandler] Saved checkpoint`);
    }
  }

  // Public API
  async getData(): Promise<MyData[]> {
    const checkpoint = await this.loadCheckpoint();
    return checkpoint.data;
  }

  async addData(value: string): Promise<MyData> {
    const checkpoint = await this.loadCheckpoint();

    const data: MyData = {
      id: `data-${Date.now()}`,
      value,
      timestamp: new Date().toISOString(),
    };

    checkpoint.data.push(data);
    await this.saveCheckpoint(checkpoint);

    // Emit event
    this.emit("data-added", data);

    return data;
  }
}
```

### Step 3: Add IPC Channels

Register in `ElectronIPCAdapter`:

```typescript
// In ElectronIPCAdapter.ts
import { MyHandler } from "./MyHandler.js";

// Add to config
interface IPCAdapterConfig {
  // ... existing
  myHandler?: MyHandler;
}

// Register channels
ipcMain.handle("my:get-data", async () => {
  return await this.myHandler.getData();
});

ipcMain.handle("my:add-data", async (_event, value: string) => {
  return await this.myHandler.addData(value);
});

// Listen for events
this.myHandler.on("data-added", (data) => {
  this.eventBroadcaster.broadcast("my:data-added", data);
});
```

### Step 4: Export from Module

Update `src/ui-adapter/index.ts`:

```typescript
export { MyHandler } from "./MyHandler.js";
export type { MyHandlerConfig, MyData } from "./MyHandler.js";
```

### Step 5: Write Tests

Create `test/ui-adapter/MyHandler.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { MyHandler } from "@/ui-adapter/MyHandler.js";
import { StateManager } from "@/advanced/StateManager.js";
import os from "os";
import path from "path";
import fs from "fs/promises";

describe("MyHandler", () => {
  let handler: MyHandler;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-my-handler-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    const stateManager = new StateManager({
      checkpointDir: path.join(testDir, ".checkpoints"),
    });

    handler = new MyHandler({
      projectDir: testDir,
      stateManager,
      debug: false,
    });
  });

  it("should add data", async () => {
    const data = await handler.addData("test-value");

    expect(data.id).toMatch(/^data-\d+$/);
    expect(data.value).toBe("test-value");
    expect(data.timestamp).toBeDefined();
  });

  it("should persist data", async () => {
    await handler.addData("value1");
    await handler.addData("value2");

    const allData = await handler.getData();
    expect(allData).toHaveLength(2);
    expect(allData[0].value).toBe("value1");
    expect(allData[1].value).toBe("value2");
  });

  it("should emit data-added event", async () => {
    let emittedData: any = null;
    handler.on("data-added", (data) => {
      emittedData = data;
    });

    const data = await handler.addData("test");
    expect(emittedData).toEqual(data);
  });
});
```

---

## Testing Guidelines

### Test Organization

```
test/
├── ui-adapter/              # Handler tests
│   ├── TaskAPIHandler.test.ts
│   ├── RoadmapAPI.test.ts
│   └── MyHandler.test.ts
├── integration/             # Integration tests
│   ├── TaskExecution.test.ts
│   └── DecisionLearning.test.ts
└── utils/                   # Utility tests
    └── execFileNoThrow.test.ts
```

### Test Structure

```typescript
describe("ComponentName", () => {
  // Setup
  let component: ComponentName;
  let testDir: string;

  beforeEach(async () => {
    // Create test environment
    testDir = path.join(os.tmpdir(), `test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    component = new ComponentName({ ... });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("method1", () => {
    it("should handle normal case", async () => {
      // Arrange
      const input = "test";

      // Act
      const result = await component.method1(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe("success");
    });

    it("should handle error case", async () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      await expect(component.method1(invalidInput)).rejects.toThrow();
    });
  });
});
```

### Test Coverage Requirements

- **New Code**: 90%+ coverage
- **Handlers**: 85%+ coverage
- **Utilities**: 95%+ coverage

### Running Tests

```bash
# All tests
bun test

# Specific file
bun test test/ui-adapter/TaskAPIHandler.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### Integration Testing

Test handlers with real dependencies:

```typescript
describe("TaskAPIHandler Integration", () => {
  it("should execute task end-to-end", async () => {
    // Setup real dependencies
    const stateManager = new StateManager({ ... });
    const waveOrchestrator = new WaveOrchestrator({ ... });
    const resourceManager = new ResourceManager({ ... });

    const handler = new TaskAPIHandler({
      projectDir: testDir,
      stateManager,
      waveOrchestrator,
      resourceManager,
    });

    // Create and execute task
    const task = await handler.createTask({ ... });
    await handler.startTask(task.id);

    // Wait for completion
    await new Promise((resolve) => {
      handler.on("task-updated", (updatedTask) => {
        if (updatedTask.status === "completed") {
          resolve(updatedTask);
        }
      });
    });

    // Verify outcome
    const finalTask = await handler.getTask(task.id);
    expect(finalTask.status).toBe("completed");
    expect(finalTask.qualityGates?.passed).toBe(true);
  });
});
```

---

## Performance Optimization

### Caching Strategy

#### Memory Cache

```typescript
private cache = new Map<string, { data: unknown; timestamp: number }>();
private readonly CACHE_TTL = 60000; // 1 minute

private getCached<T>(key: string): T | null {
  const entry = this.cache.get(key);
  if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
    return entry.data as T;
  }
  this.cache.delete(key);
  return null;
}
```

**Guidelines**:
- Use for frequently accessed data
- TTL: 60s for read operations, 0 for writes
- Invalidate on mutations

#### Checkpoint Memoization

```typescript
private checkpointCache: MyCheckpoint | null = null;
private checkpointCacheTime = 0;

private async loadCheckpoint(): Promise<MyCheckpoint> {
  if (this.checkpointCache && Date.now() - this.checkpointCacheTime < this.CACHE_TTL) {
    return this.checkpointCache;
  }

  const checkpoint = await this.stateManager.loadCheckpoint(this.checkpointName);
  this.checkpointCache = checkpoint;
  this.checkpointCacheTime = Date.now();
  return checkpoint;
}
```

**Guidelines**:
- Memoize checkpoint loads (expensive I/O)
- Invalidate on save operations

### Backpressure Handling

Use EventBroadcaster for high-frequency events:

```typescript
// ❌ BAD: No throttling
for (const line of output.split("\n")) {
  this.emit("terminal-output", { line });
}

// ✅ GOOD: Use EventBroadcaster
eventBroadcaster.streamTerminalOutput({
  taskId,
  sessionId,
  output: line,
  timestamp: new Date().toISOString(),
});
```

### Batch Operations

```typescript
// ❌ BAD: Multiple checkpoint saves
for (const item of items) {
  await this.addItem(item); // Saves checkpoint each time
}

// ✅ GOOD: Batch operation
async addItems(items: Item[]): Promise<void> {
  const checkpoint = await this.loadCheckpoint();
  checkpoint.items.push(...items);
  await this.saveCheckpoint(checkpoint); // Single save
}
```

---

## Debugging

### Enable Debug Logging

```typescript
const handler = new TaskAPIHandler({
  projectDir: "/path/to/project",
  stateManager,
  waveOrchestrator,
  resourceManager,
  debug: true, // Enable debug logging
});
```

### Inspect Checkpoints

```bash
# View checkpoint data
cat .auto-claude-integration/auto-claude-tasks.json | jq .

# List all checkpoints
ls -lh .auto-claude-integration/
```

### Event Debugging

```typescript
// Log all events
handler.on("task-updated", (task) => {
  console.log("[DEBUG] Task updated:", task);
});

handler.on("error", (error) => {
  console.error("[DEBUG] Error:", error);
});
```

### Profiling

```typescript
// Measure execution time
const start = Date.now();
await handler.someOperation();
const duration = Date.now() - start;
console.log(`Operation took ${duration}ms`);
```

---

## Contributing

### Pull Request Process

1. **Fork and Branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Implement Changes**
   - Follow code style
   - Add tests (90%+ coverage)
   - Update documentation

3. **Verify Quality Gates**
   ```bash
   bun run typecheck  # 0 errors
   bun run lint       # Pass
   bun test           # All pass
   bun test --coverage # 90%+ new code
   ```

4. **Commit**
   ```bash
   git commit -m "feat: Add MyHandler for X functionality"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/my-new-feature
   # Create PR on GitHub
   ```

### Commit Message Format

Follow Conventional Commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic change)
- `refactor`: Code refactoring
- `test`: Add/update tests
- `chore`: Maintenance

**Examples**:
```
feat(ui-adapter): Add WorktreeAPIHandler for git worktree management

Implements WorktreeAPIHandler with list, create, and delete operations.
Uses execFileNoThrow for safe git command execution.

Closes #123
```

### Code Review Checklist

- [ ] Code follows style guide
- [ ] Tests added/updated (90%+ coverage)
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] All tests pass
- [ ] Commit messages follow convention
- [ ] PR description is clear

---

## Next Steps

- **API Reference**: Detailed API documentation
- **Examples**: Browse example implementations
- **Architecture Diagrams**: Visual architecture docs

---

**Version**: 1.0.0
**Last Updated**: 2026-01-11
