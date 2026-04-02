# KLAR — Requirements Specification
## Knowledge Legitimacy Audit & Review

### 1. Product Overview
KLAR is a production-grade web platform that verifies AI-generated content by checking every factual claim against real-world evidence sources (Wikipedia, Wikidata, web search). It produces a color-coded trust report showing Supported (green), Unverifiable (yellow), and Contradicted (red) claims — each with source links.

### 2. Target Users
- Knowledge workers & freelancers
- Content creators & journalists
- SMBs & agencies
- Legal, consulting & compliance firms
- Educational institutions

### 3. Functional Requirements

#### 3.1 Authentication & User Management
- Email + password signup/login via Supabase Auth
- Google OAuth integration
- Session management with JWT refresh
- Password reset flow
- User profile management
- Account deletion (GDPR)

#### 3.2 Core Verification Pipeline
1. **Text Input**: User pastes AI-generated text (up to 10,000 chars)
2. **Claim Extraction**: Gemini Flash extracts factual claims as structured JSON
3. **Evidence Search**: 
   - Primary: Wikipedia/Wikidata API (~40% of claims)
   - Secondary: Serper.dev web search for remaining claims
   - 3-5 sources collected per claim
4. **AI Judgment**: Second Gemini pass classifies each claim:
   - SUPPORTED (green) — evidence confirms
   - UNVERIFIABLE (yellow) — insufficient evidence
   - CONTRADICTED (red) — evidence contradicts
5. **Report Generation**: Color-coded interactive report with:
   - Overall trust score (% supported)
   - Per-claim verdict with reasoning
   - Source links for each claim
   - Click-to-expand detail view

#### 3.3 Verification History
- List of all past verifications
- Search and filter by date, score
- Click to view full report
- Delete individual verifications

#### 3.4 User Dashboard
- Verification count statistics
- Trust score trends
- Recent verifications
- Usage quota display

#### 3.5 Rate Limiting
- Free tier: 10 verifications/month
- Unauthenticated: 3 verifications (stored in cookie)
- Rate limit display in UI

### 4. Non-Functional Requirements

#### 4.1 Internationalization
- Full German (primary) and English support
- URL-based locale routing (/de/..., /en/...)
- All UI strings externalized
- Date/number formatting per locale

#### 4.2 Theming
- Light and dark mode
- System preference detection
- Manual toggle with persistence
- Smooth transitions

#### 4.3 Performance
- Verification pipeline: < 15 seconds for 500-word text
- Page load: < 2 seconds (LCP)
- Server-side rendering for landing pages
- Streaming responses for verification progress

#### 4.4 Security
- Row Level Security (RLS) on all Supabase tables
- API key protection (server-side only)
- Input validation and sanitization
- Prompt injection prevention (isolated AI calls)
- CSRF protection
- Rate limiting per user/IP
- HTTPS enforcement
- Content Security Policy headers

#### 4.5 Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios ≥ 4.5:1
- Focus indicators

#### 4.6 Error Handling
- Graceful degradation on API failures
- User-friendly error messages (in both languages)
- Retry logic with exponential backoff
- Fallback AI models (Mistral/Groq if Gemini fails)
- Loading states and skeleton screens
- Offline detection

### 5. Technology Stack
- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL, Frankfurt EU region)
- **Auth**: Supabase Auth (email + Google OAuth)
- **AI**: Google Gemini Flash (@google/generative-ai)
- **Evidence**: Wikipedia API, Wikidata API, Serper.dev
- **i18n**: next-intl
- **Theming**: next-themes
- **Deployment**: Vercel
- **Language**: TypeScript (strict mode)

### 6. Data Privacy (GDPR)
- All data stored in EU (Frankfurt)
- Users can export their data
- Users can delete their account and all data
- No data used for AI training
- Minimal data collection
- Clear privacy policy
- Cookie consent
