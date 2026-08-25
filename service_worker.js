const STORAGE_VAULT = "vaultMeta";
const STORAGE_SETTINGS = "settings";
const SESSION_KEY = "vaultSession";
const INLINE_RECENT_KEY = "inlineRecent";
const INLINE_SCRIPT_ID = "totp-vault-inline-picker";

let inlineRegistrationTask = Promise.resolve();

const DEFAULT_SETTINGS = {
  autoLockMinutes: 5,
  inlinePickerMode: "off",
  inlineAllowedOrigins: [],
  showCodes: true,
  codeVisibilityOverrides: {}
};

const SERVICE_ICON_KEYS = new Set([
  "outlook", "microsoft", "google", "github", "aws", "azure",
  "cloudflare", "apple", "meta", "dropbox", "vpn", "generic"
]);

hardenStorageAccess();
refreshInlinePickerRegistration();

chrome.runtime.onInstalled.addListener(() => refreshInlinePickerRegistration());
chrome.runtime.onStartup.addListener(() => refreshInlinePickerRegistration());

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || sender.id !== chrome.runtime.id) return false;

  if (message.type === "totpVault:inline:refreshRegistration") {
    refreshInlinePickerRegistration()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "totpVault:inline:list") {
    listInlineEntries()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message || "No se pudo abrir la bóveda." }));
    return true;
  }

  if (message.type === "totpVault:inline:code") {
    getInlineCode(message.entryId)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message || "No se pudo generar el código." }));
    return true;
  }

  if (message.type === "totpVault:inline:openPopup") {
    openExtensionPopup()
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});

async function hardenStorageAccess() {
  const trustedOnly = { accessLevel: "TRUSTED_CONTEXTS" };
  try {
    const operations = [];
    if (chrome.storage?.local?.setAccessLevel) operations.push(chrome.storage.local.setAccessLevel(trustedOnly));
    if (chrome.storage?.session?.setAccessLevel) operations.push(chrome.storage.session.setAccessLevel(trustedOnly));
    await Promise.all(operations);
  } catch (error) {
    console.warn("TOTP Vault: no se pudo restringir storage a contextos de confianza", error);
  }
}

async function getSettings() {
  const data = await chrome.storage.local.get(STORAGE_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...(data[STORAGE_SETTINGS] || {}) };
  if (!Array.isArray(settings.inlineAllowedOrigins)) settings.inlineAllowedOrigins = [];
  if (typeof settings.showCodes !== "boolean") settings.showCodes = true;
  if (!settings.codeVisibilityOverrides || typeof settings.codeVisibilityOverrides !== "object" || Array.isArray(settings.codeVisibilityOverrides)) {
    settings.codeVisibilityOverrides = {};
  }
  return settings;
}

function validOrigin(origin) {
  try {
    const url = new URL(origin);
    return /^https?:$/.test(url.protocol) && url.origin === origin;
  } catch {
    return false;
  }
}

function refreshInlinePickerRegistration() {
  // Several service-worker lifecycle events can fire almost at the same time
  // (initial evaluation, onInstalled/onStartup and settings refresh). Serialize
  // registration changes so two calls can never register the same script ID.
  inlineRegistrationTask = inlineRegistrationTask
    .catch(() => {})
    .then(syncInlinePickerRegistration);
  return inlineRegistrationTask;
}

async function syncInlinePickerRegistration() {
  const settings = await getSettings();
  const mode = settings.inlinePickerMode || "off";
  let matches = [];

  if (mode === "all") {
    const all = ["http://*/*", "https://*/*"];
    if (await chrome.permissions.contains({ origins: all })) matches = all;
  } else if (mode === "site") {
    for (const origin of settings.inlineAllowedOrigins) {
      if (!validOrigin(origin)) continue;
      const pattern = `${origin}/*`;
      try {
        if (await chrome.permissions.contains({ origins: [pattern] })) matches.push(pattern);
      } catch {}
    }
  }

  matches = [...new Set(matches)];

  let registered = [];
  try {
    registered = await chrome.scripting.getRegisteredContentScripts({ ids: [INLINE_SCRIPT_ID] });
  } catch {}
  const exists = registered.some((script) => script.id === INLINE_SCRIPT_ID);

  if (!matches.length) {
    if (exists) {
      try {
        await chrome.scripting.unregisterContentScripts({ ids: [INLINE_SCRIPT_ID] });
      } catch (error) {
        console.warn("TOTP Vault: no se pudo retirar el selector inline", error);
      }
    }
    return;
  }

  const definition = {
    id: INLINE_SCRIPT_ID,
    matches,
    js: ["content.js"],
    runAt: "document_idle",
    allFrames: true,
    persistAcrossSessions: true
  };

  if (exists) {
    await chrome.scripting.updateContentScripts([definition]);
  } else {
    try {
      await chrome.scripting.registerContentScripts([definition]);
    } catch (error) {
      // A previous worker instance can finish registration between the lookup
      // and register call. In that rare race, update the existing definition.
      if (/Duplicate script ID/i.test(String(error?.message || error))) {
        await chrome.scripting.updateContentScripts([definition]);
      } else {
        throw error;
      }
    }
  }
}

async function getUnlockedEntries() {
  const [{ [STORAGE_VAULT]: meta, [STORAGE_SETTINGS]: rawSettings }, { [SESSION_KEY]: session }] = await Promise.all([
    chrome.storage.local.get([STORAGE_VAULT, STORAGE_SETTINGS]),
    chrome.storage.session.get(SESSION_KEY)
  ]);

  const settings = { ...DEFAULT_SETTINGS, ...(rawSettings || {}) };
  if (typeof settings.showCodes !== "boolean") settings.showCodes = true;
  if (!settings.codeVisibilityOverrides || typeof settings.codeVisibilityOverrides !== "object" || Array.isArray(settings.codeVisibilityOverrides)) {
    settings.codeVisibilityOverrides = {};
  }
  if (!meta || !session?.keyB64) return { locked: true, entries: [], settings };

  const minutes = Number(settings.autoLockMinutes);
  if (minutes !== 0) {
    const timeoutMs = Math.max(1, Number.isFinite(minutes) ? minutes : 5) * 60_000;
    if (Date.now() - Number(session.lastActivity || 0) > timeoutMs) {
      await chrome.storage.session.remove(SESSION_KEY);
      return { locked: true, entries: [], settings };
    }
  }

  try {
    const keyBytes = base64ToBytes(session.keyB64);
    const entries = await decryptVault(meta, keyBytes);
    return { locked: false, entries, settings, keyBytes };
  } catch {
    await chrome.storage.session.remove(SESSION_KEY);
    return { locked: true, entries: [], settings };
  }
}

async function touchSession() {
  const data = await chrome.storage.session.get(SESSION_KEY);
  const session = data[SESSION_KEY];
  if (!session?.keyB64) return;
  await chrome.storage.session.set({
    [SESSION_KEY]: { ...session, lastActivity: Date.now() }
  });
}

function isCodeVisibleForSettings(settings, entryId) {
  const overrides = settings?.codeVisibilityOverrides || {};
  if (typeof overrides[entryId] === "boolean") return overrides[entryId];
  return settings?.showCodes !== false;
}

function maskedCodeForDigits(digits) {
  return Number(digits) === 8 ? "•••• ••••" : "••• •••";
}

async function listInlineEntries() {
  const vault = await getUnlockedEntries();
  if (vault.locked) return { ok: true, locked: true, entries: [] };

  const recentData = await chrome.storage.local.get(INLINE_RECENT_KEY);
  const recent = recentData[INLINE_RECENT_KEY] || {};
  const entries = [...vault.entries].sort((a, b) => Number(recent[b.id] || 0) - Number(recent[a.id] || 0));

  const result = [];
  for (const entry of entries) {
    try {
      const current = await getCurrentCode(entry);
      const codeVisible = isCodeVisibleForSettings(vault.settings, entry.id);
      result.push({
        id: entry.id,
        name: entry.name || "TOTP",
        issuer: entry.issuer || "",
        code: codeVisible ? current.code : maskedCodeForDigits(entry.digits || 6),
        codeVisible,
        remaining: current.remaining,
        period: entry.period || 30,
        icon: publicIcon(entry)
      });
    } catch {
      const codeVisible = isCodeVisibleForSettings(vault.settings, entry.id);
      result.push({
        id: entry.id,
        name: entry.name || "TOTP",
        issuer: entry.issuer || "",
        code: codeVisible ? "------" : maskedCodeForDigits(entry.digits || 6),
        codeVisible,
        remaining: 0,
        period: entry.period || 30,
        icon: publicIcon(entry)
      });
    }
  }

  await touchSession();
  return { ok: true, locked: false, entries: result, now: Date.now() };
}

async function getInlineCode(entryId) {
  const vault = await getUnlockedEntries();
  if (vault.locked) return { ok: false, locked: true, error: "La bóveda está bloqueada." };

  const entry = vault.entries.find((item) => item.id === entryId);
  if (!entry) return { ok: false, error: "La cuenta TOTP ya no existe." };

  const current = await getCurrentCode(entry);
  const recentData = await chrome.storage.local.get(INLINE_RECENT_KEY);
  const recent = recentData[INLINE_RECENT_KEY] || {};
  recent[entry.id] = Date.now();
  const keys = Object.keys(recent).sort((a, b) => Number(recent[b]) - Number(recent[a])).slice(0, 100);
  const trimmed = Object.fromEntries(keys.map((key) => [key, recent[key]]));
  await chrome.storage.local.set({ [INLINE_RECENT_KEY]: trimmed });
  await touchSession();

  return {
    ok: true,
    id: entry.id,
    name: entry.name || "TOTP",
    code: current.code,
    remaining: current.remaining,
    period: entry.period || 30
  };
}

async function openExtensionPopup() {
  if (chrome.action?.openPopup) {
    try {
      await chrome.action.openPopup();
      return true;
    } catch {}
  }
  return false;
}

function publicIcon(entry) {
  const icon = normalizeIconConfig(entry?.icon);
  if (icon.type === "custom") return icon;
  if (icon.type === "builtin") return icon;
  const detected = detectBuiltinIcon(entry);
  if (detected) return { type: "builtin", key: detected };
  return { type: "fallback", text: getFallbackInitials(entry) };
}

function normalizeIconConfig(icon) {
  if (!icon || icon.type === "auto") return { type: "auto" };
  if (icon.type === "builtin" && SERVICE_ICON_KEYS.has(icon.key)) return { type: "builtin", key: icon.key };
  if (icon.type === "custom" && typeof icon.data === "string" && icon.data.startsWith("data:image/")) {
    return { type: "custom", data: icon.data };
  }
  return { type: "auto" };
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

async function decryptVault(meta, keyBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(meta.iv) },
    key,
    base64ToBytes(meta.ciphertext)
  );
  const parsed = JSON.parse(new TextDecoder().decode(plaintext));
  if (!Array.isArray(parsed)) throw new Error("Formato de bóveda inválido.");
  return parsed;
}

function base64ToBytes(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function getCurrentCode(entry) {
  const period = entry.period || 30;
  const now = Math.floor(Date.now() / 1000);
  const remaining = period - (now % period);
  const code = await generateTotp(entry.secret, period, entry.digits || 6, entry.algorithm || "SHA-1", now);
  return { code, remaining };
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
    "raw", keyBytes, { name: "HMAC", hash: { name: algorithm } }, false, ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, counterBytes));
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
  for (const char of String(base32 || "").toUpperCase().replace(/[\s=-]/g, "")) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("Secreto Base32 inválido.");
    bits += value.toString(2).padStart(5, "0");
  }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(out);
}
