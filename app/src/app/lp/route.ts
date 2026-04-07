import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return new NextResponse(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   KLAR Landing Page – self-contained HTML served at /lp
   Green accent: #008c50 / #00cc77 / #00e88a
   ═══════════════════════════════════════════════════════════ */
const HTML = /* html */ `<!DOCTYPE html>
<html lang="de" class="scroll-smooth">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>KLAR — Knowledge Legitimacy Audit &amp; Review</title>
<meta name="description" content="KI-generierte Inhalte verifizieren. Jede Behauptung gegen echte Quellen pruefen. 10-Stufen-Pipeline, Browser-Extension, API.">
<meta name="theme-color" content="#f5f5f7">
<meta property="og:title" content="KLAR — AI Fact-Check Verification">
<meta property="og:description" content="10-step verification pipeline for AI-generated content. Browser extension, API, Dashboard.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style>
:root{
  --color-bg:#f5f5f7;--color-bg-alt:#eeeef0;--color-surface:#ffffff;--color-surface-hover:#f8f8fa;
  --color-border:rgba(0,0,0,.08);--color-border-hover:rgba(0,0,0,.14);--color-border-accent:rgba(0,140,80,.18);
  --color-accent:#008c50;--color-accent-dim:#006e3e;--color-accent-soft:rgba(0,140,80,.06);--color-accent-glow:rgba(0,140,80,.12);
  --color-text-main:#111113;--color-muted:#555558;--color-faint:#8e8e93;--font-sans:'Inter',system-ui,-apple-system,sans-serif;
}
html{scrollbar-gutter:auto}
body{font-family:var(--font-sans);background:var(--color-bg);color:var(--color-text-main);position:relative}
::selection{background:var(--color-accent);color:#fff}

.gradient-orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(100px);will-change:transform}
.orb--1{width:600px;height:600px;background:#008c50;opacity:.04;top:5%;left:10%;animation:orb-drift-1 25s ease-in-out infinite}
.orb--2{width:500px;height:500px;background:#6432b4;opacity:.03;top:35%;right:4%;animation:orb-drift-2 30s ease-in-out infinite}
.orb--3{width:450px;height:450px;background:#008c50;opacity:.03;bottom:10%;left:45%;animation:orb-drift-3 22s ease-in-out infinite}
@keyframes orb-drift-1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(80px,-50px) scale(1.15)}66%{transform:translate(-40px,60px) scale(.9)}}
@keyframes orb-drift-2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-60px,40px) scale(1.1)}70%{transform:translate(50px,-70px) scale(.85)}}
@keyframes orb-drift-3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-80px,-50px) scale(1.2)}}

.ticker-track{display:flex;align-items:center;height:100%;white-space:nowrap;width:max-content;will-change:transform;backface-visibility:hidden}
.ticker-item{display:inline-block;padding:0 3.5rem;font-size:1.05rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.9);flex-shrink:0}
.ticker-item::before{content:'\\25C6';margin-right:1.75rem;color:#00cc77;font-size:.7rem;vertical-align:middle}

.nav-scrolled{background:rgba(255,255,255,.82)!important;backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(0,140,80,.08)}
.nav-links-pill{display:flex;align-items:center;gap:1px;background:rgba(0,0,0,.042);border:1px solid rgba(0,0,0,.07);border-radius:100px;padding:3px 5px}
.nav-link{position:relative;padding:5px 11px;border-radius:100px;font-size:.72rem;font-weight:500;color:var(--color-muted);transition:color .2s ease,background .2s ease;letter-spacing:.01em;white-space:nowrap}
.nav-link:hover{color:var(--color-text-main);background:rgba(0,0,0,.06)}
.nav-link--active{color:var(--color-accent)!important;background:rgba(0,140,80,.08)!important;font-weight:600}
.gradient-text{background:linear-gradient(135deg,var(--color-accent),#00e88a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.card-hover{transition:border-color .5s cubic-bezier(.16,1,.3,1),transform .5s cubic-bezier(.16,1,.3,1),box-shadow .5s cubic-bezier(.16,1,.3,1)}
.card-hover:hover{border-color:var(--color-border-hover);transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,.08),0 0 0 1px rgba(0,140,80,.04)}
.reveal{opacity:0;transform:translateY(30px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.reveal--visible{opacity:1;transform:translateY(0)}
.section-dark{background:#0f0f11;color:#f0f0f2}
.section-alt{background:var(--color-bg-alt)}
.section-glow{position:relative;overflow:hidden}
.section-glow::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:800px;height:600px;background:radial-gradient(circle,rgba(0,140,80,.06) 0%,transparent 60%);pointer-events:none}
.section-organic{position:relative;overflow:hidden}
.section-organic::before{content:'';position:absolute;top:5%;right:0;width:50%;height:90%;background:radial-gradient(ellipse,rgba(0,140,80,.03) 0%,transparent 60%);border-radius:50%;pointer-events:none;transform:rotate(-15deg)}
.section-organic::after{content:'';position:absolute;bottom:5%;left:0;width:45%;height:80%;background:radial-gradient(ellipse,rgba(100,50,180,.02) 0%,transparent 60%);border-radius:50%;pointer-events:none;transform:rotate(10deg)}

.signal-grid{display:grid;grid-template-columns:1fr;gap:1rem;margin-bottom:4rem}
.signal-card{min-width:0;padding:2rem 1.5rem;border-radius:1rem;text-align:center;background:rgba(0,140,80,.07);border:1px solid rgba(0,140,80,.25)}
.signal-value{display:block;margin-bottom:.9rem;font-size:clamp(2.35rem,7vw,4.75rem);font-weight:900;line-height:.88;letter-spacing:-.05em;color:#00cc77;overflow-wrap:anywhere}
.signal-label{display:block;margin-bottom:.45rem;font-size:1.125rem;font-weight:600;color:#f0f0f2;text-wrap:balance}
.signal-copy{display:block;max-width:28ch;margin-inline:auto;font-size:.76rem;line-height:1.45;color:#7a7a88;text-wrap:balance}

/* ── Immersive Roadmap ── */
.rm{position:relative;max-width:940px;margin:0 auto;padding:60px 0 40px}
.rm__line{position:absolute;left:50%;top:0;bottom:0;width:120px;transform:translateX(-50%);overflow:visible;pointer-events:none}
.rm__line svg{position:absolute;top:0;left:50%;transform:translateX(-50%);width:120px;height:100%}
.rm__line-bg{fill:none;stroke:rgba(255,255,255,.1);stroke-width:3;stroke-linecap:round}
.rm__line-progress{fill:none;stroke:url(#rmGradient);stroke-width:3;stroke-linecap:round}
.rm__line-glow{position:absolute;left:50%;width:23px;height:40px;border-radius:50%;background:radial-gradient(circle,rgba(0,140,80,.7),transparent 70%);filter:blur(8px);top:0;pointer-events:none;z-index:1;opacity:0;transform:translateX(-50%)}
.rm__row{display:grid;grid-template-columns:1fr 80px 1fr;position:relative}
.rm__row+.rm__row{margin-top:48px}
.rm__center{display:flex;justify-content:center;position:relative;padding-top:20px}
.rm__dot{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.08);border:3px solid rgba(255,255,255,.15);position:relative;z-index:3;transition:all .6s cubic-bezier(.16,1,.3,1);flex-shrink:0}
.rm__dot--active{background:var(--color-accent);border-color:var(--color-accent);box-shadow:0 0 20px rgba(0,140,80,.55),0 0 40px rgba(0,140,80,.18);transform:scale(1.4)}
.rm__branch{position:absolute;top:28px;height:2px;background:rgba(255,255,255,.1);transition:background .6s ease,box-shadow .6s ease;border-radius:1px}
.rm__branch--l{right:calc(50% + 9px);left:0}
.rm__branch--r{left:calc(50% + 9px);right:0}
.rm__branch--active{background:var(--color-accent);box-shadow:0 0 10px rgba(0,140,80,.3)}
.rm__card{padding:28px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);opacity:0;transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1),border-color .5s ease,box-shadow .5s ease}
.rm__card--l{transform:translateX(-40px);text-align:right}
.rm__card--r{transform:translateX(40px)}
.rm__card--active{opacity:1!important;transform:translateX(0)!important;border-color:rgba(0,140,80,.2);box-shadow:0 8px 32px rgba(0,0,0,.3),0 0 30px rgba(0,140,80,.06)}
.rm__label{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--color-accent);background:rgba(0,140,80,.1);padding:3px 10px;border-radius:6px;margin-bottom:10px}
.rm__title{font-size:1.2rem;font-weight:700;margin-bottom:6px;letter-spacing:-.01em;color:#f0f0f2}
.rm__desc{font-size:.875rem;color:#9999a1;line-height:1.7;margin-bottom:14px}
.rm__tags{display:flex;flex-wrap:wrap;gap:6px}
.rm__card--l .rm__tags{justify-content:flex-end}
.rm__tag{font-size:11px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#8e8e96;font-weight:500}
.rm__end{display:flex;justify-content:center;padding-top:64px;position:relative;z-index:3}
.rm__end-marker{display:flex;flex-direction:column;align-items:center;gap:12px;opacity:0;transform:translateY(20px);transition:all .7s cubic-bezier(.16,1,.3,1)}
.rm__end-marker--active{opacity:1;transform:translateY(0)}
.rm__end-ring{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.12);transition:all .7s cubic-bezier(.16,1,.3,1)}
.rm__end-marker--active .rm__end-ring{background:linear-gradient(135deg,var(--color-accent),#00e88a);border-color:transparent;box-shadow:0 0 30px rgba(0,140,80,.5),0 0 60px rgba(0,140,80,.15)}
.rm__end-label{font-size:.875rem;font-weight:600;color:rgba(255,255,255,.15);transition:color .7s ease;letter-spacing:.02em}
.rm__end-marker--active .rm__end-label{color:#f0f0f2}

.faq-answer{max-height:0;overflow:hidden;transition:max-height .28s cubic-bezier(.4,0,.2,1)}
.faq-item--open .faq-answer{max-height:600px;transition:max-height .5s cubic-bezier(.16,1,.3,1)}
.faq-item--open{border-color:rgba(0,140,80,.15)!important;box-shadow:0 4px 24px rgba(0,140,80,.04)}
.faq-question__icon::before,.faq-question__icon::after{content:'';position:absolute;background:var(--color-muted);border-radius:2px;transition:transform .4s cubic-bezier(.16,1,.3,1)}
.faq-question__icon::before{width:14px;height:2px;top:50%;left:50%;transform:translate(-50%,-50%)}
.faq-question__icon::after{width:2px;height:14px;top:50%;left:50%;transform:translate(-50%,-50%)}
.faq-item--open .faq-question__icon::after{transform:translate(-50%,-50%) rotate(90deg);opacity:0}
.faq-item{border-bottom:1px solid var(--color-border)}
.faq-item:first-child{border-top:1px solid var(--color-border)}
.faq-item--open{background:rgba(0,140,80,.02)}

.lang-pill{display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,.04);border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:4px}
.lang-btn{min-width:44px;height:30px;border:none;border-radius:999px;background:transparent;font-size:.72rem;font-weight:700;color:var(--color-muted);cursor:pointer;transition:all .2s ease}
.lang-btn.is-active{background:rgba(0,140,80,.1);color:var(--color-accent);box-shadow:inset 0 0 0 1px rgba(0,140,80,.14)}

.typing-cursor{display:inline-block;width:3px;height:.75em;background:var(--color-accent);margin-left:2px;vertical-align:baseline;animation:blink-cursor .7s step-end infinite}
@keyframes blink-cursor{0%,100%{opacity:1}50%{opacity:0}}

.browser-chrome{border-radius:12px;overflow:hidden;border:1px solid var(--color-border-hover);box-shadow:0 20px 60px rgba(0,0,0,.1)}
.browser-toolbar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--color-surface);border-bottom:1px solid var(--color-border)}
.browser-dots{display:flex;gap:6px}
.browser-dots span{width:10px;height:10px;border-radius:50%}
.browser-dots span:nth-child(1){background:#ff5f57}
.browser-dots span:nth-child(2){background:#febc2e}
.browser-dots span:nth-child(3){background:#28c840}
.browser-url{flex:1;padding:5px 12px;border-radius:6px;background:var(--color-bg);border:1px solid var(--color-border);font-size:11px;color:var(--color-faint);font-family:var(--font-sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.magnetic-btn{position:relative;display:inline-block;transition:transform .3s cubic-bezier(.16,1,.3,1)}

.back-to-top{position:fixed;bottom:2rem;right:2rem;z-index:900;width:44px;height:44px;border-radius:50%;background:var(--color-accent);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,140,80,.35);opacity:0;visibility:hidden;transform:translateY(12px);transition:opacity .3s ease,visibility .3s ease,transform .3s ease,background .25s ease}
.back-to-top:hover{background:#006e3e;transform:translateY(-2px)}
.back-to-top--visible{opacity:1;visibility:visible;transform:translateY(0)}

.nav-hamburger{display:none;flex-direction:column;justify-content:center;gap:5px;cursor:pointer;padding:8px;border:none;background:transparent;z-index:51;-webkit-tap-highlight-color:transparent}
.nav-hamburger span{display:block;width:22px;height:2px;background:var(--color-text-main);border-radius:2px;transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .25s ease}
.nav-hamburger.is-open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.nav-hamburger.is-open span:nth-child(2){opacity:0;transform:translateX(-6px)}
.nav-hamburger.is-open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
#mobileMenu{display:flex;flex-direction:column;align-items:center;justify-content:center;position:fixed;inset:0;z-index:50;background:rgba(4,8,18,.97);backdrop-filter:saturate(160%) blur(24px);-webkit-backdrop-filter:saturate(160%) blur(24px);visibility:hidden;opacity:0;pointer-events:none;transition:opacity .28s ease,visibility .28s}
#mobileMenu.is-open{visibility:visible;opacity:1;pointer-events:auto}
.mm-close{position:absolute;top:18px;right:18px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;cursor:pointer}
.mm-brand{font-size:1.35rem;font-weight:800;letter-spacing:-.04em;background:linear-gradient(135deg,#008c50,#00e88a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:28px}
.mm-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:calc(100% - 48px);max-width:340px}
.mm-link{font-size:.95rem;font-weight:600;color:rgba(255,255,255,.75);text-decoration:none;padding:14px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;text-align:center;transition:color .2s,background .2s,border-color .2s,transform .15s}
.mm-link:hover{color:#fff;background:rgba(0,140,80,.14);border-color:rgba(0,140,80,.3);transform:scale(1.03)}
.mm-link--full{grid-column:span 2}

.cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:9998;transform:translateY(100%);transition:transform .5s cubic-bezier(.16,1,.3,1)}
.cookie-banner--visible{transform:translateY(0)}
.cookie-banner__inner{max-width:680px;margin:0 auto 24px;padding:24px 28px;background:rgba(255,255,255,.95);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-radius:20px;border:1px solid rgba(0,0,0,.08);box-shadow:0 20px 60px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.03)}
.cookie-banner__title{font-weight:700;font-size:.95rem;margin-bottom:6px}
.cookie-banner__text{font-size:.8rem;color:var(--color-muted);line-height:1.6;margin-bottom:16px}
.cookie-banner__actions{display:flex;gap:10px;flex-wrap:wrap}
.cookie-banner__btn{padding:10px 22px;border-radius:10px;font-size:.8rem;font-weight:600;cursor:pointer;transition:all .25s ease;border:none}
.cookie-banner__btn--accept{background:var(--color-accent);color:#fff}
.cookie-banner__btn--reject{background:var(--color-bg-alt);color:var(--color-text-main);border:1px solid var(--color-border)}

.engine-card{position:relative;padding:2rem;border-radius:1rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);transition:border-color .5s ease,box-shadow .5s ease,transform .5s ease}
.engine-card:hover{border-color:rgba(0,140,80,.2);box-shadow:0 12px 40px rgba(0,0,0,.2),0 0 20px rgba(0,140,80,.05);transform:translateY(-4px)}
.engine-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(0,140,80,.1);margin-bottom:1rem}

.pricing-card{position:relative;padding:2rem;border-radius:1.25rem;background:var(--color-surface);border:1px solid var(--color-border);transition:border-color .4s ease,box-shadow .4s ease,transform .4s ease}
.pricing-card:hover{border-color:var(--color-border-hover);transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.08)}
.pricing-card--featured{border-color:rgba(0,140,80,.3);box-shadow:0 0 40px rgba(0,140,80,.08)}
.pricing-card--featured:hover{box-shadow:0 16px 48px rgba(0,0,0,.08),0 0 40px rgba(0,140,80,.12)}

@media(min-width:700px){.signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:1180px){.signal-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:767px){
  .nav-hamburger{display:flex}
  .rm__row{grid-template-columns:40px 1fr}
  .rm__center{padding-top:4px;grid-column:1;grid-row:1}
  .rm__cell:not(.rm__cell--hide){grid-column:2;grid-row:1}
  .rm__line{left:0;transform:none;width:40px!important}
  .rm__line svg{left:0;transform:none;width:40px}
  .rm__card--l,.rm__card--r{text-align:left;transform:translateX(18px)}
  .rm__card--l .rm__tags,.rm__card--r .rm__tags{justify-content:flex-start}
  .rm__card--active.rm__card--l,.rm__card--active.rm__card--r{transform:translateX(0)!important}
  .rm__cell--hide,.rm__branch{display:none}
  .rm__row+.rm__row{margin-top:28px}
  #hero{padding-top:7rem!important}
  .lang-pill{margin-left:auto}
}
</style>
</head>
<body class="overflow-x-hidden antialiased leading-relaxed">
<div class="gradient-orbs" aria-hidden="true"><div class="orb orb--1"></div><div class="orb orb--2"></div><div class="orb orb--3"></div></div>

<!-- ══════════ TICKER ══════════ -->
<div class="fixed top-0 left-0 right-0 z-[60] overflow-hidden" style="height:48px;background:#0a0a0c;border-bottom:1px solid rgba(0,140,80,.25);">
  <div class="ticker-track" id="tickerTrack">
    <span class="ticker-item">KLAR VERIFICATION</span>
    <span class="ticker-item">AI FACT-CHECK</span>
    <span class="ticker-item">10-STEP PIPELINE</span>
    <span class="ticker-item">CLAIM EXTRACTION</span>
    <span class="ticker-item">SOURCE CREDIBILITY</span>
    <span class="ticker-item">BIAS DETECTION</span>
    <span class="ticker-item">HALLUCINATION CHECK</span>
    <span class="ticker-item">EVIDENCE GRADING</span>
    <span class="ticker-item">BROWSER EXTENSION</span>
    <span class="ticker-item">PRIVACY FIRST</span>
    <span class="ticker-item">KLAR VERIFICATION</span>
    <span class="ticker-item">AI FACT-CHECK</span>
    <span class="ticker-item">10-STEP PIPELINE</span>
    <span class="ticker-item">CLAIM EXTRACTION</span>
    <span class="ticker-item">SOURCE CREDIBILITY</span>
  </div>
</div>

<!-- ══════════ NAV ══════════ -->
<nav class="fixed top-[48px] left-0 right-0 z-50 h-16 flex items-center transition-all duration-400" id="nav">
  <div class="w-full max-w-[1100px] mx-auto px-5 md:px-10 flex items-center justify-between gap-4">
    <a href="#hero" class="flex items-center gap-2 hover:opacity-70 transition-opacity">
      <span style="font-size:1.15rem;font-weight:900;letter-spacing:-.04em;color:#008c50;">KLAR</span>
    </a>
    <div class="hidden md:flex items-center gap-3">
      <div class="nav-links-pill">
        <a href="#problem" class="nav-link magnetic-btn" data-nav-section="problem" data-i18n data-de="Problem" data-en="Problem">Problem</a>
        <a href="#features" class="nav-link magnetic-btn" data-nav-section="features" data-i18n data-de="Engine" data-en="Engine">Engine</a>
        <a href="#roadmap" class="nav-link magnetic-btn" data-nav-section="roadmap" data-i18n data-de="Pipeline" data-en="Pipeline">Pipeline</a>
        <a href="#extension" class="nav-link magnetic-btn" data-nav-section="extension" data-i18n data-de="Extension" data-en="Extension">Extension</a>
        <a href="#pricing" class="nav-link magnetic-btn" data-nav-section="pricing" data-i18n data-de="Preise" data-en="Pricing">Preise</a>
        <a href="#faq" class="nav-link magnetic-btn" data-nav-section="faq" data-i18n data-de="FAQ" data-en="FAQ">FAQ</a>
      </div>
      <div class="lang-pill" aria-label="Language switcher">
        <button class="lang-btn" type="button" data-lang-switch="de">DE</button>
        <button class="lang-btn" type="button" data-lang-switch="en">EN</button>
      </div>
      <a href="/de/verify" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:var(--color-accent);color:#fff;font-size:.75rem;font-weight:700;border-radius:10px;text-decoration:none;transition:all .25s ease;box-shadow:0 2px 14px rgba(0,140,80,.25);white-space:nowrap;" data-i18n data-de="Jetzt pruefen" data-en="Check now">Jetzt pruefen</a>
    </div>
    <button class="nav-hamburger md:hidden" id="navHamburger" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
</nav>

<!-- ══════════ MOBILE MENU ══════════ -->
<div id="mobileMenu" aria-hidden="true" role="dialog">
  <button class="mm-close" onclick="closeMobileMenu()" aria-label="Close">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
  <div class="mm-brand">KLAR</div>
  <div class="lang-pill mb-5">
    <button class="lang-btn" type="button" data-lang-switch="de">DE</button>
    <button class="lang-btn" type="button" data-lang-switch="en">EN</button>
  </div>
  <div class="mm-grid">
    <a href="#problem" class="mm-link" onclick="closeMobileMenu()" data-i18n data-de="Problem" data-en="Problem">Problem</a>
    <a href="#features" class="mm-link" onclick="closeMobileMenu()" data-i18n data-de="Engine" data-en="Engine">Engine</a>
    <a href="#roadmap" class="mm-link" onclick="closeMobileMenu()" data-i18n data-de="Pipeline" data-en="Pipeline">Pipeline</a>
    <a href="#extension" class="mm-link" onclick="closeMobileMenu()" data-i18n data-de="Extension" data-en="Extension">Extension</a>
    <a href="#pricing" class="mm-link" onclick="closeMobileMenu()" data-i18n data-de="Preise" data-en="Pricing">Preise</a>
    <a href="#faq" class="mm-link" onclick="closeMobileMenu()" data-i18n data-de="FAQ" data-en="FAQ">FAQ</a>
    <a href="/de/verify" class="mm-link mm-link--full" onclick="closeMobileMenu()" data-i18n data-de="Jetzt pruefen" data-en="Check now">Jetzt pruefen</a>
  </div>
</div>

<!-- ══════════ HERO ══════════ -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden pb-[120px] pt-28 section-dark" id="hero">
  <canvas id="heroParticles" class="absolute inset-0 z-[1]"></canvas>
  <div class="absolute inset-0 z-0" style="background:radial-gradient(ellipse 70% 55% at 50% 40%,rgba(0,140,80,.09) 0%,transparent 65%),radial-gradient(ellipse 50% 60% at 20% 80%,rgba(0,140,80,.05) 0%,transparent 50%),radial-gradient(ellipse 45% 50% at 80% 25%,rgba(0,80,50,.07) 0%,transparent 50%)"></div>
  <div class="absolute inset-0 z-0 opacity-100" style="background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:72px 72px;mask-image:radial-gradient(ellipse 60% 55% at 50% 50%,black 0%,transparent 70%)"></div>
  <div class="relative z-10 max-w-[900px] mx-auto px-5 text-center">
    <div class="reveal mb-5">
      <span class="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full" style="color:var(--color-accent);background:rgba(0,140,80,.08);border:1px solid rgba(0,140,80,.18);" data-i18n data-de="AI-VERIFIZIERUNG &middot; FAKTENCHECK &middot; OPEN SOURCE" data-en="AI VERIFICATION &middot; FACT-CHECK &middot; OPEN SOURCE">AI-VERIFIZIERUNG &middot; FAKTENCHECK &middot; OPEN SOURCE</span>
    </div>
    <h1 class="reveal text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.06] tracking-tight mb-6" style="color:#f0f0f2;">
      <span data-i18n data-de="Die Verifikationsplattform fuer" data-en="The verification platform for">Die Verifikationsplattform fuer</span><br>
      <span class="gradient-text" id="heroTyping">KI-Inhalte</span>
    </h1>
    <p class="reveal text-lg md:text-xl max-w-[720px] mx-auto leading-relaxed mb-10" style="color:#9a9aaa;" data-i18n
       data-de="KLAR prueft jede Behauptung gegen echte Quellen. Unsere 10-Stufen-Pipeline analysiert Fakten, erkennt Verzerrungen, bewertet Quellen und findet Halluzinationen. Per Browser-Extension, URL oder Texteingabe."
       data-en="KLAR checks every claim against real sources. Our 10-step pipeline analyzes facts, detects bias, evaluates sources, and finds hallucinations. Via browser extension, URL, or text input.">KLAR prueft jede Behauptung gegen echte Quellen. Unsere 10-Stufen-Pipeline analysiert Fakten, erkennt Verzerrungen, bewertet Quellen und findet Halluzinationen. Per Browser-Extension, URL oder Texteingabe.</p>
    <div class="reveal flex flex-wrap items-center justify-center gap-4">
      <a href="/de/verify" class="magnetic-btn" style="display:inline-flex;align-items:center;gap:8px;padding:14px 32px;background:var(--color-accent);color:#fff;font-size:.95rem;font-weight:700;border-radius:12px;text-decoration:none;transition:all .25s ease;box-shadow:0 4px 24px rgba(0,140,80,.3);" data-i18n data-de="Jetzt pruefen" data-en="Check now">Jetzt pruefen</a>
      <a href="#roadmap" style="display:inline-flex;align-items:center;gap:8px;padding:14px 24px;background:transparent;color:var(--color-faint);font-size:.9rem;font-weight:600;border-radius:12px;text-decoration:none;border:1px solid rgba(255,255,255,.15);transition:all .25s ease;" data-i18n data-de="Pipeline entdecken" data-en="Explore pipeline">Pipeline entdecken</a>
    </div>
    <div class="reveal mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[700px] mx-auto text-left">
      <div class="rounded-2xl p-5" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
        <div class="text-3xl font-black gradient-text mb-1" data-target="10" data-suffix=" Stufen">0</div>
        <div class="text-sm" style="color:#b0b0ba;" data-i18n data-de="Analyse-Pipeline" data-en="Analysis pipeline">Analyse-Pipeline</div>
      </div>
      <div class="rounded-2xl p-5" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
        <div class="text-3xl font-black gradient-text mb-1" data-target="30" data-prefix="< " data-suffix="s">0</div>
        <div class="text-sm" style="color:#b0b0ba;" data-i18n data-de="Pro Verifikation" data-en="Per verification">Pro Verifikation</div>
      </div>
      <div class="rounded-2xl p-5" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
        <div class="text-3xl font-black gradient-text mb-1" data-target="5" data-suffix=" Sprachen">0</div>
        <div class="text-sm" style="color:#b0b0ba;" data-i18n data-de="Unterstuetzt" data-en="Supported">Unterstuetzt</div>
      </div>
    </div>
  </div>
  <div class="absolute bottom-0 left-0 right-0 h-[120px] z-20" style="background:linear-gradient(to bottom,transparent,#0f0f11);"></div>
</section>

<!-- ══════════ PROBLEM ══════════ -->
<section class="relative section-dark" id="problem" style="padding:7rem 0 6rem;margin-top:-2px;">
  <div class="max-w-[1100px] mx-auto px-5 md:px-10">
    <h2 class="reveal text-4xl md:text-5xl font-black leading-[1.05] tracking-tight mb-6" style="color:#f0f0f2;">
      <span data-i18n data-de="Warum KI-Inhalte" data-en="Why AI content">Warum KI-Inhalte</span><br>
      <span style="color:#00cc77;" data-i18n data-de="verifiziert werden muessen" data-en="must be verified">verifiziert werden muessen</span>
    </h2>
    <p class="reveal text-lg max-w-[640px] leading-relaxed mb-16" style="color:#9a9aaa;" data-i18n
       data-de="KI-generierte Texte klingen ueberzeugend, enthalten aber haeufig ungepruefte Behauptungen, Verzerrungen und erfundene Fakten. Ohne systematische Verifikation verbreiten sich diese Fehler unkontrolliert."
       data-en="AI-generated texts sound convincing but frequently contain unchecked claims, biases, and fabricated facts. Without systematic verification, these errors spread uncontrolled.">KI-generierte Texte klingen ueberzeugend, enthalten aber haeufig ungepruefte Behauptungen, Verzerrungen und erfundene Fakten. Ohne systematische Verifikation verbreiten sich diese Fehler unkontrolliert.</p>
    <div class="signal-grid">
      <div class="reveal signal-card">
        <span class="signal-value" data-target="78" data-suffix="%">0</span>
        <span class="signal-label" data-i18n data-de="enthalten ungepruefte Claims" data-en="contain unchecked claims">enthalten ungepruefte Claims</span>
        <span class="signal-copy" data-i18n data-de="KI-generierter Texte haben mindestens eine nicht belegte Behauptung" data-en="of AI-generated texts have at least one unsupported claim">KI-generierter Texte haben mindestens eine nicht belegte Behauptung</span>
      </div>
      <div class="reveal signal-card">
        <span class="signal-value" data-target="91" data-suffix="%">0</span>
        <span class="signal-label" data-i18n data-de="erkennen KI-Inhalte nicht" data-en="cannot identify AI content">erkennen KI-Inhalte nicht</span>
        <span class="signal-copy" data-i18n data-de="der Nutzer koennen KI-generierte von menschlichen Texten nicht unterscheiden" data-en="of users cannot distinguish AI-generated from human-written text">der Nutzer koennen KI-generierte von menschlichen Texten nicht unterscheiden</span>
      </div>
      <div class="reveal signal-card">
        <span class="signal-value">3.2x</span>
        <span class="signal-label" data-i18n data-de="schnellere Verbreitung" data-en="faster spread">schnellere Verbreitung</span>
        <span class="signal-copy" data-i18n data-de="Falschinformationen verbreiten sich schneller als Korrekturen" data-en="Misinformation spreads faster than corrections">Falschinformationen verbreiten sich schneller als Korrekturen</span>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ FEATURES / ENGINE ══════════ -->
<section class="relative section-dark" id="features" style="padding:6rem 0;">
  <div class="section-glow"></div>
  <div class="max-w-[1100px] mx-auto px-5 md:px-10 relative z-10">
    <h2 class="reveal text-3xl md:text-5xl font-black tracking-tight mb-4" style="color:#f0f0f2;" data-i18n data-de="Verification Engine" data-en="Verification Engine">Verification Engine</h2>
    <p class="reveal text-base max-w-[560px] leading-relaxed mb-12" style="color:#9a9aaa;" data-i18n
       data-de="Fuenf Kernmodule arbeiten zusammen, um KI-generierte Inhalte praezise zu pruefen."
       data-en="Five core modules work together to precisely verify AI-generated content.">Fuenf Kernmodule arbeiten zusammen, um KI-generierte Inhalte praezise zu pruefen.</p>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="reveal engine-card">
        <div class="engine-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00cc77" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
        <h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Claim-Extraktion" data-en="Claim Extraction">Claim-Extraktion</h3>
        <p class="text-sm leading-relaxed" style="color:#9a9aaa;" data-i18n data-de="NLP isoliert einzelne pruefbare Behauptungen aus beliebigen Texten, URLs oder Dokumenten." data-en="NLP isolates individual verifiable claims from any text, URL, or document.">NLP isoliert einzelne pruefbare Behauptungen aus beliebigen Texten, URLs oder Dokumenten.</p>
      </div>
      <div class="reveal engine-card">
        <div class="engine-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00cc77" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Quellen-Verifikation" data-en="Source Verification">Quellen-Verifikation</h3>
        <p class="text-sm leading-relaxed" style="color:#9a9aaa;" data-i18n data-de="Jeder Claim wird gegen mehrere unabhaengige Quellen und Datenbanken abgeglichen." data-en="Every claim is cross-referenced against multiple independent sources and databases.">Jeder Claim wird gegen mehrere unabhaengige Quellen und Datenbanken abgeglichen.</p>
      </div>
      <div class="reveal engine-card">
        <div class="engine-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00cc77" stroke-width="2" stroke-linecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></div>
        <h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Glaubwuerdigkeits-Scoring" data-en="Credibility Scoring">Glaubwuerdigkeits-Scoring</h3>
        <p class="text-sm leading-relaxed" style="color:#9a9aaa;" data-i18n data-de="Quellen werden nach Domain-Autoritaet, Reputation und Vertrauenswuerdigkeit bewertet." data-en="Sources are scored by domain authority, reputation, and trustworthiness.">Quellen werden nach Domain-Autoritaet, Reputation und Vertrauenswuerdigkeit bewertet.</p>
      </div>
      <div class="reveal engine-card">
        <div class="engine-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00cc77" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Bias-Erkennung" data-en="Bias Detection">Bias-Erkennung</h3>
        <p class="text-sm leading-relaxed" style="color:#9a9aaa;" data-i18n data-de="Systematische Verzerrungen in Framing, Sentiment und politischer Ausrichtung werden erkannt." data-en="Systematic biases in framing, sentiment, and political leaning are detected.">Systematische Verzerrungen in Framing, Sentiment und politischer Ausrichtung werden erkannt.</p>
      </div>
      <div class="reveal engine-card">
        <div class="engine-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00cc77" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg></div>
        <h3 class="text-lg font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Halluzinations-Erkennung" data-en="Hallucination Detection">Halluzinations-Erkennung</h3>
        <p class="text-sm leading-relaxed" style="color:#9a9aaa;" data-i18n data-de="KI-typische Erfindungen und Kohaerenz-Fehler werden identifiziert und markiert." data-en="AI-typical fabrications and coherence errors are identified and flagged.">KI-typische Erfindungen und Kohaerenz-Fehler werden identifiziert und markiert.</p>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ INPUT MODES ══════════ -->
<section class="section-organic" style="padding:6rem 0;" id="inputModes">
  <div class="max-w-[1100px] mx-auto px-5 md:px-10 relative z-10">
    <h2 class="reveal text-3xl md:text-4xl font-black tracking-tight mb-4" data-i18n data-de="Drei Eingabewege" data-en="Three input modes">Drei Eingabewege</h2>
    <p class="reveal text-base max-w-[520px] leading-relaxed mb-10" style="color:var(--color-muted);" data-i18n
       data-de="Egal ob Text, URL oder Dokument. KLAR analysiert jedes Format."
       data-en="Whether text, URL, or document. KLAR analyzes any format.">Egal ob Text, URL oder Dokument. KLAR analysiert jedes Format.</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="reveal card-hover rounded-2xl p-6 bg-white border border-[rgba(0,0,0,.07)]">
        <div class="text-3xl mb-3">&#9997;&#65039;</div>
        <h3 class="font-bold mb-2" data-i18n data-de="Texteingabe" data-en="Text input">Texteingabe</h3>
        <p class="text-sm leading-relaxed" style="color:var(--color-muted);" data-i18n data-de="Text einfuegen und direkt pruefen lassen." data-en="Paste text and verify directly.">Text einfuegen und direkt pruefen lassen.</p>
      </div>
      <div class="reveal card-hover rounded-2xl p-6 bg-white border border-[rgba(0,0,0,.07)]">
        <div class="text-3xl mb-3">&#128279;</div>
        <h3 class="font-bold mb-2" data-i18n data-de="URL-Analyse" data-en="URL analysis">URL-Analyse</h3>
        <p class="text-sm leading-relaxed" style="color:var(--color-muted);" data-i18n data-de="Webseiten-URL eingeben, Inhalte werden automatisch extrahiert." data-en="Enter a web URL, content is extracted automatically.">Webseiten-URL eingeben, Inhalte werden automatisch extrahiert.</p>
      </div>
      <div class="reveal card-hover rounded-2xl p-6 bg-white border border-[rgba(0,0,0,.07)]">
        <div class="text-3xl mb-3">&#128196;</div>
        <h3 class="font-bold mb-2" data-i18n data-de="Datei-Upload" data-en="File upload">Datei-Upload</h3>
        <p class="text-sm leading-relaxed" style="color:var(--color-muted);" data-i18n data-de="PDF, DOCX oder TXT hochladen und analysieren." data-en="Upload PDF, DOCX, or TXT for analysis.">PDF, DOCX oder TXT hochladen und analysieren.</p>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ IMMERSIVE ROADMAP / PIPELINE ══════════ -->
<section class="section-dark" id="roadmap" style="padding:6rem 0 5rem;">
  <div class="max-w-[1100px] mx-auto px-5 md:px-10">
    <h2 class="reveal text-3xl md:text-5xl font-black tracking-tight mb-4" style="color:#f0f0f2;" data-i18n data-de="10-Stufen-Pipeline" data-en="10-Step Pipeline">10-Stufen-Pipeline</h2>
    <p class="reveal text-base max-w-[560px] leading-relaxed mb-12" style="color:#9a9aaa;" data-i18n
       data-de="Jeder eingereichte Inhalt durchlaeuft unsere vollstaendige Verifikationskette."
       data-en="Every submitted content passes through our complete verification chain.">Jeder eingereichte Inhalt durchlaeuft unsere vollstaendige Verifikationskette.</p>

    <div class="rm" id="roadmapTimeline">
      <div class="rm__line" id="rmLine">
        <svg id="rmSvg" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="rmGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#008c50"/><stop offset="100%" stop-color="#00e88a"/></linearGradient></defs>
          <path id="rmPathBg" class="rm__line-bg"/>
          <path id="rmPathFill" class="rm__line-progress"/>
        </svg>
        <div class="rm__line-glow" id="rmGlow"></div>
      </div>

      <!-- Step 1 – left -->
      <div class="rm__row">
        <div class="rm__card rm__card--l">
          <span class="rm__label" data-i18n data-de="Schritt 01" data-en="Step 01">Schritt 01</span>
          <div class="rm__title" data-i18n data-de="Input-Analyse" data-en="Input Analysis">Input-Analyse</div>
          <div class="rm__desc" data-i18n data-de="NLP parst den Eingabetext und erkennt Sprache, Struktur und Texttyp." data-en="NLP parses input text, detecting language, structure, and text type.">NLP parst den Eingabetext und erkennt Sprache, Struktur und Texttyp.</div>
          <div class="rm__tags"><span class="rm__tag">NLP</span><span class="rm__tag">Tokenisierung</span><span class="rm__tag">Spracherkennung</span></div>
        </div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--l"></div></div>
        <div class="rm__cell rm__cell--hide"></div>
      </div>

      <!-- Step 2 – right -->
      <div class="rm__row">
        <div class="rm__cell rm__cell--hide"></div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--r"></div></div>
        <div class="rm__card rm__card--r">
          <span class="rm__label" data-i18n data-de="Schritt 02" data-en="Step 02">Schritt 02</span>
          <div class="rm__title" data-i18n data-de="Claim-Extraktion" data-en="Claim Extraction">Claim-Extraktion</div>
          <div class="rm__desc" data-i18n data-de="Einzelne pruefbare Behauptungen werden aus dem Text isoliert." data-en="Individual verifiable claims are isolated from the text.">Einzelne pruefbare Behauptungen werden aus dem Text isoliert.</div>
          <div class="rm__tags"><span class="rm__tag">Entity Recognition</span><span class="rm__tag">Claim Parsing</span></div>
        </div>
      </div>

      <!-- Step 3 – left -->
      <div class="rm__row">
        <div class="rm__card rm__card--l">
          <span class="rm__label" data-i18n data-de="Schritt 03" data-en="Step 03">Schritt 03</span>
          <div class="rm__title" data-i18n data-de="Quellen-Recherche" data-en="Source Research">Quellen-Recherche</div>
          <div class="rm__desc" data-i18n data-de="Vertrauenswuerdige Datenbanken und externe Quellen werden durchsucht." data-en="Trusted databases and external sources are searched.">Vertrauenswuerdige Datenbanken und externe Quellen werden durchsucht.</div>
          <div class="rm__tags"><span class="rm__tag">Web Search</span><span class="rm__tag">API</span><span class="rm__tag">Database</span></div>
        </div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--l"></div></div>
        <div class="rm__cell rm__cell--hide"></div>
      </div>

      <!-- Step 4 – right -->
      <div class="rm__row">
        <div class="rm__cell rm__cell--hide"></div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--r"></div></div>
        <div class="rm__card rm__card--r">
          <span class="rm__label" data-i18n data-de="Schritt 04" data-en="Step 04">Schritt 04</span>
          <div class="rm__title" data-i18n data-de="Kreuzreferenz" data-en="Cross-Reference">Kreuzreferenz</div>
          <div class="rm__desc" data-i18n data-de="Claims werden gegen mehrere unabhaengige Quellen geprueft und verglichen." data-en="Claims are checked and compared against multiple independent sources.">Claims werden gegen mehrere unabhaengige Quellen geprueft und verglichen.</div>
          <div class="rm__tags"><span class="rm__tag">Multi-Source</span><span class="rm__tag">Konsens</span></div>
        </div>
      </div>

      <!-- Step 5 – left -->
      <div class="rm__row">
        <div class="rm__card rm__card--l">
          <span class="rm__label" data-i18n data-de="Schritt 05" data-en="Step 05">Schritt 05</span>
          <div class="rm__title" data-i18n data-de="Glaubwuerdigkeits-Pruefung" data-en="Credibility Check">Glaubwuerdigkeits-Pruefung</div>
          <div class="rm__desc" data-i18n data-de="Quellenqualitaet und -Autoritaet werden systematisch bewertet." data-en="Source quality and authority are systematically evaluated.">Quellenqualitaet und -Autoritaet werden systematisch bewertet.</div>
          <div class="rm__tags"><span class="rm__tag">Domain Authority</span><span class="rm__tag">Trust Score</span></div>
        </div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--l"></div></div>
        <div class="rm__cell rm__cell--hide"></div>
      </div>

      <!-- Step 6 – right -->
      <div class="rm__row">
        <div class="rm__cell rm__cell--hide"></div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--r"></div></div>
        <div class="rm__card rm__card--r">
          <span class="rm__label" data-i18n data-de="Schritt 06" data-en="Step 06">Schritt 06</span>
          <div class="rm__title" data-i18n data-de="Bias-Analyse" data-en="Bias Analysis">Bias-Analyse</div>
          <div class="rm__desc" data-i18n data-de="Framing, Sentiment und systematische Verzerrungen werden analysiert." data-en="Framing, sentiment, and systematic biases are analyzed.">Framing, Sentiment und systematische Verzerrungen werden analysiert.</div>
          <div class="rm__tags"><span class="rm__tag">Sentiment</span><span class="rm__tag">Framing</span><span class="rm__tag">Political Lean</span></div>
        </div>
      </div>

      <!-- Step 7 – left -->
      <div class="rm__row">
        <div class="rm__card rm__card--l">
          <span class="rm__label" data-i18n data-de="Schritt 07" data-en="Step 07">Schritt 07</span>
          <div class="rm__title" data-i18n data-de="Halluzinations-Check" data-en="Hallucination Check">Halluzinations-Check</div>
          <div class="rm__desc" data-i18n data-de="KI-typische Erfindungen und Kohaerenz-Fehler werden erkannt." data-en="AI-typical fabrications and coherence errors are detected.">KI-typische Erfindungen und Kohaerenz-Fehler werden erkannt.</div>
          <div class="rm__tags"><span class="rm__tag">Pattern Detection</span><span class="rm__tag">Coherence</span></div>
        </div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--l"></div></div>
        <div class="rm__cell rm__cell--hide"></div>
      </div>

      <!-- Step 8 – right -->
      <div class="rm__row">
        <div class="rm__cell rm__cell--hide"></div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--r"></div></div>
        <div class="rm__card rm__card--r">
          <span class="rm__label" data-i18n data-de="Schritt 08" data-en="Step 08">Schritt 08</span>
          <div class="rm__title" data-i18n data-de="Evidenz-Bewertung" data-en="Evidence Grading">Evidenz-Bewertung</div>
          <div class="rm__desc" data-i18n data-de="Staerke der Belege wird klassifiziert: Stark, Mittel, Schwach, Ungenueged." data-en="Evidence strength is classified: Strong, Moderate, Weak, Insufficient.">Staerke der Belege wird klassifiziert: Stark, Mittel, Schwach, Ungenuegend.</div>
          <div class="rm__tags"><span class="rm__tag">Strong</span><span class="rm__tag">Moderate</span><span class="rm__tag">Weak</span></div>
        </div>
      </div>

      <!-- Step 9 – left -->
      <div class="rm__row">
        <div class="rm__card rm__card--l">
          <span class="rm__label" data-i18n data-de="Schritt 09" data-en="Step 09">Schritt 09</span>
          <div class="rm__title" data-i18n data-de="Konfidenz-Scoring" data-en="Confidence Scoring">Konfidenz-Scoring</div>
          <div class="rm__desc" data-i18n data-de="Alle Analyseergebnisse werden aggregiert und zu einem Gesamtscore verdichtet." data-en="All analysis results are aggregated into a comprehensive confidence score.">Alle Analyseergebnisse werden aggregiert und zu einem Gesamtscore verdichtet.</div>
          <div class="rm__tags"><span class="rm__tag">Aggregation</span><span class="rm__tag">Score 0-100</span></div>
        </div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--l"></div></div>
        <div class="rm__cell rm__cell--hide"></div>
      </div>

      <!-- Step 10 – right -->
      <div class="rm__row">
        <div class="rm__cell rm__cell--hide"></div>
        <div class="rm__center"><div class="rm__dot"></div><div class="rm__branch rm__branch--r"></div></div>
        <div class="rm__card rm__card--r">
          <span class="rm__label" data-i18n data-de="Schritt 10" data-en="Step 10">Schritt 10</span>
          <div class="rm__title" data-i18n data-de="Endergebnis" data-en="Final Verdict">Endergebnis</div>
          <div class="rm__desc" data-i18n data-de="Verifiziertes Ergebnis mit vollstaendigem Report, Quellen und Empfehlungen." data-en="Verified result with complete report, sources, and recommendations.">Verifiziertes Ergebnis mit vollstaendigem Report, Quellen und Empfehlungen.</div>
          <div class="rm__tags"><span class="rm__tag">Report</span><span class="rm__tag">PDF</span><span class="rm__tag">Dashboard</span></div>
        </div>
      </div>

      <!-- End marker -->
      <div class="rm__end" id="rmEndDot">
        <div class="rm__end-marker">
          <div class="rm__end-ring">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="rm__end-label" data-i18n data-de="Verifikation abgeschlossen" data-en="Verification complete">Verifikation abgeschlossen</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ DEMO ══════════ -->
<section class="section-organic" style="padding:6rem 0;" id="demo">
  <div class="max-w-[960px] mx-auto px-5 md:px-10">
    <h2 class="reveal text-3xl md:text-4xl font-black tracking-tight mb-4 text-center" data-i18n data-de="So sieht die Verifikation aus" data-en="This is what verification looks like">So sieht die Verifikation aus</h2>
    <p class="reveal text-base max-w-[520px] mx-auto text-center leading-relaxed mb-10" style="color:var(--color-muted);" data-i18n
       data-de="Ergebnis-Dashboard mit Claim-Analyse, Quellen und Konfidenz-Score."
       data-en="Result dashboard with claim analysis, sources, and confidence score.">Ergebnis-Dashboard mit Claim-Analyse, Quellen und Konfidenz-Score.</p>
    <div class="reveal browser-chrome">
      <div class="browser-toolbar">
        <div class="browser-dots"><span></span><span></span><span></span></div>
        <div class="browser-url">klar-app.vercel.app/de/verify</div>
      </div>
      <div style="padding:2.5rem;background:var(--color-bg);">
        <div class="flex flex-col md:flex-row gap-6">
          <div class="flex-1 rounded-xl p-5" style="background:var(--color-surface);border:1px solid var(--color-border);">
            <div class="text-xs font-semibold uppercase tracking-wider mb-3" style="color:var(--color-accent);" data-i18n data-de="Eingabe" data-en="Input">Eingabe</div>
            <div class="text-sm leading-relaxed" style="color:var(--color-muted);">"The Great Wall of China is visible from space with the naked eye."</div>
          </div>
          <div class="flex-1 rounded-xl p-5" style="background:var(--color-surface);border:1px solid var(--color-border);">
            <div class="text-xs font-semibold uppercase tracking-wider mb-3" style="color:var(--color-accent);" data-i18n data-de="Ergebnis" data-en="Result">Ergebnis</div>
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm" style="background:linear-gradient(135deg,#dc2626,#f87171);">23</div>
              <div>
                <div class="text-sm font-bold" style="color:#dc2626;" data-i18n data-de="Wahrscheinlich falsch" data-en="Likely false">Wahrscheinlich falsch</div>
                <div class="text-xs" style="color:var(--color-faint);">Confidence: 23/100</div>
              </div>
            </div>
            <div class="text-xs leading-relaxed" style="color:var(--color-muted);" data-i18n
               data-de="NASA und ESA bestaetigen: Die Chinesische Mauer ist mit blossem Auge aus dem Weltraum nicht sichtbar."
               data-en="NASA and ESA confirm: the Great Wall is not visible from space with the naked eye.">NASA und ESA bestaetigen: Die Chinesische Mauer ist mit blossem Auge aus dem Weltraum nicht sichtbar.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ EXTENSION ══════════ -->
<section class="section-dark" id="extension" style="padding:6rem 0;">
  <div class="max-w-[1100px] mx-auto px-5 md:px-10 text-center">
    <h2 class="reveal text-3xl md:text-5xl font-black tracking-tight mb-4" style="color:#f0f0f2;" data-i18n data-de="Browser-Extension" data-en="Browser Extension">Browser-Extension</h2>
    <p class="reveal text-base max-w-[560px] mx-auto leading-relaxed mb-10" style="color:#9a9aaa;" data-i18n
       data-de="Verifiziere KI-Inhalte direkt auf jeder Webseite. Text markieren, rechtsklicken, pruefen."
       data-en="Verify AI content directly on any webpage. Select text, right-click, verify.">Verifiziere KI-Inhalte direkt auf jeder Webseite. Text markieren, rechtsklicken, pruefen.</p>
    <div class="reveal grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[800px] mx-auto text-left">
      <div class="rounded-2xl p-5" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
        <div class="text-2xl mb-2">&#128269;</div>
        <h3 class="font-bold mb-1" style="color:#f0f0f2;" data-i18n data-de="Inline-Scan" data-en="Inline Scan">Inline-Scan</h3>
        <p class="text-sm" style="color:#9a9aaa;" data-i18n data-de="Markiere Text und starte den Check ueber das Kontextmenue." data-en="Select text and start the check via context menu.">Markiere Text und starte den Check ueber das Kontextmenue.</p>
      </div>
      <div class="rounded-2xl p-5" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
        <div class="text-2xl mb-2">&#128200;</div>
        <h3 class="font-bold mb-1" style="color:#f0f0f2;" data-i18n data-de="Side Panel" data-en="Side Panel">Side Panel</h3>
        <p class="text-sm" style="color:#9a9aaa;" data-i18n data-de="Detaillierte Ergebnisse im Side-Panel der Extension." data-en="Detailed results in the extension side panel.">Detaillierte Ergebnisse im Side-Panel der Extension.</p>
      </div>
      <div class="rounded-2xl p-5" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
        <div class="text-2xl mb-2">&#128274;</div>
        <h3 class="font-bold mb-1" style="color:#f0f0f2;" data-i18n data-de="Datenschutz" data-en="Privacy">Datenschutz</h3>
        <p class="text-sm" style="color:#9a9aaa;" data-i18n data-de="Keine Daten werden gespeichert. Alles lokal verarbeitet." data-en="No data stored. Everything processed locally.">Keine Daten werden gespeichert. Alles lokal verarbeitet.</p>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ PRICING ══════════ -->
<section class="section-organic" id="pricing" style="padding:6rem 0;">
  <div class="max-w-[1100px] mx-auto px-5 md:px-10">
    <h2 class="reveal text-3xl md:text-4xl font-black tracking-tight mb-4 text-center" data-i18n data-de="Preise" data-en="Pricing">Preise</h2>
    <p class="reveal text-base max-w-[520px] mx-auto text-center leading-relaxed mb-12" style="color:var(--color-muted);" data-i18n
       data-de="Starte kostenlos. Upgrade nach Bedarf."
       data-en="Start for free. Upgrade as needed.">Starte kostenlos. Upgrade nach Bedarf.</p>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="reveal pricing-card">
        <div class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--color-accent);" data-i18n data-de="Kostenlos" data-en="Free">Kostenlos</div>
        <div class="text-3xl font-black mb-1">&#8364;0</div>
        <div class="text-sm mb-5" style="color:var(--color-muted);" data-i18n data-de="Fuer immer" data-en="Forever">Fuer immer</div>
        <ul class="space-y-2 text-sm" style="color:var(--color-muted);">
          <li data-i18n data-de="&#10003; 5 Checks / Tag" data-en="&#10003; 5 checks / day">&#10003; 5 Checks / Tag</li>
          <li data-i18n data-de="&#10003; Texteingabe" data-en="&#10003; Text input">&#10003; Texteingabe</li>
          <li data-i18n data-de="&#10003; Basis-Report" data-en="&#10003; Basic report">&#10003; Basis-Report</li>
        </ul>
      </div>
      <div class="reveal pricing-card pricing-card--featured">
        <div class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--color-accent);">Pro</div>
        <div class="text-3xl font-black mb-1">&#8364;9<span class="text-lg font-semibold" style="color:var(--color-muted);">.99/mo</span></div>
        <div class="text-sm mb-5" style="color:var(--color-muted);" data-i18n data-de="Pro Monat" data-en="Per month">Pro Monat</div>
        <ul class="space-y-2 text-sm" style="color:var(--color-muted);">
          <li data-i18n data-de="&#10003; 50 Checks / Tag" data-en="&#10003; 50 checks / day">&#10003; 50 Checks / Tag</li>
          <li data-i18n data-de="&#10003; URL + Datei-Upload" data-en="&#10003; URL + file upload">&#10003; URL + Datei-Upload</li>
          <li data-i18n data-de="&#10003; Voller Report + PDF" data-en="&#10003; Full report + PDF">&#10003; Voller Report + PDF</li>
          <li data-i18n data-de="&#10003; Browser-Extension" data-en="&#10003; Browser extension">&#10003; Browser-Extension</li>
        </ul>
      </div>
      <div class="reveal pricing-card">
        <div class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--color-accent);">Business</div>
        <div class="text-3xl font-black mb-1">&#8364;29<span class="text-lg font-semibold" style="color:var(--color-muted);">.99/mo</span></div>
        <div class="text-sm mb-5" style="color:var(--color-muted);" data-i18n data-de="Pro Monat" data-en="Per month">Pro Monat</div>
        <ul class="space-y-2 text-sm" style="color:var(--color-muted);">
          <li data-i18n data-de="&#10003; Unbegrenzte Checks" data-en="&#10003; Unlimited checks">&#10003; Unbegrenzte Checks</li>
          <li data-i18n data-de="&#10003; API-Zugang" data-en="&#10003; API access">&#10003; API-Zugang</li>
          <li data-i18n data-de="&#10003; Team-Dashboard" data-en="&#10003; Team dashboard">&#10003; Team-Dashboard</li>
          <li data-i18n data-de="&#10003; Webhook-Integration" data-en="&#10003; Webhook integration">&#10003; Webhook-Integration</li>
        </ul>
      </div>
      <div class="reveal pricing-card">
        <div class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--color-accent);">Enterprise</div>
        <div class="text-3xl font-black mb-1" data-i18n data-de="Individuell" data-en="Custom">Individuell</div>
        <div class="text-sm mb-5" style="color:var(--color-muted);" data-i18n data-de="Auf Anfrage" data-en="On request">Auf Anfrage</div>
        <ul class="space-y-2 text-sm" style="color:var(--color-muted);">
          <li data-i18n data-de="&#10003; Self-hosted Option" data-en="&#10003; Self-hosted option">&#10003; Self-hosted Option</li>
          <li data-i18n data-de="&#10003; Custom Pipeline" data-en="&#10003; Custom pipeline">&#10003; Custom Pipeline</li>
          <li data-i18n data-de="&#10003; SLA + Support" data-en="&#10003; SLA + support">&#10003; SLA + Support</li>
          <li data-i18n data-de="&#10003; SSO / SAML" data-en="&#10003; SSO / SAML">&#10003; SSO / SAML</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ TECH & PRIVACY ══════════ -->
<section class="section-alt" id="tech" style="padding:5rem 0;">
  <div class="max-w-[900px] mx-auto px-5 md:px-10 text-center">
    <h2 class="reveal text-2xl md:text-3xl font-black tracking-tight mb-8" data-i18n data-de="Technologie &amp; Datenschutz" data-en="Technology &amp; Privacy">Technologie &amp; Datenschutz</h2>
    <div class="reveal grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="rounded-xl p-4" style="background:var(--color-surface);border:1px solid var(--color-border);">
        <div class="text-lg mb-1">&#128737;&#65039;</div>
        <div class="text-xs font-bold" data-i18n data-de="DSGVO-konform" data-en="GDPR compliant">DSGVO-konform</div>
      </div>
      <div class="rounded-xl p-4" style="background:var(--color-surface);border:1px solid var(--color-border);">
        <div class="text-lg mb-1">&#128187;</div>
        <div class="text-xs font-bold" data-i18n data-de="Open-Source Pipeline" data-en="Open source pipeline">Open-Source Pipeline</div>
      </div>
      <div class="rounded-xl p-4" style="background:var(--color-surface);border:1px solid var(--color-border);">
        <div class="text-lg mb-1">&#127465;&#127466;</div>
        <div class="text-xs font-bold" data-i18n data-de="Deutsche Server" data-en="German servers">Deutsche Server</div>
      </div>
      <div class="rounded-xl p-4" style="background:var(--color-surface);border:1px solid var(--color-border);">
        <div class="text-lg mb-1">&#128274;</div>
        <div class="text-xs font-bold" data-i18n data-de="Keine Datenspeicherung" data-en="No data storage">Keine Datenspeicherung</div>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ FAQ ══════════ -->
<section style="padding:5rem 0;" id="faq">
  <div class="max-w-[720px] mx-auto px-5 md:px-10">
    <h2 class="reveal text-2xl md:text-3xl font-black tracking-tight mb-8 text-center" data-i18n data-de="Haeufige Fragen" data-en="Frequently Asked Questions">Haeufige Fragen</h2>
    <div id="faqList">
      <div class="faq-item">
        <button class="faq-question flex items-center justify-between w-full py-5 text-left cursor-pointer" aria-expanded="false">
          <span class="font-semibold text-sm pr-4" data-i18n data-de="Was genau prueft KLAR?" data-en="What exactly does KLAR verify?">Was genau prueft KLAR?</span>
          <span class="faq-question__icon relative w-5 h-5 flex-shrink-0"></span>
        </button>
        <div class="faq-answer">
          <p class="pb-5 text-sm leading-relaxed" style="color:var(--color-muted);" data-i18n
             data-de="KLAR extrahiert einzelne Behauptungen aus Texten und prueft jede gegen mehrere unabhaengige Quellen. Die Pipeline bewertet Quellenglaubwuerdigkeit, erkennt Verzerrungen und identifiziert KI-Halluzinationen."
             data-en="KLAR extracts individual claims from texts and verifies each against multiple independent sources. The pipeline evaluates source credibility, detects bias, and identifies AI hallucinations.">KLAR extrahiert einzelne Behauptungen aus Texten und prueft jede gegen mehrere unabhaengige Quellen. Die Pipeline bewertet Quellenglaubwuerdigkeit, erkennt Verzerrungen und identifiziert KI-Halluzinationen.</p>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question flex items-center justify-between w-full py-5 text-left cursor-pointer" aria-expanded="false">
          <span class="font-semibold text-sm pr-4" data-i18n data-de="Welche Sprachen werden unterstuetzt?" data-en="Which languages are supported?">Welche Sprachen werden unterstuetzt?</span>
          <span class="faq-question__icon relative w-5 h-5 flex-shrink-0"></span>
        </button>
        <div class="faq-answer">
          <p class="pb-5 text-sm leading-relaxed" style="color:var(--color-muted);" data-i18n
             data-de="Aktuell Deutsch, Englisch, Franzoesisch, Spanisch und Italienisch. Weitere Sprachen folgen."
             data-en="Currently German, English, French, Spanish, and Italian. More languages coming soon.">Aktuell Deutsch, Englisch, Franzoesisch, Spanisch und Italienisch. Weitere Sprachen folgen.</p>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question flex items-center justify-between w-full py-5 text-left cursor-pointer" aria-expanded="false">
          <span class="font-semibold text-sm pr-4" data-i18n data-de="Werden meine Daten gespeichert?" data-en="Is my data stored?">Werden meine Daten gespeichert?</span>
          <span class="faq-question__icon relative w-5 h-5 flex-shrink-0"></span>
        </button>
        <div class="faq-answer">
          <p class="pb-5 text-sm leading-relaxed" style="color:var(--color-muted);" data-i18n
             data-de="Nein. Eingabetexte werden nach der Verifikation nicht dauerhaft gespeichert. Die Verarbeitung ist DSGVO-konform."
             data-en="No. Input texts are not permanently stored after verification. Processing is GDPR-compliant.">Nein. Eingabetexte werden nach der Verifikation nicht dauerhaft gespeichert. Die Verarbeitung ist DSGVO-konform.</p>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question flex items-center justify-between w-full py-5 text-left cursor-pointer" aria-expanded="false">
          <span class="font-semibold text-sm pr-4" data-i18n data-de="Gibt es eine API?" data-en="Is there an API?">Gibt es eine API?</span>
          <span class="faq-question__icon relative w-5 h-5 flex-shrink-0"></span>
        </button>
        <div class="faq-answer">
          <p class="pb-5 text-sm leading-relaxed" style="color:var(--color-muted);" data-i18n
             data-de="Ja. Ab dem Business-Plan steht eine REST-API mit API-Key-Authentifizierung zur Verfuegung."
             data-en="Yes. Starting with the Business plan, a REST API with API key authentication is available.">Ja. Ab dem Business-Plan steht eine REST-API mit API-Key-Authentifizierung zur Verfuegung.</p>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question flex items-center justify-between w-full py-5 text-left cursor-pointer" aria-expanded="false">
          <span class="font-semibold text-sm pr-4" data-i18n data-de="Wie funktioniert die Browser-Extension?" data-en="How does the browser extension work?">Wie funktioniert die Browser-Extension?</span>
          <span class="faq-question__icon relative w-5 h-5 flex-shrink-0"></span>
        </button>
        <div class="faq-answer">
          <p class="pb-5 text-sm leading-relaxed" style="color:var(--color-muted);" data-i18n
             data-de="Installiere die Chrome-Extension, markiere Text auf einer beliebigen Webseite und waehle 'Mit KLAR pruefen' im Kontextmenue. Die Ergebnisse erscheinen im Side-Panel."
             data-en="Install the Chrome extension, select text on any webpage, and choose 'Check with KLAR' from the context menu. Results appear in the side panel.">Installiere die Chrome-Extension, markiere Text auf einer beliebigen Webseite und waehle 'Mit KLAR pruefen' im Kontextmenue. Die Ergebnisse erscheinen im Side-Panel.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══════════ FOOTER ══════════ -->
<footer class="section-dark" style="padding:4rem 0 2rem;">
  <div class="max-w-[1100px] mx-auto px-5 md:px-10">
    <div class="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
      <div>
        <div class="text-xl font-black mb-2" style="color:#008c50;">KLAR</div>
        <p class="text-sm" style="color:#9a9aaa;">Knowledge Legitimacy Audit &amp; Review</p>
      </div>
      <div class="flex flex-wrap gap-8 text-sm" style="color:#9a9aaa;">
        <div>
          <div class="font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Produkt" data-en="Product">Produkt</div>
          <a href="#features" class="block mb-1 hover:underline" data-i18n data-de="Engine" data-en="Engine">Engine</a>
          <a href="#roadmap" class="block mb-1 hover:underline" data-i18n data-de="Pipeline" data-en="Pipeline">Pipeline</a>
          <a href="#extension" class="block mb-1 hover:underline" data-i18n data-de="Extension" data-en="Extension">Extension</a>
          <a href="#pricing" class="block hover:underline" data-i18n data-de="Preise" data-en="Pricing">Preise</a>
        </div>
        <div>
          <div class="font-bold mb-2" style="color:#f0f0f2;" data-i18n data-de="Rechtliches" data-en="Legal">Rechtliches</div>
          <a href="/de/privacy" class="block mb-1 hover:underline" data-i18n data-de="Datenschutz" data-en="Privacy">Datenschutz</a>
          <a href="/de/terms" class="block mb-1 hover:underline" data-i18n data-de="AGB" data-en="Terms">AGB</a>
          <a href="/de/imprint" class="block hover:underline" data-i18n data-de="Impressum" data-en="Imprint">Impressum</a>
        </div>
      </div>
    </div>
    <div class="border-t border-white/10 pt-4 text-xs text-center" style="color:#6a6a72;">
      &copy; 2025 KLAR. All rights reserved.
    </div>
  </div>
</footer>

<!-- ══════════ COOKIE BANNER ══════════ -->
<div class="cookie-banner" id="cookieBanner">
  <div class="cookie-banner__inner">
    <div class="cookie-banner__title" data-i18n data-de="Cookie-Einstellungen" data-en="Cookie Settings">Cookie-Einstellungen</div>
    <div class="cookie-banner__text" data-i18n
       data-de="Wir verwenden nur technisch notwendige Cookies. Keine Tracking- oder Analyse-Cookies."
       data-en="We only use technically necessary cookies. No tracking or analytics cookies.">Wir verwenden nur technisch notwendige Cookies. Keine Tracking- oder Analyse-Cookies.</div>
    <div class="cookie-banner__actions">
      <button class="cookie-banner__btn cookie-banner__btn--accept" id="cookieAccept" data-i18n data-de="Akzeptieren" data-en="Accept">Akzeptieren</button>
      <button class="cookie-banner__btn cookie-banner__btn--reject" id="cookieReject" data-i18n data-de="Nur notwendige" data-en="Necessary only">Nur notwendige</button>
    </div>
  </div>
</div>

<!-- ══════════ BACK TO TOP ══════════ -->
<button class="back-to-top" id="backToTop" aria-label="Back to top">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
</button>

<!-- ═══════════════════════════════════════════════
     JAVASCRIPT
     ═══════════════════════════════════════════════ -->
<script>
(function(){
'use strict';
var $=function(s,c){return(c||document).querySelector(s)};
var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
var clamp=function(v,mn,mx){return Math.min(Math.max(v,mn),mx)};
var prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Language Toggle ── */
function getLang(){var s=localStorage.getItem('klar_lp_lang');if(s==='en'||s==='de')return s;return document.documentElement.getAttribute('lang')==='en'?'en':'de'}
function applyLang(l){var n=l==='en'?'en':'de';document.documentElement.setAttribute('lang',n);localStorage.setItem('klar_lp_lang',n);$$('[data-i18n]').forEach(function(el){var t=el.getAttribute('data-'+n);if(typeof t==='string')el.innerHTML=t});$$('[data-lang-switch]').forEach(function(b){b.classList.toggle('is-active',b.getAttribute('data-lang-switch')===n)})}
function initLang(){applyLang(getLang());$$('[data-lang-switch]').forEach(function(b){b.addEventListener('click',function(){applyLang(b.getAttribute('data-lang-switch'))})})}

/* ── Reveal ── */
function initReveal(){
  var els=$$('.reveal');if(!els.length)return;
  els.forEach(function(el){var p=el.parentElement;if(!p)return;var sibs=Array.prototype.slice.call(p.children).filter(function(c){return c.classList.contains('reveal')});if(sibs.length>1){var idx=sibs.indexOf(el);if(idx>0)el.style.transitionDelay=Math.min(idx*0.08,0.4)+'s'}});
  var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('reveal--visible')}else{if(e.boundingClientRect.top>0)e.target.classList.remove('reveal--visible')}})},{threshold:0.08,rootMargin:'0px 0px -40px 0px'});
  els.forEach(function(el){obs.observe(el)});
}

/* ── Counters ── */
function fmtNum(n,sep){if(!sep)return String(n);var s=String(n),r='';for(var i=s.length-1,c=0;i>=0;i--,c++){if(c>0&&c%3===0)r=sep+r;r=s[i]+r}return r}
function animCounter(el){var t=parseInt(el.dataset.target,10),suf=el.dataset.suffix||'',pre=el.dataset.prefix||'',sep=el.dataset.separator||'',dur=1600,start=null;if(el._raf)cancelAnimationFrame(el._raf);function step(ts){if(!start)start=ts;var p=Math.min((ts-start)/dur,1);var ease=1-Math.pow(1-p,3);el.textContent=pre+fmtNum(Math.round(ease*t),sep)+suf;if(p<1)el._raf=requestAnimationFrame(step)}el._raf=requestAnimationFrame(step)}
function resetCounter(el){if(el._raf)cancelAnimationFrame(el._raf);el.textContent=(el.dataset.prefix||'')+'0'+(el.dataset.suffix||'')}
function initCounters(){var c=$$('[data-target]');if(!c.length)return;var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)animCounter(e.target);else resetCounter(e.target)})},{threshold:0.4});c.forEach(function(el){obs.observe(el)})}

/* ── Navbar ── */
function initNavbar(){
  var nav=$('#nav');if(!nav)return;var links=$$('.nav-link[data-nav-section]');var ticking=false;
  function setActive(id){links.forEach(function(l){l.classList.toggle('nav-link--active',l.dataset.navSection===id)})}
  function onScroll(){if(ticking)return;ticking=true;requestAnimationFrame(function(){nav.classList.toggle('nav-scrolled',window.scrollY>60);var active=null;links.forEach(function(l){var sec=document.getElementById(l.dataset.navSection);if(!sec)return;var r=sec.getBoundingClientRect();if(r.top<=window.innerHeight*0.45&&r.bottom>0)active=l.dataset.navSection});if(active)setActive(active);ticking=false})}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
}

/* ── Smooth Scroll ── */
function initSmooth(){$$('a[href^="#"]').forEach(function(l){l.addEventListener('click',function(e){var t=$(l.getAttribute('href'));if(!t)return;e.preventDefault();window.scrollTo({top:t.getBoundingClientRect().top+window.scrollY-118,behavior:'smooth'})})})}

/* ── FAQ ── */
function initFAQ(){var list=$('#faqList');if(!list)return;list.addEventListener('click',function(e){var btn=e.target.closest('.faq-question');if(!btn)return;var item=btn.parentElement;var open=item.classList.contains('faq-item--open');$$('.faq-item--open',list).forEach(function(o){o.classList.remove('faq-item--open');o.querySelector('.faq-question').setAttribute('aria-expanded','false')});if(!open){item.classList.add('faq-item--open');btn.setAttribute('aria-expanded','true')}})}

/* ── Mobile Menu ── */
function initMobile(){
  var ham=$('#navHamburger'),menu=$('#mobileMenu');if(!ham||!menu)return;
  ham.addEventListener('click',function(){var open=menu.classList.toggle('is-open');ham.classList.toggle('is-open',open);menu.setAttribute('aria-hidden',!open);ham.setAttribute('aria-expanded',open)});
  window.closeMobileMenu=function(){menu.classList.remove('is-open');ham.classList.remove('is-open');menu.setAttribute('aria-hidden','true');ham.setAttribute('aria-expanded','false')};
}

/* ── Back to Top ── */
function initBack(){var btn=$('#backToTop');if(!btn)return;window.addEventListener('scroll',function(){btn.classList.toggle('back-to-top--visible',window.scrollY>600)},{passive:true});btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})})}

/* ── Cookie Banner ── */
function initCookie(){var b=$('#cookieBanner');if(!b||localStorage.getItem('klar_cookie'))return;setTimeout(function(){b.classList.add('cookie-banner--visible')},2000);$('#cookieAccept').addEventListener('click',function(){localStorage.setItem('klar_cookie','all');b.classList.remove('cookie-banner--visible')});$('#cookieReject').addEventListener('click',function(){localStorage.setItem('klar_cookie','essential');b.classList.remove('cookie-banner--visible')})}

/* ── Ticker Animation ── */
function initTicker(){
  var track=$('#tickerTrack');if(!track||prefersReduced)return;
  var speed=0.5,pos=0,raf;
  function tick(){pos-=speed;if(pos<=-track.scrollWidth/2)pos=0;track.style.transform='translateX('+pos+'px)';raf=requestAnimationFrame(tick)}
  /* Duplicate items for seamless loop */
  var items=track.innerHTML;track.innerHTML=items+items;
  raf=requestAnimationFrame(tick);
}

/* ── Typing Animation ── */
function initTyping(){
  var el=$('#heroTyping');if(!el||prefersReduced)return;
  var words={de:['KI-Inhalte','AI-Fakten','Halluzinationen'],en:['AI content','AI facts','hallucinations']};
  var wIdx=0,cIdx=0,isDel=false,delay=100;
  var tn=document.createTextNode(el.textContent);el.textContent='';el.appendChild(tn);
  var cur=document.createElement('span');cur.className='typing-cursor';el.appendChild(cur);
  function tick(){var w=words[getLang()]||words.de;var c=w[wIdx];if(isDel){cIdx--;tn.textContent=c.substring(0,cIdx);delay=50}else{cIdx++;tn.textContent=c.substring(0,cIdx);delay=80+Math.random()*60}if(!isDel&&cIdx===c.length){delay=2500;isDel=true}else if(isDel&&cIdx===0){isDel=false;wIdx=(wIdx+1)%w.length;delay=400}setTimeout(tick,delay)}
  setTimeout(tick,2000);
}

/* ══════════════════════════════════════
   IMMERSIVE ROADMAP
   ══════════════════════════════════════ */
function initRoadmap(){
  var timeline=$('#roadmapTimeline'),svg=$('#rmSvg'),pathBg=$('#rmPathBg'),pathFill=$('#rmPathFill'),glow=$('#rmGlow');
  if(!timeline||!svg||!pathBg||!pathFill)return;
  var rows=$$('.rm__row',timeline),ticking=false,totalLen=0;

  function buildSnakePath(){
    var lineEl=$('#rmLine');if(!lineEl)return;
    var h=timeline.offsetHeight,isMobile=window.innerWidth<768,d,w,cx;
    if(isMobile){w=40;cx=20;lineEl.style.left='0';lineEl.style.transform='none'}
    else{w=120;cx=w/2;lineEl.style.left='';lineEl.style.transform=''}
    lineEl.style.width=w+'px';svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('width',w);svg.setAttribute('height',h);
    if(isMobile){d='M '+cx+' 0 L '+cx+' '+h}
    else{var amp=40,segH=260,segs=Math.ceil(h/segH);d='M '+cx+' 0';for(var i=0;i<segs;i++){var y0=i*segH,yEnd=Math.min(y0+segH,h),dir=(i%2===0)?1:-1;d+=' C '+(cx+amp*dir)+' '+(y0+segH*0.25)+', '+(cx+amp*dir)+' '+(y0+segH*0.75)+', '+cx+' '+yEnd}}
    pathBg.setAttribute('d',d);pathFill.setAttribute('d',d);
    totalLen=pathFill.getTotalLength();pathFill.style.strokeDasharray=totalLen;pathFill.style.strokeDashoffset=totalLen;
    if(totalLen>0){var tRect=timeline.getBoundingClientRect();rows.forEach(function(row){var dot=row.querySelector('.rm__dot');if(!dot)return;var dRect=dot.getBoundingClientRect();var dotY=dRect.top+dRect.height/2-tRect.top;var lo=0,hi=totalLen;for(var it=0;it<50;it++){var mid=(lo+hi)/2;var pt=pathFill.getPointAtLength(mid);if(pt.y<dotY)lo=mid;else hi=mid}row.dataset.rmProgress=((lo+hi)/2/totalLen).toFixed(4)})}
  }
  buildSnakePath();window.addEventListener('resize',buildSnakePath);

  function onScroll(){if(ticking)return;ticking=true;requestAnimationFrame(function(){
    var rect=timeline.getBoundingClientRect(),vh=window.innerHeight;
    var start=rect.top-vh*0.65,end=rect.bottom-vh*0.25,range=end-start;
    var progress=range>0?clamp(-start/range,0,1):0;
    if(totalLen)pathFill.style.strokeDashoffset=totalLen*(1-progress);
    if(glow&&totalLen){var pt=pathFill.getPointAtLength(progress*totalLen);glow.style.top=pt.y+'px';glow.style.left=pt.x+'px';glow.style.opacity=(progress>0.01&&progress<0.92)?'1':'0'}
    rows.forEach(function(row){var dot=row.querySelector('.rm__dot'),card=row.querySelector('.rm__card'),branch=row.querySelector('.rm__branch');var rp=parseFloat(row.dataset.rmProgress)||0;var isA=progress>=rp;if(dot)dot.classList.toggle('rm__dot--active',isA);if(card)card.classList.toggle('rm__card--active',isA);if(branch)branch.classList.toggle('rm__branch--active',isA)});
    var endDot=$('#rmEndDot');if(endDot)endDot.querySelector('.rm__end-marker').classList.toggle('rm__end-marker--active',progress>=0.92);
    ticking=false})}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
}

/* ══════════════════════════════════════
   HERO PARTICLES : ambient canvas network
   ══════════════════════════════════════ */
function initParticles(){
  if(prefersReduced)return;
  var canvas=$('#heroParticles'),hero=$('#hero');if(!canvas||!hero)return;
  var ctx=canvas.getContext('2d'),particles=[],mouse={x:-9999,y:-9999,prevX:-9999,prevY:-9999,speed:0};
  var isMobile=window.innerWidth<768;
  var count=isMobile?85:150,connectDist=isMobile?65:125,maxLineWidth=isMobile?0.12:0.8,mouseRadius=isMobile?200:320;
  var running=true,time=0,burstParticles=[];

  function resize(){canvas.width=hero.offsetWidth;canvas.height=hero.offsetHeight}

  function create(x,y,isBurst){
    var angle=Math.random()*Math.PI*2,speed=isBurst?(Math.random()*4+2):(Math.random()*0.6+0.1);
    var tier=Math.random(),size,opacity;
    if(tier<0.15){size=Math.random()*5+3;opacity=Math.random()*0.3+0.15}
    else if(tier<0.45){size=Math.random()*3+1.5;opacity=Math.random()*0.5+0.15}
    else{size=Math.random()*1.5+0.5;opacity=Math.random()*0.6+0.1}
    return{x:x!==undefined?x:Math.random()*canvas.width,y:y!==undefined?y:Math.random()*canvas.height,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,size:size,baseSize:size,opacity:opacity,baseOpacity:opacity,hu:Math.random()*40-20,pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.02+0.005,life:isBurst?1:-1,isBurst:!!isBurst};
  }

  function seed(){resize();particles=[];for(var i=0;i<count;i++)particles.push(create())}

  function spawnBurst(x,y,amt){for(var i=0;i<amt;i++)burstParticles.push(create(x,y,true))}

  function animate(){
    if(!running)return;time+=0.016;ctx.clearRect(0,0,canvas.width,canvas.height);
    if(mouse.x>0&&mouse.prevX>0){var mdx=mouse.x-mouse.prevX,mdy=mouse.y-mouse.prevY;mouse.speed=Math.sqrt(mdx*mdx+mdy*mdy)}
    mouse.prevX=mouse.x;mouse.prevY=mouse.y;
    var dynRadius=mouseRadius+Math.min(mouse.speed*3,200);

    for(var i=0;i<particles.length;i++){
      var p=particles[i];var dx=mouse.x-p.x,dy=mouse.y-p.y,dist=Math.sqrt(dx*dx+dy*dy);
      p.pulse+=p.pulseSpeed;p.size=p.baseSize*(1+Math.sin(p.pulse)*0.3);
      if(dist<dynRadius&&dist>0){var force=(dynRadius-dist)/dynRadius;var attract=force*0.06,swirl=force*0.03;p.vx+=dx/dist*attract-dy/dist*swirl;p.vy+=dy/dist*attract+dx/dist*swirl;p.size*=(1+force*0.8);p.opacity=Math.max(p.opacity,p.baseOpacity+force*0.4)}else{p.opacity+=(p.baseOpacity-p.opacity)*0.05}
      p.vx+=Math.sin(time+p.pulse*3)*0.003;p.vy+=Math.cos(time+p.pulse*2)*0.003;
      p.vx*=0.985;p.vy*=0.985;p.x+=p.vx;p.y+=p.vy;
      if(p.x<-40)p.x=canvas.width+40;if(p.x>canvas.width+40)p.x=-40;
      if(p.y<-40)p.y=canvas.height+40;if(p.y>canvas.height+40)p.y=-40;

      /* green particles */
      var r=0,g=clamp(140+p.hu,100,200),b=clamp(80+p.hu*0.5,50,120);
      if(p.size>3){var grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*4);grd.addColorStop(0,'rgba('+r+','+g+','+b+','+(p.opacity*0.3)+')');grd.addColorStop(1,'rgba('+r+','+g+','+b+',0)');ctx.fillStyle=grd;ctx.fillRect(p.x-p.size*4,p.y-p.size*4,p.size*8,p.size*8)}
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fillStyle='rgba('+r+','+g+','+b+','+p.opacity+')';ctx.fill();
    }

    /* burst particles */
    for(var i=burstParticles.length-1;i>=0;i--){var bp=burstParticles[i];bp.life-=0.02;if(bp.life<=0){burstParticles.splice(i,1);continue}bp.vx*=0.96;bp.vy*=0.96;bp.x+=bp.vx;bp.y+=bp.vy;bp.size=bp.baseSize*bp.life;var alpha=bp.life*bp.baseOpacity;ctx.beginPath();ctx.arc(bp.x,bp.y,bp.size,0,Math.PI*2);ctx.fillStyle='rgba(0,200,120,'+alpha+')';ctx.fill()}

    /* connection lines */
    for(var i=0;i<particles.length;i++){for(var j=i+1;j<particles.length;j++){
      var dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,dist=Math.sqrt(dx*dx+dy*dy);
      var eDist=connectDist;var midX=(particles[i].x+particles[j].x)/2,midY=(particles[i].y+particles[j].y)/2;
      var dmx=mouse.x-midX,dmy=mouse.y-midY,dM=Math.sqrt(dmx*dmx+dmy*dmy);
      if(dM<dynRadius)eDist=connectDist+(dynRadius-dM)/dynRadius*100;
      if(dist<eDist){var op=(1-dist/eDist)*0.25;if(dM<dynRadius)op*=(1+(1-dM/dynRadius)*2);ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.strokeStyle='rgba(0,140,80,'+Math.min(op,0.18)+')';ctx.lineWidth=Math.max(0.3,(1-dist/eDist)*maxLineWidth);ctx.stroke()}
    }}

    /* mouse glow */
    if(mouse.x>0&&mouse.y>0){
      var gs=250+mouse.speed*2;var g1=ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,gs);g1.addColorStop(0,'rgba(0,140,80,.12)');g1.addColorStop(0.4,'rgba(0,140,80,.05)');g1.addColorStop(1,'rgba(0,140,80,0)');ctx.fillStyle=g1;ctx.fillRect(mouse.x-gs,mouse.y-gs,gs*2,gs*2);
      var g2=ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,40);g2.addColorStop(0,'rgba(0,200,120,.15)');g2.addColorStop(1,'rgba(0,140,80,0)');ctx.fillStyle=g2;ctx.fillRect(mouse.x-40,mouse.y-40,80,80);
    }
    requestAnimationFrame(animate);
  }

  var lastBurst=0;
  hero.addEventListener('mousemove',function(e){var rect=hero.getBoundingClientRect();mouse.x=e.clientX-rect.left;mouse.y=e.clientY-rect.top;var now=performance.now();if(mouse.speed>8&&now-lastBurst>80){spawnBurst(mouse.x,mouse.y,Math.min(Math.floor(mouse.speed/4),6));lastBurst=now}});
  hero.addEventListener('mouseleave',function(){mouse.x=-9999;mouse.y=-9999;mouse.speed=0});
  hero.addEventListener('click',function(e){var rect=hero.getBoundingClientRect();spawnBurst(e.clientX-rect.left,e.clientY-rect.top,20)});
  window.addEventListener('resize',resize);
  requestAnimationFrame(function(){seed();animate()});
}

/* ── Init all ── */
initLang();initReveal();initCounters();initNavbar();initSmooth();initFAQ();initMobile();initBack();initCookie();initTicker();initTyping();
/* Defer heavy canvas work */
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){initRoadmap();initParticles()})}
else{initRoadmap();initParticles()}
})();
</script>
</body>
</html>`;
