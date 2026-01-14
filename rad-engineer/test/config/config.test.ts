/**
 * Configuration Schema Tests
 *
 * Tests for Zod-based configuration validation with environment variable support
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig, type Config } from "../../src/config/schema";

describe("Configuration Schema", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear all config-related env vars
    delete process.env.RAD_USE_REAL_AGENTS;
    delete process.env.RAD_API_KEY;
    delete process.env.RAD_MAX_AGENTS;
    delete process.env.RAD_TIMEOUT;
    delete process.env.RAD_LOG_LEVEL;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("loadConfig - defaults", () => {
    it("should load default configuration when no env vars set", () => {
      const config = loadConfig();

      expect(config.useRealAgents).toBe(false);
      expect(config.apiKey).toBeUndefined();
      expect(config.maxAgents).toBe(3);
      expect(config.timeout).toBe(300000);
      expect(config.logLevel).toBe("info");
    });
  });

  describe("loadConfig - environment variables", () => {
    it("should load useRealAgents from RAD_USE_REAL_AGENTS", () => {
      process.env.RAD_USE_REAL_AGENTS = "true";
      const config = loadConfig();

      expect(config.useRealAgents).toBe(true);
    });

    it("should load apiKey from RAD_API_KEY", () => {
      process.env.RAD_API_KEY = "sk-test-key-123";
      const config = loadConfig();

      expect(config.apiKey).toBe("sk-test-key-123");
    });

    it("should load maxAgents from RAD_MAX_AGENTS", () => {
      process.env.RAD_MAX_AGENTS = "5";
      const config = loadConfig();

      expect(config.maxAgents).toBe(5);
    });

    it("should load timeout from RAD_TIMEOUT", () => {
      process.env.RAD_TIMEOUT = "60000";
      const config = loadConfig();

      expect(config.timeout).toBe(60000);
    });

    it("should load logLevel from RAD_LOG_LEVEL", () => {
      process.env.RAD_LOG_LEVEL = "debug";
      const config = loadConfig();

      expect(config.logLevel).toBe("debug");
    });

    it("should load all config from environment variables", () => {
      process.env.RAD_USE_REAL_AGENTS = "true";
      process.env.RAD_API_KEY = "sk-test-key-456";
      process.env.RAD_MAX_AGENTS = "10";
      process.env.RAD_TIMEOUT = "120000";
      process.env.RAD_LOG_LEVEL = "error";

      const config = loadConfig();

      expect(config.useRealAgents).toBe(true);
      expect(config.apiKey).toBe("sk-test-key-456");
      expect(config.maxAgents).toBe(10);
      expect(config.timeout).toBe(120000);
      expect(config.logLevel).toBe("error");
    });
  });

  describe("loadConfig - validation", () => {
    it("should accept valid maxAgents values (1-10)", () => {
      process.env.RAD_MAX_AGENTS = "1";
      expect(() => loadConfig()).not.toThrow();

      process.env.RAD_MAX_AGENTS = "10";
      expect(() => loadConfig()).not.toThrow();
    });

    it("should reject maxAgents less than 1", () => {
      process.env.RAD_MAX_AGENTS = "0";
      expect(() => loadConfig()).toThrow();

      process.env.RAD_MAX_AGENTS = "-5";
      expect(() => loadConfig()).toThrow();
    });

    it("should reject maxAgents greater than 10", () => {
      process.env.RAD_MAX_AGENTS = "11";
      expect(() => loadConfig()).toThrow();

      process.env.RAD_MAX_AGENTS = "100";
      expect(() => loadConfig()).toThrow();
    });

    it("should accept valid timeout values (min 1000ms)", () => {
      process.env.RAD_TIMEOUT = "1000";
      expect(() => loadConfig()).not.toThrow();

      process.env.RAD_TIMEOUT = "600000";
      expect(() => loadConfig()).not.toThrow();
    });

    it("should reject timeout less than 1000ms", () => {
      process.env.RAD_TIMEOUT = "999";
      expect(() => loadConfig()).toThrow();

      process.env.RAD_TIMEOUT = "0";
      expect(() => loadConfig()).toThrow();
    });

    it("should accept valid log levels", () => {
      const validLevels = ["debug", "info", "warn", "error"];

      for (const level of validLevels) {
        process.env.RAD_LOG_LEVEL = level;
        expect(() => loadConfig()).not.toThrow();
      }
    });

    it("should reject invalid log levels", () => {
      process.env.RAD_LOG_LEVEL = "invalid";
      expect(() => loadConfig()).toThrow();

      process.env.RAD_LOG_LEVEL = "trace";
      expect(() => loadConfig()).toThrow();
    });

    it("should reject invalid boolean for useRealAgents", () => {
      process.env.RAD_USE_REAL_AGENTS = "invalid";
      expect(() => loadConfig()).toThrow();

      process.env.RAD_USE_REAL_AGENTS = "yes";
      expect(() => loadConfig()).toThrow();
    });
  });

  describe("loadConfig - type coercion", () => {
    it("should coerce string 'true' to boolean true", () => {
      process.env.RAD_USE_REAL_AGENTS = "true";
      const config = loadConfig();

      expect(config.useRealAgents).toBe(true);
      expect(typeof config.useRealAgents).toBe("boolean");
    });

    it("should coerce string 'false' to boolean false", () => {
      process.env.RAD_USE_REAL_AGENTS = "false";
      const config = loadConfig();

      expect(config.useRealAgents).toBe(false);
      expect(typeof config.useRealAgents).toBe("boolean");
    });

    it("should coerce string numbers to integers", () => {
      process.env.RAD_MAX_AGENTS = "5";
      process.env.RAD_TIMEOUT = "60000";
      const config = loadConfig();

      expect(config.maxAgents).toBe(5);
      expect(typeof config.maxAgents).toBe("number");
      expect(config.timeout).toBe(60000);
      expect(typeof config.timeout).toBe("number");
    });
  });

  describe("Config type", () => {
    it("should match expected structure", () => {
      const config: Config = {
        useRealAgents: true,
        apiKey: "sk-test",
        maxAgents: 5,
        timeout: 60000,
        logLevel: "info",
      };

      expect(config.useRealAgents).toBeDefined();
      expect(config.maxAgents).toBeDefined();
      expect(config.timeout).toBeDefined();
      expect(config.logLevel).toBeDefined();
    });

    it("should allow optional apiKey", () => {
      const config: Config = {
        useRealAgents: false,
        maxAgents: 3,
        timeout: 300000,
        logLevel: "info",
      };

      expect(config.apiKey).toBeUndefined();
    });
  });
});
