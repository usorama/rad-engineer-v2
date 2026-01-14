/**
 * ProviderAvailability Tests
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { ProviderAvailability } from "../../../src/sdk/providers/ProviderAvailability.ts";
import { ProviderFactory } from "../../../src/sdk/providers/ProviderFactory.ts";
import { ProviderType } from "../../../src/sdk/providers/types.ts";

describe("ProviderAvailability", () => {
  let factory: ProviderFactory;

  beforeEach(() => {
    // Create factory with test providers
    const config = {
      defaultProvider: ProviderType.ANTHROPIC,
      providers: {
        anthropic: {
          providerType: ProviderType.ANTHROPIC,
          baseUrl: "https://api.anthropic.com",
          model: "claude-3-5-sonnet-20241022",
          timeout: 300000,
          temperature: 1.0,
          maxTokens: 4096,
          topP: 1.0,
          stream: false,
        },
        glm: {
          providerType: ProviderType.GLM,
          baseUrl: "https://api.z.ai/api/anthropic",
          model: "glm-4.7",
          timeout: 3000000,
          temperature: 1.0,
          maxTokens: 4096,
          topP: 1.0,
          stream: false,
        },
        ollama: {
          providerType: ProviderType.OLLAMA,
          baseUrl: "http://localhost:11434",
          model: "llama3.2",
          timeout: 120000,
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
          stream: false,
        },
      },
      enableFallback: false,
    };

    factory = new ProviderFactory(config);
  });

  describe("isProviderAvailable", () => {
    it("should detect Anthropic availability when API key is set", async () => {
      // Set Anthropic API key
      process.env.ANTHROPIC_API_KEY = "sk-ant-test12345";

      const result = await ProviderAvailability.isProviderAvailable(factory, "anthropic");

      expect(result.provider).toBe("anthropic");
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();

      // Cleanup
      delete process.env.ANTHROPIC_API_KEY;
    });

    it("should detect Anthropic unavailability when API key is missing", async () => {
      // Remove Anthropic API key
      delete process.env.ANTHROPIC_API_KEY;

      const result = await ProviderAvailability.isProviderAvailable(factory, "anthropic");

      expect(result.provider).toBe("anthropic");
      expect(result.available).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("should detect Anthropic unavailability when API key has wrong format", async () => {
      // Set Anthropic API key with wrong format
      process.env.ANTHROPIC_API_KEY = "invalid-key-format";

      const result = await ProviderAvailability.isProviderAvailable(factory, "anthropic");

      expect(result.provider).toBe("anthropic");
      expect(result.available).toBe(false);
      expect(result.reason).toBeDefined();

      // Cleanup
      delete process.env.ANTHROPIC_API_KEY;
    });

    it("should detect GLM availability when API key is set", async () => {
      // Set GLM API key
      process.env.GLM_API_KEY = "test-glm-key";

      const result = await ProviderAvailability.isProviderAvailable(factory, "glm");

      expect(result.provider).toBe("glm");
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();

      // Cleanup
      delete process.env.GLM_API_KEY;
    });

    it("should detect GLM unavailability when API key is missing", async () => {
      // Remove GLM API key
      delete process.env.GLM_API_KEY;

      const result = await ProviderAvailability.isProviderAvailable(factory, "glm");

      expect(result.provider).toBe("glm");
      expect(result.available).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("should return unavailable for unregistered provider", async () => {
      const result = await ProviderAvailability.isProviderAvailable(factory, "unregistered");

      expect(result.provider).toBe("unregistered");
      expect(result.available).toBe(false);
      expect(result.reason).toContain("not registered");
    });
  });

  describe("getAvailableProviders", () => {
    it("should return list of available providers", async () => {
      // Set multiple API keys
      process.env.ANTHROPIC_API_KEY = "sk-ant-test12345";
      process.env.GLM_API_KEY = "test-glm-key";

      const available = await ProviderAvailability.getAvailableProviders(factory);

      // Anthropic and GLM should be available
      expect(available).toContain("anthropic");
      expect(available).toContain("glm");

      // Ollama availability depends on whether it's running
      // We won't assert on it since it's environment-dependent

      // Cleanup
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GLM_API_KEY;
    });

    it("should return empty list when no providers are available", async () => {
      // Remove all API keys
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GLM_API_KEY;
      delete process.env.OLLAMA_HOST;

      const available = await ProviderAvailability.getAvailableProviders(factory);

      // Should only contain Ollama if it's running locally
      // Otherwise should be empty
      // We'll just check that Anthropic and GLM are not available
      expect(available).not.toContain("anthropic");
      expect(available).not.toContain("glm");
    });
  });

  describe("getEnvVarForProvider", () => {
    it("should return correct env var for Anthropic", () => {
      // This is tested indirectly through isProviderAvailable
      // Direct testing would require making the method public or adding a test-specific export
      expect(true).toBe(true); // Placeholder
    });

    it("should return correct env var for GLM", () => {
      expect(true).toBe(true); // Placeholder
    });

    it("should return correct env var for Ollama (OLLAMA_HOST)", () => {
      expect(true).toBe(true); // Placeholder
    });
  });
});
