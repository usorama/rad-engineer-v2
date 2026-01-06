# Research Evidence: ResponseParser

**Date**: 2026-01-05
**Component**: ResponseParser (Phase 1)
**Status**: Research Complete

---

## Evidence Summary

ResponseParser extracts and validates structured data from agent responses. Research identified three key areas:

1. **Expected Response Format**: Structured JSON with 6 fields (success, filesModified, testsWritten, summary, errors, nextSteps)
2. **Parsing Strategy**: JSON.parse with error handling for malformed responses
3. **Validation Requirements**: Field presence checking and type validation

---

## Verified Claims Table

| Claim ID | Capability | Status | Evidence Source | Verified By |
|----------|-----------|--------|-----------------|-------------|
| CLAIM-001 | Response format: 6 required fields | ✅ VERIFIED | `/Users/umasankr/.claude/CLAUDE.md:85-93` | Codebase analysis |
| CLAIM-002 | success field: boolean | ✅ VERIFIED | `/Users/umasankr/.claude/CLAUDE.md:87` | Codebase analysis |
| CLAIM-003 | filesModified: string array | ✅ VERIFIED | `/Users/umasankr/.claude/CLAUDE.md:88` | Codebase analysis |
| CLAIM-004 | testsWritten: string array | ✅ VERIFIED | `/Users/umasankr/.claude/CLAUDE.md:89` | Codebase analysis |
| CLAIM-005 | summary: string, max 500 chars | ✅ VERIFIED | `/Users/umasankr/.claude/CLAUDE.md:90,96` | Codebase analysis |
| CLAIM-006 | errors: string array | ✅ VERIFIED | `/Users/umasankr/.claude/CLAUDE.md:91` | Codebase analysis |
| CLAIM-007 | nextSteps: string array | ✅ VERIFIED | `/Users/umasankr/.claude/CLAUDE.md:92` | Codebase analysis |
| CLAIM-008 | JSON parsing via JSON.parse() | ✅ VERIFIED | Node.js built-in | Primary source |

---

## Detailed Claims

### CLAIM-001: Response Format - 6 Required Fields

**Evidence**:
- Source: `/Users/umasankr/.claude/CLAUDE.md:85-93`
- Quote:
```json
{
  "success": true,
  "filesModified": ["src/hooks/useQuiz.ts"],
  "testsWritten": ["src/hooks/__tests__/useQuiz.test.ts"],
  "summary": "Implemented quiz state management with timer support",
  "errors": [],
  "nextSteps": ["Add edge case tests"]
}
```
- Verification: Direct quote from CLAUDE.md

**Required For**: `validateStructure()` method

---

### CLAIM-002: success Field - Boolean

**Evidence**:
- Source: `/Users/umasankr/.claude/CLAUDE.md:87`
- Quote: `"success": true`
- Verification: Documented as boolean

**Required For**: `validateStructure()` method

---

### CLAIM-003: filesModified Field - String Array

**Evidence**:
- Source: `/Users/umasankr/.claude/CLAUDE.md:88`
- Quote: `"filesModified": ["src/hooks/useQuiz.ts"]`
- Verification: Documented as string array

**Required For**: `validateStructure()` method

---

### CLAIM-004: testsWritten Field - String Array

**Evidence**:
- Source: `/Users/umasankr/.claude/CLAUDE.md:89`
- Quote: `"testsWritten": ["src/hooks/__tests__/useQuiz.test.ts"]`
- Verification: Documented as string array

**Required For**: `validateStructure()` method

---

### CLAIM-005: summary Field - String, Max 500 Chars

**Evidence**:
- Source: `/Users/umasankr/.claude/CLAUDE.md:90,96`
- Quote: `"summary": "Implemented quiz state management with timer support"`
- Quote: `**Max summary length: 500 chars.**`
- Verification: Documented with max length

**Required For**: `validateStructure()` method

---

### CLAIM-006: errors Field - String Array

**Evidence**:
- Source: `/Users/umasankr/.claude/CLAUDE.md:91`
- Quote: `"errors": []`
- Verification: Documented as string array

**Required For**: `validateStructure()` method

---

### CLAIM-007: nextSteps Field - String Array

**Evidence**:
- Source: `/Users/umasankr/.claude/CLAUDE.md:92`
- Quote: `"nextSteps": ["Add edge case tests"]`
- Verification: Documented as string array

**Required For**: `validateStructure()` method

---

### CLAIM-008: JSON Parsing via JSON.parse()

**Evidence**:
- Source: Node.js built-in `JSON.parse()`
- Verification: Standard Node.js API

**Required For**: `parseResponse()` method

---

## Code Evidence

### Example 1: Valid Agent Response

```json
{
  "success": true,
  "filesModified": ["src/services/UserService.ts"],
  "testsWritten": ["src/services/__tests__/UserService.test.ts"],
  "summary": "Implemented UserService with CRUD operations",
  "errors": [],
  "nextSteps": ["Add input validation", "Add integration tests"]
}
```

### Example 2: Valid Response (Failure Case)

```json
{
  "success": false,
  "filesModified": [],
  "testsWritten": [],
  "summary": "Failed to implement UserService",
  "errors": ["Type error: User type not defined", "Test failed: cannot find UserService"],
  "nextSteps": ["Define User type", "Fix test import"]
}
```

### Example 3: Invalid Response (Missing Fields)

```json
{
  "success": true,
  "filesModified": ["src/service.ts"]
  // Missing: testsWritten, summary, errors, nextSteps
}
```

### Example 4: Malformed Response (Not JSON)

```text
The agent returned prose instead of JSON:
"I implemented the service successfully. The tests are passing."
```

---

## Parsing Strategy

### JSON Parsing with Error Handling

```typescript
interface AgentResponse {
  success: boolean;
  filesModified: string[];
  testsWritten: string[];
  summary: string;
  errors: string[];
  nextSteps: string[];
}

function parseResponse(rawResponse: string): ParseResult<AgentResponse> {
  try {
    // Attempt to parse JSON
    const parsed = JSON.parse(rawResponse) as unknown;

    // Validate structure
    const validation = validateResponseStructure(parsed);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid response structure: ${validation.errors.join(', ')}`
      };
    }

    return {
      success: true,
      data: parsed as AgentResponse
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: `Malformed JSON: ${error.message}`
      };
    }
    return {
      success: false,
      error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
```

---

## Validation Strategy

### Field Presence Checking

```typescript
function validateResponseStructure(data: unknown): ValidationResult {
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: ['Response is not an object']
    };
  }

  const response = data as Record<string, unknown>;
  const errors: string[] = [];

  // Check required fields
  const requiredFields: (keyof AgentResponse)[] = [
    'success',
    'filesModified',
    'testsWritten',
    'summary',
    'errors',
    'nextSteps'
  ];

  for (const field of requiredFields) {
    if (!(field in response)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check field types
  if (typeof response.success !== 'boolean') {
    errors.push('success must be boolean');
  }

  if (!Array.isArray(response.filesModified)) {
    errors.push('filesModified must be an array');
  }

  if (!Array.isArray(response.testsWritten)) {
    errors.push('testsWritten must be an array');
  }

  if (typeof response.summary !== 'string') {
    errors.push('summary must be a string');
  } else if (response.summary.length > 500) {
    errors.push('summary must be <= 500 characters');
  }

  if (!Array.isArray(response.errors)) {
    errors.push('errors must be an array');
  }

  if (!Array.isArray(response.nextSteps)) {
    errors.push('nextSteps must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Error Handling

### Malformed JSON Response

**Error**: `SyntaxError: Unexpected token I in JSON at position 0`

**Recovery**:
1. Detect prose response (no JSON structure detected)
2. Return parse error with guidance
3. Log warning for debugging

### Missing Required Fields

**Error**: `Missing required field: summary`

**Recovery**:
1. Return validation error with list of missing fields
2. Guide agent to return complete structure

### Type Mismatch

**Error**: `success must be boolean`

**Recovery**:
1. Return validation error with type requirement
2. Guide agent to return correct type

---

## Integration Points

### With SDKIntegration

**Location**: `/Users/umasankr/Projects/rad-engineer-v2/rad-engineer/src/sdk/SDKIntegration.ts`

**Integration Pattern**:

```typescript
class SDKIntegration {
  constructor(private responseParser: ResponseParser) {}

  async executeAgent(task: AgentTask): Promise<AgentResult> {
    // Spawn agent and get response
    const rawResponse = await this.agent.execute(task);

    // Parse response
    const parseResult = this.responseParser.parse(rawResponse);
    if (!parseResult.success) {
      throw new ResponseParseError(parseResult.error);
    }

    return parseResult.data;
  }
}
```

### With PromptValidator

**Integration**:
- PromptValidator validates input prompts
- ResponseParser validates output responses
- Both enforce structured JSON format

---

## References

### Primary Sources

1. **Global CLAUDE.md**
   - Path: `/Users/umasankr/.claude/CLAUDE.md`
   - Section: "STRUCTURED JSON OUTPUTS (MANDATORY)"
   - Lines: 81-96
   - Last Updated: Documented in CLAUDE.md v3.0

2. **Node.js JSON API**
   - URL: https://nodejs.org/api/json.html
   - Method: `JSON.parse()`
   - Status: Built-in Node.js API

### Related Sources

3. **Project CLAUDE.md**
   - Path: `/Users/umasankr/Projects/rad-engineer-v2/CLAUDE.md`
   - Sections: Integration patterns

4. **SDKIntegration.ts**
   - Path: `/Users/umasankr/Projects/rad-engineer-v2/rad-engineer/src/sdk/SDKIntegration.ts`
   - Pattern: Agent execution and response handling

5. **Integration Plan**
   - Path: `/Users/umasankr/Projects/rad-engineer-v2/.claude/orchestration/docs/planning/SMART_ORCHESTRATOR_EXECUTE_INTEGRATION_PLAN.md`
   - Section: ResponseParser component requirements

---

## Next Steps

### Immediate Actions

1. ✅ **Research Complete** - All claims documented from verified sources
2. ⏳ **Create Component Spec** - Generate YAML spec for ResponseParser
3. ⏳ **Create Test Spec** - Generate test specification
4. ⏳ **Validate Specs** - Ensure evidence alignment
5. ⏳ **Implement** - Build ResponseParser with TDD

### Open Questions

- **Q1**: Should we handle mixed JSON + prose responses?
  - **A**: Initial implementation rejects non-JSON responses (strict mode)

- **Q2**: Should we allow optional fields?
  - **A**: No - all 6 fields are required per CLAUDE.md spec

- **Q3**: Summary length enforcement?
  - **A**: Yes - validate summary <= 500 chars as per CLAUDE.md

### Research Gaps

- None - all required claims verified

---

## Appendix: Response Validation Decision Tree

```
┌─────────────────────────────────────────┐
│      Receive Agent Response             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  JSON Parse         │
        │  (JSON.parse)       │
        └─────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
      SUCCESS           SYNTAX ERROR
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Field Check     │  │ RETURN: Invalid │
│ (6 required)    │  │ "Malformed JSON" │
└─────────┬───────┘  └─────────────────┘
          │
  ┌───────┴───────┐
  │               │
 ALL PRESENT     MISSING FIELDS
  │               │
  ▼               ▼
┌─────────────────┐ ┌─────────────────┐
│ Type Check      │ │ RETURN: Invalid │
│ (bool, array)   │ │ "Missing fields" │
└─────────┬───────┘ └─────────────────┘
          │
  ┌───────┴───────┐
  │               │
 ALL VALID       TYPE MISMATCH
  │               │
  ▼               ▼
┌─────────────────┐ ┌─────────────────┐
│ Value Check     │ │ RETURN: Invalid │
│ (summary length)│ │ "Type mismatch"  │
└─────────┬───────┘ └─────────────────┘
          │
  ┌───────┴───────┐
  │               │
 ALL VALID       INVALID VALUE
  │               │
  ▼               ▼
┌─────────────────┐ ┌─────────────────┐
│ RETURN: Valid   │ │ RETURN: Invalid │
└─────────────────┘ │ "Invalid value"  │
                    └─────────────────┘
```

---

**Document Status**: ✅ Complete
**Claims Verified**: 8
**Evidence Sources**: 5
**Code Examples**: 4
**Next Phase**: Component specification generation
