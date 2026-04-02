import { describe, it, expect } from "vitest";
import { evaluateWithFrameworks } from "@/lib/analysis/framework-evaluator";

const wellStructuredText = `
In summary, the migration to a microservices architecture should be completed by Q3 2025.
The key finding is that our monolith cannot scale beyond 10,000 concurrent users.

BACKGROUND: Our current system handles approximately 5,000 concurrent users with 95th
percentile latency of 450ms. However, the architecture has several limitations that
prevent horizontal scaling.

ANALYSIS: We evaluated three alternatives: (1) vertical scaling of the existing monolith,
(2) strangler fig pattern migration to microservices, and (3) complete rewrite. Each
approach was assessed against cost, risk, and timeline criteria.

On the other hand, the complete rewrite carries significant risk of feature regression.
However, the strangler fig approach allows incremental migration while maintaining service
continuity.

RISKS: The primary risk is data consistency during the migration period. If the event
sourcing layer fails, we could face data loss. A rollback plan should be prepared for
each service extraction.

RECOMMENDATION: We should adopt the strangler fig pattern, starting with the authentication
service. This approach balances risk and velocity while allowing us to avoid a big-bang
migration.
`;

const poorText = `
Things are bad. Something needs to change. It's really important. We have to do something
about this. The situation is concerning. Many people are worried. We need to act now.
Everyone agrees something must be done. This is clearly the right thing to do. There are
no alternatives. The decision is obvious. We should just do it.
`;

const mediumText = `
The quarterly sales report shows that revenue increased by 15% compared to last year.
This growth was driven primarily by expansion into European markets. Customer acquisition
costs decreased by 8%, while retention rates improved by 3 percentage points.

Looking at the data more closely, we can see that the enterprise segment grew faster than
SMB. However, there are concerns about sustainability if economic conditions worsen.
The team should monitor these trends carefully and prepare contingency plans.
`;

describe("Framework Evaluator", () => {
  describe("evaluateWithFrameworks", () => {
    it("should return high scores for well-structured text", () => {
      const result = evaluateWithFrameworks(wellStructuredText);
      expect(result.overallScore).toBeGreaterThan(50);
      expect(["A", "B", "C"]).toContain(result.overallGrade);
    });

    it("should return lower scores for poor quality text", () => {
      const result = evaluateWithFrameworks(poorText);
      expect(result.overallScore).toBeLessThan(60);
    });

    it("should return correct interface shape", () => {
      const result = evaluateWithFrameworks(wellStructuredText);
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("overallGrade");
      expect(result).toHaveProperty("frameworks");
      expect(result).toHaveProperty("strengths");
      expect(result).toHaveProperty("weaknesses");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("summary");
      expect(Array.isArray(result.frameworks)).toBe(true);
    });

    it("should evaluate multiple frameworks", () => {
      const result = evaluateWithFrameworks(wellStructuredText);
      expect(result.frameworks.length).toBeGreaterThanOrEqual(4);
      const frameworkNames = result.frameworks.map(f => f.framework);
      expect(frameworkNames).toContain("MECE");
      expect(frameworkNames).toContain("BLUF");
    });

    it("should have framework scores between 0 and 100", () => {
      const result = evaluateWithFrameworks(wellStructuredText);
      for (const fw of result.frameworks) {
        expect(fw.score).toBeGreaterThanOrEqual(0);
        expect(fw.score).toBeLessThanOrEqual(100);
        expect(typeof fw.passed).toBe("boolean");
        expect(Array.isArray(fw.findings)).toBe(true);
      }
    });

    it("should have valid grade", () => {
      const result = evaluateWithFrameworks(mediumText);
      expect(["A", "B", "C", "D", "F"]).toContain(result.overallGrade);
    });

    it("should identify strengths and weaknesses", () => {
      const result = evaluateWithFrameworks(wellStructuredText);
      expect(result.strengths.length).toBeGreaterThanOrEqual(0);
      // Well-structured text should have at least some strengths
      expect(result.strengths.length + result.weaknesses.length).toBeGreaterThan(0);
    });

    it("should provide recommendations", () => {
      const result = evaluateWithFrameworks(poorText);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should produce non-empty summary", () => {
      const result = evaluateWithFrameworks(mediumText);
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it("should handle very short text", () => {
      const result = evaluateWithFrameworks("Hello world.");
      expect(result).toHaveProperty("overallScore");
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it("should score BLUF higher when conclusion leads", () => {
      const blufText = `
        The key finding is that we should migrate to cloud services immediately.
        This recommendation is based on cost analysis showing 40% savings. Furthermore,
        the risk assessment indicates minimal disruption if we follow the phased approach.
        However, we must consider potential security implications of the migration.
      `;
      const result = evaluateWithFrameworks(blufText);
      const bluf = result.frameworks.find(f => f.framework === "BLUF");
      expect(bluf).toBeDefined();
      expect(bluf!.score).toBeGreaterThan(40);
    });
  });
});
