# engg-support-system Parallel Development Session

> **Copy this entire file content to start a new Claude Code terminal for ESS development**

---

## Session Context

You are working on **engg-support-system (ESS)**, a deterministic engineering intelligence system that provides:
- **Veracity Engine** (Python): Neo4j graph + deterministic confidence scoring
- **Knowledge Base** (TypeScript): Qdrant vector search + MCP server
- **Gateway** (TypeScript): Unified query agent + conversation manager

**This is a PARALLEL session** - there is another Claude Code terminal working on rad-engineer-v2.

---

## Your Mission

Implement ESS enhancements following the priority order in `IMPLEMENTATION-PLAN.md`, ensuring rad-engineer-v2 integration dependencies are completed FIRST.

**Priority Order (P0 blocks rad-engineer-v2):**
1. P0: Local Development Setup
2. P0: TypeScript AST Parser
3. P0: HTTP Gateway API
4. P1: Health Check Endpoints
5. P1: LLM Request Queue
6. P1: Embedding Model Pinning

---

## First Actions

1. **Read the implementation plan:**
   ```
   Read docs/platform-foundation/engg-support-system/IMPLEMENTATION-PLAN.md
   ```

2. **Check if local setup is complete:**
   ```bash
   docker ps | grep ess
   ```

3. **If not setup, follow the setup guide:**
   ```
   Read docs/platform-foundation/engg-support-system/SETUP-GUIDE.md
   ```

4. **Start with Phase 0 if not done, otherwise continue to next incomplete phase**

---

## Integration Checkpoints

After completing each phase, update the integration status:

**Location**: `docs/platform-foundation/engg-support-system/INTEGRATION-STATUS.md`

```markdown
## Integration Checkpoint: Phase X

- [ ] Tests pass locally
- [ ] rad-engineer-v2 can call the feature
- [ ] VPS deployed (if applicable)
- [ ] Timestamp: YYYY-MM-DD HH:MM

Evidence:
- Test output: [paste]
- Integration test: [paste]
```

---

## Deterministic Execution Rules

1. **Before each task:**
   - Read the task specification
   - Verify preconditions are met
   - Create test file first (TDD)

2. **After each task:**
   - Run tests: `bun test` or `pytest`
   - Run typecheck (if TypeScript): `bun run typecheck`
   - Verify success criteria from plan
   - Update integration status

3. **On completion of each phase:**
   - Create checkpoint in INTEGRATION-STATUS.md
   - Run integration test with rad-engineer-v2 (if applicable)
   - Deploy to VPS and verify

---

## Communication with rad-engineer-v2 Session

**Signal completion** by updating:
- `docs/platform-foundation/engg-support-system/INTEGRATION-STATUS.md`

**Check for dependencies** by reading:
- `docs/platform-foundation/INTEGRATION-DEPENDENCIES.md`

---

## Quality Gates

Every code change must pass:

1. **Unit tests** - `bun test` or `pytest`
2. **Type check** - `bun run typecheck` or `mypy`
3. **Lint** - `bun run lint` or `ruff check`
4. **Integration test** - verify with actual services

---

## VPS Deployment

After local verification, deploy to VPS:

```bash
./scripts/deploy-to-vps.sh
```

Or manually:
```bash
git push vps main
ssh vps-dev "cd /home/devuser/Projects/engg-support-system && git pull && docker-compose restart"
```

---

## Key Files

| File | Purpose |
|------|---------|
| `IMPLEMENTATION-PLAN.md` | Task breakdown and specifications |
| `SETUP-GUIDE.md` | Local environment setup |
| `INTEGRATION-STATUS.md` | Checkpoint tracking |
| `docker-compose.local.yml` | Local Docker services |
| `scripts/verify-local-env.sh` | Environment verification |
| `scripts/deploy-to-vps.sh` | VPS deployment |

---

## Start Command

After reading this, execute:

```
Read docs/platform-foundation/engg-support-system/IMPLEMENTATION-PLAN.md
```

Then continue with the first incomplete phase.

---

**Session Type**: Parallel ESS Development
**Priority**: P0 items first (rad-engineer-v2 dependencies)
**Quality**: Full features, not MVP
