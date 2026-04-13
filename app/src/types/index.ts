export type VerificationStatus = "processing" | "completed" | "failed";
export type ClaimVerdict = "supported" | "unverifiable" | "contradicted";
export type UserPlan = "free" | "pro" | "team" | "enterprise";
export type UserRole = "user" | "moderator" | "admin" | "super_admin";

// ═══════════════════════════════════════════
// Analysis Modes (2026 Multi-Analysis System)
// ═══════════════════════════════════════════

export type AnalysisMode =
  | "fact-check"        // Original: fact verification against sources
  | "bias-check"        // Detect loaded language, framing, one-sided perspectives
  | "ai-detection"      // Detect AI-generated content
  | "plagiarism"        // Check for text overlap with known sources
  | "ai-transparency"   // EU AI Act Art. 50 compliance checker
  | "security-headers"  // HTTP security header scanner (OWASP)
  | "comprehensive";    // Run all analyses in one pass

export type InputMode = "text" | "url" | "file";

export interface AnalysisRequest {
  text?: string;
  url?: string;
  language?: string;
  mode: InputMode;
  analyses: AnalysisMode[];
}

// Re-exported analysis result types
export type { BiasAnalysis } from "@/lib/analysis/bias-detector";
export type { AIDetectionResult } from "@/lib/analysis/ai-detector";
export type { PlagiarismResult } from "@/lib/analysis/plagiarism-detector";

export interface ComprehensiveResult {
  factCheck?: {
    trustScore: number;
    totalClaims: number;
    supported: number;
    contradicted: number;
    unverifiable: number;
  };
  biasAnalysis?: import("@/lib/analysis/bias-detector").BiasAnalysis;
  aiDetection?: import("@/lib/analysis/ai-detector").AIDetectionResult;
  plagiarism?: import("@/lib/analysis/plagiarism-detector").PlagiarismResult;
}

export type OrgRole = "owner" | "admin" | "member";
export type ApiKeyScope = "verify" | "export" | "batch" | "compliance";
export type ComplianceReportType = "ai_act_transparency" | "ai_act_risk_assessment" | "monthly_summary" | "audit_export";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string;
  theme: string;
  role: UserRole;
  monthly_verification_count: number;
  monthly_reset_at: string;
  plan: UserPlan;
  org_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: "team" | "enterprise";
  max_seats: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  joined_at: string;
  // Joined fields
  email?: string;
  full_name?: string | null;
}

export interface OrgInvitation {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  rate_limit_per_minute: number;
  total_requests: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Webhook {
  id: string;
  org_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

export interface ComplianceReport {
  id: string;
  org_id: string | null;
  user_id: string;
  report_type: ComplianceReportType;
  title: string;
  period_start: string;
  period_end: string;
  data: Record<string, unknown>;
  generated_at: string;
}

export interface Tag {
  id: string;
  org_id: string | null;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string | null;
  input_text: string;
  source_url: string | null;
  source_title: string | null;
  is_public: boolean;
  language: string;
  total_claims: number;
  supported_count: number;
  unverifiable_count: number;
  contradicted_count: number;
  trust_score: number;
  status: VerificationStatus;
  processing_time_ms: number;
  total_tokens: number | null;
  created_at: string;
}

export interface ClaimSource {
  title: string;
  url: string;
  snippet: string;
  source_type: "wikipedia" | "wikidata" | "web" | "academic" | "government" | "news" | "fact_check" | "manual" | "verified_claim";
  credibility_score?: number;
}

export interface Claim {
  id: string;
  verification_id: string;
  claim_text: string;
  original_sentence: string;
  verdict: ClaimVerdict;
  confidence: number;
  reasoning: string;
  sources: ClaimSource[];
  position_start: number;
  position_end: number;
  created_at: string;
}

export interface Review {
  id: string;
  claim_id: string;
  user_id: string;
  original_verdict: ClaimVerdict;
  new_verdict: ClaimVerdict;
  comment: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

// API types
export interface VerifyRequest {
  text: string;
  language?: string;
}

export interface VerifyResponse {
  verification: Verification;
  claims: Claim[];
}

export interface ExtractedClaim {
  claim_text: string;
  original_sentence: string;
  position_start: number;
  position_end: number;
}

export interface EvidenceResult {
  claim: ExtractedClaim;
  sources: ClaimSource[];
}

export interface JudgmentResult {
  claim: ExtractedClaim;
  verdict: ClaimVerdict;
  confidence: number;
  reasoning: string;
  recommendation?: string;
  sources: ClaimSource[];
}

// ═══════════════════════════════════════════
// Token Usage types (transparency)
// ═══════════════════════════════════════════

export interface TokenUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

// ═══════════════════════════════════════════
// NLP Claim Quality types
// ═══════════════════════════════════════════

export interface ClaimQualityScore {
  overall: number;
  specificity: number;
  atomicity: number;
  objectivity: number;
  verifiability: number;
  entityDensity: number;
  flags: string[];
}

// ═══════════════════════════════════════════
// Grounded Search types
// ═══════════════════════════════════════════

export interface GroundingChunk {
  uri: string;
  title: string;
}

export interface GroundingSupport {
  segment: { startIndex: number; endIndex: number; text: string };
  chunkIndices: number[];
}

export interface GroundedSearchResult {
  answer: string;
  sources: ClaimSource[];
  searchQueries: string[];
  groundingChunks: GroundingChunk[];
  groundingSupports: GroundingSupport[];
}

// ═══════════════════════════════════════════
// Cross-Reference Validation types
// ═══════════════════════════════════════════

export interface CrossReferenceResult {
  agreementScore: number;
  sourceConsensus: "strong" | "moderate" | "weak" | "none";
  independentSources: number;
  conflictingClaims: string[];
  supportingDetails: string[];
}

// ═══════════════════════════════════════════
// Semantic Similarity types
// ═══════════════════════════════════════════

export interface SemanticScore {
  similarity: number;
  relevance: "high" | "medium" | "low" | "none";
}

// ═══════════════════════════════════════════
// Hallucination Detection types
// ═══════════════════════════════════════════

export interface HallucinationSignal {
  type: "entity_mismatch" | "number_inconsistency" | "date_conflict" | "unsupported_specificity" | "source_fabrication" | "low_evidence_overlap";
  severity: "low" | "medium" | "high";
  confidence: number;
  detail: string;
}

export interface HallucinationAnalysis {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: HallucinationSignal[];
}

// ═══════════════════════════════════════════
// Enhanced Judgment (includes all new signals)
// ═══════════════════════════════════════════

export interface EnhancedJudgmentResult extends JudgmentResult {
  claimQuality?: ClaimQualityScore;
  crossReference?: CrossReferenceResult;
  hallucinationAnalysis?: HallucinationAnalysis;
  semanticRelevance?: number;
  groundedSources?: ClaimSource[];
}

// Pipeline event types for streaming
export type PipelineEvent =
  | { type: "status"; stage: string; message: string }
  | { type: "claims_extracted"; claims: ExtractedClaim[] }
  | { type: "claim_quality"; index: number; quality: ClaimQualityScore }
  | { type: "claim_judged"; index: number; result: JudgmentResult }
  | { type: "cross_reference"; index: number; result: CrossReferenceResult }
  | { type: "hallucination_check"; index: number; analysis: HallucinationAnalysis }
  | { type: "url_extracted"; url: string; title: string | null; contentLength: number }
  | { type: "file_extracted"; filename: string; wordCount: number }
  | { type: "adversarial_detected"; threatLevel: string; threatScore: number; detections: { type: string; severity: string; confidence: number }[] }
  | { type: "bias_analysis"; result: import("@/lib/analysis/bias-detector").BiasAnalysis }
  | { type: "ai_detection"; result: import("@/lib/analysis/ai-detector").AIDetectionResult }
  | { type: "plagiarism_check"; result: import("@/lib/analysis/plagiarism-detector").PlagiarismResult }
  | { type: "ai_transparency"; result: import("@/lib/analysis/ai-act-checker").AIActResult }
  | { type: "security_scan"; result: import("@/lib/analysis/security-scanner").SecurityScanResult }
  | { type: "token_estimate"; estimatedInputTokens: number; estimatedTotalTokens: number }
  | { type: "token_usage"; tokens: TokenUsageInfo }
  | { type: "completed"; verification: Verification; claims: Claim[] }
  | { type: "error"; message: string };

// ═══════════════════════════════════════════
// Adversarial & Source Types
// ═══════════════════════════════════════════

export type AdversarialDetectionType =
  | "prompt_injection"
  | "data_poisoning"
  | "hallucination_pattern"
  | "synthetic_text"
  | "manipulation"
  | "factual_fabrication";
export type AdversarialSeverity = "low" | "medium" | "high" | "critical";
export type SourceCategory =
  | "academic"
  | "news_major"
  | "news_local"
  | "government"
  | "wiki"
  | "social_media"
  | "blog"
  | "corporate"
  | "unknown";

export interface BatchJob {
  id: string;
  user_id: string | null;
  agent_id: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  total_items: number;
  completed_items: number;
  failed_items: number;
  avg_trust_score: number | null;
  results: BatchItemResult[];
  created_at: string;
  completed_at: string | null;
}

export interface BatchItemResult {
  index: number;
  text: string;
  trust_score: number | null;
  total_claims: number;
  supported: number;
  contradicted: number;
  unverifiable: number;
  status: "completed" | "failed";
  error?: string;
}

export interface SourceCredibility {
  id: string;
  domain: string;
  credibility_score: number;
  total_citations: number;
  supported_rate: number | null;
  category: SourceCategory;
  last_updated: string;
}

export interface AdversarialDetection {
  id: string;
  verification_id: string;
  detection_type: AdversarialDetectionType;
  severity: AdversarialSeverity;
  confidence: number;
  details: Record<string, unknown>;
  detected_at: string;
}

export interface SubmitAnswersResponse {
  submissionId: string;
  status: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
}

export interface BatchVerifyRequest {
  items: { text: string; language?: string }[];
}

export interface BatchVerifyResponse {
  jobId: string;
  status: string;
  totalItems: number;
}
