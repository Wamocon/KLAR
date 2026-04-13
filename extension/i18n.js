/**
 * KLAR Extension — i18n Helper
 *
 * Translates all DOM elements with data-i18n attributes using chrome.i18n API.
 * Chrome automatically picks the locale matching the browser language.
 */

function klarI18n() {
  // Set HTML lang attribute based on browser locale
  const uiLang = chrome.i18n.getUILanguage().startsWith("de") ? "de" : "en";
  document.documentElement.lang = uiLang;

  // Translate text content
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });

  // Translate placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.placeholder = msg;
  });

  // Fix "Get your API key" link locale
  const lang = chrome.i18n.getUILanguage().startsWith("de") ? "de" : "en";
  const link = document.getElementById("getKeyLink");
  if (link) link.href = `${KLAR.API_BASE}/${lang}/settings`;
}

/** Get a translated message with optional substitutions */
function t(key, ...subs) {
  return chrome.i18n.getMessage(key, subs) || key;
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", klarI18n);
} else {
  klarI18n();
}
