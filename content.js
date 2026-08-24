(() => {
  if (globalThis.__TOTP_VAULT_INLINE_PICKER__) return;
  globalThis.__TOTP_VAULT_INLINE_PICKER__ = true;

  const OTP_RX = /(totp|\botp\b|2fa|mfa|one[\s_-]?time|verification|verify|authenticator|security[\s_-]?code|login[\s_-]?code|passcode|token|pin|c[oó]digo|verificaci[oó]n|autenticaci[oó]n|seguridad|clave[\s_-]?temporal)/i;
  const SERVICE_ICON_KEYS = new Set(["outlook", "microsoft", "google", "github", "aws", "azure", "cloudflare", "apple", "meta", "dropbox", "vpn", "generic"]);
  const HOST_ATTR = "data-totp-vault-inline";

  let currentTarget = null;
  let host = null;
  let shadow = null;
  let button = null;
  let panel = null;
  let searchInput = null;
  let listNode = null;
  let messageNode = null;
  let currentEntries = [];
  let menuOpenedAt = 0;
  let countdownTimer = null;
  let refreshInFlight = false;
  let scanTimer = null;

  const css = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .tv-button {
      width: 30px; height: 30px; border: 1px solid rgba(200,223,226,.26); border-radius: 10px;
      background: rgba(104,131,145,.18); color: rgba(14,23,28,.78); display: grid; place-items: center; cursor: pointer;
      padding: 0; font-family: system-ui, sans-serif; opacity: .68; transition: background .16s ease, border-color .16s ease, color .16s ease, opacity .16s ease, outline-color .16s ease;
      backdrop-filter: blur(1.5px);
    }
    .tv-button:hover, .tv-button:focus-visible, .tv-button.is-open { opacity: 1; background: #375261; color: #eaffff; border-color: rgba(200,223,226,.50); outline: 2px solid rgba(200,223,226,.28); outline-offset: 1px; }
    .tv-button svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; }
    .tv-panel {
      position: absolute; top: 36px; right: 0; width: min(326px, calc(100vw - 20px)); max-height: min(420px, calc(100vh - 70px));
      display: flex; flex-direction: column; overflow: hidden; border-radius: 18px; border: 1px solid rgba(200,223,226,.35);
      background: #2e4957; color: #eaffff; font: 13px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .tv-panel[hidden] { display: none; }
    .tv-head { padding: 12px 12px 8px; border-bottom: 1px solid rgba(200,223,226,.16); }
    .tv-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
    .tv-title strong { font-size: 13px; font-weight: 750; }
    .tv-close { border:0; background:transparent; color:#c8dfe2; cursor:pointer; font-size:18px; line-height:1; padding:2px 5px; border-radius:8px; }
    .tv-close:hover { background: rgba(234,255,255,.08); }
    .tv-search { width:100%; border:1px solid rgba(200,223,226,.28); border-radius:12px; background:#375261; color:#eaffff; padding:8px 10px; outline:none; font:inherit; }
    .tv-search::placeholder { color:#a7bfc7; }
    .tv-search:focus { border-color:#c8dfe2; outline:2px solid rgba(200,223,226,.14); }
    .tv-list { overflow:auto; padding:7px; scrollbar-width:thin; scrollbar-color:#87a1ab transparent; }
    .tv-list::-webkit-scrollbar { width:7px; }
    .tv-list::-webkit-scrollbar-track { background:transparent; }
    .tv-list::-webkit-scrollbar-thumb { background:#87a1ab; border-radius:999px; border:2px solid #2e4957; }
    .tv-row { width:100%; border:0; border-radius:13px; background:transparent; color:inherit; display:grid; grid-template-columns:38px minmax(0,1fr) auto; gap:9px; align-items:center; padding:8px; cursor:pointer; text-align:left; font:inherit; }
    .tv-row:hover, .tv-row:focus-visible { background:#375261; outline:none; }
    .tv-icon { width:38px; height:38px; border-radius:11px; display:grid; place-items:center; overflow:hidden; background:#415c6b; border:1px solid rgba(200,223,226,.18); color:#eaffff; font-weight:800; font-size:11px; }
    .tv-icon img { width:100%; height:100%; object-fit:contain; display:block; }
    .tv-icon.custom img { object-fit:cover; }
    .tv-copy { min-width:0; }
    .tv-name { font-weight:750; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .tv-meta { color:#c8dfe2; font-size:10px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .tv-code { text-align:right; font:750 15px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing:.055em; color:#eaffff; white-space:nowrap; }
    .tv-seconds { display:block; margin-top:5px; color:#a7bfc7; font:700 9px/1 system-ui,sans-serif; }
    .tv-empty { padding:18px 14px; text-align:center; color:#c8dfe2; }
    .tv-locked { padding:15px; text-align:center; color:#c8dfe2; }
    .tv-locked strong { color:#eaffff; display:block; margin-bottom:5px; }
    .tv-open { margin-top:10px; border:1px solid rgba(200,223,226,.32); border-radius:11px; background:#415c6b; color:#eaffff; padding:8px 10px; cursor:pointer; font:700 12px system-ui,sans-serif; }
    .tv-open:hover { background:#4a6675; }
    .tv-toast { position:absolute; top:36px; right:0; min-width:210px; max-width:300px; padding:9px 11px; border-radius:12px; background:#375261; color:#eaffff; border:1px solid rgba(200,223,226,.3); font:600 12px/1.3 system-ui,sans-serif; }
  `;

  function isVisible(el) {
    if (!(el instanceof HTMLInputElement) || el.disabled || el.readOnly) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0;
  }

  function attrs(el) {
    return [
      el.id, el.name, el.placeholder, el.autocomplete,
      el.getAttribute("aria-label"), el.getAttribute("aria-describedby"),
      el.getAttribute("data-testid"), el.getAttribute("data-test"),
      el.getAttribute("inputmode"), el.getAttribute("pattern"), el.getAttribute("title")
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function contextText(el) {
    const chunks = [attrs(el)];
    try {
      if (el.labels?.length) chunks.push(...[...el.labels].map((label) => label.innerText || label.textContent || ""));
    } catch {}
    let parent = el.parentElement;
    for (let i = 0; parent && i < 2; i++, parent = parent.parentElement) {
      const text = (parent.innerText || parent.textContent || "").trim();
      if (text && text.length < 700) chunks.push(text);
    }
    const form = el.closest("form");
    if (form) {
      const text = (form.innerText || form.textContent || "").trim();
      if (text && text.length < 1200) chunks.push(text);
    }
    return chunks.join(" ").replace(/\s+/g, " ").toLowerCase();
  }

  function editableInput(el) {
    if (!(el instanceof HTMLInputElement) || !isVisible(el)) return false;
    const type = (el.type || "text").toLowerCase();

    // v2.8.3: prueba de detección más estricta.
    // Ignoramos por completo los input type="text" (incluido type omitido,
    // que el navegador normaliza como "text") para reducir falsos positivos.
    if (type === "text") return false;

    return !["hidden", "checkbox", "radio", "file", "submit", "button", "reset", "range", "color"].includes(type);
  }

  function scoreInput(el) {
    if (!editableInput(el)) return -999;
    const a = attrs(el);
    const c = contextText(el);
    const type = (el.type || "text").toLowerCase();
    const max = Number.parseInt(el.maxLength, 10);
    const numeric = /numeric|decimal|tel|number/.test(`${el.inputMode} ${type}`.toLowerCase());
    let score = 0;

    if ((el.autocomplete || "").toLowerCase() === "one-time-code") score += 220;
    if (/\b(totp|otp|2fa|mfa)\b/i.test(a)) score += 130;
    if (OTP_RX.test(a)) score += 100;
    if (OTP_RX.test(c)) score += 65;
    if (numeric) score += 15;
    if (max === 6 || max === 8) score += 38;
    if (max === 1 && numeric) score += 28;
    if (/\d|0-9|[0-9]/.test(el.getAttribute("pattern") || "")) score += 8;
    if (type === "password" && OTP_RX.test(c)) score += 15;
    if (type === "email" || type === "search") score -= 80;
    return score;
  }

  function findDigitGroup(input) {
    const max = Number.parseInt(input.maxLength, 10);
    if (max !== 1) return null;
    const scope = input.form || input.parentElement || document;
    const candidates = [...scope.querySelectorAll("input")]
      .filter((el) => editableInput(el) && Number.parseInt(el.maxLength, 10) === 1)
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const base = input.getBoundingClientRect();
        return Math.abs(rect.top - base.top) < 90;
      });
    if (candidates.length < 6) return null;
    const index = candidates.indexOf(input);
    if (index < 0) return null;
    for (const length of [6, 8]) {
      if (candidates.length < length) continue;
      const start = Math.max(0, Math.min(index, candidates.length - length));
      const group = candidates.slice(start, start + length);
      if (group.includes(input)) return group;
    }
    return null;
  }

  function targetForInput(input) {
    const score = scoreInput(input);
    const group = findDigitGroup(input);
    if (group && (score >= 35 || group.some((el) => OTP_RX.test(contextText(el))))) {
      return { kind: "group", inputs: group, anchor: group[group.length - 1], score: Math.max(score, 70) };
    }
    if (score >= 52) return { kind: "single", inputs: [input], anchor: input, score };
    return null;
  }

  function findBestTarget() {
    const inputs = [...document.querySelectorAll("input")];
    let best = null;
    for (const input of inputs) {
      const target = targetForInput(input);
      if (target && (!best || target.score > best.score)) best = target;
    }
    return best;
  }

  function sameTarget(a, b) {
    if (!a || !b || a.kind !== b.kind || a.inputs.length !== b.inputs.length) return false;
    return a.inputs.every((input, index) => input === b.inputs[index]);
  }

  function setCurrentTarget(target) {
    if (!target || !target.anchor?.isConnected || !isVisible(target.anchor)) {
      removeAssistant();
      return;
    }
    if (sameTarget(currentTarget, target) && host?.isConnected) {
      updatePosition();
      return;
    }
    currentTarget = target;
    mountAssistant();
    updatePosition();
  }

  function mountAssistant() {
    if (host) host.remove();
    stopCountdown();
    host = document.createElement("div");
    host.setAttribute(HOST_ATTR, "");
    Object.assign(host.style, {
      position: "fixed", width: "30px", height: "30px", zIndex: "2147483647",
      pointerEvents: "none", margin: "0", padding: "0"
    });
    shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>${css}</style>
      <button class="tv-button" type="button" title="Elegir TOTP" aria-label="Elegir TOTP">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5.2-3.1 9.1-8 11-4.9-1.9-8-5.8-8-11V5Z"/><path d="M9 11V9a3 3 0 0 1 6 0v2"/><rect x="8" y="11" width="8" height="6" rx="2"/></svg>
      </button>
      <div class="tv-panel" hidden>
        <div class="tv-head">
          <div class="tv-title"><strong>TOTP Vault</strong><button class="tv-close" type="button" aria-label="Cerrar">×</button></div>
          <input class="tv-search" type="search" placeholder="Buscar cuenta…" autocomplete="off">
        </div>
        <div class="tv-list"></div>
      </div>
      <div class="tv-toast" hidden></div>
    `;
    button = shadow.querySelector(".tv-button");
    panel = shadow.querySelector(".tv-panel");
    searchInput = shadow.querySelector(".tv-search");
    listNode = shadow.querySelector(".tv-list");
    messageNode = shadow.querySelector(".tv-toast");
    button.style.pointerEvents = "auto";
    panel.style.pointerEvents = "auto";

    button.addEventListener("click", async (event) => {
      if (!event.isTrusted) return;
      event.preventDefault();
      event.stopPropagation();
      if (!panel.hidden) {
        closeMenu();
        return;
      }
      await openMenu();
    });
    shadow.querySelector(".tv-close").addEventListener("click", (event) => {
      if (!event.isTrusted) return;
      closeMenu();
    });
    searchInput.addEventListener("input", () => renderEntries(searchInput.value));
    (document.documentElement || document.body).appendChild(host);
  }

  function updatePosition() {
    if (!host || !currentTarget?.anchor?.isConnected) return;
    const rect = currentTarget.anchor.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) {
      host.style.display = "none";
      return;
    }
    host.style.display = "block";
    const outsideLeft = rect.right + 6;
    const left = outsideLeft + 30 <= innerWidth - 6 ? outsideLeft : Math.max(6, rect.right - 36);
    const top = Math.max(6, Math.min(innerHeight - 36, rect.top + (rect.height - 30) / 2));
    host.style.left = `${Math.round(left)}px`;
    host.style.top = `${Math.round(top)}px`;
  }

  async function openMenu() {
    if (!panel || !listNode) return;
    panel.hidden = false;
    button?.classList.add("is-open");
    listNode.innerHTML = '<div class="tv-empty">Cargando…</div>';
    searchInput.value = "";
    menuOpenedAt = Date.now();
    updatePosition();

    try {
      const response = await chrome.runtime.sendMessage({ type: "totpVault:inline:list" });
      if (!response?.ok) throw new Error(response?.error || "No se pudo leer la bóveda.");
      if (response.locked) {
        renderLocked();
        return;
      }
      currentEntries = response.entries || [];
      renderEntries("");
      startCountdown();
      setTimeout(() => searchInput?.focus(), 0);
    } catch (error) {
      listNode.innerHTML = `<div class="tv-empty">${escapeHtml(error.message || "No se pudo abrir TOTP Vault.")}</div>`;
    }
  }

  function renderLocked() {
    stopCountdown();
    listNode.innerHTML = `
      <div class="tv-locked">
        <strong>Bóveda bloqueada</strong>
        Desbloquea TOTP Vault para elegir una cuenta.
        <br><button class="tv-open" type="button">Abrir TOTP Vault</button>
      </div>`;
    const openButton = listNode.querySelector(".tv-open");
    openButton.addEventListener("click", async (event) => {
      if (!event.isTrusted) return;
      const response = await chrome.runtime.sendMessage({ type: "totpVault:inline:openPopup" });
      if (!response?.ok) showToast("Abre TOTP Vault desde el icono de Chrome.");
    });
  }

  function renderEntries(query) {
    if (!listNode) return;
    const q = String(query || "").trim().toLowerCase();
    const entries = currentEntries.filter((entry) => !q || `${entry.name} ${entry.issuer}`.toLowerCase().includes(q));
    listNode.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "tv-empty";
      empty.textContent = currentEntries.length ? "Sin coincidencias." : "No hay TOTP guardados.";
      listNode.appendChild(empty);
      return;
    }

    for (const entry of entries) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "tv-row";
      row.dataset.id = entry.id;

      const icon = document.createElement("span");
      icon.className = "tv-icon";
      renderIcon(icon, entry.icon);

      const copy = document.createElement("span");
      copy.className = "tv-copy";
      const name = document.createElement("span");
      name.className = "tv-name";
      name.textContent = entry.name || "TOTP";
      const meta = document.createElement("span");
      meta.className = "tv-meta";
      meta.textContent = entry.issuer || "TOTP";
      copy.append(name, meta);

      const code = document.createElement("span");
      code.className = "tv-code";
      const codeText = document.createElement("span");
      codeText.textContent = groupCode(entry.code || "------");
      const seconds = document.createElement("span");
      seconds.className = "tv-seconds";
      seconds.dataset.expiresAt = String(Date.now() + Number(entry.remaining || 0) * 1000);
      seconds.dataset.period = String(entry.period || 30);
      seconds.textContent = `${entry.remaining || 0}s`;
      code.append(codeText, seconds);

      row.append(icon, copy, code);
      row.addEventListener("click", async (event) => {
        if (!event.isTrusted) return;
        await chooseEntry(entry.id, entry.name || "TOTP");
      });
      listNode.appendChild(row);
    }
  }

  function renderIcon(container, icon) {
    container.replaceChildren();
    if (icon?.type === "custom" && typeof icon.data === "string") {
      container.classList.add("custom");
      const img = document.createElement("img");
      img.src = icon.data;
      img.alt = "";
      container.appendChild(img);
      return;
    }
    if (icon?.type === "builtin" && SERVICE_ICON_KEYS.has(icon.key)) {
      const img = document.createElement("img");
      img.src = chrome.runtime.getURL(`icons/services/${icon.key}.svg`);
      img.alt = "";
      container.appendChild(img);
      return;
    }
    container.textContent = icon?.text || "T";
  }

  async function chooseEntry(id, name) {
    try {
      const response = await chrome.runtime.sendMessage({ type: "totpVault:inline:code", entryId: id });
      if (!response?.ok) {
        if (response?.locked) renderLocked();
        else throw new Error(response?.error || "No se pudo generar el código.");
        return;
      }
      fillTarget(response.code);
      closeMenu();
      showToast(`Rellenado: ${name}`);
    } catch (error) {
      showToast(error.message || "No se pudo rellenar el código.");
    }
  }

  function setNativeValue(el, value) {
    const previous = el.value;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    const tracker = el._valueTracker;
    if (tracker?.setValue) tracker.setValue(previous);
    if (descriptor?.set) descriptor.set.call(el, value);
    else el.value = value;
    try {
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    } catch {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillTarget(code) {
    if (!currentTarget) return;
    if (currentTarget.kind === "group" && currentTarget.inputs.length >= code.length) {
      currentTarget.inputs.slice(0, code.length).forEach((input, index) => {
        input.focus();
        setNativeValue(input, code[index]);
      });
      currentTarget.inputs[Math.min(code.length, currentTarget.inputs.length) - 1]?.focus();
      return;
    }
    const input = currentTarget.inputs[0];
    if (!input) return;
    input.focus();
    setNativeValue(input, code);
    input.focus();
  }

  function closeMenu() {
    if (panel) panel.hidden = true;
    button?.classList.remove("is-open");
    stopCountdown();
  }

  function showToast(text) {
    if (!messageNode) return;
    messageNode.textContent = text;
    messageNode.hidden = false;
    setTimeout(() => { if (messageNode) messageNode.hidden = true; }, 1800);
  }

  function startCountdown() {
    stopCountdown();
    countdownTimer = setInterval(async () => {
      if (!panel || panel.hidden) return;
      let expired = false;
      for (const node of shadow.querySelectorAll(".tv-seconds")) {
        const remaining = Math.max(0, Math.ceil((Number(node.dataset.expiresAt || 0) - Date.now()) / 1000));
        node.textContent = `${remaining}s`;
        if (remaining <= 0) expired = true;
      }
      if (expired && !refreshInFlight && Date.now() - menuOpenedAt > 800) {
        refreshInFlight = true;
        try {
          const response = await chrome.runtime.sendMessage({ type: "totpVault:inline:list" });
          if (response?.ok && !response.locked) {
            currentEntries = response.entries || [];
            menuOpenedAt = Date.now();
            renderEntries(searchInput?.value || "");
          }
        } finally {
          refreshInFlight = false;
        }
      }
    }, 500);
  }

  function stopCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
  }

  function groupCode(code) {
    const value = String(code || "");
    if (value.length === 6) return `${value.slice(0,3)} ${value.slice(3)}`;
    if (value.length === 8) return `${value.slice(0,4)} ${value.slice(4)}`;
    return value;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[char]));
  }

  function removeAssistant() {
    stopCountdown();
    if (host) host.remove();
    host = shadow = button = panel = searchInput = listNode = messageNode = null;
    currentTarget = null;
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      if (currentTarget?.anchor?.isConnected && isVisible(currentTarget.anchor)) {
        updatePosition();
        return;
      }
      const active = document.activeElement instanceof HTMLInputElement ? targetForInput(document.activeElement) : null;
      setCurrentTarget(active || findBestTarget());
    }, 120);
  }

  document.addEventListener("focusin", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    const target = targetForInput(event.target);
    if (target) setCurrentTarget(target);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel && !panel.hidden) closeMenu();
  }, true);

  window.addEventListener("scroll", updatePosition, true);
  window.addEventListener("resize", updatePosition, { passive: true });

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "disabled", "readonly"] });

  scheduleScan();
})();
