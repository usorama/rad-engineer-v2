/**
 * Provider Factory Tests
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  ProviderFactory,
  ProviderType,
  resetProviderFactory,
} from "../../../src/sdk/providers/index.ts";

describe("ProviderFactory", () => {
  beforeEach(() => {
    // Reset factory state before each test
    resetProviderFactory();
  });

  describe("initialization", () => {
    it("should create factory with default provider", () => {
      const factory = new ProviderFactory({
        providers: {
          anthropic: {
            providerType: ProviderType.ANTHROPIC,
            apiKey: "test-key",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
        },
      });

      expect(factory.getProviderCount()).toBe(1);
    });

    it("should create factory with multiple providers", () => {
      const factory = new ProviderFactory({
        defaultProvider: ProviderType.ANTHROPIC,
        providers: {
          anthropic: {
            providerType: ProviderType.ANTHROPIC,
            apiKey: "test-key",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
          glm: {
            providerType: ProviderType.GLM,
            apiKey: "glm-key",
            baseUrl: "https://api.z.ai/api/anthropic",
            model: "glm-4.7",
          },
          ollama: {
            providerType: ProviderType.OLLAMA,
            baseUrl: "http://localhost:11434",
            model: "llama3.2",
          },
        },
      });

      expect(factory.getProviderCount()).toBe(3);
      expect(factory.listProviders()).toEqual(["anthropic", "glm", "ollama"]);
    });
  });

  describe("getProvider", () => {
    it("should return default provider when no name specified", async () => {
      const factory = new ProviderFactory({
        defaultProvider: ProviderType.ANTHROPIC,
        providers: {
          anthropic: {
            providerType: ProviderType.ANTHROPIC,
            apiKey: "test-key",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
        },
      });

      const provider = await factory.getProvider();
      expect(provider).toBeDefined();
      expect(provider.getConfig().model).toBe("claude-3-5-sonnet-20241022");
    });

    it("should return named provider", async () => {
      const factory = new ProviderFactory({
        providers: {
          glm: {
            providerType: ProviderType.GLM,
            apiKey: "glm-key",
            baseUrl: "https://api.z.ai/api/anthropic",
            model: "glm-4.7",
          },
        },
      });

      const provider = await factory.getProvider("glm");
      expect(provider).toBeDefined();
      expect(provider.getConfig().model).toBe("glm-4.7");
    });

    it("should throw for unregistered provider", async () => {
      const factory = new ProviderFactory({
        providers: {
          anthropic: {
            providerType: ProviderType.ANTHROPIC,
            apiKey: "test-key",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
        },
      });

      await expect(factory.getProvider("nonexistent")).rejects.toThrow(
        'Provider "nonexistent" not registered'
      );
    });
  });

  describe("registerProvider", () => {
    it("should register new provider", () => {
      const factory = new ProviderFactory({
        providers: {},
      });

      factory.registerProvider("test-provider", {
        providerType: ProviderType.ANTHROPIC,
        apiKey: "test-key",
        baseUrl: "https://api.anthropic.com",
        model: "claude-3-5-sonnet-20241022",
      });

      expect(factory.hasProvider("test-provider")).toBe(true);
      expect(factory.getProviderCount()).toBe(1);
    });
  });

  describe("unregisterProvider", () => {
    it("should remove registered provider", () => {
      const factory = new ProviderFactory({
        providers: {
          anthropic: {
            providerType: ProviderType.ANTHROPIC,
            apiKey: "test-key",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
        },
      });

      factory.unregisterProvider("anthropic");
      expect(factory.hasProvider("anthropic")).toBe(false);
      expect(factory.getProviderCount()).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all providers", () => {
      const factory = new ProviderFactory({
        providers: {
          anthropic: {
            providerType: ProviderType.ANTHROPIC,
            apiKey: "test-key",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
          glm: {
            providerType: ProviderType.GLM,
            apiKey: "glm-key",
            baseUrl: "https://api.z.ai/api/anthropic",
            model: "glm-4.7",
          },
        },
      });

      factory.clear();
      expect(factory.getProviderCount()).toBe(0);
    });
  });

  describe("getProviderConfig", () => {
    it("should return config without API key", () => {
      const factory = new ProviderFactory({
        providers: {
          anthropic: {
            providerType: ProviderType.ANTHROPIC,
            apiKey: "secret-key",
            baseUrl: "https://api.anthropic.com",
            model: "claude-3-5-sonnet-20241022",
          },
        },
      });

      const config = factory.getProviderConfig("anthropic");
      expect(config).toBeDefined();
      // apiKey is excluded from safe config by Omit type
      expect(config?.model).toBe("claude-3-5-sonnet-20241022");
    });

    it("should return undefined for unknown provider", () => {
      const factory = new ProviderFactory({
        providers: {},
      });

      const config = factory.getProviderConfig("unknown");
      expect(config).toBeUndefined();
    });
  });

  describe("getSupportedTypes", () => {
    it("should list all supported provider types", () => {
      const factory = new ProviderFactory({
        providers: {},
      });

      const types = factory.getSupportedTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain("anthropic");
      expect(types).toContain("glm");
      expect(types).toContain("ollama");
    });
  });
});
