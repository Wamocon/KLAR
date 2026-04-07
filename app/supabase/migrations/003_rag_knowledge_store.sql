-- KLAR RAG Knowledge Store & Training Data Pipeline
-- Migration 003: pgvector, knowledge embeddings, training data collection
-- Architecture: Retrieval-Augmented Generation for claim verification

-- ═══════════════════════════════════════════
-- Enable pgvector for embedding storage
-- ═══════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════
-- KNOWLEDGE_DOCUMENTS — Source documents for RAG retrieval
-- Stores verified evidence, curated facts, and domain knowledge
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'web' CHECK (source_type IN (
    'web', 'wikipedia', 'academic', 'government', 'news', 'fact_check', 'manual', 'verified_claim'
  )),
  domain TEXT,              -- e.g. 'science', 'politics', 'health', 'technology'
  language TEXT NOT NULL DEFAULT 'en',
  embedding vector(768),    -- gemini-embedding-001 outputs 768 dimensions
  metadata JSONB DEFAULT '{}',
  credibility_score NUMERIC(3, 2) DEFAULT 0.5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON public.knowledge_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_knowledge_domain ON public.knowledge_documents(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_source_type ON public.knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON public.knowledge_documents(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════
-- KNOWLEDGE_CHUNKS — Chunked passages for fine-grained retrieval
-- Each document is split into overlapping chunks for better matching
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunk_embedding
  ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_chunk_document ON public.knowledge_chunks(document_id);

-- ═══════════════════════════════════════════
-- TRAINING_SAMPLES — Verified claim-verdict pairs for model fine-tuning
-- Collects human-reviewed verification results as training data
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.training_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_text TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('supported', 'contradicted', 'unverifiable')),
  confidence NUMERIC(3, 2) NOT NULL,
  reasoning TEXT,
  evidence_sources JSONB DEFAULT '[]',
  embedding vector(768),
  domain TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  -- Provenance
  verification_id UUID REFERENCES public.verifications(id) ON DELETE SET NULL,
  claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'auto' CHECK (review_status IN ('auto', 'human_verified', 'rejected')),
  quality_score NUMERIC(3, 2) DEFAULT 0.0,
  -- Usage tracking
  used_in_training BOOLEAN NOT NULL DEFAULT false,
  training_batch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_embedding
  ON public.training_samples
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_training_verdict ON public.training_samples(verdict);
CREATE INDEX IF NOT EXISTS idx_training_review ON public.training_samples(review_status);
CREATE INDEX IF NOT EXISTS idx_training_domain ON public.training_samples(domain);

-- ═══════════════════════════════════════════
-- VERIFICATION_FEEDBACK — User feedback for reinforcement learning
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.verification_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID NOT NULL REFERENCES public.verifications(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('correct', 'incorrect', 'partially_correct', 'report')),
  comment TEXT,
  suggested_verdict TEXT CHECK (suggested_verdict IN ('supported', 'contradicted', 'unverifiable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_verification ON public.verification_feedback(verification_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.verification_feedback(user_id);

-- ═══════════════════════════════════════════
-- SEMANTIC SEARCH FUNCTIONS
-- ═══════════════════════════════════════════

-- Find relevant knowledge chunks by embedding similarity
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10,
  filter_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  source_type TEXT,
  source_url TEXT,
  domain TEXT,
  credibility_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity,
    kd.source_type,
    kd.source_url,
    kd.domain,
    kd.credibility_score
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.is_active = true
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
    AND (filter_domain IS NULL OR kd.domain = filter_domain)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Find similar training samples for few-shot prompting
CREATE OR REPLACE FUNCTION match_training_samples(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.4,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  claim_text TEXT,
  verdict TEXT,
  confidence NUMERIC,
  reasoning TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id,
    ts.claim_text,
    ts.verdict,
    ts.confidence,
    ts.reasoning,
    1 - (ts.embedding <=> query_embedding) AS similarity
  FROM public.training_samples ts
  WHERE ts.review_status IN ('auto', 'human_verified')
    AND 1 - (ts.embedding <=> query_embedding) > match_threshold
  ORDER BY ts.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ═══════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_feedback ENABLE ROW LEVEL SECURITY;

-- Knowledge documents: public read, admin write
CREATE POLICY "Knowledge documents are viewable by all" ON public.knowledge_documents
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage knowledge documents" ON public.knowledge_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Knowledge chunks: public read (via documents)
CREATE POLICY "Knowledge chunks are viewable by all" ON public.knowledge_chunks
  FOR SELECT USING (true);

-- Training samples: admin + service role only
CREATE POLICY "Training samples viewable by admins" ON public.training_samples
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
CREATE POLICY "Training samples managed by admins" ON public.training_samples
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Feedback: users can submit their own
CREATE POLICY "Users can submit feedback" ON public.verification_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.verification_feedback
  FOR SELECT USING (auth.uid() = user_id);
