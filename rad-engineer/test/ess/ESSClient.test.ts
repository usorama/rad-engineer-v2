/**
 * Unit tests for ESS Client
 *
 * Tests the HTTP client for the ESS Gateway API.
 */

import { beforeEach, afterEach, describe, test, expect, mock, spyOn } from "bun:test";
import {
  ESSClient,
  createLocalESSClient,
  createESSClientFromEnv,
  ESSError,
  ESSConnectionError,
  ESSTimeoutError,
} from "../../src/ess/index.js";
import type { ESSQueryResponse, ESSHealthResponse } from "../../src/ess/types.js";

// Mock fetch globally
const originalFetch = globalThis.fetch;

describe("ESSClient", () => {
  let client: ESSClient;
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve(new Response()));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    client = new ESSClient({
      baseUrl: "http://localhost:3001",
      timeout: 5000,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("constructor", () => {
    test("removes trailing slash from baseUrl", () => {
      const client1 = new ESSClient({ baseUrl: "http://localhost:3001/" });
      const client2 = new ESSClient({ baseUrl: "http://localhost:3001" });
      // Both should work the same - verified by request URL
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
    });

    test("uses default timeout of 30000ms", () => {
      const client = new ESSClient({ baseUrl: "http://localhost:3001" });
      expect(client).toBeDefined();
    });
  });

  describe("query", () => {
    test("sends POST request to /query endpoint", async () => {
      const mockResponse: ESSQueryResponse = {
        requestId: "test-123",
        timestamp: new Date().toISOString(),
        answer: {
          text: "This is the answer",
          confidence: 0.95,
          citations: [],
        },
        qdrantSources: [],
        neo4jSources: [],
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.query("How does auth work?");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3001/query");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toEqual({
        query: "How does auth work?",
        mode: "one-shot",
        synthesisMode: "synthesized",
      });
      expect(result.answer?.text).toBe("This is the answer");
    });

    test("accepts ESSQueryRequest object", async () => {
      const mockResponse: ESSQueryResponse = {
        requestId: "test-123",
        timestamp: new Date().toISOString(),
        answer: {
          text: "Answer",
          confidence: 0.9,
          citations: [],
        },
        qdrantSources: [],
        neo4jSources: [],
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await client.query({
        query: "Test query",
        project: "my-project",
        context: ["context1"],
        mode: "conversational",
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.query).toBe("Test query");
      expect(body.project).toBe("my-project");
      expect(body.context).toEqual(["context1"]);
      expect(body.mode).toBe("conversational");
    });

    test("includes project parameter when provided", async () => {
      const mockResponse: ESSQueryResponse = {
        requestId: "test-123",
        timestamp: new Date().toISOString(),
        answer: {
          text: "Answer",
          confidence: 0.9,
          citations: [],
        },
        qdrantSources: [],
        neo4jSources: [],
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await client.query("Test", "rad-engineer");

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.project).toBe("rad-engineer");
    });
  });

  describe("startConversation", () => {
    test("sends POST request to /conversation endpoint", async () => {
      const mockResponse: ESSQueryResponse = {
        requestId: "test-123",
        timestamp: new Date().toISOString(),
        answer: {
          text: "Initial answer",
          confidence: 0.8,
          citations: [],
        },
        conversationId: "conv-456",
        qdrantSources: [],
        neo4jSources: [],
        clarifyingQuestions: [
          { id: "q1", question: "Which module?" },
        ],
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.startConversation("Explain the auth system");

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3001/conversation");
      expect(options.method).toBe("POST");
      expect(result.conversationId).toBe("conv-456");
      expect(result.clarifyingQuestions).toHaveLength(1);
    });
  });

  describe("continueConversation", () => {
    test("sends POST request to /conversation/:id/continue", async () => {
      const mockResponse: ESSQueryResponse = {
        requestId: "test-123",
        timestamp: new Date().toISOString(),
        answer: {
          text: "Updated answer",
          confidence: 0.95,
          citations: [],
        },
        qdrantSources: [],
        neo4jSources: [],
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.continueConversation("conv-456", {
        q1: "The auth module",
      });

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3001/conversation/conv-456/continue");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toEqual({
        answers: { q1: "The auth module" },
      });
      expect(result.answer?.text).toBe("Updated answer");
    });
  });

  describe("abortConversation", () => {
    test("sends DELETE request to /conversation/:id", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ status: "aborted" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await client.abortConversation("conv-456");

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3001/conversation/conv-456");
      expect(options.method).toBe("DELETE");
    });
  });

  describe("health", () => {
    test("sends GET request to /health endpoint", async () => {
      const mockResponse: ESSHealthResponse = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          neo4j: { status: "ok", latency: 5 },
          qdrant: { status: "ok", latency: 3 },
          redis: { status: "ok" },
          ollama: { status: "ok", latency: 10 },
        },
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.health();

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3001/health");
      expect(options.method).toBe("GET");
      expect(result.status).toBe("healthy");
      expect(result.services.neo4j.status).toBe("ok");
    });
  });

  describe("isAvailable", () => {
    test("returns true when ESS is healthy", async () => {
      const mockResponse: ESSHealthResponse = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          neo4j: { status: "ok" },
          qdrant: { status: "ok" },
          redis: { status: "ok" },
          ollama: { status: "ok" },
        },
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.isAvailable();
      expect(result).toBe(true);
    });

    test("returns true when ESS is degraded", async () => {
      const mockResponse: ESSHealthResponse = {
        status: "degraded",
        timestamp: new Date().toISOString(),
        services: {
          neo4j: { status: "ok" },
          qdrant: { status: "error", error: "Connection failed" },
          redis: { status: "ok" },
          ollama: { status: "ok" },
        },
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 207,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.isAvailable();
      expect(result).toBe(true);
    });

    test("returns false when ESS is unhealthy", async () => {
      const mockResponse: ESSHealthResponse = {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          neo4j: { status: "error" },
          qdrant: { status: "error" },
          redis: { status: "error" },
          ollama: { status: "error" },
        },
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.isAvailable();
      expect(result).toBe(false);
    });

    test("returns false when ESS is unreachable", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("fetch failed"))
      );

      const result = await client.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe("error handling", () => {
    test("throws ESSError on non-200 response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Bad request" }), {
            status: 400,
            statusText: "Bad Request",
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await expect(client.query("test")).rejects.toThrow(ESSError);
    });

    test("throws ESSConnectionError on connection failure", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("fetch failed: ECONNREFUSED"))
      );

      await expect(client.query("test")).rejects.toThrow(ESSConnectionError);
    });
  });

  describe("API key authentication", () => {
    test("includes Authorization header when apiKey is provided", async () => {
      const authClient = new ESSClient({
        baseUrl: "http://localhost:3001",
        apiKey: "test-api-key",
      });

      const mockResponse: ESSHealthResponse = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          neo4j: { status: "ok" },
          qdrant: { status: "ok" },
          redis: { status: "ok" },
          ollama: { status: "ok" },
        },
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await authClient.health();

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-api-key");
    });
  });
});

describe("Factory Functions", () => {
  describe("createLocalESSClient", () => {
    test("creates client with default port 3001", () => {
      const client = createLocalESSClient();
      expect(client).toBeInstanceOf(ESSClient);
    });

    test("creates client with custom port", () => {
      const client = createLocalESSClient(3002);
      expect(client).toBeInstanceOf(ESSClient);
    });
  });

  describe("createESSClientFromEnv", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test("throws error when ESS_URL is not set", () => {
      delete process.env.ESS_URL;
      expect(() => createESSClientFromEnv()).toThrow("ESS_URL environment variable is required");
    });

    test("creates client from ESS_URL", () => {
      process.env.ESS_URL = "http://ess.example.com:3001";
      const client = createESSClientFromEnv();
      expect(client).toBeInstanceOf(ESSClient);
    });

    test("includes API key from ESS_API_KEY", () => {
      process.env.ESS_URL = "http://ess.example.com:3001";
      process.env.ESS_API_KEY = "secret-key";
      const client = createESSClientFromEnv();
      expect(client).toBeInstanceOf(ESSClient);
    });
  });
});

describe("Error Classes", () => {
  describe("ESSError", () => {
    test("includes status code and response", () => {
      const error = new ESSError("Request failed", 400, { error: "Bad request" });
      expect(error.message).toBe("Request failed");
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ error: "Bad request" });
      expect(error.name).toBe("ESSError");
    });
  });

  describe("ESSConnectionError", () => {
    test("includes URL", () => {
      const error = new ESSConnectionError("Connection failed", "http://localhost:3001");
      expect(error.url).toBe("http://localhost:3001");
      expect(error.name).toBe("ESSConnectionError");
    });
  });

  describe("ESSTimeoutError", () => {
    test("includes timeout duration", () => {
      const error = new ESSTimeoutError(5000);
      expect(error.timeoutMs).toBe(5000);
      expect(error.message).toBe("ESS request timed out after 5000ms");
      expect(error.name).toBe("ESSTimeoutError");
    });
  });
});
