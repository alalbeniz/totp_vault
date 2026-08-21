## Novedades de v2.7.0

- Iconos locales integrados para Outlook/Microsoft 365, Microsoft, Google, GitHub, AWS, Azure, Cloudflare, Apple/iCloud, Meta, Dropbox y VPN.
- Detección automática del icono a partir del nombre o issuer.
- Selector manual de icono al crear o editar una entrada.
- Iconos personalizados PNG/JPG/WebP. Se rasterizan a WebP 96×96 y se guardan dentro de la bóveda cifrada.
- Las entradas antiguas siguen funcionando y usan detección automática o iniciales como fallback.

## Novedades de v2.6.0

- Pulido general de interfaz sin tocar el hardening de v2.5.0.
- Popup exterior rectangular y limpio; redondeado aplicado solo a elementos internos.
- Header con más presencia y controles circulares más suaves.
- Buscador con icono real.
- Tarjetas más refinadas, densas y consistentes con el mockup.
- Badges diferenciados por tipo de servicio cuando se reconoce.
- Menú de tres puntos con iconos de Editar/Eliminar.
- Botones Rellenar/Copiar con SVG limpios en lugar de caracteres Unicode.
- Footer e iconos de seguridad unificados.
- Mejoras de hover, foco y espaciados.

## Novedades de v2.5.0 — Hardening

- `chrome.storage.local` se restringe explícitamente a `TRUSTED_CONTEXTS`.
- `chrome.storage.session` se restringe explícitamente a `TRUSTED_CONTEXTS`.
- El selector manual de campo OTP exige un clic real del usuario mediante `event.isTrusted`.
- No se añaden restricciones por dominio.
- No se modifica ni borra automáticamente el portapapeles.
- Se mantienen `activeTab` + `scripting`, sin permiso permanente `<all_urls>`.

## Novedades de v2.4.6

- La pantalla de contraseña usa el mismo estilo de scrollbar integrada que la vista principal.
- La scrollbar ya no aparece cuando no hace falta.
- Corregido el overflow fantasma de la vista de desbloqueo.

## Novedades de v2.4.5

- Sustituidos los iconos de visibilidad por ojo abierto / ojo tachado estándar en trazo.
- Mejor legibilidad a tamaños pequeños.
- Botón de visibilidad menos circular y más integrado con los inputs.

## Novedades de v2.4.4

- Ajuste visual del fondo lateral/superior para eliminar el efecto de banda/cuadrado negro.
- Iconos de mostrar/ocultar mejorados: ojo abierto / ojo tachado en lugar del punto redondo.
- Botones de visibilidad más claros y agradables en contraseña maestra y secreto TOTP.

## Novedades de v2.4.3

- Eliminado el gutter/espacio exterior que hacía ver un cuadrado oscuro en el borde del popup.
- El layout principal ahora es full-bleed por dentro, sin ese margen visual feo en la esquina.
- La pantalla de desbloqueo/contraseña maestra ahora también tiene el tratamiento redondeado y consistente con el resto.

## Novedades de v2.4.2

- Corrección del fondo exterior del popup para eliminar el rectángulo/corner oscuro visible detrás del contenedor redondeado.
- El fondo exterior y el interior ahora comparten el mismo tratamiento visual para que la esquina no cante.

## Novedades de v2.4.1

- Eliminado el marco/cuadrado negro visible alrededor del popup redondeado.
- El fondo raíz del popup usa ahora el mismo tono que la aplicación.
- Eliminado el margen transparente exterior que exponía el canvas negro de Chromium.
- Se mantiene el borde redondeado visual sin alterar las tarjetas ni la scrollbar.

- Diseño mucho más fiel al mockup elegido.
- Código TOTP alineado a la derecha del nombre y temporizador pequeño al lado.
- Dos botones debajo, usando mejor el espacio de cada tarjeta.
- Popup con esquinas más redondeadas y look más premium.
- Botón de bloqueo rediseñado con icono de candado real.
- Menú de tres puntos en cada tarjeta con Editar y Eliminar.
- Scrollbar solo visible cuando realmente hace falta, sin saltos.

# TOTP Vault v2.3.0.1

Extensión Chrome Manifest V3 para almacenar varios TOTP de forma local y cifrada.

- Scrollbar interna en la lista de TOTP, más fina y completamente integrada con el tema.
- Eliminadas las flechas y el track gris de la scrollbar del sistema.
- El encabezado y el pie permanecen fuera del área de scroll; solo se desplaza la lista de códigos.

- Tarjetas TOTP más compactas para que quepan más sin scroll.
- Estética más suave y más redondeada.
- Scrollbar integrada visualmente con el popup.
- Ajuste general de espaciados y alturas para mejorar la densidad.

## Novedades previas

- Contraseña maestra.
- Cifrado local de la bóveda con **AES-256-GCM**.
- Derivación de clave con **PBKDF2-HMAC-SHA-256 (310.000 iteraciones)**.
- La contraseña maestra no se almacena.
- La clave de sesión se mantiene únicamente en `chrome.storage.session`.
- Bloqueo automático configurable: hasta cerrar el navegador, 1, 5, 15, 30 o 60 minutos.
- Botón de bloqueo inmediato.
- Cambio de contraseña maestra.
- Exportación de copia de seguridad cifrada.
- Importación/restauración de copia cifrada.
- Nuevo icono.
- Autorrelleno mejorado: campo OTP único, grupos de 6/8 casillas, inputs tipo password, etiquetas/contexto, Shadow DOM abierto y frames accesibles. Si no lo detecta, activa un selector manual de un solo uso para hacer clic en el campo correcto.
- Búsqueda también dentro de Shadow DOM abierto.

## TOTP

- Varios códigos con nombre o descripción.
- Secretos Base32.
- URI `otpauth://totp/...`.
- SHA-1, SHA-256 y SHA-512.
- 6 u 8 dígitos.
- Periodo configurable si viene en el URI.
- Botón **Copiar**.
- Botón **Rellenar**.
- Pulsar el propio código también lo copia.

## Permisos

- `storage`: bóveda cifrada persistente + sesión temporal en memoria.
- `activeTab`: acceso temporal a la pestaña que estás usando.
- `scripting`: inyección puntual del autorrelleno.
- `clipboardWrite`: copiar códigos.

No se solicita `<all_urls>` ni acceso permanente al historial de navegación.

## Instalación

1. Descomprime el ZIP.
2. Abre `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida**.
5. Selecciona la carpeta `totp-vault-chrome-v2`.

Si ya tenías cargada la v1 como carpeta distinta, puedes eliminarla de Chrome y cargar esta.

## Seguridad y recuperación

La contraseña maestra no se guarda. Si la olvidas y no tienes una copia de los secretos originales, no hay un mecanismo de recuperación.

La copia exportada contiene la bóveda **ya cifrada**, no secretos en texto claro. Para abrirla tras importarla necesitarás la contraseña maestra con la que estaba cifrada.

## Archivos

- `manifest.json`
- `popup.html`
- `popup.css`
- `popup.js`
- `icons/`


## Nota sobre autorrelleno

La extensión prueba el documento principal y los iframes accesibles mediante `activeTab`. Chrome no permite inyectar código en ciertas páginas internas, iframes de otros orígenes sin permiso, iframes especialmente restringidos o campos encapsulados en Shadow DOM cerrado. En esos casos siempre queda disponible el botón Copiar.
