# TOTP Vault

**Chrome Web Store:** https://chromewebstore.google.com/detail/totp-vault/abiekbjdmcanmkjcimgfojklngfnpkok  
**Extension ID:** `abiekbjdmcanmkjcimgfojklngfnpkok`  
**Publicación de nuevas versiones:** [`chrome-web-store/RELEASE.md`](chrome-web-store/RELEASE.md)

TOTP Vault es una extensión para Chrome basada en Manifest V3 que permite almacenar, gestionar y utilizar códigos TOTP de forma **local y cifrada**.

La bóveda está protegida mediante una contraseña maestra e incluye autorrelleno, selector inline junto a campos OTP, autoenvío configurable, iconos de servicios, control de visibilidad, copias de seguridad cifradas y temas de color.

## Interfaz pastel

La interfaz principal usa superficies claras, códigos grandes, controles de 40–44 px y diez paletas pastel. Los identificadores históricos de los temas se conservan para mantener la compatibilidad con las preferencias ya guardadas.

El núcleo `popup-core.js`, el service worker, el formato de la bóveda y los permisos permanecen compatibles con v2.10.x. Los módulos de presentación gestionan la visibilidad, el selector de temas, el ajuste de autoenvío y la navegación de los paneles.

Las comprobaciones de interfaz se ejecutan con cuentas ficticias mediante `pnpm test` y GitHub Actions genera además un ZIP instalable de la extensión.

## Funciones principales

- Gestión de múltiples cuentas TOTP con nombre o descripción.
- Secretos Base32 y URI `otpauth://totp/...`.
- Importación de cuentas desde QR visible en la página, imagen local, portapapeles o URL de imagen.
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
- Interfaz multiidioma en español e inglés, con selección automática según Chrome o elección manual desde Ajustes.

## Importación desde QR

Desde **QR** en la pantalla principal se puede importar una cuenta TOTP desde cuatro orígenes:

- QR visible en la pestaña actual.
- Imagen local PNG, JPG, WebP, GIF o SVG.
- Imagen pegada desde el portapapeles mediante Ctrl+V/Cmd+V.
- URL directa de una imagen o enlace `otpauth://totp/...`.

Las imágenes se decodifican localmente. Para URLs externas, la extensión solicita permiso únicamente al dominio indicado y realiza la descarga sin credenciales. La cuenta nunca se guarda de forma automática: el QR rellena el formulario existente para que el usuario revise los datos y pulse **Guardar**.

El lector usa la API nativa `BarcodeDetector` cuando está disponible y `jsQR` como fallback local. `jsQR` está fijado como dependencia de pnpm y se copia al paquete durante la preparación/CI; no se descarga código en tiempo de ejecución. Dependabot comprueba sus nuevas versiones y abre un PR, que debe superar las pruebas QR antes de integrarse.

El formato de exportación masiva `otpauth-migration://` de Google Authenticator todavía no se importa.

## Novedades de v2.13.0

- Soporte multiidioma nativo mediante `chrome.i18n`.
- Español e inglés incluidos en `_locales/es` y `_locales/en`.
- Selector de idioma en Ajustes: Sistema, Español o English; Sistema sigue la configuración de Chrome.
- `manifest.json`, popup, importación QR, selector inline, estados, errores y mensajes del service worker localizados.
- Pruebas que verifican paridad de claves entre idiomas y una carga real de interfaz en inglés.

## Novedades de v2.12.0

- Importación QR desde la página visible, archivo local, portapapeles y URL de imagen.
- Decodificación completamente local con detector nativo y fallback a jsQR.
- Solicitud de permisos por dominio únicamente cuando se importa desde una URL externa.
- Revisión obligatoria de los datos detectados antes de guardarlos en la bóveda.
- Pruebas automatizadas de los cuatro orígenes de importación.

## Novedades de v2.11.0

- Rediseño completo del popup con una interfaz clara y diez paletas pastel.
- Nueva presentación de cuentas, búsqueda, acciones, ajustes y pantallas de bloqueo/desbloqueo.
- Selector de temas accesible por teclado y persistencia de las preferencias existentes.
- Mejoras de presentación del selector TOTP inline manteniendo la lógica de detección y seguridad de v2.10.x.
- Tamaño intrínseco del popup fijado a 420×600 para evitar el popup blanco/minimizado de Chrome.
- Scrollbars con gutter reservado para que no se superpongan a tarjetas ni paneles.
- Pruebas automatizadas de interfaz, cifrado, TOTP, importación/exportación, bloqueo y diseño estrecho.
- Empaquetado automático de un ZIP instalable desde GitHub Actions.

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

| Tema | Color pastel | Identificador conservado |
| --- | --- | --- |
| Porcelana | `#B9CBD9` | `1c485f` |
| Cielo | `#BADCF0` | `08709c` |
| Menta | `#BEE1D4` | `95cbc0` |
| Avena | `#E6D7BC` | `d4c299` |
| Lavanda | `#D5CCEC` | `777778` |
| Grafito | `#72777D` | `42b8af` |
| Salvia | `#D4DFBD` | `cfdf9e` |
| Vainilla | `#F0E0AC` | `ecd799` |
| Melocotón | `#F2CEB9` | `fbb38a` |
| Rosa | `#ECC8D5` | `e77292` |

La selección se almacena localmente y también se aplica al selector inline. El selector de temas admite flechas, Inicio y Fin. Escape cierra el menú de cuenta o el panel abierto.

## Iconos de cuentas

Incluye iconos locales para Outlook/Microsoft 365, Microsoft, Google, GitHub, AWS, Azure, Cloudflare, Apple/iCloud, Meta, Dropbox y VPN.

También admite iconos personalizados PNG/JPG/WebP, reducidos a WebP 96×96 y almacenados dentro de la bóveda cifrada.

## Permisos

- `storage`: bóveda cifrada y sesión temporal.
- `activeTab`: acceso temporal a la pestaña activa.
- `scripting`: autorrelleno puntual.
- `clipboardWrite`: copiar códigos.

Los permisos `http://*/*` y `https://*/*` son opcionales y se solicitan al activar el selector inline para los sitios correspondientes.

## Chrome Web Store

El workflow genera dos paquetes de extensión:

- `totp-vault-vX.Y.Z.zip`: paquete cómodo para pruebas manuales, con la extensión dentro de una carpeta versionada.
- `totp-vault-vX.Y.Z-cws.zip`: paquete preparado para Chrome Web Store, con `manifest.json` directamente en la raíz del ZIP.

También genera el artefacto `chrome-web-store-assets` con cinco capturas 1280×800, icono 128×128 y recursos promocionales 440×280 y 1400×560.

Los textos de publicación, propósito único y justificaciones de permisos están en [`chrome-web-store/LISTING.md`](chrome-web-store/LISTING.md).

La política de privacidad pública está en [`PRIVACY.md`](PRIVACY.md).

## Instalación manual

1. Descarga el ZIP generado por GitHub Actions, o clona el repositorio.
2. Si clonas el repositorio, ejecuta `pnpm install --frozen-lockfile` para preparar la dependencia local de lectura QR.
3. Abre `chrome://extensions`.
4. Activa **Modo de desarrollador**.
5. Pulsa **Cargar descomprimida**.
6. Selecciona la carpeta del proyecto (o la carpeta extraída del ZIP generado).

## Limitaciones

Chrome impide inyectar código en determinadas páginas internas, iframes restringidos y Shadow DOM cerrado. En esos casos siempre puede utilizarse **Copiar**.

Una vez introducido un TOTP en una página web, esa página puede leer el valor del campo igual que si se hubiera escrito manualmente.

## Versión actual

**v2.13.0**

## Verificación de la interfaz

Con Node.js 22 y pnpm 10:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium-headless-shell
pnpm test
```

Las pruebas ejecutan los scripts reales del popup y WebCrypto con cuentas ficticias. Las API de Chrome (almacenamiento, portapapeles, permisos e inyección) se simulan para aislar la prueba de los datos personales. Se comprueban importación QR desde archivo/URL/portapapeles/página, altas, edición, borrado, búsqueda, visibilidad, diez temas, localización español/inglés, persistencia, bloqueo, contraseña, exportación cifrada y el diseño a 420 y 320 px. Las capturas se guardan en `test-results/`.

La integración real con los permisos del navegador y el autorrelleno en otras webs se comprueba cargando la extensión descomprimida.
