# KLAR — Knowledge Guide

> A simple, non-technical explanation of everything KLAR does and how it works.

---

## Part 1: What is KLAR?

**KLAR** stands for **Knowledge Legitimacy Audit & Review**. It's a web application that checks whether written content (articles, reports, emails, AI-generated text) is accurate, original, and trustworthy.

Think of it as a **smart assistant that reads your text, finds every factual claim, and checks each one against real sources** — then tells you which claims are true, which are false, and which couldn't be verified.

---

## Part 2: All Features (In Simple Terms)

### 🔍 1. Fact Checking
**What it does:** Takes any text and finds every factual statement in it. Then it automatically searches Wikipedia and Google to see if those facts are actually true.

**What you get:** A color-coded report:
- 🟢 **Green** = This claim is supported by real sources
- 🔴 **Red** = This claim contradicts what reliable sources say
- 🟡 **Yellow** = No reliable source could be found to confirm or deny this

Each claim includes links to the sources that were used to check it, plus a plain-English explanation of why it was judged the way it was.

---

### 🧠 2. AI Detection
**What it does:** Analyzes writing patterns to determine whether text was written by a human or by an AI (like ChatGPT, Gemini, etc).

**How it works:** It looks at:
- **Sentence variety** — AI tends to write very uniform sentences
- **Vocabulary diversity** — AI uses a narrower range of words
- **Writing predictability** — AI writing is more "expected" and formulaic
- **Patterns** — AI often uses specific phrases and structures

**What you get:** A percentage score (0-100%) and a verdict:
- Human written
- Likely human
- Mixed (some AI, some human)
- Likely AI
- AI generated

---

### 👁️ 3. Bias Detection
**What it does:** Reads your text and identifies signs of bias — when writing tries to push you toward a particular opinion rather than presenting facts neutrally.

**What it detects:**
- **Loaded language** — Words designed to trigger emotions ("devastating", "miraculous")
- **Emotional appeals** — Trying to make you feel rather than think
- **One-sided framing** — Presenting only one perspective
- **Source imbalance** — Relying too heavily on sources from one viewpoint
- **Political lean** — Whether the text tilts left, right, or stays neutral

**What you get:** A bias score (0-100, lower is better), a bias level (minimal/low/moderate/significant/extreme), and a summary explaining what biases were found.

---

### 📋 4. Plagiarism Check
**What it does:** Compares your text against known web sources to check if the content was copied or closely paraphrased from somewhere else.

**What you get:**
- An **originality percentage** (higher is better, e.g., "92% original")
- A list of any matching sources found online
- A verdict: Original, Mostly Original, Some Overlap, Significant Overlap, or Likely Plagiarized

---

### 📊 5. Quality Evaluation
**What it does:** Grades the quality of your text using four professional analysis frameworks that experts use to evaluate reports and documents:

- **MECE** (Mutually Exclusive, Collectively Exhaustive) — Is the content well-organized with no gaps or overlaps?
- **Red Team** — Could someone easily poke holes in the arguments?
- **BLUF** (Bottom Line Up Front) — Is the main point stated clearly at the start?
- **Pre-Mortem** — What could go wrong if someone acted on this information?

**What you get:** An overall score and a letter grade (A through F), plus individual scores for each framework and specific recommendations for improvement.

---

### 📎 6. File Upload
**What it does:** Instead of pasting text, you can upload a document directly. Supported formats:
- **PDF** files
- **Word documents** (DOCX)
- **Text files** (TXT)

KLAR automatically extracts the text from your file and runs all the analyses you select.

**Maximum file size:** 10 MB

---

### 🌐 7. URL Verification
**What it does:** Instead of copy-pasting an article, you give KLAR the web address (URL) of any article or blog post. KLAR will visit that page, extract the content, and analyze it.

**Supports:** News articles, blog posts, documentation pages, and most publicly accessible web pages.

---

### 📑 8. Trust Report
**What it does:** After analyzing your content, KLAR generates a detailed report that includes:
- A **trust score** (0-100) showing overall reliability
- **Color-coded claims** with verdicts and sources
- A **highlighted text view** — your original text with claims marked in green/red/yellow
- **Source links** for every verdict
- **PDF export** — download the full report

---

### 🔖 9. Browser Bookmarklets
**What it does:** Small buttons you drag to your browser's bookmarks bar. Then on any webpage, you can:
- **"KLAR Verify"** — Click to send the page's text to KLAR for analysis
- **"KLAR URL"** — Click to send the page's URL to KLAR

No extension installation needed. Works in Chrome, Firefox, Edge, Safari.

---

### 📊 10. Dashboard
**What it does:** A personal home screen showing:
- How many verifications you've run
- Your trust score trends over time
- Recent contradicted claims to watch out for
- Quick access to your latest reports

---

### 📜 11. Verification History
**What it does:** A searchable, sortable list of every text you've ever verified. Filter by date, sort by trust score, search by keywords. Click any entry to re-open the full report.

---

### ⚙️ 12. Account Settings
**What it does:**
- View your profile information
- **Export all your data** (GDPR right: download everything KLAR has stored about you)
- **Delete your account** and all associated data permanently

---

### 🌍 13. Multi-Language Support
**What it does:** KLAR works in English and German. The entire interface — every button, label, and message — is available in both languages. You can switch languages at any time using the language toggle in the header.

---

### 🔒 14. Privacy & Security
- **GDPR-compliant** — Built for European data protection standards
- **EU data hosting** — All data stored in Frankfurt, Germany
- **EU AI Act ready** — Transparent AI decision-making
- No tracking cookies, no data selling, no third-party analytics

---

### 🗳️ 15. Human Review System
**What it does:** If you disagree with KLAR's verdict on a claim, you can submit a review with your own assessment and comments. This creates a record that helps improve future accuracy.

---

### 🔌 16. API Access
**What it does:** Developers can integrate KLAR into their own applications using a REST API. Send text via HTTP POST and receive results streamed back in real-time using Server-Sent Events (SSE).

Available in: cURL, JavaScript, Python.

---

## Part 3: How the AI Works (Simple Explanation)

### The Big Picture

KLAR does **not** use a single AI that does everything. Instead, it uses a **pipeline** — a series of specialized steps that each do one thing well, working together like an assembly line.

Here's what happens when you click "Analyze":

```
Your Text
    ↓
[Step 1] AI Detection — Is this human or AI-written?
    ↓
[Step 2] Quality Evaluation — Grade with professional frameworks
    ↓
[Step 3] Claim Extraction — AI reads the text and finds every factual claim
    ↓
[Step 4] Evidence Search — Each claim is searched on Wikipedia + Google
    ↓
[Step 5] Claim Quality Check — Rate how specific and verifiable each claim is
    ↓
[Step 6] Hallucination Detection — Look for AI-invented "facts"
    ↓
[Step 7] AI Judgment — A second AI evaluates each claim against the evidence found
    ↓
[Step 8] Bias Analysis — Check the whole text for bias patterns
    ↓
[Step 9] Plagiarism Check — Compare text against web sources
    ↓
[Step 10] Cross-Reference — Validate across multiple sources
    ↓
Trust Report Generated ✓
```

### Which AI Does KLAR Use?

KLAR uses **Google Gemini 2.5 Flash** — one of Google's latest AI models. It uses it in two ways:

1. **Standard mode** — For extracting claims and understanding text
2. **Grounded Search mode** — Gemini searches the live internet in real-time to find facts (this is called "Google Search Grounding")

KLAR does **not** use:
- ❌ No vector database (like PG vector) — KLAR doesn't need to store AI knowledge; it searches live every time
- ❌ No agent frameworks (like CrewAI, LangGraph, or AutoGen) — KLAR uses a simpler, faster pipeline approach
- ❌ No retrieval-augmented generation (RAG) — Instead of retrieving from a stored database, KLAR searches the open web in real-time
- ❌ No fine-tuned models — KLAR uses the standard Gemini model with carefully crafted prompts

### Why This Design?

| Decision | Reason |
|----------|--------|
| **Pipeline instead of agents** | Faster, more predictable, easier to debug. Each step is independent. |
| **Live search instead of stored knowledge** | Facts change. Live search always gets the latest information. |
| **Gemini 2.5 Flash** | Best balance of speed, accuracy, and cost for high-volume checking. |
| **Statistical NLP alongside AI** | The bias detector, AI detector, and plagiarism checker use math-based text analysis (NLP), not AI calls — making them instant and free to run. |

### Front-End vs. Back-End

KLAR has two parts that work separately:

**Front-End (What You See)**
- Built with **Next.js** and **React** — modern web frameworks used by companies like Netflix and Airbnb
- Runs in your browser
- Handles the interface, animations, dark mode, language switching
- Does **not** run any AI

**Back-End (Behind the Scenes)**
- Runs on the server
- Makes calls to Google's Gemini AI
- Searches Wikipedia and Google for evidence
- Runs all the analysis engines (bias, AI detection, plagiarism, frameworks)
- Stores your reports in a **Supabase** database (PostgreSQL — a standard database, not an AI database)

**How they communicate:**
When you click "Analyze," the front-end sends your text to the back-end API. The back-end processes it step by step and **streams results back in real-time** — so you see each claim being verified live as it happens, instead of waiting for everything to finish.

### The Analysis Engines Explained

| Engine | Type | How It Works |
|--------|------|-------------|
| **Fact Checker** | AI + Search | Gemini extracts claims → Wikipedia + Google searched → Gemini judges each claim |
| **AI Detector** | Statistical Math | Measures sentence patterns, word variety, and predictability using math formulas |
| **Bias Detector** | Statistical Math | Scans for emotional words, framing patterns, and source balance using NLP |
| **Plagiarism Checker** | Statistical Math | Compares text fingerprints against web search results |
| **Quality Evaluator** | Statistical Math | Applies MECE/Red Team/BLUF/Pre-Mortem scoring rules to the text structure |
| **Hallucination Detector** | Statistical Math | Identifies AI-typical fabrication patterns (vague specifics, contradictions) |
| **Cross-Reference Validator** | Logic | Checks if claims agree or contradict each other across sources |

### What's In the Database?

KLAR uses **Supabase** (which runs on PostgreSQL) to store:
- User accounts and profiles
- Verification reports and their claims
- Human review feedback
- Audit logs for security

It does **not** store:
- Your original text (only the extracted claims and verdicts)
- AI model weights or embeddings
- Vector data of any kind

---

## Part 4: Pricing & Usage Limits

| Plan | Price | Monthly Checks | Max Text | File Upload | Analysis Modes |
|------|-------|----------------|----------|-------------|----------------|
| **Guest** | Free (no signup) | 3 | 2,000 chars | ❌ Not available | Fact Check only |
| **Free** | $0/month | 10 | 5,000 chars | Up to 2 MB | Fact Check, Bias, AI Detection |
| **Pro** | $9/month | 200 | 10,000 chars | Up to 10 MB | All 5 modes + Comprehensive |
| **Team** | $29/user/month | Unlimited | 10,000 chars | Up to 10 MB | All modes, concurrent requests |

### How Usage is Tracked

- **Guests** get 3 free checks per month without signing up. After that, you need to create a free account.
- **Comprehensive analysis** (all 5 engines at once) counts as 2-3 checks depending on your plan, because it uses more computing resources.
- **Burst protection**: You can't run more than 1-2 checks per minute on free plans. This prevents automated abuse while letting normal users work comfortably.
- **One at a time**: Free and guest users can only run one analysis at a time. Pro and Team users can run multiple in parallel.
- **Abuse protection**: Repeatedly hitting limits triggers a temporary cooldown that escalates with continued misuse (5 min → 30 min → 2 hours).

---

## Part 5: Who Is KLAR For?

- **Journalists** — Verify claims in press releases, statements, and articles
- **Students** — Check AI-generated study materials and research papers
- **Researchers** — Validate data and detect plagiarism in academic writing
- **Content creators** — Ensure blog posts and articles are factually accurate
- **Businesses** — Audit AI-generated reports, proposals, and documentation
- **Anyone** — Who wants to know if what they're reading is actually true

---

*Built in Germany. For Europe. GDPR-compliant by design.*
