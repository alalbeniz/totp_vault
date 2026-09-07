/* Presentation helpers. Account, encryption, TOTP and autofill handlers live in popup-core.js. */
(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("totpList");
    const empty = document.getElementById("emptyState");
    const count = document.getElementById("accountCount");
    const add = document.getElementById("addPanel");
    const settings = document.getElementById("settingsPanel");
    const panels = [add, settings];
    let activePanel = null;

    function updateList() {
      const total = state.entries.length;
      count.textContent = String(total);
      count.setAttribute("aria-label", `${total} cuenta${total === 1 ? "" : "s"}`);
      // The original renderer only shows this element for search misses.
      // Show its existing onboarding copy for a newly created, empty vault too.
      if (!total && !state.filterQuery) empty.classList.remove("hidden");
      list.querySelectorAll(".totp-card").forEach((card) => {
        const name = card.querySelector(".card-title").textContent;
        card.querySelector(".card-title").title = name;
        card.querySelector(".menu-btn").setAttribute("aria-label", `Opciones de ${name}`);
        card.querySelector(".code-copy").setAttribute("aria-label", `Copiar código de ${name}`);
      });
    }
    new MutationObserver(updateList).observe(list, { childList: true });
    updateList();

    function updatePanel() {
      const next = panels.find((panel) => !panel.classList.contains("hidden")) || null;
      if (next === activePanel) return;
      const previous = activePanel;
      activePanel = next;
      document.getElementById("toggleAdd").setAttribute("aria-expanded", String(next === add));
      document.getElementById("settingsBtn").setAttribute("aria-expanded", String(next === settings));
      if (next) {
        next.scrollTop = 0;
        (next === add ? document.getElementById("name") : document.getElementById("closeSettings")).focus();
      } else if (previous) {
        document.getElementById(previous === add ? "toggleAdd" : "settingsBtn").focus();
      }
    }
    panels.forEach((panel) => new MutationObserver(updatePanel).observe(panel, { attributes: true, attributeFilter: ["class"] }));
    document.getElementById("toggleAdd").setAttribute("aria-controls", "addPanel");
    document.getElementById("settingsBtn").setAttribute("aria-controls", "settingsPanel");

    // Use existing close actions, including reset and session touch behavior.
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openMenu = list.querySelector(".card-menu:not(.hidden)");
      if (openMenu) {
        closeCardMenus();
        openMenu.closest(".totp-card").querySelector(".menu-btn").focus();
      } else if (activePanel) {
        document.getElementById(activePanel === add ? "closeAdd" : "closeSettings").click();
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
        showMessage("#settingsMessage", "Preferencia de envío actualizada.", "ok");
      } catch {
        showMessage("#settingsMessage", "No se pudo guardar la preferencia.", "error");
      }
    });
  }, { once: true });
})();
