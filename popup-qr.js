/* QR import helpers. Images are decoded locally; only direct image URLs are fetched. */
(() => {
  const MAX_QR_IMAGE_BYTES = 12 * 1024 * 1024;
  let pasteArmed = false;
  let busy = false;

  const byId = (id) => document.getElementById(id);

  function setBusy(next) {
    busy = next;
    for (const id of ["qrPageBtn", "qrFileBtn", "qrPasteBtn", "qrUrlBtn"]) {
      const button = byId(id);
      if (button) button.disabled = next;
    }
    byId("qrPanel")?.setAttribute("aria-busy", String(next));
  }

  function qrMessage(message, type = "") {
    showMessage("#qrMessage", message, type);
  }

  function clearQrState() {
    pasteArmed = false;
    byId("qrPasteHint")?.classList.add("hidden");
    hideMessage("#qrMessage");
    const file = byId("qrFileInput");
    if (file) file.value = "";
  }

  function showQrPanel(open) {
    const panel = byId("qrPanel");
    if (!panel) return;
    panel.classList.toggle("hidden", !open);
    if (open) {
      byId("addPanel")?.classList.add("hidden");
      byId("settingsPanel")?.classList.add("hidden");
      clearQrState();
      panel.scrollTop = 0;
      setTimeout(() => byId("qrPageBtn")?.focus(), 0);
    } else {
      clearQrState();
    }
    touchSession();
  }

  function isTotpPayload(value) {
    return /^otpauth:\/\/totp\//i.test(String(value || "").trim());
  }

  function parseQrPayload(value) {
    const raw = String(value || "").trim();
    if (/^otpauth-migration:\/\//i.test(raw)) {
      throw new Error("Este QR es una exportación de Google Authenticator. Ese formato se añadirá en una versión posterior.");
    }
    if (!isTotpPayload(raw)) {
      throw new Error("El QR encontrado no contiene una cuenta TOTP compatible.");
    }
    return { raw, parsed: parseInput(raw) };
  }

  function suggestedName(parsed) {
    const issuer = String(parsed.issuer || "").trim();
    let label = String(parsed.label || "").trim();
    if (issuer && label.toLowerCase().startsWith((issuer + ":").toLowerCase())) {
      label = label.slice(issuer.length + 1).trim();
      return label ? `${issuer} · ${label}` : issuer;
    }
    return label || issuer || "TOTP";
  }

  function reviewPayload(value, sourceLabel) {
    const { raw, parsed } = parseQrPayload(value);
    resetAddForm();
    byId("name").value = suggestedName(parsed);
    byId("secret").value = raw;
    state.pendingIcon = { type: "auto" };
    updateIconPickerUi();
    showQrPanel(false);
    showAdd(true);
    showMessage("#formError", `QR leído desde ${sourceLabel}. Revisa los datos y pulsa Guardar para añadirlo.`, "ok");
  }

  function dimensions(source) {
    return {
      width: Number(source.naturalWidth || source.videoWidth || source.width || 0),
      height: Number(source.naturalHeight || source.videoHeight || source.height || 0)
    };
  }

  async function decodeWithNative(source) {
    if (!("BarcodeDetector" in globalThis)) return [];
    try {
      if (typeof BarcodeDetector.getSupportedFormats === "function") {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (!formats.includes("qr_code")) return [];
      }
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const found = await detector.detect(source);
      return found.map((item) => String(item.rawValue || "").trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function decodeWithJsQr(source) {
    if (typeof jsQR !== "function") throw new Error("El lector QR local no está disponible.");
    const { width, height } = dimensions(source);
    if (!width || !height) throw new Error("No se pudo leer el tamaño de la imagen.");

    const maxSide = 4096;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("No se pudo analizar la imagen.");

    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
    return code?.data ? String(code.data).trim() : "";
  }

  async function decodeImageSource(source) {
    const nativeValues = await decodeWithNative(source);
    const compatible = nativeValues.find(isTotpPayload);
    if (compatible) return compatible;

    const fallback = decodeWithJsQr(source);
    if (fallback) return fallback;

    if (nativeValues.length) {
      throw new Error("Se encontró un QR, pero no contiene una cuenta TOTP compatible.");
    }
    throw new Error("No se encontró ningún código QR legible en la imagen.");
  }

  async function decodeImageBlob(blob) {
    if (!blob) throw new Error("No se recibió ninguna imagen.");
    if (blob.size > MAX_QR_IMAGE_BYTES) throw new Error("La imagen no puede superar 12 MB.");
    if (blob.type && !blob.type.startsWith("image/")) throw new Error("El archivo no parece ser una imagen.");

    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        try {
          return await decodeImageSource(bitmap);
        } finally {
          bitmap.close?.();
        }
      } catch {
        // SVG and some managed Chrome builds may need the HTMLImageElement path.
      }
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.decoding = "async";
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("No se pudo abrir la imagen."));
        image.src = objectUrl;
      });
      return await decodeImageSource(image);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function scanBlob(blob, sourceLabel) {
    const payload = await decodeImageBlob(blob);
    reviewPayload(payload, sourceLabel);
  }

  async function withTask(task) {
    if (busy) return;
    setBusy(true);
    hideMessage("#qrMessage");
    try {
      await task();
    } catch (error) {
      qrMessage(error?.message || "No se pudo leer el QR.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function scanCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !Number.isInteger(tab.windowId)) throw new Error("No se pudo identificar la pestaña activa.");
    const url = String(tab.url || "");
    if (!/^https?:/i.test(url) && !/^file:/i.test(url)) {
      throw new Error("Chrome no permite capturar esta página.");
    }
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const response = await fetch(dataUrl);
    await scanBlob(await response.blob(), "la página actual");
  }

  function imagePermissionPattern(url) {
    return `${url.protocol}//${url.host}/*`;
  }

  async function fetchImageUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (isTotpPayload(value)) {
      reviewPayload(value, "el enlace");
      return;
    }

    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Introduce una URL de imagen válida.");
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("La URL debe usar http:// o https://.");
    }

    const pattern = imagePermissionPattern(url);
    let granted = await chrome.permissions.contains({ origins: [pattern] });
    if (!granted) granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) throw new Error("Chrome no concedió permiso para leer esa imagen.");

    const response = await fetch(url.href, {
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer"
    });
    if (!response.ok) throw new Error(`No se pudo descargar la imagen (HTTP ${response.status}).`);

    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_QR_IMAGE_BYTES) throw new Error("La imagen no puede superar 12 MB.");
    const blob = await response.blob();
    await scanBlob(blob, "la URL");
  }

  async function handlePaste(event) {
    if (!pasteArmed || byId("qrPanel")?.classList.contains("hidden")) return;
    event.preventDefault();
    pasteArmed = false;
    byId("qrPasteHint")?.classList.add("hidden");

    const items = [...(event.clipboardData?.items || [])];
    const imageItem = items.find((item) => item.type?.startsWith("image/"));
    if (imageItem) {
      const file = imageItem.getAsFile();
      await withTask(() => scanBlob(file, "el portapapeles"));
      return;
    }

    const text = event.clipboardData?.getData("text/plain")?.trim();
    if (text) {
      await withTask(async () => reviewPayload(text, "el portapapeles"));
      return;
    }

    qrMessage("El portapapeles no contiene una imagen ni un enlace TOTP.", "error");
  }

  document.addEventListener("DOMContentLoaded", () => {
    byId("qrImportBtn")?.addEventListener("click", () => showQrPanel(true));
    byId("closeQr")?.addEventListener("click", () => showQrPanel(false));

    byId("settingsBtn")?.addEventListener("click", () => {
      if (!byId("qrPanel")?.classList.contains("hidden")) showQrPanel(false);
    });

    byId("lockBtn")?.addEventListener("click", () => showQrPanel(false));

    byId("qrPageBtn")?.addEventListener("click", () => withTask(scanCurrentPage));

    byId("qrFileBtn")?.addEventListener("click", () => byId("qrFileInput")?.click());
    byId("qrFileInput")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) withTask(() => scanBlob(file, "la imagen"));
    });

    byId("qrPasteBtn")?.addEventListener("click", () => {
      pasteArmed = true;
      hideMessage("#qrMessage");
      const hint = byId("qrPasteHint");
      hint?.classList.remove("hidden");
      hint?.focus();
    });

    byId("qrUrlForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      withTask(() => fetchImageUrl(byId("qrUrlInput")?.value));
    });

    document.addEventListener("paste", (event) => {
      handlePaste(event).catch((error) => qrMessage(error?.message || "No se pudo leer el portapapeles.", "error"));
    }, true);
  }, { once: true });
})();
