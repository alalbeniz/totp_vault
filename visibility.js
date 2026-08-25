(() => {
  const STORAGE_SETTINGS = "settings";
  const DEFAULTS = { showCodes: true, codeVisibilityOverrides: {} };
  let settings = { ...DEFAULTS };
  let applying = false;

  function normalize(raw) {
    const next = { ...DEFAULTS, ...(raw || {}) };
    if (typeof next.showCodes !== "boolean") next.showCodes = true;
    if (!next.codeVisibilityOverrides || typeof next.codeVisibilityOverrides !== "object" || Array.isArray(next.codeVisibilityOverrides)) {
      next.codeVisibilityOverrides = {};
    }
    return next;
  }

  function visibleFor(id) {
    const override = settings.codeVisibilityOverrides[id];
    return typeof override === "boolean" ? override : settings.showCodes;
  }

  function maskForCard(card) {
    const meta = card.querySelector(".card-meta")?.textContent || "";
    return /8\s*d[ií]gitos/i.test(meta) ? "•••• ••••" : "••• •••";
  }

  function setEyeState(button, visible, global = false) {
    if (!button) return;
    button.querySelector(".eye-open")?.classList.toggle("hidden", !visible);
    button.querySelector(".eye-closed")?.classList.toggle("hidden", visible);
    const action = visible ? "Ocultar" : "Mostrar";
    const label = global ? `${action} todos los códigos` : `${action} código`;
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      const globalButton = document.getElementById("toggleCodesVisibility");
      setEyeState(globalButton, settings.showCodes, true);

      for (const card of document.querySelectorAll(".totp-card")) {
        const id = card.dataset.id;
        if (!id) continue;
        const visible = visibleFor(id);
        const code = card.querySelector(".code");
        if (code) {
          code.classList.toggle("code-hidden", !visible);
          code.dataset.mask = maskForCard(card);
          code.setAttribute("aria-label", visible ? "Código TOTP visible" : "Código TOTP oculto");
        }
        setEyeState(card.querySelector(".code-visibility-btn"), visible, false);
      }
    } finally {
      applying = false;
    }
  }

  async function save() {
    const stored = await chrome.storage.local.get(STORAGE_SETTINGS);
    const merged = { ...(stored[STORAGE_SETTINGS] || {}), showCodes: settings.showCodes, codeVisibilityOverrides: settings.codeVisibilityOverrides };
    await chrome.storage.local.set({ [STORAGE_SETTINGS]: merged });
  }

  async function toggleGlobal() {
    settings.showCodes = !settings.showCodes;
    settings.codeVisibilityOverrides = {};
    apply();
    await save();
  }

  async function toggleItem(card) {
    const id = card?.dataset.id;
    if (!id) return;
    const newValue = !visibleFor(id);
    const overrides = { ...settings.codeVisibilityOverrides };
    if (newValue === settings.showCodes) delete overrides[id];
    else overrides[id] = newValue;
    settings.codeVisibilityOverrides = overrides;
    apply();
    await save();
  }

  document.addEventListener("click", (event) => {
    const globalButton = event.target.closest?.("#toggleCodesVisibility");
    if (globalButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleGlobal().catch(console.error);
      return;
    }

    const itemButton = event.target.closest?.(".code-visibility-btn");
    if (itemButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleItem(itemButton.closest(".totp-card")).catch(console.error);
    }
  }, true);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[STORAGE_SETTINGS]) return;
    settings = normalize(changes[STORAGE_SETTINGS].newValue);
    apply();
  });

  const observer = new MutationObserver(() => apply());

  async function init() {
    const stored = await chrome.storage.local.get(STORAGE_SETTINGS);
    settings = normalize(stored[STORAGE_SETTINGS]);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    apply();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
