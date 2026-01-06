/**
 * Unit Tests: ResponseParser
 * Phase 1 - Core Orchestrator
 *
 * Test coverage:
 * - parse: 4 tests
 * - validateStructure: 4 tests
 * - extractFiles: 1 test
 * - extractTests: 1 test
 * - extractErrors: 1 test
 * - isSuccess: 2 tests
 * Total: 13 unit tests
 */

import { describe, test, expect } from "bun:test";
import {
  ResponseParser,
  ResponseParserError,
  type AgentResponse,
  type ParseResult,
  type ValidationResult,
} from "@/core/ResponseParser";

describe("ResponseParser.parse", () => {
  const parser = new ResponseParser();

  test("Parse valid JSON response successfully", () => {
    const response =
      '{"success":true,"filesModified":["a.ts"],"testsWritten":["a.test.ts"],"summary":"Done","errors":[],"nextSteps":[]}';
    const parsed: ParseResult<AgentResponse> = parser.parse(response);

    expect(parsed.success).toBe(true);
    expect(parsed.error).toBeUndefined();
    expect(parsed.data).toBeDefined();
    expect(parsed.data?.success).toBe(true);
    expect(parsed.data?.filesModified).toEqual(["a.ts"]);
    expect(parsed.data?.testsWritten).toEqual(["a.test.ts"]);
    expect(parsed.data?.summary).toBe("Done");
    expect(parsed.data?.errors).toEqual([]);
    expect(parsed.data?.nextSteps).toEqual([]);
  });

  test("Reject malformed JSON response", () => {
    const response = "This is not JSON";
    const parsed: ParseResult<AgentResponse> = parser.parse(response);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain(ResponseParserError.MALFORMED_JSON);
    expect(parsed.data).toBeUndefined();
  });

  test("Reject response with missing field", () => {
    const response = '{"success":true,"filesModified":[]}';
    const parsed: ParseResult<AgentResponse> = parser.parse(response);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain(ResponseParserError.MISSING_REQUIRED_FIELD);
    expect(parsed.error).toContain("testsWritten");
    expect(parsed.data).toBeUndefined();
  });

  test("Reject response with wrong field type", () => {
    const response =
      '{"success":"true","filesModified":[],"testsWritten":[],"summary":"Done","errors":[],"nextSteps":[]}';
    const parsed: ParseResult<AgentResponse> = parser.parse(response);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.error).toContain(ResponseParserError.TYPE_MISMATCH);
    expect(parsed.error).toContain("boolean");
    expect(parsed.data).toBeUndefined();
  });
});

describe("ResponseParser.validateStructure", () => {
  const parser = new ResponseParser();

  test("Accept response with all 6 fields", () => {
    const response = {
      success: true,
      filesModified: [],
      testsWritten: [],
      summary: "Done",
      errors: [],
      nextSteps: [],
    };
    const validation: ValidationResult = parser.validateStructure(response);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("Reject response missing success field", () => {
    const response = {
      filesModified: [],
      testsWritten: [],
      summary: "Done",
      errors: [],
      nextSteps: [],
    };
    const validation: ValidationResult = parser.validateStructure(response);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      `${ResponseParserError.MISSING_REQUIRED_FIELD}: Missing required field 'success'`
    );
  });

  test("Reject response with summary > 500 chars", () => {
    const summary = "a".repeat(501);
    const response = {
      success: true,
      filesModified: [],
      testsWritten: [],
      summary,
      errors: [],
      nextSteps: [],
    };
    const validation: ValidationResult = parser.validateStructure(response);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes(ResponseParserError.VALUE_TOO_LONG))).toBe(true);
    expect(validation.errors.some((e) => e.includes("501"))).toBe(true);
  });

  test("Check all field types", () => {
    const response = {
      success: true,
      filesModified: [],
      testsWritten: [],
      summary: "Done",
      errors: [],
      nextSteps: [],
    };
    const validation: ValidationResult = parser.validateStructure(response);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    // All type checks pass (success is boolean, fields are arrays, summary is string)
  });

  test("Reject non-object input", () => {
    const validation: ValidationResult = parser.validateStructure(null);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      `${ResponseParserError.NOT_AN_OBJECT}: Response must be an object`
    );
  });

  test("Reject array input", () => {
    const validation: ValidationResult = parser.validateStructure([]);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      `${ResponseParserError.NOT_AN_OBJECT}: Response must be an object`
    );
  });
});

describe("ResponseParser.extractFiles", () => {
  const parser = new ResponseParser();

  test("Extract filesModified from response", () => {
    const response: AgentResponse = {
      success: true,
      filesModified: ["a.ts", "b.ts"],
      testsWritten: [],
      summary: "Done",
      errors: [],
      nextSteps: [],
    };
    const extracted = parser.extractFiles(response);

    expect(extracted).toEqual(["a.ts", "b.ts"]);
    expect(extracted[0]).toBe("a.ts");
    expect(extracted[1]).toBe("b.ts");
  });
});

describe("ResponseParser.extractTests", () => {
  const parser = new ResponseParser();

  test("Extract testsWritten from response", () => {
    const response: AgentResponse = {
      success: true,
      filesModified: [],
      testsWritten: ["a.test.ts", "b.test.ts"],
      summary: "Done",
      errors: [],
      nextSteps: [],
    };
    const extracted = parser.extractTests(response);

    expect(extracted).toEqual(["a.test.ts", "b.test.ts"]);
    expect(extracted[0]).toBe("a.test.ts");
  });
});

describe("ResponseParser.extractErrors", () => {
  const parser = new ResponseParser();

  test("Extract errors from response", () => {
    const response: AgentResponse = {
      success: false,
      filesModified: [],
      testsWritten: [],
      summary: "Failed",
      errors: ["Error 1", "Error 2"],
      nextSteps: [],
    };
    const extracted = parser.extractErrors(response);

    expect(extracted).toEqual(["Error 1", "Error 2"]);
    expect(extracted[0]).toBe("Error 1");
  });
});

describe("ResponseParser.isSuccess", () => {
  const parser = new ResponseParser();

  test("Return true when success field is true", () => {
    const response: AgentResponse = {
      success: true,
      filesModified: [],
      testsWritten: [],
      summary: "Done",
      errors: [],
      nextSteps: [],
    };
    const isSuccess = parser.isSuccess(response);

    expect(isSuccess).toBe(true);
  });

  test("Return false when success field is false", () => {
    const response: AgentResponse = {
      success: false,
      filesModified: [],
      testsWritten: [],
      summary: "Failed",
      errors: ["Error"],
      nextSteps: [],
    };
    const isSuccess = parser.isSuccess(response);

    expect(isSuccess).toBe(false);
  });
});
