# Seguridad de TOTP Vault

## Modelo actual

- Las semillas TOTP persistentes se almacenan cifradas con AES-256-GCM.
- La clave se deriva desde la contraseña maestra con PBKDF2-HMAC-SHA-256.
- La clave de sesión desbloqueada vive en `chrome.storage.session`.
- Tanto `chrome.storage.local` como `chrome.storage.session` se restringen a `TRUSTED_CONTEXTS`.
- El autorrelleno usa `activeTab` y `chrome.scripting`, sin `<all_urls>`.
- El fallback manual de selección de campo solo acepta eventos `click` con `event.isTrusted === true`.

## Decisiones de producto

Por diseño, esta versión:

- no restringe un TOTP a dominios concretos;
- no borra automáticamente el portapapeles.

## Límites

Una página web normal no puede acceder directamente a `chrome.storage.local` o `chrome.storage.session` de la extensión. Sin embargo, si el navegador, el perfil del sistema operativo o el equipo están comprometidos, una clave de sesión desbloqueada puede quedar expuesta a un atacante con acceso suficiente al proceso o a la memoria.


## Selector inline OTP/TOTP (v2.8.0)

La detección automática de campos es opcional. Por defecto está desactivada. Cuando se activa, Chrome solicita permisos de host para sitios concretos o para páginas HTTP/HTTPS según la opción elegida.

El script que se ejecuta en la página no puede leer `chrome.storage.local` ni `chrome.storage.session`: ambos almacenes se restringen a `TRUSTED_CONTEXTS`. Las semillas TOTP y la clave AES permanecen en contextos de confianza de la extensión. El selector solicita al service worker los códigos solo cuando el usuario pulsa el botón de TOTP Vault.

La web puede leer el código una vez que la extensión lo introduce en su propio campo, igual que con el botón Rellenar del popup. Esto es inherente al autorrelleno y no expone la semilla TOTP.
