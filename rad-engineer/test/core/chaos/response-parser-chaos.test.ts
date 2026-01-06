/**
 * Chaos Tests: ResponseParser
 * Phase 1 - Core Orchestrator
 *
 * Test edge cases and malformed inputs
 *
 * Test coverage:
 * - Extreme inputs: 4 tests
 * Total: 4 chaos tests
 */

import { describe, test, expect } from "bun:test";
import { ResponseParser, ResponseParserError } from "@/core/ResponseParser";

describe("ResponseParser Chaos Tests", () => {
  const parser = new ResponseParser();

  test("Handle extremely long response", () => {
    const longSummary = "a".repeat(10000);
    const response = JSON.stringify({
      success: true,
      filesModified: [],
      testsWritten: [],
      summary: longSummary,
      errors: [],
      nextSteps: [],
    });

    const parsed = parser.parse(response);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain(ResponseParserError.VALUE_TOO_LONG);
    expect(parsed.error).toContain("10000");
  });

  test("Handle response with null bytes", () => {
    // JSON with null byte causes malformed JSON
    const response = '{"success":tru\x00e}';
    const parsed = parser.parse(response);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain(ResponseParserError.MALFORMED_JSON);
  });

  test("Handle response with unicode", () => {
    const response = JSON.stringify({
      success: true,
      filesModified: [],
      testsWritten: [],
      summary: "测试测试",
      errors: [],
      nextSteps: [],
    });

    const parsed = parser.parse(response);

    expect(parsed.success).toBe(true);
    expect(parsed.data?.summary).toBe("测试测试");
  });

  test("Handle empty object", () => {
    const response = "{}";
    const parsed = parser.parse(response);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    // Should detect all 6 missing fields
    expect(parsed.error).toContain(ResponseParserError.MISSING_REQUIRED_FIELD);
  });

  test("Handle response with extra fields", () => {
    const response = JSON.stringify({
      success: true,
      filesModified: [],
      testsWritten: [],
      summary: "Done",
      errors: [],
      nextSteps: [],
      extraField: "should be ignored", // Extra field should be allowed
    });

    const parsed = parser.parse(response);

    expect(parsed.success).toBe(true);
    expect(parsed.data).toBeDefined();
  });

  test("Handle response with arrays containing non-strings", () => {
    const response = JSON.stringify({
      success: true,
      filesModified: [123, 456], // Should be strings
      testsWritten: [],
      summary: "Done",
      errors: [],
      nextSteps: [],
    });

    const parsed = parser.parse(response);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain(ResponseParserError.TYPE_MISMATCH);
    expect(parsed.error).toContain("filesModified");
  });

  test("Handle response with null fields", () => {
    const response = JSON.stringify({
      success: null, // Should be boolean
      filesModified: null, // Should be array
      testsWritten: null,
      summary: null,
      errors: null,
      nextSteps: null,
    });

    const parsed = parser.parse(response);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain(ResponseParserError.TYPE_MISMATCH);
  });
});
