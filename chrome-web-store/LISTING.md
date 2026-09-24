# Chrome Web Store — TOTP Vault v2.16.0

Ficha optimizada siguiendo las recomendaciones de Google para una listing clara, concisa, localizada y centrada en las funciones principales.

## Identidad

**Nombre:** TOTP Vault  
**Categoría:** Productividad / Productivity  
**Idiomas:** Español (`es`), inglés (`en`), francés (`fr`) e italiano (`it`)  
**Idioma por defecto:** Español

## Resumen / Summary

El resumen procede del `manifest.json` mediante `__MSG_extensionDescription__`.

### Español — 119 caracteres

> Códigos 2FA (TOTP), cifrados en tu navegador. Importa QR, copia o rellena códigos y mantén tus cuentas bajo tu control.

### English — 124 characters

> 2FA (TOTP) codes in a local encrypted vault. Import QR codes, copy or fill codes, and keep your accounts under your control.

## Descripción detallada — Español

TOTP Vault es un autenticador TOTP para Chrome pensado para usar tus códigos 2FA sin depender de una cuenta online. Guarda tus cuentas cifradas localmente, importa un QR y copia o rellena el código directamente donde lo necesitas.

Funciones principales:

• Importa cuentas desde un QR visible, una imagen, el portapapeles, una URL, un enlace otpauth:// o una exportación de Google Authenticator.  
• Genera códigos de 6 u 8 dígitos con SHA-1, SHA-256 y SHA-512.  
• Copia códigos o rellénalos directamente con un clic.  
• Usa un selector opcional junto a campos OTP/TOTP.  
• Protege la bóveda con contraseña maestra y bloqueo automático.  
• Exporta e importa copias de seguridad cifradas.  
• Usa español, inglés, francés e italiano o sigue automáticamente el idioma de Chrome.

Privacidad y seguridad:

Tus secretos y códigos TOTP no se envían al desarrollador. La bóveda se cifra localmente con AES-256-GCM y la contraseña maestra no se almacena.

TOTP Vault no incluye analítica, publicidad ni telemetría propia.

## Detailed description — English

TOTP Vault is a TOTP authenticator for Chrome designed to let you use your 2FA codes without depending on an online account. Keep your accounts encrypted locally, import a QR code, and copy or fill codes directly where you need them.

Main features:

• Import accounts from a visible QR code, image, clipboard, URL, otpauth:// link, or Google Authenticator export.  
• Generate 6- or 8-digit codes using SHA-1, SHA-256, or SHA-512.  
• Copy codes or fill them directly with one click.  
• Use an optional inline picker next to OTP/TOTP fields.  
• Protect your vault with a master password and automatic locking.  
• Import and export encrypted backups.  
• Use Spanish, English, French, Italian, or automatically follow Chrome's language.

Privacy and security:

Your TOTP secrets and generated codes are not sent to the developer. The vault is encrypted locally using AES-256-GCM, and your master password is not stored.

TOTP Vault includes no first-party analytics, advertising, or telemetry.

## Finalidad única / Single purpose

### ES

> TOTP Vault almacena de forma local y cifrada cuentas TOTP y permite generar, importar, copiar y rellenar códigos de autenticación de dos factores.

### EN

> TOTP Vault locally stores encrypted TOTP accounts and lets users generate, import, copy, and fill two-factor authentication codes.

## Novedades v2.16.0

Francés e italiano añadidos. Tarjetas con altura adaptable en el popup de 420 px y aviso de caducidad a los 5 segundos. Véase UPDATE_v2.16.0.md y DESCRIPTION_FR.txt / DESCRIPTION_IT.txt para la actualización de la ficha.

## Novedades v2.15.0

### ES

> Añadida importación de exportaciones de Google Authenticator, incluyendo múltiples cuentas y lotes divididos en varios QR. También se ha compactado el diseño de las tarjetas TOTP, aumentado la legibilidad de los botones de Ajustes y el contador cambia a un rojo suave cuando quedan menos de 5 segundos.

### EN

> Added Google Authenticator export import, including multiple accounts and exports split across several QR codes. TOTP cards are now more compact, Settings buttons are easier to read, and the countdown changes to a soft red when fewer than 5 seconds remain.

## Novedades v2.14.0

### ES

> Añadido un enlace opcional en Ajustes para apoyar el desarrollo mediante Buy Me a Coffee. El enlace abre una página externa en una pestaña nueva; no se integra ningún widget, SDK, analítica ni código remoto y no se añaden permisos.

### EN

> Added an optional Settings link to support development through Buy Me a Coffee. The link opens an external page in a new tab; no widget, SDK, analytics, or remote code is embedded and no new permissions are added.

## Novedades v2.13.0

### ES

> Añadido soporte multiidioma en español e inglés. TOTP Vault puede seguir automáticamente el idioma de Chrome o usar un idioma elegido manualmente desde Ajustes. La localización cubre el popup, importación QR, selector inline, autorrelleno, accesibilidad y mensajes de error.

### EN

> Added multilingual support for Spanish and English. TOTP Vault can automatically follow Chrome's language or use a language selected manually in Settings. Localization covers the popup, QR import, inline picker, autofill, accessibility labels, and error messages.

## Capturas de pantalla: localizadas vs globales

Google distingue ambos campos y muestra los recursos en este orden: vídeo localizado, capturas localizadas, vídeo global y capturas globales.

### Capturas localizadas — usar

Subir las cinco imágenes de `dist/store-assets/localized/es/` seleccionando **Español** en el desplegable del Dashboard.

Subir las cinco imágenes de `dist/store-assets/localized/en/` seleccionando **English**.

Orden:

1. Tus códigos 2FA, a mano / Your 2FA codes, at hand
2. Importa un QR en segundos / Import a QR code in seconds
3. Rellena sin copiar y pegar / Fill codes without copy and paste
4. Tu bóveda, a tu manera / Your vault, your way
5. Protegida por contraseña maestra / Protected by your master password

### Capturas globales — dejar vacío

No subir capturas al campo **Global screenshots** mientras existan juegos completos localizados para Español e Inglés.

Motivo: Chrome Web Store coloca las capturas globales después de las localizadas. Con cinco capturas localizadas por idioma, añadir otras globales duplicaría la historia visual y haría la ficha más larga sin aportar información nueva.

Si el Dashboard llegara a exigir una captura global de fallback, usar únicamente la primera captura española (`localized/es/01-vault.png`) porque Español es el `default_locale`.

## Recursos globales

Estos recursos no se localizan y se encuentran en `dist/store-assets/global/`:

- `store-icon-128.png`
- `promo-small-440x280.png`
- `promo-marquee-1400x560.png`

Las promos se han diseñado sin texto dependiente del idioma: solo marca TOTP Vault y elementos gráficos de código, para que funcionen igual en Español e Inglés.

## Justificación de permisos / Permission justifications

### storage

**ES**

> Necesario para almacenar la bóveda TOTP cifrada, mantener temporalmente la sesión desbloqueada y conservar preferencias elegidas por el usuario, incluido el idioma.

**EN**

> Required to store the encrypted TOTP vault, keep the unlocked session temporarily, and save user preferences, including the selected language.

### activeTab

**ES**

> Se utiliza únicamente cuando el usuario inicia una acción sobre la pestaña activa, como rellenar un código TOTP o buscar un QR visible.

**EN**

> Used only when the user initiates an action on the active tab, such as filling a TOTP code or scanning a visible QR code.

### scripting

**ES**

> Necesario para detectar y rellenar campos OTP/TOTP en la pestaña sobre la que el usuario solicita la acción.

**EN**

> Required to detect and fill OTP/TOTP fields in the tab where the user requests the action.

### clipboardWrite

**ES**

> Permite copiar al portapapeles el código TOTP cuando el usuario pulsa explícitamente Copiar.

**EN**

> Allows the extension to write a TOTP code to the clipboard when the user explicitly clicks Copy.

### optional_host_permissions: http://*/* y https://*/*

**ES**

> Son permisos opcionales. Se solicitan por sitio o dominio para habilitar el selector inline y para descargar una imagen QR desde una URL proporcionada expresamente por el usuario.

**EN**

> These permissions are optional. They are requested per site or domain to enable the inline picker and to download a QR image from a URL explicitly provided by the user.

## Código remoto / Remote code

**Respuesta / Answer:** No.

> TOTP Vault no ejecuta código remoto. Las dependencias necesarias, incluido jsQR, están incluidas en el paquete publicado.

> TOTP Vault does not execute remote code. Required dependencies, including jsQR, are bundled in the published extension package.

## Uso de datos

Marcar:

- **Información de autenticación / Authentication information**
- **Contenido del sitio web / Website content**

No marcar con la funcionalidad actual:

- Historial web / Web browsing activity
- Información sanitaria
- Información financiera
- Comunicaciones personales
- Ubicación
- Actividad del usuario

Certificaciones:

- No se venden ni transfieren datos fuera de los casos permitidos.
- No se usan datos para fines ajenos a la finalidad única.
- No se usan datos para determinar solvencia ni conceder préstamos.

## URLs

**Política de privacidad ES:**  
https://github.com/alalbeniz/totp_vault/blob/main/PRIVACY.md

**Privacy policy EN:**  
https://github.com/alalbeniz/totp_vault/blob/main/PRIVACY_EN.md

**Homepage:**  
https://github.com/alalbeniz/totp_vault

**Support:**  
https://github.com/alalbeniz/totp_vault/issues

## Pasos para actualizar Chrome Web Store

1. **Package → Upload New Package**: subir `totp-vault-v2.13.0-cws.zip`.
2. **Store listing → Español**: pegar la descripción española y subir las 5 capturas de `localized/es/` en **Localized screenshots**.
3. Dejar **Global screenshots** vacío.
4. **Store listing → English**: pegar la descripción inglesa y subir las 5 capturas de `localized/en/` en **Localized screenshots**.
5. Subir icono y promo tiles desde `global/`.
6. Revisar Privacy practices, permisos, datos de usuario y política de privacidad.
7. Guardar y enviar a revisión.
