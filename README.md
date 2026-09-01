# TOTP Vault

TOTP Vault es una extensión para Chrome basada en Manifest V3 que permite almacenar, gestionar y utilizar códigos TOTP de forma **local y cifrada**.

La bóveda está protegida mediante una contraseña maestra e incluye autorrelleno, selector inline junto a campos OTP, autoenvío configurable, iconos de servicios, control de visibilidad, copias de seguridad cifradas y temas de color.

## Capturas

<p align="center">
  <img src="https://raw.githubusercontent.com/alalbeniz/totp_vault/main/docs/screenshots/vault.svg" alt="TOTP Vault - Bóveda" width="520">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/alalbeniz/totp_vault/main/docs/screenshots/settings.svg" alt="TOTP Vault - Ajustes" width="430">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/alalbeniz/totp_vault/main/docs/screenshots/inline.svg" alt="TOTP Vault - Selector inline" width="620">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/alalbeniz/totp_vault/main/docs/screenshots/unlock.svg" alt="TOTP Vault - Desbloqueo" width="340">
</p>

## Funciones principales

- Gestión de múltiples cuentas TOTP con nombre o descripción.
- Secretos Base32 y URI `otpauth://totp/...`.
- SHA-1, SHA-256 y SHA-512.
- Códigos de 6 u 8 dígitos.
- Copiar y rellenar códigos con un clic.
- Búsqueda de cuentas.
- Mostrar u ocultar todos los códigos o cuentas concretas.
- Iconos automáticos para servicios conocidos e iconos personalizados.
- Bloqueo manual y bloqueo automático configurable.
- Importación y exportación de copias de seguridad cifradas.
- Cambio de contraseña maestra.
- Selector inline opcional por sitio o para todos los sitios autorizados.
- Autoenvío configurable después de rellenar un TOTP.
- Diez temas de color seleccionables.

## Novedades de v2.10.4

- El selector inline bloqueado detecta automáticamente cuándo se desbloquea la bóveda desde el popup principal.
- No es necesario cerrar y volver a abrir el selector: las cuentas aparecen al terminar el desbloqueo.
- La comprobación solo permanece activa mientras el selector bloqueado está abierto y se detiene automáticamente.
- Se mantiene la corrección de v2.10.3 que evita confundir campos de cantidad de tiendas (`qty`, `quantity`, `cantidad`, `units`, `unidades` y equivalentes) con un OTP.
- Un campo `type="number"`, `inputmode="numeric"` o `pattern="[0-9]*"` no es suficiente por sí solo para considerarse OTP.

## Seguridad

La bóveda se cifra localmente con **AES-256-GCM**. La clave se deriva de la contraseña maestra mediante **PBKDF2-HMAC-SHA-256 con 310.000 iteraciones**.

La contraseña maestra nunca se almacena. La clave de sesión se mantiene únicamente en `chrome.storage.session` mientras la bóveda permanece desbloqueada.

`chrome.storage.local` y `chrome.storage.session` se restringen a contextos confiables de la extensión mediante `TRUSTED_CONTEXTS`.

El content script del selector inline no recibe las semillas TOTP ni la clave AES. Los códigos se solicitan al service worker cuando son necesarios.

TOTP Vault no vincula obligatoriamente una cuenta a un dominio y no borra automáticamente el portapapeles.

## Autorrelleno y detección OTP

El botón **Rellenar** intenta localizar el campo OTP adecuado en la pestaña activa. Se tienen en cuenta señales como nombre, id, `autocomplete`, longitud, etiquetas y contexto relacionado con autenticación o verificación.

Se soportan campos OTP únicos, grupos de 6/8 casillas, Shadow DOM abierto e iframes accesibles.

Para reducir falsos positivos, los controles claramente relacionados con cantidades, unidades, carrito o producto quedan excluidos aunque sean numéricos.

Si no se detecta un campo adecuado, puede utilizarse el selector manual de un solo uso.

## Selector inline

Puede mostrarse un pequeño botón de TOTP Vault junto a campos OTP/TOTP detectados.

Modos disponibles:

- **Desactivado**.
- **Solo sitios autorizados**.
- **Todos los sitios web**.

El selector permite buscar cuentas, ver el tiempo restante y rellenar el código seleccionado. Las cuentas usadas recientemente aparecen primero.

Si la bóveda está bloqueada, el selector permite abrir TOTP Vault. Tras introducir la contraseña maestra, **el selector abierto se actualiza automáticamente** y muestra las cuentas sin necesidad de cerrarlo.

## Autoenvío

Después de rellenar un TOTP hay tres modos:

- **No enviar**: solo introduce el código.
- **Enviar inequívoco**: únicamente envía cuando hay un submit claro y único.
- **Compatibilidad máxima**: además busca botones de verificar, continuar, siguiente, acceder y equivalentes, incluyendo SPAs y botones `type="button"`.

## Temas

Los colores base disponibles son:

`#1C485F` · `#08709C` · `#95CBC0` · `#D4C299` · `#777778` · `#42B8AF` · `#CFDF9E` · `#ECD799` · `#FBB38A` · `#E77292`

La selección se almacena localmente y también se aplica al selector inline.

## Iconos de cuentas

Incluye iconos locales para Outlook/Microsoft 365, Microsoft, Google, GitHub, AWS, Azure, Cloudflare, Apple/iCloud, Meta, Dropbox y VPN.

También admite iconos personalizados PNG/JPG/WebP, reducidos a WebP 96×96 y almacenados dentro de la bóveda cifrada.

## Permisos

- `storage`: bóveda cifrada y sesión temporal.
- `activeTab`: acceso temporal a la pestaña activa.
- `scripting`: autorrelleno puntual.
- `clipboardWrite`: copiar códigos.

Los permisos `http://*/*` y `https://*/*` son opcionales y se solicitan al activar el selector inline para los sitios correspondientes.

## Instalación manual

1. Descarga o clona el repositorio.
2. Abre `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida**.
5. Selecciona la carpeta del proyecto.

## Limitaciones

Chrome impide inyectar código en determinadas páginas internas, iframes restringidos y Shadow DOM cerrado. En esos casos siempre puede utilizarse **Copiar**.

Una vez introducido un TOTP en una página web, esa página puede leer el valor del campo igual que si se hubiera escrito manualmente.

## Versión actual

**v2.10.4**
