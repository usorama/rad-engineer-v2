/**
 * PlanningAPIHandler - Planning workflow integration (Phase 1 - Mock Implementation)
 *
 * Implements 10 IPC channels for /plan workflow:
 * 1. startIntake - Initialize intake session
 * 2. submitAnswers - Submit user answers to questions
 * 3. startResearch - Start research phase
 * 4. getResearchStatus - Get research progress
 * 5. getResearchFindings - Get completed research results
 * 6. generatePlan - Generate implementation plan
 * 7. validatePlan - Validate plan structure
 * 8. savePlan - Persist plan to storage
 * 9. updatePlan - Update existing plan
 * 10. getQuestions - Get current questions for session
 *
 * Real-time events:
 * - intake-progress: Progress during intake phase
 * - research-agent-update: Individual agent status updates
 * - research-complete: Research phase completion
 * - plan-generated: Plan generation completion
 *
 * NOTE: Phase 1 uses mock implementations with placeholder data.
 * Phase 2 will integrate with actual rad-engineer /plan system.
 */

import { EventEmitter } from "events";

/**
 * Configuration for PlanningAPIHandler
 */
export interface PlanningAPIHandlerConfig {
  /** Project directory path */
  projectDir: string;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * Intake question structure
 */
export interface IntakeQuestion {
  id: string;
  question: string;
  type: "text" | "choice" | "multi-choice";
  required: boolean;
  options?: string[];
}

/**
 * Research agent info
 */
export interface ResearchAgent {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number;
}

/**
 * Research finding
 */
export interface ResearchFinding {
  category: string;
  title: string;
  description: string;
  confidence: number;
}

/**
 * Wave structure for planning
 */
export interface Wave {
  id: string;
  name: string;
  tasks: Array<{
    id: string;
    description: string;
    dependencies: string[];
  }>;
}

/**
 * Generated plan structure
 */
export interface GeneratedPlan {
  id: string;
  description: string;
  waves: Wave[];
  estimatedDuration: number;
}

/**
 * PlanningAPIHandler - Mock implementation for Phase 1
 *
 * @example
 * ```ts
 * const handler = new PlanningAPIHandler({
 *   projectDir: "/path/to/project",
 *   debug: true,
 * });
 *
 * // Start intake
 * const { sessionId } = await handler.startIntake();
 *
 * // Listen for events
 * handler.on("intake-progress", (event) => {
 *   console.log(event.message);
 * });
 * ```
 */
interface IntakeSession {
  id: string;
  questions: IntakeQuestion[];
  answers: Record<string, string | string[]>;
  startedAt: string;
  complete?: boolean;
}

interface ResearchSession {
  id: string;
  sessionId: string;
  agents: ResearchAgent[];
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  findings?: ResearchFinding[];
}

export class PlanningAPIHandler extends EventEmitter {
  private readonly config: PlanningAPIHandlerConfig;
  private readonly sessions: Map<string, IntakeSession> = new Map();
  private readonly plans: Map<string, GeneratedPlan> = new Map();
  private readonly research: Map<string, ResearchSession> = new Map();

  constructor(config: PlanningAPIHandlerConfig) {
    super();
    this.config = config;

    if (this.config.debug) {
      console.log(`[PlanningAPIHandler] Initialized for project: ${config.projectDir}`);
    }
  }

  /**
   * Start intake workflow
   * IPC: planning:start-intake
   *
   * @returns Session ID and initial questions
   */
  async startIntake(): Promise<{
    success: boolean;
    sessionId: string;
    questions?: IntakeQuestion[];
    error?: string;
  }> {
    try {
      const sessionId = `intake-session-${Date.now()}`;

      // Mock initial questions
      const questions: IntakeQuestion[] = [
        {
          id: "q1",
          question: "What is the main goal of this project?",
          type: "text",
          required: true,
        },
        {
          id: "q2",
          question: "What technologies are you using?",
          type: "multi-choice",
          required: true,
          options: ["React", "Node.js", "Python", "Go", "TypeScript"],
        },
        {
          id: "q3",
          question: "What is your timeline?",
          type: "choice",
          required: false,
          options: ["1 week", "2 weeks", "1 month", "3+ months"],
        },
      ];

      // Store session
      this.sessions.set(sessionId, {
        id: sessionId,
        questions,
        answers: {},
        startedAt: new Date().toISOString(),
      });

      // Emit progress event
      this.emit("intake-progress", {
        sessionId,
        progress: 0,
        message: "Intake session started",
        timestamp: new Date().toISOString(),
      });

      if (this.config.debug) {
        console.log(`[PlanningAPIHandler] Started intake session: ${sessionId}`);
      }

      return {
        success: true,
        sessionId,
        questions,
      };
    } catch (error) {
      return {
        success: false,
        sessionId: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Submit answers to intake questions
   * IPC: planning:submit-answers
   *
   * @param sessionId - Session ID from startIntake
   * @param answers - User answers keyed by question ID
   * @returns Next questions or completion status
   */
  async submitAnswers(
    sessionId: string,
    answers: Record<string, string | string[]>
  ): Promise<{
    success: boolean;
    complete: boolean;
    nextQuestions?: IntakeQuestion[];
    error?: string;
  }> {
    try {
      if (!sessionId) {
        return {
          success: false,
          complete: false,
          error: "Session ID is required",
        };
      }

      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          complete: false,
          error: "Session not found",
        };
      }

      // Store answers
      Object.assign(session.answers, answers);

      // Calculate progress
      const totalQuestions = session.questions.length;
      const answeredQuestions = Object.keys(session.answers).length;
      const progress = Math.round((answeredQuestions / totalQuestions) * 100);

      // Emit progress
      this.emit("intake-progress", {
        sessionId,
        progress,
        message: `Answered ${answeredQuestions}/${totalQuestions} questions`,
        timestamp: new Date().toISOString(),
      });

      // Check if complete (all required questions answered)
      const allRequiredAnswered = session.questions
        .filter((q: IntakeQuestion) => q.required)
        .every((q: IntakeQuestion) => session.answers[q.id] !== undefined);

      if (allRequiredAnswered && answeredQuestions >= 3) {
        // Mark complete
        session.complete = true;

        this.emit("intake-progress", {
          sessionId,
          progress: 100,
          message: "Intake complete",
          timestamp: new Date().toISOString(),
        });

        if (this.config.debug) {
          console.log(`[PlanningAPIHandler] Intake session complete: ${sessionId}`);
        }

        return {
          success: true,
          complete: true,
        };
      }

      // Return next questions (mock)
      const nextQuestions: IntakeQuestion[] = [
        {
          id: "q4",
          question: "Any additional requirements?",
          type: "text",
          required: false,
        },
      ];

      return {
        success: true,
        complete: false,
        nextQuestions,
      };
    } catch (error) {
      return {
        success: false,
        complete: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current questions for session
   * IPC: planning:get-questions
   *
   * @param sessionId - Session ID
   * @returns Current questions
   */
  async getQuestions(sessionId: string): Promise<{
    success: boolean;
    questions?: IntakeQuestion[];
    error?: string;
  }> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: "Session not found",
        };
      }

      return {
        success: true,
        questions: session.questions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Start research phase
   * IPC: planning:start-research
   *
   * @param sessionId - Session ID from intake
   * @returns Research ID and agent info
   */
  async startResearch(sessionId: string): Promise<{
    success: boolean;
    researchId?: string;
    agents?: ResearchAgent[];
    error?: string;
  }> {
    try {
      const researchId = `research-${Date.now()}`;

      // Mock research agents
      const agents: ResearchAgent[] = [
        {
          id: "agent-1",
          name: "Requirements Analyzer",
          status: "pending",
          progress: 0,
        },
        {
          id: "agent-2",
          name: "Technology Scout",
          status: "pending",
          progress: 0,
        },
        {
          id: "agent-3",
          name: "Architecture Advisor",
          status: "pending",
          progress: 0,
        },
      ];

      // Store research
      this.research.set(researchId, {
        id: researchId,
        sessionId,
        agents,
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      // Simulate async agent execution
      setTimeout(() => {
        this.simulateResearchAgents(researchId, agents);
      }, 50);

      if (this.config.debug) {
        console.log(`[PlanningAPIHandler] Started research: ${researchId}`);
      }

      return {
        success: true,
        researchId,
        agents,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Simulate research agent execution (mock)
   */
  private simulateResearchAgents(researchId: string, agents: ResearchAgent[]): void {
    const research = this.research.get(researchId);
    if (!research) return;

    // Simulate agent progress
    agents.forEach((agent, index) => {
      setTimeout(() => {
        agent.status = "in_progress";
        agent.progress = 50;

        this.emit("research-agent-update", {
          researchId,
          agentId: agent.id,
          status: agent.status,
          progress: agent.progress,
          message: `${agent.name} analyzing...`,
          timestamp: new Date().toISOString(),
        });

        // Complete agent
        setTimeout(() => {
          agent.status = "completed";
          agent.progress = 100;

          this.emit("research-agent-update", {
            researchId,
            agentId: agent.id,
            status: agent.status,
            progress: agent.progress,
            message: `${agent.name} completed`,
            timestamp: new Date().toISOString(),
          });

          // Check if all agents complete
          if (agents.every((a) => a.status === "completed")) {
            research.status = "completed";
            research.completedAt = new Date().toISOString();

            // Mock findings
            research.findings = [
              {
                category: "Requirements",
                title: "Core functionality identified",
                description: "Main features and user stories extracted",
                confidence: 0.9,
              },
              {
                category: "Technology",
                title: "Stack compatibility verified",
                description: "Selected technologies are compatible",
                confidence: 0.85,
              },
              {
                category: "Architecture",
                title: "Recommended architecture pattern",
                description: "Microservices pattern suggested",
                confidence: 0.8,
              },
            ];

            this.emit("research-complete", {
              researchId,
              sessionId: research.sessionId,
              findings: research.findings,
              timestamp: new Date().toISOString(),
            });

            if (this.config.debug) {
              console.log(`[PlanningAPIHandler] Research complete: ${researchId}`);
            }
          }
        }, 50 + index * 10);
      }, 10 + index * 10);
    });
  }

  /**
   * Get research status
   * IPC: planning:get-research-status
   *
   * @param researchId - Research ID
   * @returns Research status and agent progress
   */
  async getResearchStatus(researchId: string): Promise<{
    success: boolean;
    status?: "pending" | "in_progress" | "completed" | "failed";
    agents?: ResearchAgent[];
    error?: string;
  }> {
    try {
      if (!researchId) {
        return {
          success: false,
          error: "Research ID is required",
        };
      }

      const research = this.research.get(researchId);
      if (!research) {
        // Return mock status for non-existent research
        return {
          success: true,
          status: "pending",
          agents: [],
        };
      }

      return {
        success: true,
        status: research.status,
        agents: research.agents,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get research findings
   * IPC: planning:get-research-findings
   *
   * @param researchId - Research ID
   * @returns Research findings
   */
  async getResearchFindings(researchId: string): Promise<{
    success: boolean;
    findings?: ResearchFinding[];
    error?: string;
  }> {
    try {
      const research = this.research.get(researchId);
      if (!research) {
        return {
          success: false,
          error: "Research not found",
        };
      }

      if (research.status !== "completed") {
        return {
          success: false,
          error: "Research not completed yet",
        };
      }

      return {
        success: true,
        findings: research.findings,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate implementation plan
   * IPC: planning:generate-plan
   *
   * @param sessionId - Session ID
   * @returns Generated plan
   */
  async generatePlan(sessionId: string): Promise<{
    success: boolean;
    planId?: string;
    plan?: GeneratedPlan;
    error?: string;
  }> {
    try {
      const planId = `plan-${Date.now()}`;

      // Mock generated plan
      const plan: GeneratedPlan = {
        id: planId,
        description: "Implementation plan for project",
        waves: [
          {
            id: "wave-1",
            name: "Foundation Setup",
            tasks: [
              {
                id: "task-1",
                description: "Initialize project structure",
                dependencies: [],
              },
              {
                id: "task-2",
                description: "Configure build system",
                dependencies: ["task-1"],
              },
            ],
          },
          {
            id: "wave-2",
            name: "Core Implementation",
            tasks: [
              {
                id: "task-3",
                description: "Implement main features",
                dependencies: ["task-2"],
              },
            ],
          },
        ],
        estimatedDuration: 14, // days
      };

      // Store plan
      this.plans.set(planId, plan);

      // Emit event
      this.emit("plan-generated", {
        sessionId,
        planId,
        plan,
        timestamp: new Date().toISOString(),
      });

      if (this.config.debug) {
        console.log(`[PlanningAPIHandler] Generated plan: ${planId}`);
      }

      return {
        success: true,
        planId,
        plan,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate plan structure
   * IPC: planning:validate-plan
   *
   * @param planId - Plan ID
   * @returns Validation result
   */
  async validatePlan(planId: string): Promise<{
    success: boolean;
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }> {
    try {
      const plan = this.plans.get(planId);

      if (!plan) {
        // Non-existent plan is invalid
        return {
          success: true,
          valid: false,
          errors: ["Plan not found"],
          warnings: [],
        };
      }

      // Mock validation
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!plan.waves || plan.waves.length === 0) {
        errors.push("Plan must have at least one wave");
      }

      if (plan.estimatedDuration > 30) {
        warnings.push("Estimated duration exceeds recommended 30 days");
      }

      return {
        success: true,
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Save plan to storage
   * IPC: planning:save-plan
   *
   * @param planId - Plan ID
   * @returns Saved path
   */
  async savePlan(planId: string): Promise<{
    success: boolean;
    savedPath?: string;
    error?: string;
  }> {
    try {
      const plan = this.plans.get(planId);
      if (!plan) {
        return {
          success: false,
          error: "Plan not found",
        };
      }

      // Mock save path
      const savedPath = `${this.config.projectDir}/.rad-engineer/plans/${planId}.json`;

      if (this.config.debug) {
        console.log(`[PlanningAPIHandler] Saved plan to: ${savedPath}`);
      }

      return {
        success: true,
        savedPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update existing plan
   * IPC: planning:update-plan
   *
   * @param planId - Plan ID
   * @param updates - Plan updates
   * @returns Updated plan
   */
  async updatePlan(
    planId: string,
    updates: Partial<GeneratedPlan>
  ): Promise<{
    success: boolean;
    plan?: GeneratedPlan;
    error?: string;
  }> {
    try {
      const plan = this.plans.get(planId);
      if (!plan) {
        // Create new plan if not exists (for testing)
        const newPlan: GeneratedPlan = {
          id: planId,
          description: updates.description || "Updated plan",
          waves: updates.waves || [],
          estimatedDuration: updates.estimatedDuration || 7,
        };

        this.plans.set(planId, newPlan);

        // Emit event
        this.emit("plan-generated", {
          planId,
          plan: newPlan,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          plan: newPlan,
        };
      }

      // Apply updates
      Object.assign(plan, updates);

      // Emit event
      this.emit("plan-generated", {
        planId,
        plan,
        timestamp: new Date().toISOString(),
      });

      if (this.config.debug) {
        console.log(`[PlanningAPIHandler] Updated plan: ${planId}`);
      }

      return {
        success: true,
        plan,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
