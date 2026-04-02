-- KLAR B2B Expansion Schema
-- Organizations, API Keys, Webhooks, Compliance Reports, Tags
-- Migration 003 — April 2026

-- ═══════════════════════════════════════════
-- ORGANIZATIONS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'team' CHECK (plan IN ('team', 'enterprise')),
  max_seats INTEGER NOT NULL DEFAULT 5,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug
  ON public.organizations(slug);

-- ═══════════════════════════════════════════
-- ORGANIZATION MEMBERS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org
  ON public.org_members(org_id);

CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON public.org_members(user_id);

-- ═══════════════════════════════════════════
-- ORGANIZATION INVITATIONS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.org_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token
  ON public.org_invitations(token);

CREATE INDEX IF NOT EXISTS idx_org_invitations_email
  ON public.org_invitations(email);

-- ═══════════════════════════════════════════
-- API KEYS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['verify'],
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 10,
  total_requests BIGINT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user
  ON public.api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_org
  ON public.api_keys(org_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash
  ON public.api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix
  ON public.api_keys(key_prefix);

-- ═══════════════════════════════════════════
-- WEBHOOKS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['scan.completed'],
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org
  ON public.webhooks(org_id);

-- ═══════════════════════════════════════════
-- COMPLIANCE REPORTS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'ai_act_transparency', 'ai_act_risk_assessment', 'monthly_summary', 'audit_export'
  )),
  title TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_org
  ON public.compliance_reports(org_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_user
  ON public.compliance_reports(user_id, generated_at DESC);

-- ═══════════════════════════════════════════
-- VERIFICATION TAGS (categorize scans)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.verification_tags (
  verification_id UUID NOT NULL REFERENCES public.verifications(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (verification_id, tag_id)
);

-- ═══════════════════════════════════════════
-- ADD org_id TO PROFILES
-- ═══════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════
-- ADD org_id TO VERIFICATIONS (for team scans)
-- ═══════════════════════════════════════════
ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_verifications_org
  ON public.verifications(org_id, created_at DESC);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ═══════════════════════════════════════════

-- Organizations: members can view their org
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their org" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = organizations.id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners can update their org" ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = organizations.id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Authenticated users can create orgs" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Org members: accessible by org members
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view members" ON public.org_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_members.org_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage members" ON public.org_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_members.org_id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org admins can remove members" ON public.org_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_members.org_id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

-- Org invitations: admins manage, invitees view by token
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage invitations" ON public.org_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_invitations.org_id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

-- API keys: users can manage their own
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Webhooks: org admins manage
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage webhooks" ON public.webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = webhooks.org_id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
    )
  );

-- Compliance reports: user can view own, org members can view org reports
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compliance reports" ON public.compliance_reports
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = compliance_reports.org_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create compliance reports" ON public.compliance_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tags: user or org members can manage
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags" ON public.tags
  FOR ALL USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = tags.org_id AND m.user_id = auth.uid()
    )
  );

-- Verification tags: accessible via verification ownership
ALTER TABLE public.verification_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage verification tags" ON public.verification_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.verifications v
      WHERE v.id = verification_tags.verification_id
      AND (v.user_id = auth.uid() OR v.user_id IS NULL)
    )
  );

-- ═══════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════

-- Increment API key usage counter
CREATE OR REPLACE FUNCTION public.increment_api_key_usage(key_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.api_keys
  SET total_requests = total_requests + 1,
      last_used_at = NOW()
  WHERE id = key_id_input;
END;
$$;

-- Seed initial source credibility scores for major DACH sources
INSERT INTO public.source_credibility (domain, credibility_score, category, language, description)
VALUES
  -- German news (high credibility)
  ('tagesschau.de', 0.95, 'news', 'de', 'ARD public broadcaster — German flagship news'),
  ('zeit.de', 0.92, 'news', 'de', 'Die Zeit — quality weekly broadsheet'),
  ('sueddeutsche.de', 0.91, 'news', 'de', 'Süddeutsche Zeitung — major quality daily'),
  ('spiegel.de', 0.89, 'news', 'de', 'Der Spiegel — leading news magazine'),
  ('faz.net', 0.90, 'news', 'de', 'Frankfurter Allgemeine Zeitung — conservative quality daily'),
  ('dw.com', 0.90, 'news', 'de', 'Deutsche Welle — international public broadcaster'),
  ('zdf.de', 0.93, 'news', 'de', 'ZDF public broadcaster — second German TV channel'),
  ('ndr.de', 0.91, 'news', 'de', 'NDR public broadcaster — Northern Germany'),
  ('br.de', 0.91, 'news', 'de', 'Bayerischer Rundfunk — Bavarian public broadcaster'),
  ('wdr.de', 0.91, 'news', 'de', 'WDR public broadcaster — North Rhine-Westphalia'),
  ('stern.de', 0.82, 'news', 'de', 'Stern — general interest magazine'),
  ('handelsblatt.com', 0.88, 'news', 'de', 'Handelsblatt — business/finance daily'),
  ('tagesspiegel.de', 0.87, 'news', 'de', 'Der Tagesspiegel — Berlin daily'),
  ('taz.de', 0.83, 'news', 'de', 'taz — left-leaning cooperative daily'),
  ('heise.de', 0.88, 'news', 'de', 'Heise Online — technology news'),
  ('golem.de', 0.85, 'news', 'de', 'Golem — technology news'),
  -- Austrian news
  ('orf.at', 0.93, 'news', 'de', 'ORF — Austrian public broadcaster'),
  ('derstandard.at', 0.88, 'news', 'de', 'Der Standard — Austrian quality daily'),
  ('diepresse.com', 0.87, 'news', 'de', 'Die Presse — Austrian conservative daily'),
  -- Swiss news
  ('srf.ch', 0.94, 'news', 'de', 'SRF — Swiss public broadcaster (German)'),
  ('nzz.ch', 0.91, 'news', 'de', 'Neue Zürcher Zeitung — Swiss quality daily'),
  ('tagesanzeiger.ch', 0.88, 'news', 'de', 'Tages-Anzeiger — major Swiss daily'),
  -- International English (high credibility)
  ('reuters.com', 0.94, 'news', 'en', 'Reuters — major wire service'),
  ('apnews.com', 0.94, 'news', 'en', 'Associated Press — wire service'),
  ('bbc.co.uk', 0.91, 'news', 'en', 'BBC News — UK public broadcaster'),
  ('bbc.com', 0.91, 'news', 'en', 'BBC News — international'),
  ('theguardian.com', 0.87, 'news', 'en', 'The Guardian — UK broadsheet'),
  ('nytimes.com', 0.89, 'news', 'en', 'The New York Times'),
  ('washingtonpost.com', 0.87, 'news', 'en', 'The Washington Post'),
  ('ft.com', 0.90, 'news', 'en', 'Financial Times — business/finance'),
  ('economist.com', 0.89, 'news', 'en', 'The Economist'),
  ('nature.com', 0.96, 'academic', 'en', 'Nature — peer-reviewed science journal'),
  ('science.org', 0.96, 'academic', 'en', 'Science — AAAS journal'),
  ('thelancet.com', 0.95, 'academic', 'en', 'The Lancet — medical journal'),
  ('bmj.com', 0.94, 'academic', 'en', 'British Medical Journal'),
  ('pubmed.ncbi.nlm.nih.gov', 0.93, 'academic', 'en', 'PubMed — biomedical literature'),
  ('arxiv.org', 0.80, 'academic', 'en', 'arXiv — preprint server (not peer-reviewed)'),
  -- Fact-checking organizations
  ('correctiv.org', 0.92, 'fact-check', 'de', 'CORRECTIV — German investigative/fact-checking'),
  ('faktenfinder.tagesschau.de', 0.93, 'fact-check', 'de', 'ARD Faktenfinder — public broadcaster fact-check'),
  ('mimikama.org', 0.85, 'fact-check', 'de', 'Mimikama — Austrian fact-checking'),
  ('snopes.com', 0.88, 'fact-check', 'en', 'Snopes — oldest English fact-checker'),
  ('politifact.com', 0.87, 'fact-check', 'en', 'PolitiFact — political fact-checking'),
  ('factcheck.org', 0.89, 'fact-check', 'en', 'FactCheck.org — Annenberg Center'),
  ('fullfact.org', 0.90, 'fact-check', 'en', 'Full Fact — UK fact-checking'),
  -- Reference sources
  ('en.wikipedia.org', 0.82, 'reference', 'en', 'English Wikipedia'),
  ('de.wikipedia.org', 0.82, 'reference', 'de', 'German Wikipedia'),
  ('britannica.com', 0.90, 'reference', 'en', 'Encyclopædia Britannica'),
  ('statista.com', 0.84, 'reference', 'en', 'Statista — statistics portal'),
  -- Government / institutional
  ('europa.eu', 0.93, 'government', 'en', 'European Union official'),
  ('bundesregierung.de', 0.92, 'government', 'de', 'German Federal Government'),
  ('destatis.de', 0.94, 'government', 'de', 'German Federal Statistics Office'),
  ('who.int', 0.91, 'government', 'en', 'World Health Organization'),
  -- Low credibility / known unreliable
  ('rt.com', 0.20, 'state-media', 'en', 'RT (Russia Today) — Russian state media'),
  ('sputniknews.com', 0.15, 'state-media', 'en', 'Sputnik — Russian state media'),
  ('infowars.com', 0.10, 'fringe', 'en', 'InfoWars — conspiracy content'),
  ('breitbart.com', 0.30, 'fringe', 'en', 'Breitbart — far-right media'),
  ('compact-online.de', 0.15, 'fringe', 'de', 'Compact — far-right German magazine (banned 2024)')
ON CONFLICT (domain) DO NOTHING;
