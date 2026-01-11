/**
 * Provider Auto-Detector Tests
 *
 * Tests for automatic provider detection from environment variables
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  ProviderAutoDetector,
  autoDetectProviders,
  getDefaultProvider,
  detectAllProviders,
  type ProviderInfo,
  type DetectionResult,
} from "../../src/config/ProviderAutoDetector";
import { ProviderType } from "../../src/sdk/providers/types";

describe("ProviderAutoDetector", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear all provider-related env vars
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_MODEL;
    delete process.env.GLM_API_KEY;
    delete process.env.GLM_BASE_URL;
    delete process.env.GLM_MODEL;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("detectAvailableProviders", () => {
    it("should return empty array when no providers configured", () => {
      const providers = ProviderAutoDetector.detectAvailableProviders();
      expect(providers).toEqual([]);
    });

    it("should detect GLM via api.z.ai proxy (ANTHROPIC_AUTH_TOKEN)", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";
      process.env.ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic";

      const providers = ProviderAutoDetector.detectAvailableProviders();

      expect(providers.length).toBeGreaterThanOrEqual(1);
      const glmProxy = providers.find((p) => p.name === "glm-proxy");
      expect(glmProxy).toBeDefined();
      expect(glmProxy?.providerType).toBe(ProviderType.GLM);
      expect(glmProxy?.apiKey).toBe("test-key");
      expect(glmProxy?.baseUrl).toBe("https://api.z.ai/api/anthropic");
      expect(glmProxy?.model).toBe("glm-4.7");
      expect(glmProxy?.available).toBe(true);
    });

    it("should detect Anthropic when ANTHROPIC_API_KEY is set", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";

      const providers = ProviderAutoDetector.detectAvailableProviders();

      const anthropic = providers.find((p) => p.name === "anthropic");
      expect(anthropic).toBeDefined();
      expect(anthropic?.providerType).toBe(ProviderType.ANTHROPIC);
      expect(anthropic?.apiKey).toBe("sk-ant-test");
      expect(anthropic?.baseUrl).toBe("https://api.anthropic.com");
    });

    it("should detect GLM direct API when GLM_API_KEY is set", () => {
      process.env.GLM_API_KEY = "glm-test-key";
      process.env.GLM_MODEL = "glm-4.5";

      const providers = ProviderAutoDetector.detectAvailableProviders();

      const glm = providers.find((p) => p.name === "glm");
      expect(glm).toBeDefined();
      expect(glm?.providerType).toBe(ProviderType.GLM);
      expect(glm?.apiKey).toBe("glm-test-key");
      expect(glm?.model).toBe("glm-4.5");
      expect(glm?.baseUrl).toBe("https://open.bigmodel.cn/api/paas/v4/");
    });

    it("should detect OpenAI when OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "sk-openai-test";
      process.env.OPENAI_MODEL = "gpt-4o-mini";

      const providers = ProviderAutoDetector.detectAvailableProviders();

      const openai = providers.find((p) => p.name === "openai");
      expect(openai).toBeDefined();
      expect(openai?.providerType).toBe(ProviderType.OPENAI);
      expect(openai?.apiKey).toBe("sk-openai-test");
      expect(openai?.model).toBe("gpt-4o-mini");
    });

    it("should detect Ollama when OLLAMA_HOST is set", () => {
      process.env.OLLAMA_HOST = "http://localhost:11434";
      process.env.OLLAMA_MODEL = "llama3";

      const providers = ProviderAutoDetector.detectAvailableProviders();

      const ollama = providers.find((p) => p.name === "ollama");
      expect(ollama).toBeDefined();
      expect(ollama?.providerType).toBe(ProviderType.OLLAMA);
      expect(ollama?.apiKey).toBe("");
      expect(ollama?.model).toBe("llama3");
      expect(ollama?.baseUrl).toBe("http://localhost:11434");
    });

    it("should detect multiple providers simultaneously", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";
      process.env.OPENAI_API_KEY = "sk-openai-test";
      process.env.OLLAMA_HOST = "http://localhost:11434";

      const providers = ProviderAutoDetector.detectAvailableProviders();

      expect(providers.length).toBeGreaterThanOrEqual(3);
      expect(providers.some((p) => p.providerType === "glm")).toBe(true);
      expect(providers.some((p) => p.providerType === "openai")).toBe(true);
      expect(providers.some((p) => p.providerType === "ollama")).toBe(true);
    });
  });

  describe("getDefaultProvider", () => {
    it("should throw error when no providers configured", () => {
      expect(() => ProviderAutoDetector.getDefaultProvider()).toThrow(
        "No LLM providers configured"
      );
    });

    it("should return first available provider", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const provider = ProviderAutoDetector.getDefaultProvider();

      expect(provider).toBeDefined();
      expect(provider.name).toBe("glm-proxy");
      expect(provider.available).toBe(true);
    });

    it("should prioritize Anthropic over GLM when both have keys", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.GLM_API_KEY = "glm-test-key";

      const provider = ProviderAutoDetector.getDefaultProvider();

      expect(provider.providerType).toBe(ProviderType.ANTHROPIC);
    });
  });

  describe("initializeFromEnv", () => {
    it("should throw error when no providers detected", () => {
      expect(() => ProviderAutoDetector.initializeFromEnv()).toThrow(
        "No LLM providers detected"
      );
    });

    it("should create ProviderFactoryConfig from detected providers", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const config = ProviderAutoDetector.initializeFromEnv();

      expect(config.defaultProvider).toBeDefined();
      expect(config.providers).toBeDefined();
      expect(Object.keys(config.providers).length).toBeGreaterThan(0);

      const glmProxy = config.providers["glm-proxy"];
      expect(glmProxy).toBeDefined();
      expect(glmProxy.providerType).toBe(ProviderType.GLM);
      expect(glmProxy.apiKey).toBe("test-key");
      expect(glmProxy.model).toBe("glm-4.7");
      expect(glmProxy.baseUrl).toBe("https://api.z.ai/api/anthropic");
    });

    it("should include all detected providers in config", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";
      process.env.OPENAI_API_KEY = "sk-openai-test";

      const config = ProviderAutoDetector.initializeFromEnv();

      expect(Object.keys(config.providers).length).toBeGreaterThanOrEqual(2);
      expect(config.providers["glm-proxy"]).toBeDefined();
      expect(config.providers["openai"]).toBeDefined();
    });

    it("should set enableFallback to false by default", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const config = ProviderAutoDetector.initializeFromEnv();

      expect(config.enableFallback).toBe(false);
    });
  });

  describe("detectAll", () => {
    it("should return detection result with summary", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const result = ProviderAutoDetector.detectAll();

      expect(result).toHaveProperty("providers");
      expect(result).toHaveProperty("defaultProvider");
      expect(result).toHaveProperty("availableCount");

      expect(result.providers).toBeArray();
      expect(result.availableCount).toBeGreaterThan(0);
      expect(result.defaultProvider).toBeDefined();
    });

    it("should return null default provider when none available", () => {
      const result = ProviderAutoDetector.detectAll();

      expect(result.availableCount).toBe(0);
      expect(result.defaultProvider).toBeNull();
    });
  });

  describe("isProviderAvailable", () => {
    it("should return true for available provider type", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      expect(ProviderAutoDetector.isProviderAvailable(ProviderType.GLM)).toBe(true);
    });

    it("should return false for unavailable provider type", () => {
      expect(ProviderAutoDetector.isProviderAvailable(ProviderType.OPENAI)).toBe(false);
    });
  });

  describe("getProviderByType", () => {
    it("should return provider info for available type", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const provider = ProviderAutoDetector.getProviderByType(ProviderType.GLM);

      expect(provider).toBeDefined();
      expect(provider?.providerType).toBe(ProviderType.GLM);
    });

    it("should return undefined for unavailable type", () => {
      const provider = ProviderAutoDetector.getProviderByType(ProviderType.OPENAI);

      expect(provider).toBeUndefined();
    });
  });

  describe("printDetectedProviders", () => {
    it("should return formatted string with detected providers", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const output = ProviderAutoDetector.printDetectedProviders();

      expect(output).toContain("Detected 1 provider(s)");
      expect(output).toContain("glm-proxy");
      expect(output).toContain("glm-4.7");
      expect(output).toContain("✓");
    });

    it("should return message when no providers detected", () => {
      const output = ProviderAutoDetector.printDetectedProviders();

      expect(output).toContain("No providers detected");
    });
  });

  describe("Helper functions", () => {
    it("autoDetectProviders should initialize config from env", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const config = autoDetectProviders();

      expect(config.defaultProvider).toBeDefined();
      expect(config.providers).toBeDefined();
    });

    it("getDefaultProvider should return default provider", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const provider = getDefaultProvider();

      expect(provider).toBeDefined();
      expect(provider.available).toBe(true);
    });

    it("detectAllProviders should return detection result", () => {
      process.env.ANTHROPIC_AUTH_TOKEN = "test-key";

      const result = detectAllProviders();

      expect(result.availableCount).toBeGreaterThan(0);
      expect(result.providers).toBeArray();
    });
  });
});
