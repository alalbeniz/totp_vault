(() => {
  const THEMES = new Set(["1c485f", "08709c", "95cbc0", "d4c299", "777778", "42b8af", "cfdf9e", "ecd799", "fbb38a", "e77292"]);
  const normalize = (value) => THEMES.has(value) ? value : "1c485f";

  function apply(theme) {
    const value = normalize(theme);
    document.documentElement.dataset.theme = value;
    document.querySelectorAll(".theme-swatch").forEach((button) => {
      const selected = button.dataset.theme === value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(selected));
      button.setAttribute("role", "radio");
      button.tabIndex = selected ? 0 : -1;
    });
  }

  async function saveTheme(theme) {
    try {
      const { settings = {} } = await chrome.storage.local.get("settings");
      settings.colorTheme = normalize(theme);
      await chrome.storage.local.set({ settings });
      apply(settings.colorTheme);
    } catch {
      showMessage("#settingsMessage", "No se pudo guardar el tema. Inténtalo de nuevo.", "error");
    }
  }

  // Synchronize the core's settings snapshot so subsequent settings saves keep
  // appearance and visibility preferences. Vault/crypto behavior stays in core.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.settings) return;
    const settings = changes.settings.newValue || {};
    Object.assign(state.settings, settings);
    apply(settings.colorTheme);
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const buttons = [...document.querySelectorAll(".theme-swatch")];
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => saveTheme(button.dataset.theme));
      button.addEventListener("keydown", (event) => {
        let next;
        if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % buttons.length;
        if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index + buttons.length - 1) % buttons.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = buttons.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        buttons[next].focus();
        saveTheme(buttons[next].dataset.theme);
      });
    });
    const { settings = {} } = await chrome.storage.local.get("settings");
    apply(settings.colorTheme);
  }, { once: true });
})();
