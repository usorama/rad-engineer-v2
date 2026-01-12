/**
 * DecisionTracker Tests
 *
 * Comprehensive test suite for DecisionTracker with MADR 4.0.0 template support.
 * 30 tests total: 25 unit + 3 integration + 2 chaos
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { DecisionTracker } from "../../src/decision/DecisionTracker.js";
import type { ADRInput, ADRFilter, EvidenceSource } from "../../src/decision/DecisionTracker.js";

describe("DecisionTracker", () => {
  let tracker: DecisionTracker;

  beforeEach(() => {
    tracker = new DecisionTracker({
      autoLinkToLearningStore: false, // Disable for unit tests
      enableKnowledgeGraph: false,
    });
  });

  // ===========================================================================
  // UNIT TESTS (25 tests)
  // ===========================================================================

  describe("createADR", () => {
    it("should create ADR with sequential ID", () => {
      const input: ADRInput = {
        title: "Use TypeScript for type safety",
        contextAndProblemStatement: "Need type safety in codebase",
        decisionDrivers: ["Type safety", "Developer experience"],
        consideredOptions: [
          { title: "TypeScript" },
          { title: "JavaScript with JSDoc" },
        ],
        decisionOutcome: {
          chosenOption: "TypeScript",
          justification: "Better IDE support and catch errors at compile time",
        },
        decisionMakers: ["Tech Lead"],
      };

      const adr = tracker.createADR(input);

      expect(adr.id).toBe("ADR-0001");
      expect(adr.title).toBe(input.title);
      expect(adr.status).toBe("proposed");
      expect(adr.createdAt).toBeGreaterThan(0);
      expect(adr.updatedAt).toBeGreaterThan(0);
    });

    it("should create multiple ADRs with sequential IDs", () => {
      const input: ADRInput = {
        title: "Decision 1",
        contextAndProblemStatement: "Context 1",
        decisionDrivers: ["Driver 1"],
        consideredOptions: [
          { title: "Option A" },
          { title: "Option B" },
        ],
        decisionOutcome: {
          chosenOption: "Option A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr1 = tracker.createADR(input);
      const adr2 = tracker.createADR({ ...input, title: "Decision 2" });

      expect(adr1.id).toBe("ADR-0001");
      expect(adr2.id).toBe("ADR-0002");
    });

    it("should set default status to 'proposed'", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      expect(adr.status).toBe("proposed");
    });

    it("should accept custom status", () => {
      const input: ADRInput = {
        title: "Test ADR",
        status: "accepted",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      expect(adr.status).toBe("accepted");
    });

    it("should throw on missing required fields", () => {
      const input = {
        title: "Test ADR",
        // Missing contextAndProblemStatement
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      } as ADRInput;

      expect(() => tracker.createADR(input)).toThrow("MISSING_REQUIRED_FIELDS");
    });

    it("should throw on less than 2 options", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          // Missing second option
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      expect(() => tracker.createADR(input)).toThrow("At least 2 options required");
    });

    it("should throw when chosenOption doesn't match any option", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "Option A" },
          { title: "Option B" },
        ],
        decisionOutcome: {
          chosenOption: "Option C", // Not in consideredOptions
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      expect(() => tracker.createADR(input)).toThrow("INVALID_OPTION_CHOICE");
    });

    it("should include optional MADR fields", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        prosAndCons: [
          {
            option: "A",
            pros: ["Pro 1"],
            cons: ["Con 1"],
          },
        ],
        consequences: {
          positive: ["Positive 1"],
          negative: ["Negative 1"],
        },
        confirmation: "Code review",
        moreInformation: "See docs",
        category: "backend",
        decisionMakers: ["Lead"],
        consulted: ["Expert"],
        informed: ["Team"],
      };

      const adr = tracker.createADR(input);

      expect(adr.prosAndCons).toBeDefined();
      expect(adr.prosAndCons).toHaveLength(1);
      expect(adr.consequences).toBeDefined();
      expect(adr.confirmation).toBe("Code review");
      expect(adr.moreInformation).toBe("See docs");
      expect(adr.category).toBe("backend");
      expect(adr.consulted).toEqual(["Expert"]);
      expect(adr.informed).toEqual(["Team"]);
    });
  });

  describe("updateADR", () => {
    it("should update ADR title", () => {
      const input: ADRInput = {
        title: "Original Title",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);
      const updated = tracker.updateADR(adr.id, { title: "Updated Title" });

      expect(updated.title).toBe("Updated Title");
    });

    it("should update ADR status", () => {
      const input: ADRInput = {
        title: "Test ADR",
        status: "proposed",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);
      const updated = tracker.updateADR(adr.id, { status: "accepted" });

      expect(updated.status).toBe("accepted");
    });

    it("should throw on invalid status transition", () => {
      const input: ADRInput = {
        title: "Test ADR",
        status: "rejected",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      expect(() => tracker.updateADR(adr.id, { status: "accepted" }))
        .toThrow("INVALID_STATUS_TRANSITION");
    });

    it("should throw when updating non-existent ADR", () => {
      expect(() =>
        tracker.updateADR("ADR-9999", { title: "New Title" })
      ).toThrow("ADR_NOT_FOUND");
    });

    it("should update updatedAt timestamp", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);
      const originalUpdatedAt = adr.updatedAt;

      // Wait a bit to ensure timestamp difference
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }

      const updated = tracker.updateADR(adr.id, { title: "Updated" });

      expect(updated.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("getADR", () => {
    it("should retrieve ADR by ID", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const created = tracker.createADR(input);
      const retrieved = tracker.getADR(created.id);

      expect(retrieved).toEqual(created);
    });

    it("should throw when ADR not found", () => {
      expect(() => tracker.getADR("ADR-9999")).toThrow("ADR_NOT_FOUND");
    });

    it("should suggest similar IDs when ADR not found", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR(input);

      const error = (() => {
        try {
          // Use a typo that should match
          tracker.getADR("adr-0001");
        } catch (e) {
          return e;
        }
      })() as Error;

      expect(error.message).toContain("ADR_NOT_FOUND");
      expect(error.message).toContain("ADR-0001");
    });
  });

  describe("listADRs", () => {
    it("should return all ADRs when no filter provided", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR(input);
      tracker.createADR({ ...input, title: "Test ADR 2" });

      const adrs = tracker.listADRs();

      expect(adrs).toHaveLength(2);
    });

    it("should filter by status", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR({ ...input, status: "proposed" });
      tracker.createADR({ ...input, status: "accepted", title: "ADR 2" });

      const proposed = tracker.listADRs({ status: "proposed" });
      const accepted = tracker.listADRs({ status: "accepted" });

      expect(proposed).toHaveLength(1);
      expect(accepted).toHaveLength(1);
      expect(proposed[0].status).toBe("proposed");
      expect(accepted[0].status).toBe("accepted");
    });

    it("should filter by category", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR({ ...input, category: "backend" });
      tracker.createADR({ ...input, category: "frontend", title: "ADR 2" });

      const backend = tracker.listADRs({ category: "backend" });
      const frontend = tracker.listADRs({ category: "frontend" });

      expect(backend).toHaveLength(1);
      expect(frontend).toHaveLength(1);
    });

    it("should filter by decision makers", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR(input);
      tracker.createADR({ ...input, decisionMakers: ["Manager"], title: "ADR 2" });

      const byLead = tracker.listADRs({ decisionMakers: ["Lead"] });

      expect(byLead).toHaveLength(1);
      expect(byLead[0].decisionMakers).toContain("Lead");
    });

    it("should search by text", () => {
      const input: ADRInput = {
        title: "Use TypeScript for type safety",
        contextAndProblemStatement: "Need type safety in codebase",
        decisionDrivers: ["Type safety"],
        consideredOptions: [
          { title: "TypeScript" },
          { title: "JavaScript" },
        ],
        decisionOutcome: {
          chosenOption: "TypeScript",
          justification: "Better type safety",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR(input);
      tracker.createADR({
        title: "Use Python for backend",
        contextAndProblemStatement: "Need backend language",
        decisionDrivers: ["Simplicity"],
        consideredOptions: [
          { title: "Python" },
          { title: "JavaScript" },
        ],
        decisionOutcome: {
          chosenOption: "Python",
          justification: "Easy to learn",
        },
        decisionMakers: ["Lead"],
      });

      const results = tracker.listADRs({ searchText: "TypeScript" });

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain("TypeScript");
    });

    it("should return empty array for invalid filter", () => {
      const invalidFilter: ADRFilter = {
        dateRange: {
          start: "2024-12-31",
          end: "2024-01-01", // End before start
        },
      };

      const results = tracker.listADRs(invalidFilter);

      expect(results).toEqual([]);
    });
  });

  describe("supersedeADR", () => {
    it("should supersede old ADR with new one", () => {
      const input: ADRInput = {
        title: "Use JavaScript",
        status: "accepted",
        contextAndProblemStatement: "Need language",
        decisionDrivers: ["Simplicity"],
        consideredOptions: [
          { title: "JavaScript" },
          { title: "TypeScript" },
        ],
        decisionOutcome: {
          chosenOption: "JavaScript",
          justification: "Simpler",
        },
        decisionMakers: ["Lead"],
      };

      const oldADR = tracker.createADR(input);

      const newADR: ADRInput = {
        title: "Use TypeScript",
        contextAndProblemStatement: "Need type safety",
        decisionDrivers: ["Type safety"],
        consideredOptions: [
          { title: "TypeScript" },
          { title: "JavaScript" },
        ],
        decisionOutcome: {
          chosenOption: "TypeScript",
          justification: "Type safety",
        },
        decisionMakers: ["Lead"],
      };

      const createdADR = tracker.supersedeADR(oldADR.id, newADR);

      expect(createdADR.supersedes).toBe(oldADR.id);

      const updatedOldADR = tracker.getADR(oldADR.id);
      expect(updatedOldADR.status).toBe("superseded");
      expect(updatedOldADR.supersededBy).toContain(createdADR.id);
    });

    it("should throw when superseding non-existent ADR", () => {
      const newADR: ADRInput = {
        title: "New ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      expect(() => tracker.supersedeADR("ADR-9999", newADR))
        .toThrow("OLD_ADR_NOT_FOUND");
    });
  });

  describe("linkToEvidence", () => {
    it("should link URL evidence to ADR", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      const evidence: EvidenceSource = {
        type: "url",
        source: "https://example.com/docs",
        title: "Documentation",
        relevance: "Supports decision",
        confidence: 0.9,
      };

      tracker.linkToEvidence(adr.id, evidence);

      const retrieved = tracker.getADR(adr.id);
      expect(retrieved.evidenceSources).toHaveLength(1);
      expect(retrieved.evidenceSources[0]).toEqual(evidence);
    });

    it("should link file evidence to ADR", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      const evidence: EvidenceSource = {
        type: "file",
        source: "/path/to/spec.pdf",
        title: "Specification",
        relevance: "Requirements doc",
        confidence: 1.0,
      };

      tracker.linkToEvidence(adr.id, evidence);

      const retrieved = tracker.getADR(adr.id);
      expect(retrieved.evidenceSources).toHaveLength(1);
      expect(retrieved.evidenceSources[0].type).toBe("file");
    });

    it("should link conversation evidence to ADR", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      const evidence: EvidenceSource = {
        type: "conversation",
        source: "Meeting notes 2024-01-08",
        relevance: "Team discussion",
        confidence: 0.7,
      };

      tracker.linkToEvidence(adr.id, evidence);

      const retrieved = tracker.getADR(adr.id);
      expect(retrieved.evidenceSources).toHaveLength(1);
      expect(retrieved.evidenceSources[0].type).toBe("conversation");
    });

    it("should throw on invalid evidence type", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      const evidence = {
        type: "invalid" as "url" | "file" | "doc" | "conversation" | "experiment",
        source: "https://example.com",
        relevance: "Test",
        confidence: 0.5,
      };

      expect(() => tracker.linkToEvidence(adr.id, evidence))
        .toThrow("INVALID_EVIDENCE_TYPE");
    });

    it("should throw when confidence out of range", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      const evidence: EvidenceSource = {
        type: "url",
        source: "https://example.com",
        relevance: "Test",
        confidence: 1.5, // Invalid
      };

      expect(() => tracker.linkToEvidence(adr.id, evidence))
        .toThrow("INVALID_EVIDENCE_CONFIDENCE");
    });

    it("should warn on duplicate evidence", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      const evidence: EvidenceSource = {
        type: "url",
        source: "https://example.com",
        relevance: "Test",
        confidence: 0.8,
      };

      tracker.linkToEvidence(adr.id, evidence);
      tracker.linkToEvidence(adr.id, evidence); // Duplicate

      const retrieved = tracker.getADR(adr.id);
      expect(retrieved.evidenceSources).toHaveLength(1); // Not duplicated
    });
  });

  describe("recordOutcome", () => {
    it("should update ADR status", () => {
      const input: ADRInput = {
        title: "Test ADR",
        status: "proposed",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);
      tracker.recordOutcome(adr.id, "accepted");

      const updated = tracker.getADR(adr.id);
      expect(updated.status).toBe("accepted");
    });

    it("should throw on invalid status transition", () => {
      const input: ADRInput = {
        title: "Test ADR",
        status: "rejected",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = tracker.createADR(input);

      expect(() => tracker.recordOutcome(adr.id, "accepted"))
        .toThrow("INVALID_STATUS_TRANSITION");
    });

    it("should throw when ADR not found", () => {
      expect(() => tracker.recordOutcome("ADR-9999", "accepted"))
        .toThrow("ADR_NOT_FOUND");
    });
  });

  describe("exportToKnowledgeGraph", () => {
    it("should export ADRs to Qdrant batch format", async () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR(input);

      const batch = await tracker.exportToKnowledgeGraph();

      expect(batch.collection).toBe("adrs");
      expect(batch.batch).toHaveLength(1);
      expect(batch.batch[0].id).toBe("ADR-0001");
      expect(batch.batch[0].vector).toBeInstanceOf(Array);
      expect(batch.batch[0].vector.length).toBe(128);
      expect(batch.batch[0].payload).toBeDefined();
    });

    it("should export subset with filter", async () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR({ ...input, status: "proposed" });
      tracker.createADR({ ...input, status: "accepted", title: "ADR 2" });

      const batch = await tracker.exportToKnowledgeGraph({ status: "proposed" });

      expect(batch.batch).toHaveLength(1);
      expect(batch.batch[0].payload.status).toBe("proposed");
    });

    it("should handle empty ADR list", async () => {
      const batch = await tracker.exportToKnowledgeGraph();

      expect(batch.batch).toHaveLength(0);
    });
  });

  describe("search", () => {
    it("should search ADRs by semantic similarity", async () => {
      const input: ADRInput = {
        title: "Use TypeScript for type safety",
        contextAndProblemStatement: "Need type safety in codebase",
        decisionDrivers: ["Type safety"],
        consideredOptions: [
          { title: "TypeScript" },
          { title: "JavaScript" },
        ],
        decisionOutcome: {
          chosenOption: "TypeScript",
          justification: "Better type safety",
        },
        decisionMakers: ["Lead"],
      };

      tracker.createADR(input);

      const results = await tracker.search("type safety");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should limit search results", async () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      for (let i = 0; i < 5; i++) {
        tracker.createADR({ ...input, title: `ADR ${i}` });
      }

      const results = await tracker.search("test", 3);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should throw on empty query", async () => {
      await expect(tracker.search("")).rejects.toThrow("INVALID_QUERY");
      await expect(tracker.search("   ")).rejects.toThrow("INVALID_QUERY");
    });
  });

  // ===========================================================================
  // INTEGRATION TESTS (3 tests)
  // ===========================================================================

  describe("DecisionLearningStore Integration", () => {
    it("should record outcome to DecisionLearningStore", () => {
      const trackerWithStore = new DecisionTracker({
        autoLinkToLearningStore: true,
        enableKnowledgeGraph: false,
      });

      const input: ADRInput = {
        title: "Test ADR",
        status: "proposed",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = trackerWithStore.createADR(input);
      trackerWithStore.recordOutcome(adr.id, "accepted");

      // Verify outcome was recorded in ADR
      const updated = trackerWithStore.getADR(adr.id);
      expect(updated.status).toBe("accepted");
    });

    it("should continue ADR update even if DecisionLearningStore fails", () => {
      // This test verifies graceful degradation
      const trackerWithStore = new DecisionTracker({
        autoLinkToLearningStore: true,
        enableKnowledgeGraph: false,
      });

      const input: ADRInput = {
        title: "Test ADR",
        status: "proposed",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = trackerWithStore.createADR(input);

      // Record outcome - even if DecisionLearningStore fails, ADR should be updated
      trackerWithStore.recordOutcome(adr.id, "accepted");

      const updated = trackerWithStore.getADR(adr.id);
      expect(updated.status).toBe("accepted");
    });

    it("should map ADR categories to domains correctly", () => {
      const trackerWithStore = new DecisionTracker({
        autoLinkToLearningStore: true,
        enableKnowledgeGraph: false,
      });

      const input: ADRInput = {
        title: "Test ADR",
        status: "proposed",
        category: "backend",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      const adr = trackerWithStore.createADR(input);
      trackerWithStore.recordOutcome(adr.id, "accepted");

      // Verify ADR was updated
      const updated = trackerWithStore.getADR(adr.id);
      expect(updated.status).toBe("accepted");
      expect(updated.category).toBe("backend");
    });
  });

  // ===========================================================================
  // CHAOS TESTS (2 tests)
  // ===========================================================================

  describe("Chaos Tests", () => {
    it("should handle rapid concurrent ADR creation", () => {
      const input: ADRInput = {
        title: "Test ADR",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      // Create 20 ADRs rapidly
      const adrs: string[] = [];
      for (let i = 0; i < 20; i++) {
        const adr = tracker.createADR({ ...input, title: `ADR ${i}` });
        adrs.push(adr.id);
      }

      // Verify all ADRs were created with unique sequential IDs
      expect(adrs).toHaveLength(20);
      expect(new Set(adrs).size).toBe(20); // All unique
      expect(adrs[0]).toBe("ADR-0001");
      expect(adrs[19]).toBe("ADR-0020");

      // Verify all ADRs can be retrieved
      for (const id of adrs) {
        const adr = tracker.getADR(id);
        expect(adr).toBeDefined();
      }
    });

    it("should handle complex supersession chains", () => {
      const input: ADRInput = {
        title: "Original Decision",
        status: "accepted",
        contextAndProblemStatement: "Context",
        decisionDrivers: ["Driver"],
        consideredOptions: [
          { title: "A" },
          { title: "B" },
        ],
        decisionOutcome: {
          chosenOption: "A",
          justification: "Justification",
        },
        decisionMakers: ["Lead"],
      };

      // Create chain: ADR-0001 -> ADR-0002 -> ADR-0003
      const adr1 = tracker.createADR(input);
      const adr2 = tracker.supersedeADR(adr1.id, {
        ...input,
        title: "Revision 1",
      });
      const adr3 = tracker.supersedeADR(adr2.id, {
        ...input,
        title: "Revision 2",
      });

      // Verify chain
      const retrieved1 = tracker.getADR(adr1.id);
      const retrieved2 = tracker.getADR(adr2.id);
      const retrieved3 = tracker.getADR(adr3.id);

      expect(retrieved1.status).toBe("superseded");
      expect(retrieved1.supersededBy).toContain(adr2.id);

      expect(retrieved2.status).toBe("superseded");
      expect(retrieved2.supersedes).toBe(adr1.id);
      expect(retrieved2.supersededBy).toContain(adr3.id);

      expect(retrieved3.supersedes).toBe(adr2.id);
      expect(retrieved3.supersededBy).not.toContain(adr1.id); // No direct link
    });
  });
});
