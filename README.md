# TOTP Vault

TOTP Vault es una extensión para Chrome basada en Manifest V3 que permite almacenar, gestionar y utilizar códigos TOTP de forma local y cifrada.

La bóveda permanece en el navegador y está protegida mediante una contraseña maestra. Incluye autorrelleno, selector junto a campos OTP, autoenvío configurable, copias de seguridad cifradas y temas de color.

<p align="center">
  <img src="https://raw.githubusercontent.com/alalbeniz/totp_vault/main/docs/screenshots/vault.svg" alt="TOTP Vault - Bóveda" width="520">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/alalbeniz/totp_vault/main/docs/screenshots/unlock.svg" alt="TOTP Vault - Desbloqueo" width="360">
</p>

## Funciones principales

- Gestión de múltiples cuentas TOTP con nombre o descripción.
- Soporte para secretos Base32 y URI `otpauth://totp/...`.
- Algoritmos SHA-1, SHA-256 y SHA-512.
- Códigos de 6 u 8 dígitos.
- Periodo configurable cuando viene definido en la URI.
- Copiar el código con un clic.
- Rellenar automáticamente campos OTP/TOTP de páginas web.
- Selector opcional junto a campos OTP detectados.
- Búsqueda de cuentas.
- Mostrar u ocultar todos los códigos o únicamente cuentas concretas.
- Iconos automáticos para servicios conocidos y soporte para iconos personalizados.
- Bloqueo manual y bloqueo automático configurable.
- Exportación e importación de copias de seguridad cifradas.
- Cambio de contraseña maestra.
- Autoenvío configurable después de rellenar un TOTP.
- Diez temas de color seleccionables.

## Seguridad

La bóveda se cifra localmente con **AES-256-GCM**.

La clave de cifrado se deriva de la contraseña maestra mediante **PBKDF2-HMAC-SHA-256 con 310.000 iteraciones**.

La contraseña maestra nunca se almacena. La clave de sesión se mantiene únicamente en `chrome.storage.session` mientras la bóveda permanece desbloqueada.

El acceso a `chrome.storage.local` y `chrome.storage.session` se restringe a contextos confiables de la extensión mediante `TRUSTED_CONTEXTS`.

El selector manual de campo OTP requiere una interacción real del usuario mediante `event.isTrusted`.

TOTP Vault no vincula obligatoriamente una cuenta a un dominio y no borra automáticamente el contenido del portapapeles.

## Autorrelleno

El botón **Rellenar** intenta localizar automáticamente el campo OTP de la pestaña activa.

La detección contempla, entre otros casos:

- campos OTP únicos;
- grupos de 6 u 8 casillas;
- inputs `password`, `tel` y `number`;
- etiquetas y contexto cercano relacionado con verificación o autenticación;
- Shadow DOM abierto;
- iframes accesibles.

Si no encuentra un campo adecuado, puede utilizarse el selector manual de un solo uso.

## Selector junto a campos OTP

TOTP Vault puede mostrar un pequeño botón junto a campos OTP/TOTP detectados en las páginas web.

Hay tres modos disponibles:

- **Desactivado**: no se inyecta el selector.
- **Solo sitios autorizados**: se activa únicamente en los orígenes autorizados por el usuario.
- **Todos los sitios web**: se solicita permiso para utilizarlo en cualquier sitio HTTP/HTTPS.

El selector permite buscar cuentas, muestra los códigos y su tiempo restante y ordena primero las cuentas utilizadas recientemente.

El content script no recibe semillas TOTP ni la clave AES. Los códigos se solicitan al service worker únicamente cuando son necesarios.

## Autoenvío

Después de rellenar un TOTP pueden utilizarse tres modos:

- **No enviar**: únicamente se introduce el código.
- **Enviar inequívoco**: envía el formulario solo cuando existe un único `submit` claramente identificable.
- **Compatibilidad máxima**: además intenta localizar botones de verificar, continuar, siguiente, acceder o equivalentes, incluyendo formularios SPA y botones personalizados.

El modo **Compatibilidad máxima** está pensado para páginas que utilizan botones `type="button"` en lugar de un `submit` tradicional.

## Visibilidad de códigos

Los códigos pueden mostrarse u ocultarse desde el icono de ojo de la cabecera.

También puede definirse una excepción por cada cuenta mediante su propio control de visibilidad. Las preferencias se conservan localmente.

Aunque un código esté oculto, las funciones **Copiar** y **Rellenar** continúan funcionando normalmente.

## Temas

La extensión incluye diez temas seleccionables desde **Ajustes**.

Los colores base disponibles son:

`#1C485F` · `#08709C` · `#95CBC0` · `#D4C299` · `#777778` · `#42B8AF` · `#CFDF9E` · `#ECD799` · `#FBB38A` · `#E77292`

La selección se guarda localmente y también se aplica al selector inline.

## Iconos de cuentas

TOTP Vault incluye iconos locales para:

- Outlook / Microsoft 365
- Microsoft
- Google
- GitHub
- AWS
- Azure
- Cloudflare
- Apple / iCloud
- Meta
- Dropbox
- VPN

El icono puede detectarse automáticamente a partir del nombre o del issuer, seleccionarse manualmente o sustituirse por una imagen personalizada PNG, JPG o WebP.

Los iconos personalizados se reducen a WebP 96×96 y se almacenan dentro de la bóveda cifrada.

## Copias de seguridad

La exportación genera un archivo JSON que contiene la bóveda ya cifrada.

Los secretos no se exportan en texto claro. Para restaurar una copia es necesaria la contraseña maestra con la que fue cifrada.

Si se pierde la contraseña maestra y no se dispone de los secretos originales, no existe un mecanismo de recuperación.

## Permisos

La extensión utiliza los siguientes permisos:

- `storage`: almacenamiento de la bóveda cifrada y de la sesión temporal.
- `activeTab`: acceso temporal a la pestaña activa para el autorrelleno.
- `scripting`: inyección puntual del código necesario para detectar y rellenar OTP.
- `clipboardWrite`: copiar códigos al portapapeles.

Los permisos `http://*/*` y `https://*/*` son opcionales y solo se solicitan si se activa el selector inline para sitios autorizados o para todos los sitios.

## Instalación manual

1. Descarga o clona el repositorio.
2. Abre `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida**.
5. Selecciona la carpeta del proyecto.

## Compatibilidad y limitaciones

Chrome no permite inyectar código en determinadas páginas internas del navegador, iframes especialmente restringidos o Shadow DOM cerrado.

En esos casos siempre puede utilizarse el botón **Copiar**.

Una vez que un TOTP se introduce en una página web, esa página puede leer el valor del campo, igual que ocurre con cualquier código introducido manualmente.

## Versión actual

**v2.10.2**

Esta versión incluye los temas configurables, el selector inline por sitios autorizados, los tres modos de autoenvío, controles de visibilidad de códigos, iconos de servicios y las mejoras de seguridad y cifrado descritas anteriormente.
