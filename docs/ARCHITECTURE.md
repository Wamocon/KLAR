# KLAR — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Landing Page  │  │ Dashboard    │  │ Verification UI  │  │
│  │ (SSR/SSG)     │  │ (CSR)        │  │ (Streaming)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                     Next.js App Router                      │
│                  Tailwind CSS + shadcn/ui                    │
│                   next-intl + next-themes                    │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      API LAYER (Edge/Serverless)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /api/verify   │  │ /api/auth    │  │ /api/history     │  │
│  │ (streaming)   │  │ (callback)   │  │ (CRUD)           │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────┘  │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────────────┐    │
│  │           VERIFICATION PIPELINE                      │    │
│  │  1. Input Validation & Sanitization                  │    │
│  │  2. Claim Extraction (Gemini Flash)                  │    │
│  │  3. Evidence Search (Wikipedia → Serper.dev)         │    │
│  │  4. Claim Judgment (Gemini Flash)                    │    │
│  │  5. Report Assembly & Storage                        │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      DATA LAYER                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Supabase (Frankfurt EU)                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐   │    │
│  │  │ Auth     │ │ Database │ │ Row Level Security │   │    │
│  │  │ (OAuth)  │ │ (Postgres│ │ (per-user isolation│   │    │
│  │  └──────────┘ └──────────┘ └────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   EXTERNAL SERVICES                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Google Gemini │  │ Wikipedia    │  │ Serper.dev       │  │
│  │ Flash API     │  │ /Wikidata    │  │ Search API       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

#### profiles
- id (uuid, FK → auth.users.id, PK)
- email (text)
- full_name (text, nullable)
- avatar_url (text, nullable)
- locale (text, default 'de')
- theme (text, default 'system')
- monthly_verification_count (int, default 0)
- monthly_reset_at (timestamptz)
- plan (text, default 'free')
- created_at (timestamptz)
- updated_at (timestamptz)

#### verifications
- id (uuid, PK)
- user_id (uuid, FK → auth.users.id, nullable for anon)
- input_text (text)
- language (text)
- total_claims (int)
- supported_count (int)
- unverifiable_count (int) — claims where no source confirmed or denied (excluded from trust_score)
- contradicted_count (int)
- trust_score (decimal) — supported / (supported + contradicted) × 100; unverifiable claims excluded
- status (text: 'processing'|'completed'|'failed')
- processing_time_ms (int)
- created_at (timestamptz)

#### claims
- id (uuid, PK)
- verification_id (uuid, FK → verifications.id)
- claim_text (text)
- original_sentence (text)
- verdict (text: 'supported'|'unverifiable'|'contradicted') — displayed as "Unconfirmed" in the UI
- confidence (decimal)
- reasoning (text)
- sources (jsonb)
- position_start (int)
- position_end (int)
- created_at (timestamptz)

#### reviews
- id (uuid, PK)
- claim_id (uuid, FK → claims.id)
- user_id (uuid, FK → auth.users.id)
- original_verdict (text)
- new_verdict (text)
- comment (text)
- created_at (timestamptz)

#### audit_log
- id (uuid, PK)
- user_id (uuid, FK → auth.users.id, nullable)
- action (text)
- entity_type (text)
- entity_id (uuid)
- metadata (jsonb)
- ip_address (text)
- created_at (timestamptz)

### Row Level Security Policies
- Users can only read/write their own verifications
- Users can only read/write their own claims (via verification)
- Users can only read/write their own reviews
- Audit log: insert-only for authenticated users, read own entries

### Indexes
- verifications(user_id, created_at DESC)
- claims(verification_id)
- audit_log(user_id, created_at DESC)
