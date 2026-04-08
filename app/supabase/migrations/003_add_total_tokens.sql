-- Add total_tokens column to verifications table for token usage tracking
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT NULL;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_verifications_total_tokens ON verifications (total_tokens) WHERE total_tokens IS NOT NULL;
