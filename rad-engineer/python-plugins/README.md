# Python Plugins for rad-engineer-v2

This directory contains Python plugins ported from Auto-Claude for use with rad-engineer-v2.

## Overview

The rad-engineer-v2 integration uses Python plugins to provide enhanced capabilities that complement the TypeScript core. These plugins communicate via JSON over stdin/stdout using the `PythonPluginBridge`.

### Available Plugins

1. **QA Loop** (`qa_loop.py`) - Quality assurance validation
2. **Spec Generator** (`spec_generator.py`) - Dynamic specification generation
3. **AI Merge** (`ai_merge.py`) - AI-powered conflict resolution

---

## Quick Start

### 1. Setup

Run the setup script to install dependencies:

```bash
cd python-plugins
./setup-plugins.sh
```

This will:
- Check Python 3.9+ is installed
- Create a virtual environment
- Install dependencies from `requirements.txt`
- Verify plugin files
- Test plugin execution

### 2. Manual Setup (if needed)

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

---

## Plugin Documentation

### QA Loop (`qa_loop.py`)

**Purpose**: Execute quality gates and detect recurring issues after task completion.

**Input** (JSON via stdin):
```json
{
  "project_dir": "/path/to/project",
  "task_id": "task-123"
}
```

**Output** (JSON via stdout):
```json
{
  "success": true,
  "data": {
    "gates": [
      {
        "type": "typecheck",
        "passed": true,
        "output": "No errors found",
        "duration": 1234,
        "severity": "required"
      }
    ],
    "recurring_issues": [
      {
        "key": "missing-return-type",
        "message": "Function missing return type",
        "count": 3,
        "should_escalate": false
      }
    ]
  },
  "error": null
}
```

**Quality Gates**:
- **TypeCheck** (required): `pnpm typecheck` must pass
- **Lint** (warning): `pnpm lint` should pass
- **Test** (required): `bun test` must pass
- **Code Quality** (warning): Detect TODOs, console.log, any types

**Recurring Issue Detection**:
- Threshold: 3 occurrences
- Similarity: 80% (fuzzy matching)
- Escalation: Manual intervention after 3+ occurrences

**TypeScript Integration**:
```typescript
import { QAPluginIntegration } from '@/python-bridge';

const qa = new QAPluginIntegration({
  pythonPath: 'python3',
  pluginPath: './python-plugins/qa_loop.py',
  timeout: 180000,  // 3 minutes
});

const result = await qa.runQALoop('/path/to/project', 'task-123');
console.log(result.data.gates);
```

---

### Spec Generator (`spec_generator.py`)

**Purpose**: Generate execution specifications using dynamic complexity-based pipelines.

**Input** (JSON via stdin):
```json
{
  "task_description": "Add user authentication with OAuth2 support",
  "complexity": "complex",
  "project_dir": "/path/to/project"
}
```

**Output** (JSON via stdout):
```json
{
  "success": true,
  "data": {
    "complexity": "complex",
    "phases_completed": 8,
    "spec": {
      "title": "User Authentication with OAuth2",
      "requirements": [...],
      "architecture": {...},
      "implementation_plan": [...]
    },
    "duration_seconds": 490.5
  },
  "error": null
}
```

**Complexity Levels**:
- **SIMPLE**: 3 phases (~90s) - Discovery → Quick Spec → Validate
- **STANDARD**: 6 phases (~330s) - Discovery → Requirements → Context → Spec → Plan → Validate
- **COMPLEX**: 8 phases (~490s) - Discovery → Requirements → Research → Context → Spec → Plan → Self-Critique → Validate

**Complexity Assessment** (Automatic):
```python
# Simple indicators: "fix", "update", "simple", "quick"
# Complex indicators: "implement", "research", "architecture", "integration"
# Task length: < 50 chars = likely simple, > 200 chars = likely complex
# File count: < 3 files = simple, > 10 files = complex
```

**TypeScript Integration**:
```typescript
import { SpecGenPluginIntegration } from '@/python-bridge';

const specGen = new SpecGenPluginIntegration({
  pythonPath: 'python3',
  pluginPath: './python-plugins/spec_generator.py',
  timeout: 600000,  // 10 minutes
});

// Auto-detect complexity
const result = await specGen.generateSpec('Add OAuth2 authentication');

// Or specify complexity
const result = await specGen.generateSpec('Fix button color', { complexity: 'simple' });
```

---

### AI Merge (`ai_merge.py`)

**Purpose**: Resolve git merge conflicts using AI (Claude or GPT-4).

**Input** (JSON via stdin):
```json
{
  "file_path": "src/utils/helper.ts",
  "conflict": {
    "current": {
      "content": "const x = 1;",
      "start_line": 10,
      "end_line": 12
    },
    "incoming": {
      "content": "const x = 2;",
      "start_line": 10,
      "end_line": 12
    },
    "severity": "major"
  },
  "provider": "anthropic",  // or "openai"
  "api_key": "your-api-key",
  "model": "claude-sonnet-4-5-20250929"  // optional
}
```

**Output** (JSON via stdout):
```json
{
  "success": true,
  "data": {
    "decision": "ai_merged",
    "merged_code": "const x = 2;",
    "explanation": "Incoming change updates the value...",
    "confidence": 0.95,
    "tokens_used": {
      "input": 123,
      "output": 45
    }
  },
  "error": null
}
```

**Merge Decisions**:
- `ai_merged`: AI successfully merged the conflict
- `needs_human_review`: Conflict too complex for AI
- `failed`: AI merge attempt failed

**Conflict Severities** (31 ChangeTypes):
- `trivial`: Whitespace, formatting
- `minor`: Comments, simple variable changes
- `moderate`: Logic changes, new functions
- `major`: API changes, architecture modifications
- `critical`: Breaking changes, security impacts

**Multi-Provider Support**:
- **Anthropic**: Claude Opus 4.5, Sonnet 4.5, Haiku 4.5
- **OpenAI**: GPT-4, GPT-4 Turbo

**TypeScript Integration**:
```typescript
import { AIMergePluginIntegration, detectMergeConflicts } from '@/python-bridge';

// Detect conflicts in repository
const conflicts = await detectMergeConflicts('/path/to/repo');

// Resolve conflicts
const aiMerge = new AIMergePluginIntegration({
  pythonPath: 'python3',
  pluginPath: './python-plugins/ai_merge.py',
  timeout: 120000,  // 2 minutes per conflict
});

for (const conflict of conflicts) {
  const result = await aiMerge.resolveConflict(conflict, {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  if (result.output.data.decision === 'ai_merged') {
    // Apply merged code
    console.log('Merged:', result.output.data.merged_code);
  }
}
```

---

## Architecture

### Communication Protocol

All plugins use JSON-based stdin/stdout communication:

1. **TypeScript** → Spawn Python subprocess
2. **TypeScript** → Send JSON input via stdin
3. **Python** → Process input
4. **Python** → Send JSON output via stdout
5. **TypeScript** → Parse JSON output

### Error Handling

Plugins use a standard error format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PLUGIN_ERROR",
    "message": "Error description",
    "details": "Stack trace or additional info"
  }
}
```

### PythonPluginBridge

The TypeScript bridge (`src/python-bridge/PythonPluginBridge.ts`) provides:

- Subprocess management
- Timeout handling (configurable per plugin)
- Retry logic with exponential backoff
- Process health monitoring
- Graceful shutdown

---

## Platform Compatibility

### Tested Platforms
- ✅ macOS (primary development platform)
- ⚠️ Linux (requires testing)
- ⚠️ Windows (requires testing)

### Platform-Specific Notes

**macOS**:
- Python 3.9+ via Homebrew: `brew install python@3.9`
- Virtual environment: `python3 -m venv .venv`

**Linux**:
- Install Python 3.9+: `sudo apt install python3.9 python3.9-venv`
- May require `python3-pip`: `sudo apt install python3-pip`

**Windows**:
- Install Python 3.9+ from python.org
- Virtual environment: `python -m venv .venv`
- Activation: `.venv\Scripts\activate`

---

## Troubleshooting

### "python3: command not found"
- **macOS/Linux**: Install Python 3.9+ via Homebrew or apt
- **Windows**: Install from python.org, add to PATH

### "ModuleNotFoundError: anthropic"
- Run `pip install -r requirements.txt` in virtual environment
- Verify virtual environment is activated: `which python3` should point to `.venv/bin/python3`

### "Plugin execution timeout"
- Increase timeout in TypeScript integration (default: 30s)
- Check plugin is not hanging on input (test with direct invocation)

### "API key not found"
- AI Merge requires `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- Set in environment: `export ANTHROPIC_API_KEY=your-key`
- Or pass via plugin input

### "Permission denied: qa_loop.py"
- Make plugins executable: `chmod +x python-plugins/*.py`
- Verify shebang: `#!/usr/bin/env python3`

---

## Development

### Adding a New Plugin

1. Create `my_plugin.py` in `python-plugins/`
2. Add shebang: `#!/usr/bin/env python3`
3. Implement JSON stdin/stdout protocol
4. Add dependencies to `requirements.txt`
5. Create TypeScript wrapper in `src/python-bridge/MyPluginIntegration.ts`
6. Write tests in `test/python-bridge/MyPlugin.test.ts`
7. Document in this README

### Testing Plugins Directly

```bash
# Activate virtual environment
source .venv/bin/activate

# Test QA Loop
echo '{"project_dir": "/path/to/project", "task_id": "test"}' | python3 qa_loop.py

# Test Spec Generator
echo '{"task_description": "Add login", "complexity": "simple"}' | python3 spec_generator.py

# Test AI Merge (requires API key)
echo '{"file_path": "test.ts", "conflict": {...}, "provider": "anthropic", "api_key": "key"}' | python3 ai_merge.py
```

---

## License

AGPL-3.0 (inherited from Auto-Claude)

See `docs/auto-claude-integration/evidence/AGPL-3.0-COMPLIANCE-PLAN.md` for compliance details.

---

## References

- **Evidence Documentation**: `docs/auto-claude-integration/evidence/*-results.md`
- **PythonPluginBridge**: `src/python-bridge/PythonPluginBridge.ts`
- **Integration Tests**: `test/python-bridge/*.test.ts`
- **Auto-Claude Source**: `workspaces/rad-engineer-ui/apps/backend/`

---

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2026-01-11
