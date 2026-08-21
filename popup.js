const STORAGE_VAULT = "vaultMeta";
const STORAGE_SETTINGS = "settings";
const SESSION_KEY = "vaultSession";

const DEFAULT_SETTINGS = {
  autoLockMinutes: 5
};

const KDF_ITERATIONS = 310000;
const VAULT_VERSION = 2;

const BUILTIN_ICONS = {
  outlook: { label: "Outlook / Microsoft 365", src: "icons/services/outlook.svg" },
  microsoft: { label: "Microsoft", src: "icons/services/microsoft.svg" },
  google: { label: "Google", src: "icons/services/google.svg" },
  github: { label: "GitHub", src: "icons/services/github.svg" },
  aws: { label: "AWS", src: "icons/services/aws.svg" },
  azure: { label: "Azure", src: "icons/services/azure.svg" },
  cloudflare: { label: "Cloudflare", src: "icons/services/cloudflare.svg" },
  apple: { label: "Apple / iCloud", src: "icons/services/apple.svg" },
  meta: { label: "Meta", src: "icons/services/meta.svg" },
  dropbox: { label: "Dropbox", src: "icons/services/dropbox.svg" },
  vpn: { label: "VPN", src: "icons/services/vpn.svg" },
  generic: { label: "Genérico", src: "icons/services/generic.svg" }
};

const MAX_CUSTOM_ICON_BYTES = 2 * 1024 * 1024;
const CUSTOM_ICON_SIZE = 96;

const state = {
  entries: [],
  keyBytes: null,
  settings: { ...DEFAULT_SETTINGS },
  timerId: null,
  sessionCheckId: null,
  filterQuery: "",
  listResizeObserver: null,
  authResizeObservers: [],
  pendingIcon: { type: "auto" },
  editingId: null,
  openMenuId: null
};

const $ = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await hardenStorageAccess();
  bindUi();
  setupListScrollbar();
  setupAuthScrollbars();
  await loadSettings();
  await restoreSession();
  state.timerId = setInterval(refreshCodes, 250);
  state.sessionCheckId = setInterval(checkAutoLock, 1000);
}

async function hardenStorageAccess() {
  // Explicitly prevent extension content scripts / injected extension contexts
  // from reading the persistent vault or the in-memory session key.
  // The popup remains a trusted extension context and continues to work normally.
  const trustedOnly = { accessLevel: "TRUSTED_CONTEXTS" };

  const operations = [];
  if (chrome.storage?.local?.setAccessLevel) {
    operations.push(chrome.storage.local.setAccessLevel(trustedOnly));
  }
  if (chrome.storage?.session?.setAccessLevel) {
    operations.push(chrome.storage.session.setAccessLevel(trustedOnly));
  }

  if (!operations.length) return;

  try {
    await Promise.all(operations);
  } catch (error) {
    // Do not break the extension on an older/managed Chrome build.
    // storage.session is already restricted by default; this is defense-in-depth.
    console.warn("TOTP Vault: no se pudo endurecer el acceso a storage", error);
  }
}

let listScrollbarTimer = null;

function updateListOverflowState() {
  updateScrollableOverflow($("#totpList"));
}

function setupListScrollbar() {
  const list = $("#totpList");
  if (!list || list.dataset.scrollEnhancer === "true") return;
  attachScrollEnhancer(list);
  if (window.ResizeObserver) {
    state.listResizeObserver?.disconnect?.();
    state.listResizeObserver = new ResizeObserver(() => updateListOverflowState());
    state.listResizeObserver.observe(list);
  } else {
    window.addEventListener("resize", updateListOverflowState);
  }
}

function updateScrollableOverflow(el) {
  if (!el) return;
  const hasScroll = el.scrollHeight > el.clientHeight + 2;
  el.classList.toggle("has-scroll", hasScroll);
  if (!hasScroll) el.classList.remove("scroll-active");
}

function attachScrollEnhancer(el) {
  if (!el || el.dataset.scrollEnhancer === "true") return;
  let timer = null;

  const activate = () => {
    updateScrollableOverflow(el);
    if (!el.classList.contains("has-scroll")) return;
    el.classList.add("scroll-active");
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!el.matches(":hover")) {
        el.classList.remove("scroll-active");
      }
    }, 900);
  };

  const deactivate = () => {
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("scroll-active"), 180);
  };

  el.addEventListener("mouseenter", activate);
  el.addEventListener("mouseleave", deactivate);
  el.addEventListener("scroll", activate, { passive: true });
  el.addEventListener("wheel", activate, { passive: true });
  el.addEventListener("touchmove", activate, { passive: true });
  el.addEventListener("keydown", activate);

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => updateScrollableOverflow(el));
    ro.observe(el);
    if (el.classList.contains("center-view")) {
      state.authResizeObservers.push(ro);
    }
  }

  el.dataset.scrollEnhancer = "true";
  queueMicrotask(() => updateScrollableOverflow(el));
}

function setupAuthScrollbars() {
  document.querySelectorAll(".center-view").forEach(attachScrollEnhancer);
}


function detectBuiltinIcon(entry) {
  const source = `${entry?.name || ""} ${entry?.issuer || ""}`.toLowerCase();
  if (/outlook|office\s*365|microsoft\s*365|hotmail|live\.com|exchange/.test(source)) return "outlook";
  if (/github/.test(source)) return "github";
  if (/gmail|google/.test(source)) return "google";
  if (/azure|entra|aad|active\s*directory/.test(source)) return "azure";
  if (/cloudflare/.test(source)) return "cloudflare";
  if (/amazon\s*web\s*services|\baws\b/.test(source)) return "aws";
  if (/icloud|apple/.test(source)) return "apple";
  if (/instagram|facebook|\bmeta\b/.test(source)) return "meta";
  if (/dropbox/.test(source)) return "dropbox";
  if (/vpn|fortinet|fortigate|globalprotect|pulse\s*secure|anyconnect|openvpn/.test(source)) return "vpn";
  if (/microsoft|windows/.test(source)) return "microsoft";
  return null;
}

function getFallbackInitials(entry) {
  const words = (entry?.name || entry?.issuer || "TOTP").split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]).join("").toUpperCase() || "T";
}

function normalizeIconConfig(icon) {
  if (!icon || icon.type === "auto") return { type: "auto" };
  if (icon.type === "builtin" && BUILTIN_ICONS[icon.key]) return { type: "builtin", key: icon.key };
  if (icon.type === "custom" && typeof icon.data === "string" && icon.data.startsWith("data:image/")) return { type: "custom", data: icon.data };
  return { type: "auto" };
}

function resolveEntryIcon(entry) {
  const icon = normalizeIconConfig(entry?.icon);
  if (icon.type === "custom") return { type: "custom", src: icon.data, key: "custom" };
  if (icon.type === "builtin") return { type: "builtin", src: BUILTIN_ICONS[icon.key].src, key: icon.key };
  const detected = detectBuiltinIcon(entry);
  if (detected) return { type: "builtin", src: BUILTIN_ICONS[detected].src, key: detected };
  return { type: "fallback", text: getFallbackInitials(entry), key: "generic" };
}

function renderIconInto(container, entry) {
  if (!container) return;
  container.replaceChildren();
  container.classList.remove("is-custom", "is-fallback");
  const resolved = resolveEntryIcon(entry);
  if (resolved.type === "fallback") {
    container.classList.add("is-fallback");
    container.textContent = resolved.text;
    return;
  }
  if (resolved.type === "custom") container.classList.add("is-custom");
  const img = document.createElement("img");
  img.src = resolved.src;
  img.alt = "";
  img.decoding = "async";
  container.appendChild(img);
}

function buildPreviewEntry() {
  let issuer = "";
  try {
    const raw = $("#secret")?.value?.trim();
    if (raw?.toLowerCase().startsWith("otpauth://")) issuer = parseInput(raw).issuer || "";
  } catch {}
  return { name: $("#name")?.value?.trim() || "TOTP", issuer, icon: normalizeIconConfig(state.pendingIcon) };
}

function updateIconPickerUi() {
  const select = $("#iconSelect");
  if (!select) return;
  const rawIcon = state.pendingIcon || { type: "auto" };
  const icon = rawIcon.type === "custom" ? rawIcon : normalizeIconConfig(rawIcon);
  select.value = icon.type === "builtin" ? icon.key : icon.type;
  const custom = icon.type === "custom";
  $("#customIconControls")?.classList.toggle("hidden", !custom);
  $("#clearCustomIcon")?.classList.toggle("hidden", !custom || !icon.data);
  renderIconInto($("#iconPreview"), buildPreviewEntry());
}

async function rasterizeCustomIcon(file) {
  if (!file) throw new Error("Selecciona una imagen.");
  if (file.size > MAX_CUSTOM_ICON_BYTES) throw new Error("El icono no puede superar 2 MB.");
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error("Usa un icono PNG, JPG o WebP.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = CUSTOM_ICON_SIZE;
    canvas.height = CUSTOM_ICON_SIZE;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("No se pudo procesar el icono.");
    const scale = Math.min(CUSTOM_ICON_SIZE / img.naturalWidth, CUSTOM_ICON_SIZE / img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const x = Math.round((CUSTOM_ICON_SIZE - w) / 2);
    const y = Math.round((CUSTOM_ICON_SIZE - h) / 2);
    ctx.clearRect(0, 0, CUSTOM_ICON_SIZE, CUSTOM_ICON_SIZE);
    ctx.drawImage(img, x, y, w, h);
    return canvas.toDataURL("image/webp", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bindUi() {
  $("#setupForm").addEventListener("submit", handleSetup);
  $("#unlockForm").addEventListener("submit", handleUnlock);

  $("#toggleAdd").addEventListener("click", () => { resetAddForm(); showAdd(true); });
  $("#closeAdd").addEventListener("click", () => showAdd(false));
  $("#cancelAdd").addEventListener("click", () => showAdd(false));
  $("#addForm").addEventListener("submit", handleAdd);
  $("#iconSelect").addEventListener("change", (event) => {
    const value = event.target.value;
    if (value === "auto") state.pendingIcon = { type: "auto" };
    else if (value === "custom") {
      if (state.pendingIcon?.type !== "custom") state.pendingIcon = { type: "custom", data: "" };
    } else if (BUILTIN_ICONS[value]) state.pendingIcon = { type: "builtin", key: value };
    updateIconPickerUi();
  });
  $("#chooseCustomIcon").addEventListener("click", () => $("#customIconFile").click());
  $("#clearCustomIcon").addEventListener("click", () => {
    state.pendingIcon = { type: "auto" };
    $("#customIconFile").value = "";
    updateIconPickerUi();
  });
  $("#customIconFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      hideMessage("#formError");
      state.pendingIcon = { type: "custom", data: await rasterizeCustomIcon(file) };
      updateIconPickerUi();
    } catch (err) {
      state.pendingIcon = { type: "auto" };
      event.target.value = "";
      updateIconPickerUi();
      showMessage("#formError", err.message || "No se pudo procesar el icono.", "error");
    }
  });
  $("#name").addEventListener("input", updateIconPickerUi);
  $("#secret").addEventListener("input", updateIconPickerUi);

  $("#settingsBtn").addEventListener("click", () => showSettings(true));
  $("#searchInput")?.addEventListener("input", (event) => {
    state.filterQuery = event.target.value.trim().toLowerCase();
    render();
  });
  $("#closeSettings").addEventListener("click", () => showSettings(false));
  $("#lockBtn").addEventListener("click", lockVault);

  $("#autoLockSelect").addEventListener("change", saveAutoLockSetting);
  $("#exportBtn").addEventListener("click", exportEncryptedBackup);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => importEncryptedBackup(e.target.files?.[0], false));

  $("#setupImportBtn").addEventListener("click", () => $("#setupImportFile").click());
  $("#setupImportFile").addEventListener("change", (e) => importEncryptedBackup(e.target.files?.[0], true));

  $("#changePasswordToggle").addEventListener("click", () => {
    $("#changePasswordForm").classList.toggle("hidden");
  });
  $("#changePasswordForm").addEventListener("submit", handleChangePassword);

  for (const button of document.querySelectorAll("[data-reveal]")) {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.reveal);
      const showing = input.type === "password";
      input.type = showing ? "text" : "password";
      button.querySelector(".eye-open")?.classList.toggle("hidden", showing);
      button.querySelector(".eye-closed")?.classList.toggle("hidden", !showing);
      button.setAttribute("aria-label", showing ? "Ocultar contenido" : "Mostrar contenido");
      button.setAttribute("title", showing ? "Ocultar" : "Mostrar");
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-btn") && !event.target.closest(".card-menu")) {
      closeCardMenus();
    }
  });
}

async function loadSettings() {
  const data = await chrome.storage.local.get(STORAGE_SETTINGS);
  state.settings = { ...DEFAULT_SETTINGS, ...(data[STORAGE_SETTINGS] || {}) };
  $("#autoLockSelect").value = String(state.settings.autoLockMinutes);
}

async function restoreSession() {
  const local = await chrome.storage.local.get(STORAGE_VAULT);
  const meta = local[STORAGE_VAULT];

  if (!meta) {
    switchView("setupView");
    return;
  }

  const sessionData = await chrome.storage.session.get(SESSION_KEY);
  const session = sessionData[SESSION_KEY];

  if (!session?.keyB64 || sessionExpired(session)) {
    await chrome.storage.session.remove(SESSION_KEY);
    switchView("unlockView");
    return;
  }

  try {
    const keyBytes = base64ToBytes(session.keyB64);
    const entries = await decryptVault(meta, keyBytes);
    state.keyBytes = keyBytes;
    state.entries = entries;
    switchView("vaultView");
    render();
    await touchSession();
  } catch {
    await chrome.storage.session.remove(SESSION_KEY);
    switchView("unlockView");
  }
}

function switchView(id) {
  for (const viewId of ["loadingView", "setupView", "unlockView", "vaultView"]) {
    document.getElementById(viewId).classList.toggle("hidden", viewId !== id);
  }
  queueMicrotask(() => {
    setupAuthScrollbars();
    document.querySelectorAll(".center-view:not(.hidden)").forEach(updateScrollableOverflow);
  });
  if (id === "unlockView") {
    setTimeout(() => $("#unlockPassword").focus(), 0);
  }
}

async function handleSetup(event) {
  event.preventDefault();
  hideMessage("#setupError");

  try {
    const p1 = $("#setupPassword").value;
    const p2 = $("#setupPassword2").value;
    validateNewPassword(p1, p2);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyBytes = await deriveKeyBytes(p1, salt, KDF_ITERATIONS);

    state.keyBytes = keyBytes;
    state.entries = [];

    const meta = await encryptVault([], keyBytes, salt, KDF_ITERATIONS);
    await chrome.storage.local.set({
      [STORAGE_VAULT]: meta,
      [STORAGE_SETTINGS]: state.settings
    });
    await cacheSessionKey(keyBytes);

    $("#setupForm").reset();
    switchView("vaultView");
    render();
  } catch (err) {
    showMessage("#setupError", err.message || "No se pudo crear la bóveda.", "error");
  }
}

async function handleUnlock(event) {
  event.preventDefault();
  hideMessage("#unlockError");

  try {
    const password = $("#unlockPassword").value;
    const data = await chrome.storage.local.get(STORAGE_VAULT);
    const meta = data[STORAGE_VAULT];
    if (!meta) throw new Error("No existe ninguna bóveda.");

    const salt = base64ToBytes(meta.salt);
    const keyBytes = await deriveKeyBytes(password, salt, meta.iterations || KDF_ITERATIONS);

    let entries;
    try {
      entries = await decryptVault(meta, keyBytes);
    } catch {
      throw new Error("Contraseña maestra incorrecta.");
    }

    state.keyBytes = keyBytes;
    state.entries = entries;
    await cacheSessionKey(keyBytes);

    $("#unlockForm").reset();
    switchView("vaultView");
    render();
  } catch (err) {
    showMessage("#unlockError", err.message || "No se pudo desbloquear.", "error");
  }
}

async function lockVault() {
  state.keyBytes = null;
  state.entries = [];
  state.editingId = null;
  state.openMenuId = null;
  await chrome.storage.session.remove(SESSION_KEY);
  showAdd(false);
  showSettings(false);
  switchView("unlockView");
}

async function checkAutoLock() {
  if (!state.keyBytes) return;
  const data = await chrome.storage.session.get(SESSION_KEY);
  const session = data[SESSION_KEY];
  if (!session || sessionExpired(session)) {
    await lockVault();
  }
}

function sessionExpired(session) {
  const minutes = Number(state.settings.autoLockMinutes);

  // 0 = mantener desbloqueado durante la sesión actual del navegador.
  // chrome.storage.session se elimina cuando termina la sesión del navegador,
  // al recargar/deshabilitar la extensión o al reiniciar Chrome.
  if (minutes === 0) return false;

  const timeoutMs = Math.max(1, Number.isFinite(minutes) ? minutes : 5) * 60_000;
  return Date.now() - Number(session.lastActivity || 0) > timeoutMs;
}

async function cacheSessionKey(keyBytes) {
  await chrome.storage.session.set({
    [SESSION_KEY]: {
      keyB64: bytesToBase64(keyBytes),
      lastActivity: Date.now()
    }
  });
}

async function touchSession() {
  if (!state.keyBytes) return;
  await cacheSessionKey(state.keyBytes);
  updateVaultStatus();
}

function updateVaultStatus() {
  const el = $("#vaultStatus");
  const min = Number(state.settings.autoLockMinutes);
  let label;

  if (min === 0) label = "al cerrar navegador";
  else if (min === 60) label = "1 h";
  else label = `${min || 5} min`;

  el.textContent = `Desbloqueada · bloqueo ${label}`;
}

function resetAddForm() {
  state.editingId = null;
  $("#addPanelTitle").textContent = "Añadir TOTP";
  $("#saveAddBtn").textContent = "Guardar";
  $("#addForm").reset();
  state.pendingIcon = { type: "auto" };
  $("#customIconFile").value = "";
  updateIconPickerUi();
  hideMessage("#formError");
}

function openEditEntry(id) {
  const entry = state.entries.find((e) => e.id === id);
  if (!entry) return;
  closeCardMenus();
  state.editingId = id;
  $("#addPanelTitle").textContent = "Editar TOTP";
  $("#saveAddBtn").textContent = "Actualizar";
  $("#name").value = entry.name || "";
  $("#secret").value = entry.secret || "";
  state.pendingIcon = normalizeIconConfig(entry.icon);
  $("#customIconFile").value = "";
  updateIconPickerUi();
  showAdd(true);
}

function showAdd(open) {
  $("#addPanel").classList.toggle("hidden", !open);
  if (open) {
    $("#settingsPanel").classList.add("hidden");
    setTimeout(() => $("#name").focus(), 0);
  } else {
    resetAddForm();
  }
  touchSession();
}

function showSettings(open) {
  $("#settingsPanel").classList.toggle("hidden", !open);
  if (open) {
    $("#addPanel").classList.add("hidden");
    $("#autoLockSelect").value = String(state.settings.autoLockMinutes);
  } else {
    $("#changePasswordForm").classList.add("hidden");
    $("#changePasswordForm").reset();
    hideMessage("#settingsMessage");
    hideMessage("#changePasswordError");
  }
  touchSession();
}

async function saveAutoLockSetting() {
  state.settings.autoLockMinutes = Number($("#autoLockSelect").value);
  await chrome.storage.local.set({ [STORAGE_SETTINGS]: state.settings });
  await touchSession();
  showMessage("#settingsMessage", "Bloqueo automático actualizado.", "ok");
}

async function handleAdd(event) {
  event.preventDefault();
  hideMessage("#formError");

  try {
    ensureUnlocked();
    const rawName = $("#name").value.trim();
    const rawSecret = $("#secret").value.trim();
    if (!rawName) throw new Error("Introduce un nombre o descripción.");
    if (!rawSecret) throw new Error("Introduce el secreto TOTP.");

    const parsed = parseInput(rawSecret);
    await generateTotp(parsed.secret, parsed.period, parsed.digits, parsed.algorithm);
    if (state.pendingIcon?.type === "custom" && !state.pendingIcon.data) {
      throw new Error("Elige una imagen para el icono personalizado.");
    }

    const payload = {
      id: state.editingId || crypto.randomUUID(),
      name: rawName || parsed.label || "TOTP",
      secret: parsed.secret,
      period: parsed.period,
      digits: parsed.digits,
      algorithm: parsed.algorithm,
      issuer: parsed.issuer || "",
      icon: normalizeIconConfig(state.pendingIcon),
      createdAt: state.entries.find((e) => e.id === state.editingId)?.createdAt || Date.now()
    };

    if (state.editingId) {
      state.entries = state.entries.map((entry) => entry.id === state.editingId ? payload : entry);
    } else {
      state.entries.push(payload);
    }

    await persistVault();
    showAdd(false);
    render();
  } catch (err) {
    showMessage("#formError", err.message || "No se pudo guardar el TOTP.", "error");
  }
}

function closeCardMenus() {
  state.openMenuId = null;
  document.querySelectorAll(".card-menu").forEach((menu) => menu.classList.add("hidden"));
}

function toggleCardMenu(id, node) {
  const menu = node.querySelector(".card-menu");
  if (!menu) return;

  const willOpen = state.openMenuId !== id || menu.classList.contains("hidden");
  closeCardMenus();
  if (willOpen) {
    state.openMenuId = id;
    menu.classList.remove("hidden");
  }
}

async function deleteEntry(id) {
  ensureUnlocked();
  closeCardMenus();
  const entry = state.entries.find((e) => e.id === id);
  if (!entry) return;
  if (!confirm(`¿Eliminar "${entry.name}"?`)) return;

  state.entries = state.entries.filter((e) => e.id !== id);
  await persistVault();
  render();
}

async function persistVault() {
  ensureUnlocked();
  const data = await chrome.storage.local.get(STORAGE_VAULT);
  const current = data[STORAGE_VAULT];
  const salt = current?.salt ? base64ToBytes(current.salt) : crypto.getRandomValues(new Uint8Array(16));
  const iterations = current?.iterations || KDF_ITERATIONS;

  const meta = await encryptVault(state.entries, state.keyBytes, salt, iterations);
  await chrome.storage.local.set({ [STORAGE_VAULT]: meta });
  await touchSession();
}

async function copyEntry(entry, node) {
  try {
    ensureUnlocked();
    const { code } = await getCurrentCode(entry);
    await navigator.clipboard.writeText(code);
    await touchSession();
    showStatus(node, "Código copiado.", "ok");
  } catch (err) {
    showStatus(node, err.message || "No se pudo copiar.", "error");
  }
}

async function fillEntry(entry, node) {
  try {
    ensureUnlocked();
    const { code } = await getCurrentCode(entry);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) throw new Error("No se pudo acceder a la pestaña activa.");
    if (/^(chrome|edge|about|chrome-extension):/i.test(tab.url || "")) {
      throw new Error("Chrome no permite rellenar campos en páginas internas.");
    }

    let results;
    try {
      // Prueba el documento principal y todos los frames a los que activeTab
      // permita acceder. Esto cubre muchos portales que renderizan el MFA
      // dentro de un iframe.
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: fillDetectedTotp,
        args: [code]
      });
    } catch {
      // Algunos sitios no permiten inyectar en todos sus frames. En ese caso
      // reintentamos al menos sobre el documento principal.
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fillDetectedTotp,
        args: [code]
      });
    }

    const success = results?.find((item) => item?.result?.ok)?.result;
    if (success?.ok) {
      await touchSession();
      showStatus(node, success.message || "Código rellenado.", "ok");
      return;
    }

    const detail = results
      ?.map((item) => item?.result?.message)
      .find(Boolean);

    throw new Error(detail || "No encontré un campo TOTP/OTP reconocible.");
  } catch (err) {
    const msg = err?.message || "No se pudo rellenar.";
    if (/Cannot access|Missing host permission|permission/i.test(msg)) {
      showStatus(node, "La web bloquea el acceso al formulario o está en un iframe de otro dominio.", "error");
    } else {
      showStatus(node, msg, "error");
    }
  }
}

function fillDetectedTotp(code) {
  const OTP_RX = /(totp|\botp\b|2fa|mfa|one[\s_-]?time|verification|verify|authenticator|security[\s_-]?code|login[\s_-]?code|passcode|token|pin|c[oó]digo|verificaci[oó]n|autenticaci[oó]n|seguridad|clave[\s_-]?temporal)/i;

  function visible(el) {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return r.width > 0 && r.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      Number.parseFloat(style.opacity || "1") > 0 &&
      !el.disabled && !el.readOnly;
  }

  function collectInputs(root = document) {
    const out = [...root.querySelectorAll("input")];
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) out.push(...collectInputs(el.shadowRoot));
    }
    return out;
  }

  function attrs(el) {
    return [
      el.id, el.name, el.placeholder, el.autocomplete,
      el.getAttribute("aria-label"), el.getAttribute("aria-describedby"),
      el.getAttribute("data-testid"), el.getAttribute("data-test"),
      el.getAttribute("inputmode"), el.getAttribute("pattern"),
      el.getAttribute("title")
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function contextText(el) {
    const chunks = [attrs(el)];

    try {
      if (el.labels?.length) {
        chunks.push(...[...el.labels].map((label) => label.innerText || label.textContent || ""));
      }
    } catch {}

    const describedBy = (el.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter(Boolean);
    for (const id of describedBy) {
      const described = document.getElementById(id);
      if (described) chunks.push(described.innerText || described.textContent || "");
    }

    // El texto alrededor del campo suele ser mucho más útil que sus atributos
    // en portales corporativos: "Introduce el código de verificación", etc.
    let parent = el.parentElement;
    for (let i = 0; parent && i < 3; i++, parent = parent.parentElement) {
      const text = (parent.innerText || parent.textContent || "").trim();
      if (text && text.length < 900) chunks.push(text);
    }

    const form = el.closest("form");
    if (form) {
      const text = (form.innerText || form.textContent || "").trim();
      if (text && text.length < 1500) chunks.push(text);
    }

    return chunks.join(" ").replace(/\s+/g, " ").toLowerCase();
  }

  function isEditable(el) {
    if (!(el instanceof HTMLInputElement) || !visible(el)) return false;

    const type = (el.type || "text").toLowerCase();
    if (["hidden", "checkbox", "radio", "file", "submit", "button", "reset", "range", "color"].includes(type)) {
      return false;
    }

    // Algunos proveedores disfrazan el OTP como password.
    if (type === "password") {
      const max = Number.parseInt(el.maxLength, 10);
      return OTP_RX.test(contextText(el)) || (max >= 1 && max <= 8);
    }

    return ["text", "tel", "number", "search", "email", "password"].includes(type) || !type;
  }

  function score(el, eligibleInputs) {
    const a = attrs(el);
    const c = contextText(el);
    const type = (el.type || "text").toLowerCase();
    const max = Number.parseInt(el.maxLength, 10);
    let s = 0;

    if ((el.autocomplete || "").toLowerCase() === "one-time-code") s += 180;
    if (/\b(totp|otp|2fa|mfa)\b/i.test(a)) s += 120;
    if (OTP_RX.test(a)) s += 95;
    if (OTP_RX.test(c)) s += 65;

    if (/numeric|decimal|tel/.test(`${el.inputMode} ${type}`.toLowerCase())) s += 18;
    if (max >= 6 && max <= 8) s += 40;
    if (max === code.length) s += 35;
    if (/\d|0-9|[0-9]/.test(el.getAttribute("pattern") || "")) s += 10;
    if (el === document.activeElement) s += 35;
    if (el.closest('[role="dialog"], dialog, [aria-modal="true"]')) s += 15;

    // Si hay un solo campo editable en un formulario/modal que habla de
    // verificación, es muy probablemente el OTP aunque tenga atributos genéricos.
    const form = el.closest("form");
    if (form && OTP_RX.test((form.innerText || form.textContent || ""))) {
      const sameForm = eligibleInputs.filter((x) => x.form === form);
      if (sameForm.length === 1) s += 45;
    }

    if (type === "email" && !OTP_RX.test(c)) s -= 80;
    if (type === "search" && !OTP_RX.test(c)) s -= 60;

    return s;
  }

  function setNativeValue(el, value) {
    const previous = el.value;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

    // React mantiene un tracker propio; devolverle el valor anterior hace que
    // el evento input posterior sea interpretado como un cambio real.
    const tracker = el._valueTracker;
    if (tracker?.setValue) tracker.setValue(previous);

    if (descriptor?.set) descriptor.set.call(el, value);
    else el.value = value;

    try {
      el.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value
      }));
    } catch {}

    try {
      el.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value
      }));
    } catch {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    el.dispatchEvent(new Event("focus", { bubbles: true }));
  }

  const inputs = collectInputs().filter(isEditable);
  if (!inputs.length) {
    return { ok: false, message: "No hay campos OTP editables accesibles en este frame." };
  }

  // 1) OTP dividido en una casilla por dígito.
  const oneChar = inputs.filter((el) => {
    const max = Number.parseInt(el.maxLength, 10);
    const c = contextText(el);
    const numeric = /numeric|decimal|tel/.test(`${el.inputMode} ${el.type}`.toLowerCase());
    return max === 1 || ((max <= 1 || max === -1) && numeric && OTP_RX.test(c));
  });

  if (oneChar.length >= code.length) {
    const groups = [];
    for (let i = 0; i <= oneChar.length - code.length; i++) {
      const g = oneChar.slice(i, i + code.length);
      const rects = g.map((x) => x.getBoundingClientRect());
      const sameForm = g.every((x) => x.form === g[0].form);
      const sameParent = g.every((x) => x.parentElement === g[0].parentElement);
      const aligned = Math.max(...rects.map(r => r.top)) - Math.min(...rects.map(r => r.top)) < 90;
      const closeHorizontally = rects.every((r, idx) => idx === 0 || Math.abs(r.left - rects[idx - 1].right) < 140);
      const contextLooksOtp = g.some((x) => OTP_RX.test(contextText(x)));

      if (aligned && closeHorizontally && (sameForm || sameParent || contextLooksOtp)) {
        groups.push(g);
      }
    }

    if (groups.length) {
      const group = groups[0];
      group.forEach((el, i) => {
        el.focus();
        setNativeValue(el, code[i]);
      });
      group[group.length - 1].focus();
      return { ok: true, message: `Rellenadas ${group.length} casillas OTP.` };
    }
  }

  // 2) Campo único: puntuación por atributos + etiquetas + texto cercano.
  const ranked = inputs
    .map((el) => ({ el, score: score(el, inputs) }))
    .sort((a, b) => b.score - a.score);

  let target = ranked[0]?.score >= 28 ? ranked[0].el : null;

  // 3) Si solo queda un candidato razonable y parece numérico/corto, úsalo.
  if (!target && inputs.length === 1) {
    const only = inputs[0];
    const max = Number.parseInt(only.maxLength, 10);
    const numeric = /numeric|decimal|tel|number/.test(`${only.inputMode} ${only.type}`.toLowerCase());
    if (numeric || max === code.length || OTP_RX.test(contextText(only))) target = only;
  }

  // 4) Último recurso: elemento activo dentro de este frame.
  if (!target && isEditable(document.activeElement)) {
    target = document.activeElement;
  }

  if (!target) {
    // 5) Fallback universal: deja un selector de un solo uso en la página.
    // El usuario pulsa directamente el campo OTP y lo rellenamos sin depender
    // de nombres, labels o frameworks concretos.
    const PICKER_ID = "__totp_vault_picker__";
    const existing = document.getElementById(PICKER_ID);
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = PICKER_ID;
    banner.textContent = "TOTP Vault: haz clic en el campo del código para rellenarlo · Esc para cancelar";
    Object.assign(banner.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "14px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "10px 14px",
      borderRadius: "10px",
      background: "#111827",
      color: "#ffffff",
      border: "1px solid #3b82f6",
      boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      fontWeight: "600",
      pointerEvents: "none"
    });
    (document.documentElement || document.body).appendChild(banner);

    let done = false;

    const cleanup = () => {
      if (done) return;
      done = true;
      document.removeEventListener("click", chooseField, true);
      document.removeEventListener("keydown", cancelPicker, true);
      banner.remove();
    };

    const cancelPicker = (event) => {
      if (event.key === "Escape") cleanup();
    };

    const chooseField = (event) => {
      // Ignore synthetic clicks created by page JavaScript. Only a real user
      // interaction can complete the manual OTP-field selection fallback.
      if (!event.isTrusted) return;

      const clicked = event.target;
      const el = clicked instanceof HTMLInputElement
        ? clicked
        : clicked?.closest?.("input");

      if (!el || !isEditable(el)) return;

      const max = Number.parseInt(el.maxLength, 10);
      if (max === 1) {
        const scope = el.form || el.parentElement || document;
        const candidates = [...scope.querySelectorAll("input")]
          .filter((x) => isEditable(x) && Number.parseInt(x.maxLength, 10) === 1);
        const index = candidates.indexOf(el);
        const start = index >= 0 ? Math.max(0, Math.min(index, candidates.length - code.length)) : 0;
        const group = candidates.slice(start, start + code.length);

        if (group.length === code.length) {
          group.forEach((x, i) => {
            x.focus();
            setNativeValue(x, code[i]);
          });
          group[group.length - 1].focus();
          cleanup();
          return;
        }
      }

      el.focus();
      setNativeValue(el, code);
      el.focus();
      cleanup();
    };

    document.addEventListener("click", chooseField, true);
    document.addEventListener("keydown", cancelPicker, true);
    setTimeout(cleanup, 30000);

    return {
      ok: true,
      pending: true,
      message: "No lo detecté automáticamente. Haz clic ahora en el campo OTP de la web."
    };
  }

  target.focus();
  setNativeValue(target, code);
  target.focus();

  const fieldName =
    target.getAttribute("aria-label") ||
    target.placeholder ||
    target.name ||
    target.id ||
    "campo detectado";

  return { ok: true, message: `Rellenado en: ${fieldName}` };
}

async function exportEncryptedBackup() {
  try {
    ensureUnlocked();
    const data = await chrome.storage.local.get([STORAGE_VAULT, STORAGE_SETTINGS]);
    const backup = {
      format: "totp-vault-backup",
      version: VAULT_VERSION,
      exportedAt: new Date().toISOString(),
      vaultMeta: data[STORAGE_VAULT],
      settings: data[STORAGE_SETTINGS] || state.settings
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `totp-vault-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    await touchSession();
    showMessage("#settingsMessage", "Copia cifrada exportada.", "ok");
  } catch (err) {
    showMessage("#settingsMessage", err.message || "No se pudo exportar.", "error");
  }
}

async function importEncryptedBackup(file, fromSetup) {
  if (!file) return;

  const targetMessage = fromSetup ? "#setupError" : "#settingsMessage";

  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (backup?.format !== "totp-vault-backup" || !backup?.vaultMeta?.ciphertext) {
      throw new Error("El archivo no es una copia válida de TOTP Vault.");
    }
    if (Number(backup.version) > VAULT_VERSION) {
      throw new Error("La copia pertenece a una versión más nueva de la extensión.");
    }

    if (!fromSetup && !confirm("La importación sustituirá la bóveda actual. ¿Continuar?")) {
      return;
    }

    await chrome.storage.local.set({
      [STORAGE_VAULT]: backup.vaultMeta,
      [STORAGE_SETTINGS]: { ...DEFAULT_SETTINGS, ...(backup.settings || {}) }
    });

    await chrome.storage.session.remove(SESSION_KEY);
    state.keyBytes = null;
    state.entries = [];
    await loadSettings();

    if (fromSetup) $("#setupImportFile").value = "";
    else $("#importFile").value = "";

    switchView("unlockView");
    showMessage("#unlockError", "Copia importada. Desbloquéala con la contraseña de esa copia.", "ok");
  } catch (err) {
    showMessage(targetMessage, err.message || "No se pudo importar.", "error");
  }
}

async function handleChangePassword(event) {
  event.preventDefault();
  hideMessage("#changePasswordError");

  try {
    ensureUnlocked();
    const currentPassword = $("#currentPassword").value;
    const newPassword = $("#newPassword").value;
    const newPassword2 = $("#newPassword2").value;
    validateNewPassword(newPassword, newPassword2);

    const data = await chrome.storage.local.get(STORAGE_VAULT);
    const meta = data[STORAGE_VAULT];

    const oldSalt = base64ToBytes(meta.salt);
    const candidateOldKey = await deriveKeyBytes(
      currentPassword,
      oldSalt,
      meta.iterations || KDF_ITERATIONS
    );

    try {
      await decryptVault(meta, candidateOldKey);
    } catch {
      throw new Error("La contraseña actual no es correcta.");
    }

    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const newKeyBytes = await deriveKeyBytes(newPassword, newSalt, KDF_ITERATIONS);
    const newMeta = await encryptVault(state.entries, newKeyBytes, newSalt, KDF_ITERATIONS);

    state.keyBytes = newKeyBytes;
    await chrome.storage.local.set({ [STORAGE_VAULT]: newMeta });
    await cacheSessionKey(newKeyBytes);

    $("#changePasswordForm").reset();
    $("#changePasswordForm").classList.add("hidden");
    showMessage("#settingsMessage", "Contraseña maestra actualizada.", "ok");
  } catch (err) {
    showMessage("#changePasswordError", err.message || "No se pudo cambiar la contraseña.", "error");
  }
}

function validateNewPassword(p1, p2) {
  if (p1.length < 8) throw new Error("Usa una contraseña de al menos 8 caracteres.");
  if (p1 !== p2) throw new Error("Las contraseñas no coinciden.");
}

async function encryptVault(entries, keyBytes, saltBytes, iterations) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(keyBytes);
  const plaintext = new TextEncoder().encode(JSON.stringify(entries));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  return {
    version: VAULT_VERSION,
    cipher: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations,
    salt: bytesToBase64(saltBytes),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    updatedAt: Date.now()
  };
}

async function decryptVault(meta, keyBytes) {
  const key = await importAesKey(keyBytes);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(meta.iv) },
    key,
    base64ToBytes(meta.ciphertext)
  );

  const parsed = JSON.parse(new TextDecoder().decode(plaintext));
  if (!Array.isArray(parsed)) throw new Error("Formato de bóveda inválido.");
  return parsed;
}

async function deriveKeyBytes(password, saltBytes, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations
    },
    material,
    256
  );

  return new Uint8Array(bits);
}

async function importAesKey(keyBytes) {
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function parseInput(value) {
  if (/^otpauth:\/\/totp\//i.test(value)) {
    const url = new URL(value);
    const secret = normalizeBase32(url.searchParams.get("secret") || "");
    if (!secret) throw new Error("El enlace otpauth:// no contiene un secreto válido.");

    const digits = clampInt(url.searchParams.get("digits"), 6, 6, 8);
    const period = clampInt(url.searchParams.get("period"), 30, 5, 300);
    const algorithm = normalizeAlgorithm(url.searchParams.get("algorithm") || "SHA1");
    const label = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const issuer = url.searchParams.get("issuer") || "";

    return { secret, digits, period, algorithm, label, issuer };
  }

  return {
    secret: normalizeBase32(value),
    digits: 6,
    period: 30,
    algorithm: "SHA-1",
    label: "",
    issuer: ""
  };
}

function normalizeBase32(value) {
  const normalized = value
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/=+$/g, "");

  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) {
    throw new Error("El secreto debe estar en Base32 o ser un enlace otpauth:// válido.");
  }
  return normalized;
}

function normalizeAlgorithm(value) {
  const v = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (v === "SHA1") return "SHA-1";
  if (v === "SHA256") return "SHA-256";
  if (v === "SHA512") return "SHA-512";
  throw new Error(`Algoritmo TOTP no compatible: ${value}`);
}

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function render() {
  const list = $("#totpList");
  const empty = $("#emptyState");
  list.innerHTML = "";

  const query = state.filterQuery || "";
  const visibleEntries = state.entries.filter((entry) => {
    if (!query) return true;
    return `${entry.name || ""} ${entry.issuer || ""}`.toLowerCase().includes(query);
  });

  const hasAnyEntries = state.entries.length > 0;
  empty.classList.toggle("hidden", visibleEntries.length > 0 || !hasAnyEntries);

  if (hasAnyEntries && visibleEntries.length === 0) {
    empty.classList.remove("hidden");
    empty.querySelector("strong").textContent = "Sin coincidencias";
    empty.querySelector("span").textContent = "Prueba con otro texto de búsqueda.";
  } else {
    empty.querySelector("strong").textContent = "No hay TOTP guardados";
    empty.querySelector("span").textContent = "Pulsa + para añadir el primero.";
  }

  for (const entry of visibleEntries) {
    const node = $("#totpTemplate").content.firstElementChild.cloneNode(true);
    node.dataset.id = entry.id;
    node.querySelector(".card-title").textContent = entry.name;
    node.querySelector(".card-meta").textContent =
      entry.issuer || `${entry.digits} dígitos · ${entry.period}s`;
    const badge = node.querySelector(".card-badge");
    renderIconInto(badge, entry);

    node.querySelector(".menu-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCardMenu(entry.id, node);
    });
    node.querySelector(".edit-item").addEventListener("click", () => openEditEntry(entry.id));
    node.querySelector(".delete-item").addEventListener("click", () => deleteEntry(entry.id));
    node.querySelector(".copy-btn").addEventListener("click", () => copyEntry(entry, node));
    node.querySelector(".code-copy").addEventListener("click", () => copyEntry(entry, node));
    node.querySelector(".fill-btn").addEventListener("click", () => fillEntry(entry, node));

    list.appendChild(node);
  }

  updateVaultStatus();
  refreshCodes();
  queueMicrotask(updateListOverflowState);
}

async function refreshCodes() {
  if (!state.keyBytes) return;
  const cards = [...document.querySelectorAll(".totp-card")];

  await Promise.all(cards.map(async (card) => {
    const entry = state.entries.find((e) => e.id === card.dataset.id);
    if (!entry) return;

    try {
      const { code, remaining, fraction } = await getCurrentCode(entry);
      card.querySelector(".code").textContent = groupCode(code);
      card.querySelector(".seconds").textContent = remaining;

      const circumference = 2 * Math.PI * 15;
      card.querySelector(".timer-progress").style.strokeDashoffset =
        String(circumference * (1 - fraction));
    } catch {
      card.querySelector(".code").textContent = "ERROR";
    }
  }));
}

function groupCode(code) {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}

async function getCurrentCode(entry) {
  const period = entry.period || 30;
  const now = Math.floor(Date.now() / 1000);
  const remaining = period - (now % period);
  const code = await generateTotp(
    entry.secret,
    period,
    entry.digits || 6,
    entry.algorithm || "SHA-1",
    now
  );

  return {
    code,
    remaining,
    fraction: remaining / period
  };
}

async function generateTotp(secret, period = 30, digits = 6, algorithm = "SHA-1", unixTime = null) {
  const keyBytes = base32ToBytes(secret);
  const counter = Math.floor((unixTime ?? Math.floor(Date.now() / 1000)) / period);

  const counterBytes = new Uint8Array(8);
  let value = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: { name: algorithm } },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, counterBytes)
  );

  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  return String(binary % (10 ** digits)).padStart(digits, "0");
}

function base32ToBytes(base32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  const clean = normalizeBase32(base32);

  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("Secreto Base32 no válido.");
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  if (!bytes.length) throw new Error("Secreto Base32 demasiado corto.");
  return new Uint8Array(bytes);
}

function ensureUnlocked() {
  if (!state.keyBytes) throw new Error("La bóveda está bloqueada.");
}

function showStatus(node, message, type = "") {
  const el = node.querySelector(".status");
  el.textContent = message;
  el.className = `status ${type}`.trim();

  clearTimeout(el._clearTimer);
  el._clearTimer = setTimeout(() => {
    el.textContent = "";
    el.className = "status";
  }, 2800);
}

function showMessage(selector, message, type = "") {
  const el = $(selector);
  el.textContent = message;
  el.className = `message ${type}`.trim();
  el.classList.remove("hidden");
}

function hideMessage(selector) {
  const el = $(selector);
  el.textContent = "";
  el.className = "message hidden";
}
