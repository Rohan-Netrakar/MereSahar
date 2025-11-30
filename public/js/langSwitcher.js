// public/js/langSwitcher.js
// Generic, reversible language switcher.
// Usage: import { initLangSwitcher } from "/js/langSwitcher.js"; initLangSwitcher({ selector:'#langSwitcher' });

const translations = {
  en: {
    "📍 Civic Issue Reporting": "📍 Civic Issue Reporting",
    "Report an Issue": "Report an Issue",
    "Name": "Name",
    "Your Name": "Your Name",
    "Category": "Category",
    "Description": "Description",
    "Describe issue": "Describe issue",
    "📷 Open Camera": "📷 Open Camera",
    "📸 Capture": "📸 Capture",
    "📍 Get My Location": "📍 Get My Location",
    "🚀 Submit Issue": "🚀 Submit Issue",
    "Front Camera": "Front Camera",
    "Back Camera": "Back Camera",
    "Potholes": "Potholes",
    "Street Light": "Street Light",
    "Water Overflow": "Water Overflow",
    "Dustbin Overflow": "Dustbin Overflow",
    "Change Language": "Change Language"
  },
  hi: {
    "📍 Civic Issue Reporting": "📍 नागरिक समस्या रिपोर्टिंग",
    "Report an Issue": "समस्या दर्ज करें",
    "Name": "नाम",
    "Your Name": "आपका नाम",
    "Category": "श्रेणी",
    "Description": "विवरण",
    "Describe issue": "समस्या का विवरण लिखें",
    "📷 Open Camera": "📷 कैमरा खोलें",
    "📸 Capture": "📸 कैप्चर करें",
    "📍 Get My Location": "📍 मेरा स्थान प्राप्त करें",
    "🚀 Submit Issue": "🚀 समस्या सबमिट करें",
    "Front Camera": "फ्रंट कैमरा",
    "Back Camera": "बैक कैमरा",
    "Potholes": "गड्ढे",
    "Street Light": "सड़क व बाल्ब",
    "Water Overflow": "पानी ओवरफ़्लो",
    "Dustbin Overflow": "कूड़ेदान ओवरफ़्लो",
    "Change Language": "भाषा बदलें"
  }
};

// store original values so translations are reversible
const originalText = new WeakMap();     // Node -> original text string
const originalAttrs = new WeakMap();    // Element -> { attrName: originalValue }

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceInStringFromDict(str, dict) {
  if (!str) return str;
  // replace longer keys first to avoid partial collisions
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  let out = str;
  for (const k of keys) {
    if (!k) continue;
    const r = new RegExp(escapeRegex(k), "g");
    out = out.replace(r, dict[k]);
  }
  return out;
}

function walkTextNodes(root, cb) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while ((node = walker.nextNode())) {
    // skip empty / whitespace-only nodes
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    // skip script/style/noscript parents
    const parent = node.parentElement;
    if (!parent) continue;
    const tag = parent.tagName && parent.tagName.toLowerCase();
    if (["script", "style", "noscript"].includes(tag)) continue;
    cb(node);
  }
}

function storeOriginalTextNode(node) {
  if (!originalText.has(node)) {
    originalText.set(node, node.nodeValue);
  }
}

function storeOriginalAttributes(el, attrNames) {
  if (!originalAttrs.has(el)) {
    const obj = {};
    for (const a of attrNames) {
      if (el.hasAttribute && el.hasAttribute(a)) {
        obj[a] = el.getAttribute(a);
      }
    }
    if (Object.keys(obj).length) originalAttrs.set(el, obj);
  }
}

function translateTextNodesForDict(root, dict) {
  walkTextNodes(root, (node) => {
    storeOriginalTextNode(node);
    const original = originalText.get(node) || node.nodeValue;
    const replaced = replaceInStringFromDict(original, dict);
    if (replaced !== node.nodeValue) node.nodeValue = replaced;
  });
}

function translateAttributesForDict(root, dict) {
  // attributes we care about
  const attrs = ["placeholder", "title", "aria-label", "alt", "value"];
  const selector = attrs.map(a => `[${a}]`).join(",");
  root.querySelectorAll(selector).forEach(el => {
    storeOriginalAttributes(el, attrs);
    const origs = originalAttrs.get(el) || {};
    for (const a of attrs) {
      const origVal = (origs[a] !== undefined) ? origs[a] : (el.getAttribute && el.getAttribute(a));
      if (!origVal) continue;
      const replaced = replaceInStringFromDict(origVal, dict);
      if (replaced !== el.getAttribute(a)) el.setAttribute(a, replaced);
    }
  });

  // options (their textContent is usually a text node, but ensure we handle them)
  root.querySelectorAll("option").forEach(opt => {
    if (!originalText.has(opt.firstChild)) {
      // store original text for the child text node if present
      if (opt.firstChild && opt.firstChild.nodeType === Node.TEXT_NODE) originalText.set(opt.firstChild, opt.firstChild.nodeValue);
    }
    if (opt.firstChild && opt.firstChild.nodeType === Node.TEXT_NODE) {
      const original = originalText.get(opt.firstChild) || opt.firstChild.nodeValue;
      const replaced = replaceInStringFromDict(original, dict);
      if (replaced !== opt.textContent) opt.textContent = replaced;
    }
  });
}

function applyTranslations(lang) {
  const dict = translations[lang];
  if (!dict) {
    console.warn("No translations found for", lang);
    return;
  }
  // translate entire document starting from body
  translateTextNodesForDict(document.body, dict);
  translateAttributesForDict(document.body, dict);
}

/**
 * Initialize the language switcher UI and behaviour.
 * options:
 *  - selector: container to mount switcher (default '#langSwitcher')
 *  - defaultLang: fallback default if localStorage empty (default 'en')
 *  - available: array of language codes to show (default: keys of translations)
 */
export function initLangSwitcher(options = {}) {
  const selector = options.selector || "#langSwitcher";
  const defaultLang = options.defaultLang || "en";
  const available = options.available || Object.keys(translations);

  let current = localStorage.getItem("lang") || defaultLang;
  if (!available.includes(current)) current = available[0];

  const root = document.querySelector(selector);
  if (!root) {
    console.warn("Lang switcher root not found:", selector);
    // still apply translations to page default
    applyTranslations(current);
    return;
  }

  // Build a compact UI: dropdown + apply button + toggle quick button
  root.innerHTML = ""; // clean
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.gap = "8px";

  const select = document.createElement("select");
  select.setAttribute("aria-label", "Select language");
  available.forEach(code => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code.toUpperCase();
    if (code === current) opt.selected = true;
    select.appendChild(opt);
  });

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.textContent = translations[current]["Change Language"] || "Change Language";
  applyBtn.className = "lang-apply-btn";

  const quickToggle = document.createElement("button");
  quickToggle.type = "button";
  quickToggle.textContent = "🌐";
  quickToggle.title = "Toggle language";
  quickToggle.className = "lang-toggle-btn";

  applyBtn.addEventListener("click", () => {
    const chosen = select.value;
    if (!translations[chosen]) return;
    current = chosen;
    localStorage.setItem("lang", current);
    applyTranslations(current);
    // update apply button text if translated
    applyBtn.textContent = translations[current]["Change Language"] || "Change Language";
  });

  quickToggle.addEventListener("click", () => {
    // simple rotate through available languages
    const idx = available.indexOf(current);
    const next = available[(idx + 1) % available.length];
    select.value = next;
    current = next;
    localStorage.setItem("lang", current);
    applyTranslations(current);
    applyBtn.textContent = translations[current]["Change Language"] || "Change Language";
  });

  root.appendChild(select);
  root.appendChild(applyBtn);
  root.appendChild(quickToggle);

  // store originals for the initial DOM so translations are reversible
  walkTextNodes(document.body, (node) => storeOriginalTextNode(node));
  // store attributes originals
  document.querySelectorAll("[placeholder],[title],[aria-label],[alt],[value]").forEach(el => storeOriginalAttributes(el, ["placeholder","title","aria-label","alt","value"]));

  // apply initial language
  applyTranslations(current);

  // watch for new nodes / attribute changes and translate them as they appear
  const mo = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const n of m.addedNodes) {
          if (n.nodeType === Node.TEXT_NODE) {
            storeOriginalTextNode(n);
            const dict = translations[current];
            if (dict) {
              const orig = originalText.get(n) || n.nodeValue;
              const replaced = replaceInStringFromDict(orig, dict);
              if (replaced !== n.nodeValue) n.nodeValue = replaced;
            }
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            // store originals in subtree and translate subtree
            walkTextNodes(n, (textNode) => storeOriginalTextNode(textNode));
            n.querySelectorAll("[placeholder],[title],[aria-label],[alt],[value]").forEach(el => storeOriginalAttributes(el, ["placeholder","title","aria-label","alt","value"]));
            // translate subtree
            const dict = translations[current];
            if (dict) {
              translateTextNodesForDict(n, dict);
              translateAttributesForDict(n, dict);
            }
          }
        }
      } else if (m.type === "attributes") {
        const el = m.target;
        storeOriginalAttributes(el, [m.attributeName]);
        const dict = translations[current];
        if (dict) {
          const origs = originalAttrs.get(el) || {};
          const original = origs[m.attributeName] !== undefined ? origs[m.attributeName] : el.getAttribute(m.attributeName);
          if (original !== null) {
            const replaced = replaceInStringFromDict(original, dict);
            if (replaced !== el.getAttribute(m.attributeName)) el.setAttribute(m.attributeName, replaced);
          }
        }
      }
    }
  });

  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeOldValue: false });
}
