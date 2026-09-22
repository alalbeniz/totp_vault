/* Presentation helpers. Account, encryption, TOTP and autofill handlers live in popup-core.js. */
(() => {
  const tr = (key, subs, fallback = "") => globalThis.TotpI18n?.t?.(key, subs, fallback) || fallback;
  document.addEventListener("DOMContentLoaded", async () => {
    await globalThis.TotpI18n?.ready;
    const list = document.getElementById("totpList");
    const empty = document.getElementById("emptyState");
    const count = document.getElementById("accountCount");
    const add = document.getElementById("addPanel");
    const settings = document.getElementById("settingsPanel");
    const qr = document.getElementById("qrPanel");
    const panels = [add, settings, qr];
    let activePanel = null;

    function updateList() {
      const total = state.entries.length;
      count.textContent = String(total);
      count.setAttribute("aria-label", total === 1
        ? tr("accountCountOne", undefined, "1 cuenta")
        : tr("accountCountMany", [String(total)], `${total} cuentas`));
      // The original renderer only shows this element for search misses.
      // Show its existing onboarding copy for a newly created, empty vault too.
      if (!total && !state.filterQuery) empty.classList.remove("hidden");
      list.querySelectorAll(".totp-card").forEach((card) => {
        const name = card.querySelector(".card-title").textContent;
        card.querySelector(".card-title").title = name;
        card.querySelector(".menu-btn").setAttribute("aria-label", tr("optionsFor", [name], `Opciones de ${name}`));
        card.querySelector(".code-copy").setAttribute("aria-label", tr("copyCodeFor", [name], `Copiar código de ${name}`));
      });
    }
    new MutationObserver(updateList).observe(list, { childList: true });
    new MutationObserver(updateList).observe(document.getElementById("vaultView"), { attributes: true, attributeFilter: ["class"] });
    updateList();

    function updatePanel() {
      const next = panels.find((panel) => !panel.classList.contains("hidden")) || null;
      if (next === activePanel) return;
      const previous = activePanel;
      activePanel = next;
      document.getElementById("toggleAdd").setAttribute("aria-expanded", String(next === add));
      document.getElementById("settingsBtn").setAttribute("aria-expanded", String(next === settings));
      document.getElementById("qrImportBtn").setAttribute("aria-expanded", String(next === qr));
      if (next) {
        next.scrollTop = 0;
        const target = next === add
          ? document.getElementById("name")
          : next === settings
            ? document.getElementById("closeSettings")
            : document.getElementById("qrPageBtn");
        target?.focus();
      } else if (previous) {
        const trigger = previous === add
          ? document.getElementById("toggleAdd")
          : previous === settings
            ? document.getElementById("settingsBtn")
            : document.getElementById("qrImportBtn");
        trigger?.focus();
      }
    }
    panels.forEach((panel) => new MutationObserver(updatePanel).observe(panel, { attributes: true, attributeFilter: ["class"] }));
    document.getElementById("toggleAdd").setAttribute("aria-controls", "addPanel");
    document.getElementById("settingsBtn").setAttribute("aria-controls", "settingsPanel");
    document.getElementById("qrImportBtn").setAttribute("aria-controls", "qrPanel");

    // Use existing close actions, including reset and session touch behavior.
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openMenu = list.querySelector(".card-menu:not(.hidden)");
      if (openMenu) {
        closeCardMenus();
        openMenu.closest(".totp-card").querySelector(".menu-btn").focus();
      } else if (activePanel) {
        const closeId = activePanel === add ? "closeAdd" : activePanel === settings ? "closeSettings" : "closeQr";
        document.getElementById(closeId)?.click();
      }
    });

    // Bind the existing auto-submit preference to its settings control.
    const autoSubmit = document.getElementById("autoSubmitMode");
    const applyAutoSubmit = (value) => { autoSubmit.value = ["off", "conservative", "maximum"].includes(value) ? value : "off"; };
    chrome.storage.local.get("settings").then(({ settings = {} }) => applyAutoSubmit(settings.autoSubmitMode));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.settings) applyAutoSubmit(changes.settings.newValue?.autoSubmitMode);
    });
    autoSubmit.addEventListener("change", async () => {
      try {
        const { settings = {} } = await chrome.storage.local.get("settings");
        await chrome.storage.local.set({ settings: { ...settings, autoSubmitMode: autoSubmit.value } });
        showMessage("#settingsMessage", tr("submissionPreferenceUpdated", undefined, "Preferencia de envío actualizada."), "ok");
      } catch {
        showMessage("#settingsMessage", tr("savePreferenceFailed", undefined, "No se pudo guardar la preferencia."), "error");
      }
    });
  }, { once: true });
})();
