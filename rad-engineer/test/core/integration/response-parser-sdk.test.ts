/**
 * Integration Tests: ResponseParser with SDKIntegration
 * Phase 1 - Core Orchestrator
 *
 * Test coverage:
 * - SDKIntegration + ResponseParser: 2 tests
 * Total: 2 integration tests
 */

import { describe, test, expect } from "bun:test";
import { ResponseParser, ResponseParserError } from "@/core/ResponseParser";

describe("ResponseParser SDK Integration", () => {
  const parser = new ResponseParser();

  test("SDKIntegration parses agent response", () => {
    // Simulate agent response from SDK
    const agentResponse =
      '{"success":true,"filesModified":["src/service.ts"],"testsWritten":["src/service.test.ts"],"summary":"Implemented service","errors":[],"nextSteps":["Add edge case tests"]}';

    // Parse via ResponseParser (as SDK would do)
    const parsed = parser.parse(agentResponse);

    expect(parsed.success).toBe(true);
    expect(parsed.data).toBeDefined();
    expect(parsed.data?.filesModified).toContain("src/service.ts");
    expect(parsed.data?.testsWritten).toContain("src/service.test.ts");
    expect(parsed.data?.summary).toBe("Implemented service");
  });

  test("SDKIntegration handles parse failure", () => {
    // Simulate malformed agent response
    const malformedResponse = "This is not valid JSON at all";

    // Parse should fail
    const parsed = parser.parse(malformedResponse);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain(ResponseParserError.MALFORMED_JSON);
    expect(parsed.data).toBeUndefined();
  });
});
