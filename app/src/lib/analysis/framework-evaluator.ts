/**
 * Framework Evaluator — Scores text quality using structured thinking frameworks.
 * Based on MECE, Red Team, OODA, BLUF, and Pre-Mortem methodologies.
 */

export interface FrameworkScore {
  framework: string;
  score: number; // 0–100
  passed: boolean;
  findings: string[];
}

export interface FrameworkEvaluation {
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  frameworks: FrameworkScore[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
}

/**
 * MECE Check — Mutually Exclusive, Collectively Exhaustive.
 * Is the text complete? Does it cover all relevant dimensions without overlap?
 */
function evaluateMECE(text: string): FrameworkScore {
  const findings: string[] = [];
  let score = 50; // baseline

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  // Completeness indicators
  const hasIntro = /\b(introduction|overview|background|context|summary)\b/i.test(text) || sentences.length >= 3;
  const hasConclusion = /\b(conclusion|summary|in summary|therefore|thus|to summarize)\b/i.test(text);
  const hasEvidence = /\b(data|evidence|source|study|research|according|report)\b/i.test(text);
  const hasMultiplePoints = sentences.length >= 5;

  if (hasIntro) { score += 10; findings.push("Has context/introduction."); }
  else { findings.push("Missing introduction or context."); }

  if (hasConclusion) { score += 10; findings.push("Has conclusion/summary."); }
  else { findings.push("Missing clear conclusion."); }

  if (hasEvidence) { score += 10; findings.push("References evidence or data."); }
  else { findings.push("No evidence or data references."); }

  if (hasMultiplePoints) { score += 10; findings.push("Covers multiple points."); }
  else { findings.push("Too few distinct points — may not be exhaustive."); }

  // Check for redundancy (overlapping content)
  const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
  if (uniqueSentences.size < sentences.length * 0.8) {
    score -= 15;
    findings.push("Repetitive content detected — violates Mutually Exclusive principle.");
  }

  // Topic coverage breadth
  const topicMarkers = text.match(/\b(who|what|when|where|why|how|impact|cause|effect|risk|benefit|cost)\b/gi);
  const uniqueTopics = new Set((topicMarkers || []).map(t => t.toLowerCase()));
  if (uniqueTopics.size >= 4) { score += 10; findings.push("Good topic coverage breadth."); }

  return { framework: "MECE", score: Math.max(0, Math.min(100, score)), passed: score >= 60, findings };
}

/**
 * Red Team Check — Adversarial analysis.
 * Does the text acknowledge weaknesses, counter-arguments, risks?
 */
function evaluateRedTeam(text: string): FrameworkScore {
  const findings: string[] = [];
  let score = 30; // baseline (strict)

  // Counter-argument presence
  const counterArgs = /\b(however|although|despite|nevertheless|on the other hand|critics|opponents|alternatively|drawback|limitation|weakness|risk|concern|challenge)\b/gi;
  const counterCount = (text.match(counterArgs) || []).length;

  if (counterCount >= 3) {
    score += 25;
    findings.push(`Good: ${counterCount} counter-arguments or limitations acknowledged.`);
  } else if (counterCount >= 1) {
    score += 15;
    findings.push(`Some counter-arguments present (${counterCount}), but could be more thorough.`);
  } else {
    findings.push("No counter-arguments or limitations acknowledged — vulnerable to adversarial critique.");
  }

  // Uncertainty acknowledgment
  const uncertainty = /\b(may|might|could|possibly|potentially|uncertain|unclear|debatable|controversial|depends)\b/gi;
  const uncertaintyCount = (text.match(uncertainty) || []).length;

  if (uncertaintyCount >= 2) {
    score += 15;
    findings.push("Appropriately acknowledges uncertainty.");
  } else {
    findings.push("Text presents claims as absolute — missing nuance.");
  }

  // Source criticism
  const sourceCriticism = /\b(limit(?:ation|ed)|bias(?:ed)?|sample size|methodology|correlation.*causation|outdated|small.?scale)\b/gi;
  if (sourceCriticism.test(text)) {
    score += 15;
    findings.push("Critically evaluates sources or methodology.");
  }

  // Blind spot check — does it only present one perspective?
  const perspectives = text.match(/\b(proponents|supporters|critics|opponents|advocates|skeptics)\b/gi);
  if (perspectives && new Set(perspectives.map(p => p.toLowerCase())).size >= 2) {
    score += 15;
    findings.push("Presents multiple stakeholder perspectives.");
  } else {
    findings.push("Single-perspective analysis — Red Team would challenge this.");
  }

  return { framework: "Red Team", score: Math.max(0, Math.min(100, score)), passed: score >= 55, findings };
}

/**
 * BLUF Check — Bottom Line Up Front.
 * Is the main point stated early? Is it clear and actionable?
 */
function evaluateBLUF(text: string): FrameworkScore {
  const findings: string[] = [];
  let score = 40;

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length < 2) {
    return { framework: "BLUF", score: 20, passed: false, findings: ["Text too short to evaluate structure."] };
  }

  const firstTwoSentences = sentences.slice(0, 2).join(" ").toLowerCase();

  // Does the opening contain a clear conclusion or key finding?
  const conclusionKeywords = /\b(key finding|result|conclusion|recommendation|answer|bottom line|in short|the main|primary|most important)\b/i;
  if (conclusionKeywords.test(firstTwoSentences)) {
    score += 25;
    findings.push("Main point is stated upfront (BLUF compliant).");
  } else {
    findings.push("Main point not clearly stated in opening — consider leading with the conclusion.");
  }

  // Action-oriented language
  const actionable = /\b(should|must|recommend|propose|suggest|next step|action|implement|adopt|avoid)\b/gi;
  const actionCount = (text.match(actionable) || []).length;
  if (actionCount >= 2) {
    score += 15;
    findings.push("Contains actionable recommendations.");
  } else {
    findings.push("Lacks actionable recommendations.");
  }

  // Clarity (short sentences = clearer)
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
  if (avgSentenceLength <= 20) {
    score += 10;
    findings.push("Good sentence clarity (concise).");
  } else if (avgSentenceLength > 30) {
    score -= 10;
    findings.push("Sentences too long — reduces clarity.");
  }

  // Structured with clear sections?
  const hasSections = /\n\s*(?:#{1,3}\s|[A-Z][^a-z]*:|\d+\.\s)/m.test(text);
  if (hasSections) {
    score += 10;
    findings.push("Well-structured with clear sections.");
  }

  return { framework: "BLUF", score: Math.max(0, Math.min(100, score)), passed: score >= 55, findings };
}

/**
 * Pre-Mortem Check — What could go wrong?
 * Does the text identify risks, failure modes, and mitigation?
 */
function evaluatePreMortem(text: string): FrameworkScore {
  const findings: string[] = [];
  let score = 30;

  const riskTerms = /\b(risk|threat|vulnerability|failure|danger|pitfall|downside|worst.?case|if .* fails|warning|caution)\b/gi;
  const mitigationTerms = /\b(mitigat|prevent|safeguard|backup|contingency|fallback|plan B|alternative|reduce|minimize|protect|hedge)\b/gi;

  const risks = (text.match(riskTerms) || []).length;
  const mitigations = (text.match(mitigationTerms) || []).length;

  if (risks >= 3) {
    score += 25;
    findings.push(`Identifies ${risks} risk factors.`);
  } else if (risks >= 1) {
    score += 15;
    findings.push(`Mentions some risks (${risks}), but could be more thorough.`);
  } else {
    findings.push("No risks or failure modes identified — Pre-Mortem would flag this.");
  }

  if (mitigations >= 2) {
    score += 25;
    findings.push(`${mitigations} mitigation strategies mentioned.`);
  } else if (mitigations >= 1) {
    score += 10;
    findings.push("Minimal mitigation strategies.");
  } else if (risks > 0) {
    findings.push("Risks identified but no mitigation strategies.");
  }

  // Scenario thinking
  const scenarios = /\b(if|scenario|what if|in case|should .* happen|worst case|best case)\b/gi;
  if ((text.match(scenarios) || []).length >= 2) {
    score += 10;
    findings.push("Uses scenario-based thinking.");
  }

  return { framework: "Pre-Mortem", score: Math.max(0, Math.min(100, score)), passed: score >= 50, findings };
}

/**
 * Main framework evaluation function.
 * Runs all frameworks and produces a composite report.
 */
export function evaluateWithFrameworks(text: string): FrameworkEvaluation {
  const frameworks = [
    evaluateMECE(text),
    evaluateRedTeam(text),
    evaluateBLUF(text),
    evaluatePreMortem(text),
  ];

  const overallScore = Math.round(
    frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length
  );

  const overallGrade: FrameworkEvaluation["overallGrade"] =
    overallScore >= 85 ? "A" :
    overallScore >= 70 ? "B" :
    overallScore >= 55 ? "C" :
    overallScore >= 40 ? "D" : "F";

  const strengths = frameworks
    .filter(f => f.passed)
    .map(f => `${f.framework}: ${f.findings.find(fi => fi.startsWith("Good") || fi.startsWith("Has") || fi.startsWith("Approp") || fi.includes("compliant")) || `Score ${f.score}%`}`);

  const weaknesses = frameworks
    .filter(f => !f.passed)
    .map(f => `${f.framework}: ${f.findings.find(fi => fi.startsWith("No ") || fi.startsWith("Missing") || fi.startsWith("Single") || fi.startsWith("Lacks") || fi.includes("not")) || `Score ${f.score}%`}`);

  const recommendations: string[] = [];
  for (const fw of frameworks) {
    if (!fw.passed) {
      switch (fw.framework) {
        case "MECE":
          recommendations.push("Ensure all aspects of the topic are covered without redundancy.");
          break;
        case "Red Team":
          recommendations.push("Add counter-arguments and acknowledge limitations to strengthen the analysis.");
          break;
        case "BLUF":
          recommendations.push("State the main conclusion in the first sentence.");
          break;
        case "Pre-Mortem":
          recommendations.push("Identify potential risks and include mitigation strategies.");
          break;
      }
    }
  }

  const passedCount = frameworks.filter(f => f.passed).length;
  const summary = `Passed ${passedCount}/${frameworks.length} framework checks. Grade: ${overallGrade} (${overallScore}%).`;

  return {
    overallScore,
    overallGrade,
    frameworks,
    strengths,
    weaknesses,
    recommendations,
    summary,
  };
}
