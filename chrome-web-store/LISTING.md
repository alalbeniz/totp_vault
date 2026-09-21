# Chrome Web Store — ficha de publicación

Este documento contiene los textos y declaraciones preparados para publicar **TOTP Vault v2.12.0** en Chrome Web Store.

## Identidad

**Nombre:** TOTP Vault

**Categoría sugerida:** Productividad

**Idioma principal:** Español

**Descripción corta:**

> Bóveda TOTP local y cifrada con QR, autorrelleno, bloqueo automático y copias de seguridad.

**Single purpose:**

> TOTP Vault almacena de forma local y cifrada cuentas TOTP y permite generar, importar, copiar y rellenar códigos de autenticación de dos factores.

## Descripción detallada

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

Privacidad y seguridad:

- La bóveda se cifra localmente con AES-256-GCM.
- La clave se deriva con PBKDF2-HMAC-SHA-256.
- La contraseña maestra no se almacena.
- No hay analítica, publicidad ni telemetría propia.
- Los secretos TOTP y códigos generados no se envían al desarrollador.
- El lector QR se ejecuta localmente; jsQR está incluido en el paquete.
- Los permisos de sitio son opcionales y se solicitan cuando una función los necesita.

TOTP Vault utiliza Manifest V3 y está diseñado para solicitar únicamente los permisos necesarios para sus funciones visibles.

## Justificación de permisos para Privacy practices

### storage

> Necesario para almacenar la bóveda TOTP cifrada, mantener temporalmente la sesión desbloqueada y conservar preferencias elegidas por el usuario.

### activeTab

> Se utiliza únicamente cuando el usuario inicia una acción sobre la pestaña activa, como rellenar un código TOTP o buscar un QR visible.

### scripting

> Necesario para detectar y rellenar campos OTP/TOTP en la pestaña sobre la que el usuario solicita la acción.

### clipboardWrite

> Permite copiar al portapapeles el código TOTP cuando el usuario pulsa explícitamente Copiar.

### optional_host_permissions: http://*/* y https://*/*

> Son permisos opcionales. Se solicitan por sitio o dominio para habilitar el selector inline y para descargar una imagen QR desde una URL proporcionada expresamente por el usuario.

## Código remoto

**Respuesta recomendada:** No.

> TOTP Vault no ejecuta código remoto. Las dependencias necesarias, incluido jsQR, están incluidas en el paquete publicado.

## Datos de usuario — guía de declaración

La extensión procesa información sensible de autenticación y contenido de sitios únicamente para sus funciones visibles. No transmite estos datos al desarrollador.

En el formulario de Chrome Web Store conviene declarar de forma conservadora las categorías que correspondan a:

- **Authentication information**: secretos TOTP y códigos de autenticación.
- **Website content**: campos OTP/TOTP y QR visible cuando el usuario usa autorrelleno, selector inline o lectura de QR.
- **Web browsing activity / domains or URLs**, si el formulario actual incluye una categoría equivalente: solo en la medida necesaria para recordar sitios autorizados y ejecutar funciones iniciadas por el usuario.

Para cada una, indicar que el uso es exclusivamente funcional, que no se vende ni se usa para publicidad y que no se transmite al desarrollador.

## Política de privacidad

URL preparada una vez integrado en main:

https://github.com/alalbeniz/totp_vault/blob/main/PRIVACY.md

## Página principal y soporte

**Homepage:**

https://github.com/alalbeniz/totp_vault

**Support URL:**

https://github.com/alalbeniz/totp_vault/issues

## Recursos gráficos preparados

El paquete de publicación incluye:

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

## Distribución sugerida para la primera revisión

Para una primera subida, **Unlisted** puede servir para completar la revisión y realizar una prueba de instalación desde Chrome Web Store antes de cambiar a **Public**. Todas las modalidades siguen sujetas a revisión y políticas de la Store.
