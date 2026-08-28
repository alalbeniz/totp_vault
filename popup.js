(() => {
  const STORAGE_SETTINGS = "settings";
  const THEMES = new Set(["1c485f","08709c","95cbc0","d4c299","777778","42b8af","cfdf9e","ecd799","fbb38a","e77292"]);
  const normalize = (value) => THEMES.has(value) ? value : "1c485f";

  function apply(theme) {
    const value = normalize(theme);
    document.documentElement.dataset.theme = value;
    document.body?.setAttribute("data-theme", value);
    document.querySelectorAll(".theme-swatch").forEach((button) => {
      const selected = button.dataset.theme === value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(selected));
      button.setAttribute("role", "radio");
    });
  }

  async function loadTheme() {
    const { settings = {} } = await chrome.storage.local.get(STORAGE_SETTINGS);
    apply(settings.colorTheme);
  }

  async function saveTheme(theme) {
    const { settings = {} } = await chrome.storage.local.get(STORAGE_SETTINGS);
    settings.colorTheme = normalize(theme);
    await chrome.storage.local.set({ [STORAGE_SETTINGS]: settings });
    apply(settings.colorTheme);
  }

  function bindThemePicker() {
    document.querySelectorAll(".theme-swatch").forEach((button) => {
      button.addEventListener("click", () => saveTheme(button.dataset.theme));
    });
  }

  // Load the proven v2.9.10 popup logic unchanged, then layer theme handling on top.
  const core = document.createElement("script");
  core.src = chrome.runtime.getURL("popup-core.js");
  core.async = false;
  core.addEventListener("load", async () => {
    bindThemePicker();
    await loadTheme();
    if (document.readyState !== "loading") {
      document.dispatchEvent(new Event("DOMContentLoaded"));
    }
  });
  document.head.appendChild(core);
})();
