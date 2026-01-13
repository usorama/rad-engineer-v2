/**
 * Ollama Provider Tests
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { OllamaProvider } from "../../../src/sdk/providers/OllamaProvider.ts";
import { ProviderType } from "../../../src/sdk/providers/types.ts";

/**
 * Check if Ollama service is available
 */
async function isOllamaAvailable(baseUrl = "http://localhost:11434"): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe("OllamaProvider", () => {
  let ollamaAvailable = false;

  beforeAll(async () => {
    ollamaAvailable = await isOllamaAvailable();
    if (!ollamaAvailable) {
      console.warn("⚠️  Ollama service not available - skipping integration tests");
    }
  });
  describe("initialization", () => {
    it("should initialize with localhost URL", async () => {
      if (!ollamaAvailable) {
        console.log("⏭️  Skipping: Ollama not available");
        return;
      }

      const provider = new OllamaProvider();

      await provider.initialize({
        providerType: ProviderType.OLLAMA,
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
      });

      const config = provider.getConfig();
      expect(config.model).toBe("llama3.2");
      expect(config.baseUrl).toBe("http://localhost:11434");
      // apiKey is excluded from safe config by Omit type
    });

    it("should throw when Ollama is not running", async () => {
      const provider = new OllamaProvider();

      await expect(
        provider.initialize({
          providerType: ProviderType.OLLAMA,
          baseUrl: "http://localhost:9999", // Wrong port
          model: "llama3.2",
        })
      ).rejects.toThrow("Cannot connect to Ollama");
    });
  });

  describe("validateModel", () => {
    it("should accept any non-empty model name", () => {
      const provider = new OllamaProvider();

      expect(provider.validateModel("llama3.2")).toBe(true);
      expect(provider.validateModel("mistral")).toBe(true);
      expect(provider.validateModel("codellama")).toBe(true);
    });

    it("should reject empty model names", () => {
      const provider = new OllamaProvider();

      expect(provider.validateModel("")).toBe(false);
    });
  });

  describe("estimateTokens", () => {
    it("should estimate tokens based on character count", () => {
      const provider = new OllamaProvider();

      const text = "This is a test message for Ollama token estimation.";
      const estimate = provider.estimateTokens(text);

      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBe(Math.ceil(text.length / 4));
    });
  });

  describe("supportsFeature", () => {
    it("should support streaming", () => {
      const provider = new OllamaProvider();

      expect(provider.supportsFeature("streaming")).toBe(true);
    });

    it("should support tools for some models", async () => {
      if (!ollamaAvailable) {
        console.log("⏭️  Skipping: Ollama not available");
        return;
      }

      const provider = new OllamaProvider();

      await provider.initialize({
        providerType: ProviderType.OLLAMA,
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
      });

      // Llama 3.2 supports tools
      expect(provider.supportsFeature("tools")).toBe(true);
    });

    it("should support images for vision models", async () => {
      if (!ollamaAvailable) {
        console.log("⏭️  Skipping: Ollama not available");
        return;
      }

      const provider = new OllamaProvider();

      await provider.initialize({
        providerType: ProviderType.OLLAMA,
        baseUrl: "http://localhost:11434",
        model: "llava", // Vision model
      });

      expect(provider.supportsFeature("images")).toBe(true);
    });

    it("should not support images for non-vision models", async () => {
      if (!ollamaAvailable) {
        console.log("⏭️  Skipping: Ollama not available");
        return;
      }

      const provider = new OllamaProvider();

      await provider.initialize({
        providerType: ProviderType.OLLAMA,
        baseUrl: "http://localhost:11434",
        model: "llama3.2", // Not a vision model
      });

      expect(provider.supportsFeature("images")).toBe(false);
    });
  });

  describe("getConfig", () => {
    it("should return config without API key", async () => {
      if (!ollamaAvailable) {
        console.log("⏭️  Skipping: Ollama not available");
        return;
      }

      const provider = new OllamaProvider();

      await provider.initialize({
        providerType: ProviderType.OLLAMA,
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
      });

      const config = provider.getConfig();
      // apiKey is excluded from safe config by Omit type
      expect(config.model).toBe("llama3.2");
      expect(config.baseUrl).toBe("http://localhost:11434");
    });
  });
});
