/**
 * Anthropic Provider Tests
 */

import { describe, it, expect } from "bun:test";
import { AnthropicProvider } from "../../../src/sdk/providers/AnthropicProvider.ts";
import { ProviderType } from "../../../src/sdk/providers/types.ts";

describe("AnthropicProvider", () => {
  describe("initialization", () => {
    it("should initialize with config", async () => {
      const provider = new AnthropicProvider();

      await provider.initialize({
        providerType: ProviderType.ANTHROPIC,
        apiKey: "test-key",
        baseUrl: "https://api.anthropic.com",
        model: "claude-3-5-sonnet-20241022",
        timeout: 300000,
      });

      const config = provider.getConfig();
      expect(config.model).toBe("claude-3-5-sonnet-20241022");
      expect(config.baseUrl).toBe("https://api.anthropic.com");
      expect(config.apiKey).toBeUndefined(); // Should be excluded from safe config
    });

    it("should use default values for optional config", async () => {
      const provider = new AnthropicProvider();

      await provider.initialize({
        providerType: ProviderType.ANTHROPIC,
        apiKey: "test-key",
        baseUrl: "https://api.anthropic.com",
        model: "claude-3-5-sonnet-20241022",
      });

      const config = provider.getConfig();
      expect(config.timeout).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.maxTokens).toBeDefined();
    });
  });

  describe("validateModel", () => {
    it("should accept Claude model names", () => {
      const provider = new AnthropicProvider();

      expect(provider.validateModel("claude-3-5-sonnet-20241022")).toBe(true);
      expect(provider.validateModel("claude-3-opus-20240229")).toBe(true);
      expect(provider.validateModel("claude-3-haiku-20240307")).toBe(true);
    });

    it("should reject non-Claude models", () => {
      const provider = new AnthropicProvider();

      expect(provider.validateModel("gpt-4")).toBe(false);
      expect(provider.validateModel("llama-3")).toBe(false);
      expect(provider.validateModel("glm-4")).toBe(false);
    });
  });

  describe("estimateTokens", () => {
    it("should estimate tokens based on character count", () => {
      const provider = new AnthropicProvider();

      // Rough approximation: ~4 chars per token
      const text = "This is a test message for token estimation.";
      const estimate = provider.estimateTokens(text);

      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBe(Math.ceil(text.length / 4));
    });
  });

  describe("supportsFeature", () => {
    it("should support all features", () => {
      const provider = new AnthropicProvider();

      expect(provider.supportsFeature("streaming")).toBe(true);
      expect(provider.supportsFeature("tools")).toBe(true);
      expect(provider.supportsFeature("images")).toBe(true);
    });
  });

  describe("getConfig", () => {
    it("should return config without API key", async () => {
      const provider = new AnthropicProvider();

      await provider.initialize({
        providerType: ProviderType.ANTHROPIC,
        apiKey: "secret-key-12345",
        baseUrl: "https://api.anthropic.com",
        model: "claude-3-5-sonnet-20241022",
      });

      const config = provider.getConfig();
      expect(config.apiKey).toBeUndefined();
      expect(config.model).toBe("claude-3-5-sonnet-20241022");
      expect(config.baseUrl).toBe("https://api.anthropic.com");
    });
  });
});
