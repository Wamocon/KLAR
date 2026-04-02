-- KLAR Database Schema
-- Knowledge Legitimacy Audit & Review
-- Supabase PostgreSQL Migration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════
-- PROFILES TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'de',
  theme TEXT NOT NULL DEFAULT 'system',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
  monthly_verification_count INTEGER NOT NULL DEFAULT 0,
  monthly_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- VERIFICATIONS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  source_url TEXT,
  source_title TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'en',
  total_claims INTEGER NOT NULL DEFAULT 0,
  supported_count INTEGER NOT NULL DEFAULT 0,
  unverifiable_count INTEGER NOT NULL DEFAULT 0,
  contradicted_count INTEGER NOT NULL DEFAULT 0,
  trust_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  processing_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- CLAIMS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID NOT NULL REFERENCES public.verifications(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  original_sentence TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('supported', 'unverifiable', 'contradicted')),
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0,
  reasoning TEXT NOT NULL DEFAULT '',
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  position_start INTEGER NOT NULL DEFAULT 0,
  position_end INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- REVIEWS TABLE (human overrides)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_verdict TEXT NOT NULL,
  new_verdict TEXT NOT NULL CHECK (new_verdict IN ('supported', 'unverifiable', 'contradicted')),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_verifications_user_created 
  ON public.verifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claims_verification 
  ON public.claims(verification_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created 
  ON public.audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_status 
  ON public.verifications(status);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

-- Profiles: users can only access their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Verifications: users can only access their own
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications" ON public.verifications
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR is_public = true);

CREATE POLICY "Users can update own verifications" ON public.verifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert verifications" ON public.verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own verifications" ON public.verifications
  FOR DELETE USING (auth.uid() = user_id);

-- Claims: accessible via verification ownership
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view claims of own verifications" ON public.claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.verifications v 
      WHERE v.id = claims.verification_id 
      AND (v.user_id = auth.uid() OR v.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert claims" ON public.claims
  FOR INSERT WITH CHECK (true);

-- Reviews: users can only manage their own
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews" ON public.reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit log: insert-only, users can read their own entries
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own audit log" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, locale)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'locale', 'de')
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Increment monthly verification count
CREATE OR REPLACE FUNCTION public.increment_monthly_count(user_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_reset TIMESTAMPTZ;
BEGIN
  SELECT monthly_reset_at INTO current_reset 
  FROM public.profiles 
  WHERE id = user_id_input;

  IF current_reset < date_trunc('month', NOW()) THEN
    -- Reset counter for new month
    UPDATE public.profiles 
    SET monthly_verification_count = 1, 
        monthly_reset_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id_input;
  ELSE
    -- Increment counter
    UPDATE public.profiles 
    SET monthly_verification_count = monthly_verification_count + 1,
        updated_at = NOW()
    WHERE id = user_id_input;
  END IF;
END;
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
