(() => {
  const SUPPORTED = new Set(["es", "en"]);
  const DEFAULT_LANGUAGE = "es";
  const textKeys = new Map([
    ["Abriendo bóveda…","loadingOpeningVault"],["TU LLAVERO DIGITAL","digitalKeyring"],
    ["Todo empieza con una llave.","setupTitle"],["Crea una contraseña maestra para proteger tus cuentas en este navegador.","setupLead"],
    ["Contraseña maestra","masterPassword"],["Repetir contraseña","repeatPassword"],["Crear bóveda","createVault"],["o","or"],
    ["Importar copia cifrada","importEncryptedBackup"],["TOTP VAULT · ACCESO SEGURO","unlockEyebrow"],
    ["Tus códigos, a mano.","unlockTitle"],["Desbloquea tu bóveda para continuar donde lo dejaste.","unlockLead"],
    ["Desbloquear","unlock"],["Solo tú tienes la llave. La contraseña no se almacena y es necesaria para recuperar tus cuentas.","securityNote"],
    ["Bóveda desbloqueada","vaultUnlocked"],["Mis códigos","myCodes"],["Añadir","add"],["LECTURA LOCAL","qrEyebrow"],
    ["Importar desde QR","qrTitle"],["Lee un QR TOTP sin enviar la imagen fuera del navegador. Después podrás revisar los datos antes de guardarlos.","qrIntro"],
    ["Esta página","qrCurrentPage"],["Busca un QR visible en la pestaña actual.","qrCurrentPageHelp"],["Elegir imagen","chooseImage"],
    ["PNG, JPG, WebP, GIF o SVG.","qrFileHelp"],["Pegar imagen","pasteImage"],["Usa Ctrl+V o Cmd+V tras pulsar.","qrPasteHelp"],
    ["Ahora pega la imagen con","qrPasteLead"],["URL de imagen o enlace otpauth://","qrUrlLabel"],["Leer","read"],
    ["Procesado localmente · URL: permiso solo para ese dominio.","qrSecurity"],["UNA LLAVE MÁS","addEyebrow"],["Añadir TOTP","addTotp"],
    ["Nombre o descripción","nameDescription"],["Secreto Base32 u otpauth://","secretLabel"],["Icono","icon"],["Automático","automatic"],
    ["Personalizado…","custom"],["Quitar","remove"],["PNG, JPG o WebP · se guarda cifrado y reducido a 96×96.","iconHelp"],
    ["Cancelar","cancel"],["Guardar","save"],["A TU MANERA","settingsEyebrow"],["Ajustes y seguridad","settingsTitle"],
    ["Idioma","language"],["Sistema","languageSystem"],["Español","languageSpanish"],["English","languageEnglish"],
    ["El color de tu bóveda","vaultColor"],["10 temas pastel","pastelThemes"],["Porcelana","themePorcelain"],["Cielo","themeSky"],
    ["Menta","themeMint"],["Avena","themeOat"],["Lavanda","themeLavender"],["Grafito","themeGraphite"],["Salvia","themeSage"],
    ["Vainilla","themeVanilla"],["Melocotón","themePeach"],["Rosa","themeRose"],["Seguridad","security"],["Bloqueo automático","autoLock"],
    ["Hasta cerrar el navegador","untilBrowserClose"],["1 minuto","oneMinute"],["5 minutos","fiveMinutes"],["15 minutos","fifteenMinutes"],
    ["30 minutos","thirtyMinutes"],["1 hora","oneHour"],["Al iniciar sesión","onSignIn"],["Selector junto a campos OTP/TOTP","inlinePicker"],
    ["Desactivado","disabled"],["Solo sitios autorizados","authorizedSitesOnly"],["Todos los sitios web","allWebsites"],
    ["Muestra un pequeño botón de TOTP Vault junto a campos de verificación detectados. No vincula ninguna cuenta a una URL.","inlineHelp"],
    ["Autorizar sitio actual","authorizeCurrentSite"],["Después de rellenar un TOTP","afterFill"],["No enviar","doNotSubmit"],
    ["Enviar inequívoco","submitUnambiguous"],["Compatibilidad máxima","maximumCompatibility"],
    ["Inequívoco: solo usa un único submit claro del formulario. Compatibilidad máxima: si eso no funciona, busca el botón de verificar/continuar más probable cerca del OTP, incluyendo formularios SPA y botones personalizados.","autoSubmitHelp"],
    ["Tu copia de seguridad","backupTitle"],["Exportar cifrado","exportEncrypted"],["Importar cifrado","importEncrypted"],
    ["Cambiar contraseña maestra","changeMasterPassword"],["Contraseña actual","currentPassword"],["Nueva contraseña","newPassword"],
    ["Repetir nueva contraseña","repeatNewPassword"],["Actualizar contraseña","updatePassword"],["No hay TOTP guardados","noTotpSaved"],
    ["Pulsa + para añadir el primero.","addFirst"],["Cifrado local · Solo en tu navegador","localEncryptedOnly"],["Editar","edit"],
    ["Eliminar","delete"],["Rellenar","fill"],["Copiar","copy"]
  ]);

  const attributeKeys = new Map([
    ["Mostrar contraseña","showPassword"],["Ocultar todos los códigos","hideAllCodes"],["Ajustes","settings"],
    ["Bloquear ahora","lockNow"],["Bloquear","lock"],["Importar desde QR","importFromQr"],["Añadir TOTP","addTotp"],
    ["Buscar una cuenta…","searchAccount"],["Buscar cuentas","searchAccounts"],["Cerrar","close"],["Ej. VPN empresa","nameExample"],
    ["Mostrar secreto","showSecret"],["Icono de la cuenta","accountIcon"],["Tema de color","colorTheme"],["Porcelana","themePorcelain"],
    ["Cielo","themeSky"],["Menta","themeMint"],["Avena","themeOat"],["Lavanda","themeLavender"],["Grafito","themeGraphite"],
    ["Salvia","themeSage"],["Vainilla","themeVanilla"],["Melocotón","themePeach"],["Rosa","themeRose"],["Cuentas TOTP","myCodes"],
    ["Más opciones","moreOptions"],["Copiar código","copyCode"],["Ocultar código","hideCode"],["Segundos restantes","secondsRemaining"]
  ]);

  let preference = "system";
  let forcedCatalog = null;

  function normalizePreference(value) {
    return SUPPORTED.has(value) ? value : "system";
  }

  function systemLanguage() {
    try {
      const lang = String(globalThis.chrome?.i18n?.getUILanguage?.() || DEFAULT_LANGUAGE).toLowerCase().split("-")[0];
      return SUPPORTED.has(lang) ? lang : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }

  function resolvedLanguage() {
    return preference === "system" ? systemLanguage() : preference;
  }

  function formatCatalogEntry(entry, substitutions) {
    if (!entry?.message) return "";
    let message = entry.message;
    const values = Array.isArray(substitutions)
      ? substitutions.map((value) => String(value))
      : substitutions === undefined || substitutions === null
        ? []
        : [String(substitutions)];

    for (const [name, placeholder] of Object.entries(entry.placeholders || {})) {
      const rendered = String(placeholder?.content || "").replace(/\$(\d+)/g, (_, index) => values[Number(index) - 1] ?? "");
      message = message.replace(new RegExp("\\$" + name + "\\$", "gi"), rendered);
    }
    return message.replace(/\$\$/g, "$");
  }

  async function loadCatalog(language) {
    const url = globalThis.chrome?.runtime?.getURL?.(`_locales/${language}/messages.json`) || `_locales/${language}/messages.json`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load locale ${language}`);
    return response.json();
  }

  async function initialize() {
    try {
      const data = await globalThis.chrome?.storage?.local?.get?.("settings");
      preference = normalizePreference(data?.settings?.language);
      forcedCatalog = preference === "system" ? null : await loadCatalog(preference);
    } catch {
      preference = "system";
      forcedCatalog = null;
    }
    return preference;
  }

  function t(key, substitutions, fallback = "") {
    if (preference !== "system" && forcedCatalog) {
      const value = formatCatalogEntry(forcedCatalog[key], substitutions);
      if (value) return value;
    }
    try {
      const value = globalThis.chrome?.i18n?.getMessage?.(key, substitutions);
      if (value) return value;
    } catch {}
    return fallback;
  }

  function translateTextNode(node) {
    const raw = node.nodeValue || "";
    const trimmed = raw.trim();
    const key = textKeys.get(trimmed);
    if (!key) return;
    const translated = t(key, undefined, trimmed);
    node.nodeValue = raw.replace(trimmed, translated);
  }

  function localizeDocument(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);

    for (const el of root.querySelectorAll?.("[placeholder],[aria-label],[title]") || []) {
      for (const attr of ["placeholder","aria-label","title"]) {
        const current = el.getAttribute(attr);
        const key = attributeKeys.get(current);
        if (key) el.setAttribute(attr, t(key, undefined, current));
      }
    }

    document.documentElement.lang = resolvedLanguage();
  }

  const ready = initialize();

  globalThis.TotpI18n = {
    t,
    ready,
    localizeDocument,
    getPreference: () => preference,
    resolvedLanguage,
    normalizePreference
  };

  const apply = async () => {
    await ready;
    localizeDocument();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }
})();
