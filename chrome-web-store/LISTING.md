# Chrome Web Store — ficha de publicación

Este documento contiene los textos y declaraciones preparados para publicar **TOTP Vault v2.13.0** en Chrome Web Store.

## Identidad

**Nombre:** TOTP Vault

**Categoría sugerida:** Productividad / Productivity

**Idiomas incluidos en el paquete:** Español (`es`) e Inglés (`en`)

**Idioma por defecto del manifest:** Español

## Español

### Descripción corta

> Bóveda TOTP local y cifrada con importación QR, autorrelleno, bloqueo automático y copias de seguridad.

### Finalidad única

> TOTP Vault almacena de forma local y cifrada cuentas TOTP y permite generar, importar, copiar y rellenar códigos de autenticación de dos factores.

### Descripción detallada

TOTP Vault es una bóveda TOTP para Chrome diseñada para mantener tus códigos de autenticación de dos factores bajo tu control.

Tus cuentas se almacenan localmente y cifradas con una contraseña maestra. La extensión no necesita una cuenta online ni un servidor propio para gestionar tus secretos TOTP.

Funciones principales:

- Guarda múltiples cuentas TOTP en una bóveda local cifrada.
- Importa cuentas desde QR visible en la página, archivo de imagen, portapapeles, URL u otpauth://.
- Genera códigos de 6 u 8 dígitos con SHA-1, SHA-256 y SHA-512.
- Copia o rellena un código en la pestaña activa con un clic.
- Ofrece un selector opcional junto a campos OTP/TOTP.
- Incluye bloqueo manual y bloqueo automático configurable.
- Permite mostrar u ocultar códigos individualmente o de forma global.
- Incluye búsqueda, iconos de servicios e iconos personalizados.
- Exporta e importa copias de seguridad cifradas.
- Incluye diez temas visuales.
- Interfaz disponible en español e inglés.
- Permite seguir el idioma de Chrome o elegir manualmente Español o English desde Ajustes.

Privacidad y seguridad:

- La bóveda se cifra localmente con AES-256-GCM.
- La clave se deriva con PBKDF2-HMAC-SHA-256.
- La contraseña maestra no se almacena.
- No hay analítica, publicidad ni telemetría propia.
- Los secretos TOTP y códigos generados no se envían al desarrollador.
- El lector QR se ejecuta localmente; jsQR está incluido en el paquete.
- Los permisos de sitio son opcionales y se solicitan cuando una función los necesita.

TOTP Vault utiliza Manifest V3 y está diseñado para solicitar únicamente los permisos necesarios para sus funciones visibles.

## English

### Short description

> Local encrypted TOTP vault with QR import, autofill, automatic locking, and encrypted backups.

### Single purpose

> TOTP Vault locally stores encrypted TOTP accounts and lets users generate, import, copy, and fill two-factor authentication codes.

### Detailed description

TOTP Vault is a TOTP vault for Chrome designed to keep your two-factor authentication codes under your control.

Your accounts are stored locally and encrypted with a master password. The extension does not require an online account or a developer-operated server to manage your TOTP secrets.

Main features:

- Store multiple TOTP accounts in a local encrypted vault.
- Import accounts from a QR visible on the current page, a local image, the clipboard, an image URL, or an otpauth:// link.
- Generate 6- or 8-digit codes using SHA-1, SHA-256, or SHA-512.
- Copy or fill a code into the active tab with one click.
- Optional inline picker next to detected OTP/TOTP fields.
- Configurable manual and automatic locking.
- Show or hide codes globally or per account.
- Search, built-in service icons, and custom icons.
- Import and export encrypted backups.
- Ten selectable visual themes.
- User interface available in Spanish and English.
- Follow Chrome's language automatically or manually select Spanish or English in Settings.

Privacy and security:

- The vault is encrypted locally with AES-256-GCM.
- The encryption key is derived with PBKDF2-HMAC-SHA-256.
- The master password is not stored.
- No first-party analytics, advertising, or telemetry.
- TOTP secrets and generated codes are not sent to the developer.
- QR decoding runs locally; jsQR is bundled with the extension.
- Site access is optional and requested only when a feature requires it.

TOTP Vault uses Manifest V3 and is designed to request only the permissions required for its visible functionality.

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

**ES**

> TOTP Vault no ejecuta código remoto. Las dependencias necesarias, incluido jsQR, están incluidas en el paquete publicado.

**EN**

> TOTP Vault does not execute remote code. Required dependencies, including jsQR, are bundled in the published extension package.

## Datos de usuario — declaración recomendada

Marcar:

- **Información de autenticación / Authentication information**.
- **Contenido del sitio web / Website content**.

No marcar, salvo que el formulario cambie o se añada una función nueva:

- Historial web / Web browsing activity.
- Información sanitaria.
- Información financiera.
- Comunicaciones personales.
- Ubicación.
- Actividad del usuario.

La extensión procesa los datos necesarios localmente para sus funciones visibles. El desarrollador no recibe secretos TOTP, códigos, imágenes QR, contenido de páginas ni datos de navegación.

Certificaciones:

- No se venden ni transfieren datos fuera de los casos permitidos.
- No se usan datos para fines ajenos a la finalidad única declarada.
- No se usan datos para determinar solvencia o conceder préstamos.

## Política de privacidad

**URL:**

https://github.com/alalbeniz/totp_vault/blob/main/PRIVACY.md

## Página principal y soporte

**Homepage:**

https://github.com/alalbeniz/totp_vault

**Support URL:**

https://github.com/alalbeniz/totp_vault/issues

## Novedades de v2.13.0

### Español

> Añadido soporte multiidioma en español e inglés. TOTP Vault puede seguir automáticamente el idioma de Chrome o usar un idioma elegido manualmente desde Ajustes. La localización cubre el popup, importación QR, selector inline, autorrelleno, accesibilidad y mensajes de error.

### English

> Added multilingual support for Spanish and English. TOTP Vault can automatically follow Chrome's language or use a language selected manually in Settings. Localization covers the popup, QR import, inline picker, autofill, accessibility labels, and error messages.

## Recursos gráficos

El paquete de assets contiene:

- icono de Store: 128×128;
- cinco capturas: 1280×800;
- promo tile: 440×280;
- marquee: 1400×560.

Orden recomendado de capturas:

1. Bóveda principal.
2. Importación QR.
3. Selector inline / autorrelleno.
4. Ajustes y seguridad.
5. Desbloqueo con contraseña maestra.

Chrome Web Store permite capturas localizadas por idioma. Las capturas actuales pueden mantenerse como globales; si se añaden capturas inglesas, se deben subir seleccionando **English** en el desplegable de idioma de la ficha.

## Pasos para actualizar la publicación

1. En **Package**, usar **Upload New Package** y subir el ZIP CWS de v2.13.0.
2. En **Store listing**, seleccionar **Español** y pegar la descripción detallada española.
3. Seleccionar **English** en el selector de idioma y pegar la descripción detallada inglesa.
4. Mantener o actualizar las capturas; opcionalmente añadir capturas específicas en inglés.
5. Mantener categoría **Productividad / Productivity**.
6. En **Privacy practices**, revisar permisos, datos de usuario y las tres certificaciones.
7. Confirmar la URL de política de privacidad.
8. Guardar y enviar la actualización a revisión.
