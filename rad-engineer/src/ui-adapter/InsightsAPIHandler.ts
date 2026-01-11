/**
 * InsightsAPIHandler - AI-powered insights chat with DecisionLearningIntegration
 *
 * Responsibilities:
 * - Chat session management with StateManager persistence
 * - AI-powered insights using DecisionLearningStore context
 * - Streaming responses via EventEmitter
 * - Context-aware responses based on decision history
 *
 * APIs:
 * - insights:send-message - Send chat message, stream AI response
 * - insights:create-session - Create new chat session
 * - insights:get-session-history - Get chat history for a session
 *
 * Integration:
 * - Uses DecisionLearningIntegration for context enrichment
 * - Uses DecisionLearningStore for decision history
 * - Uses StateManager for session persistence
 */

import { EventEmitter } from "events";
import { StateManager } from "@/advanced/StateManager.js";
import type { WaveState } from "@/advanced/StateManager.js";
import { DecisionLearningIntegration } from "@/execute/DecisionLearningIntegration.js";
import type { DecisionLearningStore } from "@/decision/DecisionLearningStore.js";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Chat message in a session
 */
export interface ChatMessage {
  /** Message ID */
  id: string;
  /** Session ID this message belongs to */
  sessionId: string;
  /** Message role */
  role: "user" | "assistant";
  /** Message content */
  content: string;
  /** Timestamp (ISO) */
  timestamp: string;
  /** Optional decision context used for this message */
  decisionContext?: string[];
}

/**
 * Chat session with messages
 */
export interface ChatSession {
  /** Session ID */
  id: string;
  /** Session title/name */
  title: string;
  /** Creation timestamp (ISO) */
  createdAt: string;
  /** Last updated timestamp (ISO) */
  updatedAt: string;
  /** Messages in this session */
  messages: ChatMessage[];
  /** Session metadata */
  metadata?: {
    /** Total messages in session */
    messageCount: number;
    /** Last message timestamp */
    lastMessageAt?: string;
  };
}

/**
 * Chat session checkpoint stored in StateManager
 */
interface ChatSessionCheckpoint {
  /** All chat sessions */
  sessions: ChatSession[];
  /** Checkpoint metadata */
  metadata: {
    version: string;
    lastUpdated: string;
  };
  /** Wave state fields for StateManager compatibility */
  waveNumber: number;
  completedTasks: string[];
  failedTasks: string[];
  timestamp: string;
}

/**
 * Streaming message chunk
 */
export interface MessageChunk {
  /** Session ID */
  sessionId: string;
  /** Message ID */
  messageId: string;
  /** Content chunk */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
}

/**
 * Configuration for InsightsAPIHandler
 */
export interface InsightsAPIHandlerConfig {
  /** Project directory path */
  projectDir: string;
  /** StateManager instance for persistence */
  stateManager: StateManager;
  /** DecisionLearningIntegration instance for context */
  decisionLearning: DecisionLearningIntegration;
  /** Anthropic API key (defaults to env ANTHROPIC_API_KEY) */
  apiKey?: string;
  /** Model to use (defaults to claude-3-5-sonnet-20241022) */
  model?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * InsightsAPIHandler - AI-powered insights chat
 *
 * @example
 * ```ts
 * const handler = new InsightsAPIHandler({
 *   projectDir: "/path/to/project",
 *   stateManager: new StateManager(),
 *   decisionLearning: getDecisionLearningIntegration(),
 * });
 *
 * // Create session
 * const session = await handler.createSession("Architecture Review");
 *
 * // Send message with streaming response
 * handler.on("message-chunk", (chunk: MessageChunk) => {
 *   console.log(chunk.content);
 * });
 *
 * await handler.sendMessage(session.id, "What are the best methods for code domain?");
 *
 * // Get session history
 * const history = await handler.getSessionHistory(session.id);
 * ```
 */
export class InsightsAPIHandler extends EventEmitter {
  private readonly config: InsightsAPIHandlerConfig;
  private readonly stateManager: StateManager;
  private readonly decisionLearning: DecisionLearningIntegration;
  private readonly anthropic: Anthropic;
  private readonly checkpointName = "insights-chat-sessions";
  private messageIdCounter = 0;
  private sessionIdCounter = 0;

  constructor(config: InsightsAPIHandlerConfig) {
    super();
    this.config = config;
    this.stateManager = config.stateManager;
    this.decisionLearning = config.decisionLearning;

    // Initialize Anthropic SDK
    this.anthropic = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });

    if (this.config.debug) {
      console.log(`[InsightsAPIHandler] Initialized for project: ${config.projectDir}`);
    }
  }

  /**
   * Load chat session checkpoint from StateManager
   */
  private async loadCheckpoint(): Promise<ChatSessionCheckpoint> {
    const state = await this.stateManager.loadCheckpoint(this.checkpointName);

    if (!state) {
      return {
        waveNumber: 0,
        completedTasks: [],
        failedTasks: [],
        timestamp: new Date().toISOString(),
        sessions: [],
        metadata: {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    return state as unknown as ChatSessionCheckpoint;
  }

  /**
   * Save chat session checkpoint to StateManager
   */
  private async saveCheckpoint(checkpoint: ChatSessionCheckpoint): Promise<void> {
    checkpoint.metadata.lastUpdated = new Date().toISOString();
    checkpoint.timestamp = new Date().toISOString();

    await this.stateManager.saveCheckpoint(
      this.checkpointName,
      checkpoint as unknown as WaveState
    );

    if (this.config.debug) {
      console.log(`[InsightsAPIHandler] Saved checkpoint: ${checkpoint.sessions.length} sessions`);
    }
  }

  /**
   * Create a new chat session
   *
   * @param title - Session title
   * @returns Created session
   */
  async createSession(title: string): Promise<ChatSession> {
    const sessionId = `session-${Date.now()}-${this.sessionIdCounter++}`;

    const session: ChatSession = {
      id: sessionId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      metadata: {
        messageCount: 0,
      },
    };

    const checkpoint = await this.loadCheckpoint();
    checkpoint.sessions.push(session);
    await this.saveCheckpoint(checkpoint);

    this.emit("session-created", session);

    if (this.config.debug) {
      console.log(`[InsightsAPIHandler] Created session: ${sessionId}`);
    }

    return session;
  }

  /**
   * Get session history
   *
   * @param sessionId - Session ID
   * @returns Session with messages, or null if not found
   */
  async getSessionHistory(sessionId: string): Promise<ChatSession | null> {
    const checkpoint = await this.loadCheckpoint();
    const session = checkpoint.sessions.find((s) => s.id === sessionId);
    return session || null;
  }

  /**
   * Get all sessions
   *
   * @returns All sessions sorted by last updated (newest first)
   */
  async getAllSessions(): Promise<ChatSession[]> {
    const checkpoint = await this.loadCheckpoint();
    return checkpoint.sessions.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  /**
   * Send message and stream AI response
   *
   * Process:
   * 1. Validate session exists
   * 2. Add user message to session
   * 3. Gather decision context from DecisionLearningStore
   * 4. Build system prompt with context
   * 5. Call Anthropic API with streaming
   * 6. Emit message chunks via "message-chunk" event
   * 7. Add assistant message to session
   * 8. Save checkpoint
   *
   * @param sessionId - Session ID
   * @param message - User message content
   * @returns Assistant response (full message)
   * @throws Error if session not found
   */
  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    try {
      const checkpoint = await this.loadCheckpoint();
      const sessionIndex = checkpoint.sessions.findIndex((s) => s.id === sessionId);

      if (sessionIndex === -1) {
        const error = new Error(`Session not found: ${sessionId}`);
        this.emit('error', {
          code: 'SESSION_NOT_FOUND',
          message: `Cannot send message - session ${sessionId} does not exist`,
          action: 'Create a new session or verify the session ID is correct',
          details: error.message
        });
        throw error;
      }

      const session = checkpoint.sessions[sessionIndex];

      // Add user message
      const userMessageId = `msg-${Date.now()}-${this.messageIdCounter++}`;
      const userMessage: ChatMessage = {
        id: userMessageId,
        sessionId,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };

      session.messages.push(userMessage);
      session.updatedAt = new Date().toISOString();
      session.metadata = {
        messageCount: session.messages.length,
        lastMessageAt: userMessage.timestamp,
      };

      // Save user message
      checkpoint.sessions[sessionIndex] = session;
      await this.saveCheckpoint(checkpoint);

      // Emit user message
      this.emit("message-added", userMessage);

      if (this.config.debug) {
        console.log(`[InsightsAPIHandler] User message: ${message.substring(0, 50)}...`);
      }

      // Gather decision context
      const decisionContext = await this.gatherDecisionContext(message);

      // Build messages for API
      const apiMessages = this.buildAPIMessages(session, decisionContext);

      // Create assistant message
      const assistantMessageId = `msg-${Date.now()}-${this.messageIdCounter++}`;
      let assistantContent = "";
      let streamError: string | null = null;

      try {
        // Validate API key
        if (!this.config.apiKey && !process.env.ANTHROPIC_API_KEY) {
          throw new Error('Anthropic API key not configured');
        }

        // Stream response from Anthropic
        const stream = await this.anthropic.messages.create({
          model: this.config.model || "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: apiMessages,
          stream: true,
        });

        // Process stream
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = event.delta.text;
            assistantContent += chunk;

            // Emit chunk
            this.emit("message-chunk", {
              sessionId,
              messageId: assistantMessageId,
              content: chunk,
              done: false,
            } as MessageChunk);
          }
        }

        // Emit final chunk
        this.emit("message-chunk", {
          sessionId,
          messageId: assistantMessageId,
          content: "",
          done: true,
        } as MessageChunk);

        if (this.config.debug) {
          console.log(`[InsightsAPIHandler] Assistant response: ${assistantContent.substring(0, 50)}...`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        streamError = errorMsg;

        // Determine error type for better guidance
        let action = 'Check your Anthropic API key and network connection';
        let code = 'AI_STREAM_ERROR';

        if (errorMsg.includes('API key')) {
          code = 'AI_API_KEY_ERROR';
          action = 'Set ANTHROPIC_API_KEY environment variable or provide apiKey in config';
        } else if (errorMsg.includes('rate limit')) {
          code = 'AI_RATE_LIMIT_ERROR';
          action = 'Wait a moment before sending another message. Consider upgrading your API plan.';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          code = 'AI_NETWORK_ERROR';
          action = 'Check your internet connection and firewall settings. Verify Anthropic API is accessible.';
        } else if (errorMsg.includes('timeout')) {
          code = 'AI_TIMEOUT_ERROR';
          action = 'Request took too long. Try again with a shorter message or simpler query.';
        }

        this.emit('error', {
          code,
          message: 'Failed to get AI response',
          action,
          details: errorMsg
        });

        // Graceful degradation: provide helpful error message
        assistantContent = `I apologize, but I encountered an error while processing your message.\n\n**Error**: ${errorMsg}\n\n**What you can do**: ${action}`;

        // Emit error chunk
        this.emit("message-chunk", {
          sessionId,
          messageId: assistantMessageId,
          content: assistantContent,
          done: true,
        } as MessageChunk);
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId,
        role: "assistant",
        content: assistantContent,
        timestamp: new Date().toISOString(),
        decisionContext: decisionContext.map((d) => d.id),
      };

      session.messages.push(assistantMessage);
      session.updatedAt = new Date().toISOString();
      session.metadata = {
        messageCount: session.messages.length,
        lastMessageAt: assistantMessage.timestamp,
      };

      // Save assistant message
      const updatedCheckpoint = await this.loadCheckpoint();
      const updatedSessionIndex = updatedCheckpoint.sessions.findIndex((s) => s.id === sessionId);
      if (updatedSessionIndex !== -1) {
        updatedCheckpoint.sessions[updatedSessionIndex] = session;
        await this.saveCheckpoint(updatedCheckpoint);
      }

      // Emit assistant message
      this.emit("message-added", assistantMessage);

      return assistantMessage;
    } catch (error) {
      // Top-level error (session not found, storage failure)
      if (!(error instanceof Error && error.message.includes('Session not found'))) {
        this.emit('error', {
          code: 'SEND_MESSAGE_ERROR',
          message: 'Failed to send message',
          action: 'Check that session exists and storage is accessible',
          details: error instanceof Error ? error.message : String(error)
        });
      }
      throw error;
    }
  }

  /**
   * Gather decision context from DecisionLearningStore
   *
   * Extracts relevant decisions based on user message content
   */
  private async gatherDecisionContext(message: string): Promise<Array<{ id: string; decision: string; outcome?: string }>> {
    try {
      // Get DecisionLearningStore from integration
      const store = this.getDecisionStore();
      if (!store) {
        return [];
      }

      // Get recent decisions with outcomes
      const decisions = store.getDecisions({ hasOutcome: true });

      // Extract keywords from message for filtering
      const keywords = this.extractKeywords(message);

      // Filter decisions relevant to keywords
      const relevantDecisions = decisions
        .filter((d) => {
          if (keywords.length === 0) return true;
          const decisionText = `${d.component} ${d.activity} ${d.decision}`.toLowerCase();
          return keywords.some((keyword) => decisionText.includes(keyword));
        })
        .slice(0, 10); // Max 10 decisions for context

      return relevantDecisions.map((d) => ({
        id: d.id,
        decision: `${d.component} - ${d.activity}: ${d.decision}`,
        outcome: d.outcome ? `Success: ${d.outcome.success}, Quality: ${d.outcome.quality}` : undefined,
      }));
    } catch (error) {
      console.warn(`[InsightsAPIHandler] Failed to gather decision context: ${error}`);
      return [];
    }
  }

  /**
   * Extract keywords from message for context filtering
   */
  private extractKeywords(message: string): string[] {
    const commonWords = new Set(["the", "a", "an", "is", "are", "was", "were", "what", "how", "why", "when", "where", "which", "who"]);
    const words = message.toLowerCase().split(/\s+/);
    return words.filter((w) => w.length > 3 && !commonWords.has(w));
  }

  /**
   * Build API messages with context
   */
  private buildAPIMessages(session: ChatSession, decisionContext: Array<{ id: string; decision: string; outcome?: string }>): Array<{ role: "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add system context as first user message
    if (decisionContext.length > 0) {
      const contextMsg = this.buildContextMessage(decisionContext);
      messages.push({
        role: "user",
        content: contextMsg,
      });
      messages.push({
        role: "assistant",
        content: "I understand. I'll use this decision context to provide insights.",
      });
    }

    // Add existing conversation history
    for (const msg of session.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return messages;
  }

  /**
   * Build context message from decisions
   */
  private buildContextMessage(decisionContext: Array<{ id: string; decision: string; outcome?: string }>): string {
    let msg = "Here is relevant decision history for context:\n\n";

    for (const decision of decisionContext) {
      msg += `- ${decision.decision}\n`;
      if (decision.outcome) {
        msg += `  Outcome: ${decision.outcome}\n`;
      }
    }

    msg += "\nPlease use this context to provide informed insights.";
    return msg;
  }

  /**
   * Get DecisionLearningStore from integration (private accessor)
   */
  private getDecisionStore(): DecisionLearningStore | null {
    try {
      // Access private decisionStore via type assertion
      // This is safe since we own both classes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (this.decisionLearning as any).decisionStore as DecisionLearningStore;
    } catch {
      return null;
    }
  }

  /**
   * Delete a session
   *
   * @param sessionId - Session ID to delete
   * @returns True if deleted, false if not found
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const checkpoint = await this.loadCheckpoint();
    const sessionIndex = checkpoint.sessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex === -1) {
      return false;
    }

    checkpoint.sessions.splice(sessionIndex, 1);
    await this.saveCheckpoint(checkpoint);

    if (this.config.debug) {
      console.log(`[InsightsAPIHandler] Deleted session: ${sessionId}`);
    }

    return true;
  }
}
