/**
 * Provider Auto-Detection Integration Test
 *
 * Tests that auto-detection integrates correctly with ProviderFactory
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ProviderFactory } from "../../src/sdk/providers/ProviderFactory";
import { ProviderAutoDetector } from "../../src/config/ProviderAutoDetector";
import { ProviderType } from "../../src/sdk/providers/types";
import type { ProviderFactoryConfig } from "../../src/sdk/providers/types";

describe("Provider Auto-Detection Integration", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Clear all provider-related env vars
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_HOST;
    delete process.env.GLM_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should initialize ProviderFactory with detected providers", () => {
    // Setup environment
    process.env.ANTHROPIC_AUTH_TOKEN = "test-key-glm-proxy";
    process.env.ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic";

    // Auto-detect providers
    const config = ProviderAutoDetector.initializeFromEnv();

    // Verify config structure
    expect(config.defaultProvider).toBeDefined();
    expect(config.providers).toBeDefined();
    expect(Object.keys(config.providers).length).toBeGreaterThan(0);

    // Initialize factory with detected config
    const factory = new ProviderFactory(config);

    // Verify factory initialization
    expect(factory.getProviderCount()).toBeGreaterThan(0);
    expect(factory.listProviders()).toContain("glm-proxy");
  });

  it("should handle GLM via api.z.ai proxy detection", () => {
    process.env.ANTHROPIC_AUTH_TOKEN = "glm-proxy-key";
    process.env.ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic";

    const config = ProviderAutoDetector.initializeFromEnv();

    expect(config.defaultProvider).toBe(ProviderType.GLM);
    expect(config.providers["glm-proxy"]).toBeDefined();
    expect(config.providers["glm-proxy"].providerType).toBe(ProviderType.GLM);
    expect(config.providers["glm-proxy"].baseUrl).toBe("https://api.z.ai/api/anthropic");
  });

  it("should handle OpenAI detection", () => {
    process.env.OPENAI_API_KEY = "sk-openai-test";

    const config = ProviderAutoDetector.initializeFromEnv();

    expect(config.providers["openai"]).toBeDefined();
    expect(config.providers["openai"].providerType).toBe(ProviderType.OPENAI);
    expect(config.providers["openai"].baseUrl).toBe("https://api.openai.com/v1");
  });

  it("should handle Ollama detection", () => {
    process.env.OLLAMA_HOST = "http://localhost:11434";

    const config = ProviderAutoDetector.initializeFromEnv();

    expect(config.providers["ollama"]).toBeDefined();
    expect(config.providers["ollama"].providerType).toBe(ProviderType.OLLAMA);
    expect(config.providers["ollama"].baseUrl).toBe("http://localhost:11434");
    expect(config.providers["ollama"].apiKey).toBe("");
  });

  it("should handle multiple providers simultaneously", () => {
    process.env.ANTHROPIC_AUTH_TOKEN = "test-key";
    process.env.GLM_API_KEY = "glm-direct-key";
    // Note: OpenAI and Ollama adapters not yet implemented in Phase 1

    const config = ProviderAutoDetector.initializeFromEnv();

    // Should detect 2 providers (glm-proxy and glm)
    expect(Object.keys(config.providers).length).toBeGreaterThanOrEqual(2);

    // Verify detected providers exist in config
    expect(config.providers["glm-proxy"]).toBeDefined();
    expect(config.providers["glm"]).toBeDefined();

    // Initialize factory with only GLM providers (implemented adapters)
    const glmOnlyConfig: ProviderFactoryConfig = {
      defaultProvider: ProviderType.GLM,
      providers: {
        "glm-proxy": config.providers["glm-proxy"],
        "glm": config.providers["glm"],
      },
    };

    const factory = new ProviderFactory(glmOnlyConfig);

    // Verify factory initialization
    expect(factory.getProviderCount()).toBe(2);
    const providers = factory.listProviders();
    expect(providers).toContain("glm-proxy");
    expect(providers).toContain("glm");
  });

  it("should throw clear error when no providers configured", () => {
    expect(() => ProviderAutoDetector.initializeFromEnv()).toThrow(
      "No LLM providers detected"
    );
  });

  it("should provide helpful error message for misconfiguration", () => {
    try {
      ProviderAutoDetector.getDefaultProvider();
      expect().fail("Should have thrown error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("No LLM providers configured");
      expect((error as Error).message).toContain("ANTHROPIC_AUTH_TOKEN");
      expect((error as Error).message).toContain("OPENAI_API_KEY");
      expect((error as Error).message).toContain("OLLAMA_HOST");
    }
  });

  it("should detect providers in priority order", () => {
    // When both ANTHROPIC_API_KEY and ANTHROPIC_AUTH_TOKEN are set
    // with api.z.ai URL, it should detect as GLM proxy
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";

    const config = ProviderAutoDetector.initializeFromEnv();

    // Should detect as Anthropic (not GLM proxy)
    expect(config.defaultProvider).toBe(ProviderType.ANTHROPIC);
    expect(config.providers["anthropic"]).toBeDefined();
    expect(config.providers["anthropic"].providerType).toBe(ProviderType.ANTHROPIC);
  });

  it("should handle custom model names from env vars", () => {
    process.env.ANTHROPIC_AUTH_TOKEN = "test-key";
    process.env.GLM_MODEL = "glm-4.5";

    const config = ProviderAutoDetector.initializeFromEnv();

    expect(config.providers["glm-proxy"].model).toBe("glm-4.5");
  });

  it("should provide debugging output", () => {
    process.env.ANTHROPIC_AUTH_TOKEN = "test-key";
    process.env.GLM_API_KEY = "glm-direct-key";

    const output = ProviderAutoDetector.printDetectedProviders();

    expect(output).toContain("Detected");
    expect(output).toContain("provider(s)");
    expect(output).toContain("glm-proxy");
    expect(output).toContain("glm");
    expect(output).toContain("Default:");
  });
});
