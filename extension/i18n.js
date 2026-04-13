/**
 * KLAR Extension — Runtime i18n Engine
 *
 * Supports runtime language switching between EN and DE.
 * Loads locale files dynamically, stores preference in chrome.storage.sync.
 * Falls back to chrome.i18n.getMessage() before initialization completes.
 */

const KLAR_I18N = {
  _messages: null,
  _lang: null,
  _ready: false,
  _initPromise: null,

  /** Initialize: load locale files, read stored preference, translate DOM */
  init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  },

  async _doInit() {
    try {
      const [en, de] = await Promise.all([
        fetch(chrome.runtime.getURL("_locales/en/messages.json")).then((r) => r.json()),
        fetch(chrome.runtime.getURL("_locales/de/messages.json")).then((r) => r.json()),
      ]);
      this._messages = { en, de };
    } catch (e) {
      console.warn("[KLAR i18n] Failed to load locale files:", e);
      this._messages = {};
    }

    // Read stored preference — fall back to browser locale
    const stored = await new Promise((r) => chrome.storage.sync.get(["klarLang"], r));
    const browserLang = chrome.i18n.getUILanguage().startsWith("de") ? "de" : "en";
    this._lang = stored.klarLang || browserLang;
    this._ready = true;

    document.documentElement.lang = this._lang;
    this.translateDOM();
    this._fixLinks();

    return this._lang;
  },

  /** Get the current UI language */
  getLang() {
    return this._lang || (chrome.i18n.getUILanguage().startsWith("de") ? "de" : "en");
  },

  /** Switch language persistently */
  setLang(lang) {
    if (lang !== "en" && lang !== "de") return;
    this._lang = lang;
    chrome.storage.sync.set({ klarLang: lang });
    document.documentElement.lang = lang;
    this.translateDOM();
    this._fixLinks();
    document.dispatchEvent(new CustomEvent("klar-lang-changed", { detail: { lang } }));
  },

  /** Toggle between EN ↔ DE */
  toggle() {
    this.setLang(this._lang === "de" ? "en" : "de");
    return this._lang;
  },

  /** Translate a key with optional substitutions */
  t(key, ...subs) {
    if (this._messages && this._lang) {
      const entry = this._messages[this._lang]?.[key];
      if (entry) return this._resolve(entry, subs);
    }
    return chrome.i18n.getMessage(key, subs) || key;
  },

  /** Resolve $PLACEHOLDER$ values in a message */
  _resolve(entry, subs) {
    let msg = entry.message || "";
    if (!entry.placeholders || !subs || subs.length === 0) return msg;
    for (const [name, def] of Object.entries(entry.placeholders)) {
      const m = (def.content || "").match(/^\$(\d+)$/);
      if (m) {
        const idx = parseInt(m[1], 10) - 1;
        if (idx >= 0 && idx < subs.length) {
          msg = msg.replace(new RegExp("\\$" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\$", "gi"), String(subs[idx]));
        }
      }
    }
    return msg;
  },

  /** Translate all data-i18n DOM elements */
  translateDOM() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const msg = this.t(key);
      if (msg && msg !== key) el.textContent = msg;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const msg = this.t(key);
      if (msg && msg !== key) el.placeholder = msg;
    });
  },

  /** Fix locale-prefixed app links */
  _fixLinks() {
    const lang = this._lang || "en";
    const base = typeof KLAR !== "undefined" ? KLAR.API_BASE : "https://klar-app.vercel.app";
    const fix = (id, path) => {
      const el = document.getElementById(id);
      if (el) el.href = `${base}/${lang}/${path}`;
    };
    fix("getKeyLink", "settings");
    fix("openAppBtn", "dashboard");
    fix("linkDashboard", "dashboard");
    fix("linkHistory", "history");
    fix("linkVerify", "verify");
    fix("linkSettings", "settings");
  },
};

/** Global shorthand — works before and after init */
function t(key, ...subs) {
  return KLAR_I18N.t(key, ...subs);
}

// Cross-page sync: language changed in another view (popup ↔ sidepanel)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.klarLang && changes.klarLang.newValue !== KLAR_I18N._lang) {
    KLAR_I18N._lang = changes.klarLang.newValue;
    if (document.documentElement) {
      document.documentElement.lang = KLAR_I18N._lang;
      KLAR_I18N.translateDOM();
      KLAR_I18N._fixLinks();
      document.dispatchEvent(new CustomEvent("klar-lang-changed", { detail: { lang: KLAR_I18N._lang } }));
    }
  }
});

// Auto-init on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => KLAR_I18N.init());
} else {
  KLAR_I18N.init();
}
