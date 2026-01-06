/**
 * GLM Provider Tests
 */

import { describe, it, expect } from "bun:test";
import { GLMProvider } from "../../../src/sdk/providers/GLMProvider.ts";
import { ProviderType } from "../../../src/sdk/providers/types.ts";

describe("GLMProvider", () => {
  describe("initialization", () => {
    it("should initialize with custom base URL", async () => {
      const provider = new GLMProvider();

      await provider.initialize({
        providerType: ProviderType.GLM,
        apiKey: "glm-key",
        baseUrl: "https://api.z.ai/api/anthropic",
        model: "glm-4.7",
        timeout: 3000000,
      });

      const config = provider.getConfig();
      expect(config.model).toBe("glm-4.7");
      expect(config.baseUrl).toBe("https://api.z.ai/api/anthropic");
      expect(config.apiKey).toBeUndefined();
    });

    it("should use longer default timeout for GLM", async () => {
      const provider = new GLMProvider();

      await provider.initialize({
        providerType: ProviderType.GLM,
        apiKey: "glm-key",
        baseUrl: "https://api.z.ai/api/anthropic",
        model: "glm-4.7",
      });

      const config = provider.getConfig();
      expect(config.timeout).toBe(3000000); // 50 minutes default for GLM
    });
  });

  describe("validateModel", () => {
    it("should accept GLM model names", () => {
      const provider = new GLMProvider();

      expect(provider.validateModel("glm-4.7")).toBe(true);
      expect(provider.validateModel("glm-4")).toBe(true);
      expect(provider.validateModel("glm-3-turbo")).toBe(true);
    });

    it("should reject non-GLM models", () => {
      const provider = new GLMProvider();

      expect(provider.validateModel("gpt-4")).toBe(false);
      expect(provider.validateModel("claude-3")).toBe(false);
      expect(provider.validateModel("llama-3")).toBe(false);
    });
  });

  describe("estimateTokens", () => {
    it("should estimate tokens based on character count", () => {
      const provider = new GLMProvider();

      const text = "This is a test message for GLM token estimation.";
      const estimate = provider.estimateTokens(text);

      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBe(Math.ceil(text.length / 4));
    });
  });

  describe("supportsFeature", () => {
    it("should support streaming and tools", () => {
      const provider = new GLMProvider();

      expect(provider.supportsFeature("streaming")).toBe(true);
      expect(provider.supportsFeature("tools")).toBe(true);
    });

    it("should support images for GLM 4.0+", () => {
      const provider = new GLMProvider();

      // GLM 4.7 should support images
      expect(provider.supportsFeature("images")).toBe(true);
    });
  });

  describe("getConfig", () => {
    it("should return config without API key", async () => {
      const provider = new GLMProvider();

      await provider.initialize({
        providerType: ProviderType.GLM,
        apiKey: "secret-glm-key",
        baseUrl: "https://api.z.ai/api/anthropic",
        model: "glm-4.7",
      });

      const config = provider.getConfig();
      expect(config.apiKey).toBeUndefined();
      expect(config.model).toBe("glm-4.7");
      expect(config.baseUrl).toBe("https://api.z.ai/api/anthropic");
    });
  });
});
