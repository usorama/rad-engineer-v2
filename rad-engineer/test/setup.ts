/**
 * Test setup for Bun test runner
 * Configures test environment and shared fixtures
 */

import { beforeAll, afterAll } from "bun:test";

// Set test environment variables
process.env.NODE_ENV = "test";

// Mock API key for testing (replace with real key for integration tests)
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "sk-test-key";

// Configure test timeouts
// Note: bun test doesn't have setTimeout, configure via CLI or test file

// Global test hooks
beforeAll(() => {
  console.log("Starting SDK Integration tests...");
});

afterAll(() => {
  console.log("Test suite complete");
});
