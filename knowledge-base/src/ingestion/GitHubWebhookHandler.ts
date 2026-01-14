/**
 * GitHub Webhook Handler
 *
 * Processes GitHub push events and triggers documentation updates
 */

import type { GitHubWebhookPayload, IngestDocument } from '../core/types.js';
import { KnowledgeBase } from '../core/KnowledgeBase.js';

export interface WebhookConfig {
  secret?: string;
  repoAllowlist?: string[];
  branchAllowlist?: string[];
  fileExtensions?: string[];
  autoIngest?: boolean;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  documentsProcessed?: number;
  nodesCreated?: number;
  errors?: string[];
}

/**
 * GitHub Webhook Handler
 *
 * Listens for GitHub push events and ingests updated documentation
 */
export class GitHubWebhookHandler {
  private config: WebhookConfig;
  private kb: KnowledgeBase;

  constructor(config: WebhookConfig = {}) {
    this.config = {
      secret: config.secret || process.env.GITHUB_WEBHOOK_SECRET,
      repoAllowlist: config.repoAllowlist || [],
      branchAllowlist: config.branchAllowlist || ['main', 'master'],
      fileExtensions: config.fileExtensions || ['.md', '.txt', '.rst'],
      autoIngest: config.autoIngest ?? true,
    };

    // Initialize KB with default config
    this.kb = new KnowledgeBase({
      qdrant: {
        url: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
        collection: process.env.QDRANT_COLLECTION || 'claude-code-docs',
        timeout: 90000,
        vectorSize: 768,
      },
      ollama: {
        vps: {
          url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
          embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
          summarizeModel: process.env.OLLAMA_SUMMARIZE_MODEL || 'llama3.2',
          timeout: 90000,
          maxRetries: 3,
        },
        local: { enabled: false },
      },
      openai: { enabled: false },
      localCache: { enabled: false },
      knowledgeGraph: { enabled: true },
      search: {
        semantic: { enabled: true, weight: 1.0, topK: 5, minScore: 0.7 },
        graph: { enabled: false },
      },
      summarization: { enabled: false },
      mcp: { enabled: false },
      logging: { level: 'error', format: 'json' },
    });
  }

  /**
   * Initialize the handler
   */
  async initialize(): Promise<void> {
    await this.kb.initialize();
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.config.secret) {
      return true; // No secret configured, skip verification
    }

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.config.secret);
    const digest = hmac.update(payload).digest('hex');
    const expectedSignature = `sha256=${digest}`;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Check if repository is allowed
   */
  private isRepoAllowed(repoFullName: string): boolean {
    if (this.config.repoAllowlist!.length === 0) {
      return true; // No allowlist configured
    }
    return this.config.repoAllowlist!.includes(repoFullName);
  }

  /**
   * Check if branch is allowed
   */
  private isBranchAllowed(ref: string): boolean {
    const branch = ref.replace('refs/heads/', '');
    return this.config.branchAllowlist!.includes(branch);
  }

  /**
   * Filter files by extension
   */
  private filterFiles(files: string[]): string[] {
    return files.filter(file =>
      this.config.fileExtensions!.some(ext => file.endsWith(ext))
    );
  }

  /**
   * Extract changed files from webhook payload
   */
  extractChangedFiles(payload: GitHubWebhookPayload): string[] {
    const changedFiles = new Set<string>();

    for (const commit of payload.commits) {
      commit.added.forEach(file => changedFiles.add(file));
      commit.modified.forEach(file => changedFiles.add(file));
    }

    return Array.from(changedFiles);
  }

  /**
   * Convert URL to doc content
   * For Claude Code docs, fetch from code.claude.com
   */
  private async fetchDocContent(url: string): Promise<string> {
    // If it's a Claude Code doc URL, fetch from code.claude.com
    if (url.includes('code.claude.com') || url.includes('claude.com')) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const contentMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ||
                         html.match(/<article[^>]*>([\s\S]*?)<\/article>/);

      if (contentMatch) {
        return contentMatch[1]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '\n')
          .replace(/\n+/g, '\n')
          .trim();
      }

      throw new Error('Could not extract content from HTML');
    }

    // For GitHub URLs, we'd need to fetch raw content
    // This is a simplified version - in production, use GitHub API
    throw new Error(`Unsupported URL: ${url}`);
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: GitHubWebhookPayload): Promise<WebhookResult> {
    try {
      // Validate repository
      if (!this.isRepoAllowed(payload.repository.full_name)) {
        return {
          success: false,
          message: `Repository ${payload.repository.full_name} not in allowlist`,
        };
      }

      // Validate branch
      if (!this.isBranchAllowed(payload.ref)) {
        return {
          success: false,
          message: `Branch ${payload.ref} not in allowlist`,
        };
      }

      // Extract changed files
      const changedFiles = this.extractChangedFiles(payload);
      const docFiles = this.filterFiles(changedFiles);

      if (docFiles.length === 0) {
        return {
          success: true,
          message: 'No documentation files changed',
          documentsProcessed: 0,
        };
      }

      if (!this.config.autoIngest) {
        return {
          success: true,
          message: `Found ${docFiles.length} changed docs (auto-ingest disabled)`,
          documentsProcessed: 0,
        };
      }

      // Ingest updated documents
      const documents: IngestDocument[] = [];
      const errors: string[] = [];

      for (const file of docFiles) {
        try {
          const docUrl = `https://code.claude.com/docs/en/${file.replace(/\.md$/, '')}`;
          const content = await this.fetchDocContent(docUrl);

          documents.push({
            source: {
              repo: payload.repository.full_name,
              path: file,
              language: 'markdown',
            },
            content: content,
            metadata: {
              title: file,
              url: docUrl,
              source: 'github-webhook',
              category: 'claude-code',
              ingestedAt: new Date().toISOString(),
              branch: payload.ref.replace('refs/heads/', ''),
              commit: payload.after,
            },
          });
        } catch (error) {
          errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (documents.length === 0) {
        return {
          success: false,
          message: 'Failed to fetch any documents',
          errors,
        };
      }

      // Ingest into KB
      const result = await this.kb.ingest(documents);

      return {
        success: true,
        message: `Processed ${documents.length} documents`,
        documentsProcessed: result.documentsProcessed,
        nodesCreated: result.nodesCreated,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };

    } catch (error) {
      return {
        success: false,
        message: `Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Shutdown handler
   */
  async shutdown(): Promise<void> {
    await this.kb.shutdown();
  }
}

/**
 * Create Hono handler for GitHub webhooks
 */
export async function createGitHubWebhookRoute(config: WebhookConfig = {}) {
  const { Hono } = await import('hono');
  const app = new Hono();
  const handler = new GitHubWebhookHandler(config);

  await handler.initialize();

  app.post('/webhooks/github', async (c) => {
    // Verify signature
    const signature = c.req.header('x-hub-signature-256');
    if (signature && !handler.verifySignature(await c.req.text(), signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const payload = await c.req.json() as GitHubWebhookPayload;

    // Check if this is a push event
    if (c.req.header('x-github-event') !== 'push') {
      return c.json({ message: 'Event ignored (not a push event)' }, 200);
    }

    // Process webhook
    const result = await handler.processWebhook(payload);

    if (result.success) {
      return c.json({
        message: result.message,
        documentsProcessed: result.documentsProcessed,
        nodesCreated: result.nodesCreated,
      }, 200);
    } else {
      return c.json({
        error: result.message,
        errors: result.errors,
      }, 400);
    }
  });

  app.get('/webhooks/github', (c) => {
    return c.json({ status: 'ok', service: 'github-webhook' });
  });

  return app;
}
