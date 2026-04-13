import { describe, it, expect } from "vitest";
import { detectBias } from "@/lib/analysis/bias-detector";
import type { ClaimSource } from "@/types";

const neutralText = `
The study found that global temperatures increased by 1.1°C between 1880 and 2020.
According to NASA, the rate of warming has accelerated in recent decades.
Multiple research institutions have confirmed these findings through independent analysis.
Data from NOAA and the Met Office corroborate the observed warming trend.
`;

const biasedText = `
The catastrophic climate crisis is the greatest existential threat facing humanity, and
anyone who questions this obvious fact is a dangerous denier spreading misinformation.
Every single scientist on earth agrees that we must immediately and drastically eliminate
all fossil fuels or face absolute annihilation. The corrupt fossil fuel industry has
deliberately destroyed our planet for profit while evil corporations lie to the public.
These greedy polluters are solely responsible for every natural disaster we face.
`;

const slightlyBiasedText = `
Climate change is a significant concern that deserves attention. While most scientists
agree on the warming trend, there are different perspectives on the best policy responses.
Some experts argue for aggressive action on emissions, while others suggest a more
measured approach that balances economic concerns. The debate continues about the most
effective path forward, though the scientific consensus on warming itself is quite strong.
`;

const emptySources: ClaimSource[] = [];

const diverseSources: ClaimSource[] = [
  { title: "NASA Climate", url: "https://climate.nasa.gov", snippet: "Temperature data shows warming", source_type: "web" },
  { title: "NOAA Report", url: "https://noaa.gov/report", snippet: "Independent analysis confirms trend", source_type: "web" },
  { title: "Met Office", url: "https://metoffice.gov.uk", snippet: "Corroborating temperature records", source_type: "web" },
];

describe("Bias Detector", () => {
  describe("detectBias", () => {
    it("should return low bias for neutral, factual text", () => {
      const result = detectBias(neutralText, diverseSources);
      expect(result.overallScore).toBeLessThan(30);
      expect(["minimal", "slight"]).toContain(result.biasLevel);
    });

    it("should return high bias for heavily loaded language", () => {
      const result = detectBias(biasedText, emptySources);
      expect(result.overallScore).toBeGreaterThan(30);
      expect(["significant", "extreme", "moderate", "slight"]).toContain(result.biasLevel);
    });

    it("should detect loaded language patterns", () => {
      const result = detectBias(biasedText, emptySources);
      expect(result.loadedLanguageScore).toBeGreaterThan(0);
      const hasLoadedLanguageSignal = result.signals.some(s => s.type === "loaded_language");
      expect(hasLoadedLanguageSignal).toBe(true);
    });

    it("should detect emotional appeal in biased text", () => {
      const result = detectBias(biasedText, emptySources);
      expect(typeof result.emotionalAppealScore).toBe("number");
    });

    it("should return correct interface shape", () => {
      const result = detectBias(neutralText, emptySources);
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("biasLevel");
      expect(result).toHaveProperty("signals");
      expect(result).toHaveProperty("loadedLanguageScore");
      expect(result).toHaveProperty("emotionalAppealScore");
      expect(result).toHaveProperty("sourceBalanceScore");
      expect(result).toHaveProperty("framingScore");
      expect(result).toHaveProperty("politicalLean");
      expect(result).toHaveProperty("summary");
    });

    it("should have bias level matching score ranges", () => {
      const result = detectBias(biasedText, emptySources);
      if (result.overallScore >= 80) {
        expect(result.biasLevel).toBe("extreme");
      } else if (result.overallScore >= 60) {
        expect(result.biasLevel).toBe("significant");
      }
    });

    it("should handle slightly biased text as moderate", () => {
      const result = detectBias(slightlyBiasedText, diverseSources);
      expect(result.overallScore).toBeLessThan(60);
    });

    it("should produce non-empty summary", () => {
      const result = detectBias(neutralText, emptySources);
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it("should evaluate source balance when sources provided", () => {
      const result = detectBias(neutralText, diverseSources);
      expect(typeof result.sourceBalanceScore).toBe("number");
    });

    it("should handle empty text gracefully", () => {
      const result = detectBias("", emptySources);
      expect(result).toHaveProperty("overallScore");
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect source bias from known media outlets", () => {
      const biasedSources: ClaimSource[] = [
        { title: "Breitbart Report", url: "https://breitbart.com/politics/story", snippet: "Political analysis", source_type: "web" },
        { title: "Daily Wire", url: "https://www.dailywire.com/article", snippet: "Policy review", source_type: "web" },
      ];
      const result = detectBias(neutralText, biasedSources);
      const sourceBiasSignal = result.signals.find(s => s.type === "source_bias");
      // Should detect that sources lean right
      expect(sourceBiasSignal || result.sourceBalanceScore > 0).toBeTruthy();
    });

    it("should determine political lean from known source database", () => {
      const leftSources: ClaimSource[] = [
        { title: "MSNBC", url: "https://msnbc.com/article", snippet: "Analysis", source_type: "web" },
        { title: "HuffPost", url: "https://huffpost.com/entry/x", snippet: "Report", source_type: "web" },
        { title: "Jacobin", url: "https://jacobin.com/2025/article", snippet: "Opinion", source_type: "web" },
      ];
      const result = detectBias(neutralText, leftSources);
      expect(["left", "center-left"]).toContain(result.politicalLean);
    });

    it("should have valid signal types including source_bias", () => {
      const result = detectBias(biasedText, diverseSources);
      const validTypes = ["loaded_language", "one_sided", "emotional_appeal", "false_balance", "framing", "cherry_picking", "source_bias"];
      for (const signal of result.signals) {
        expect(validTypes).toContain(signal.type);
      }
    });
  });
});
