# Política de privacidad de TOTP Vault

**Última actualización:** 22 de septiembre de 2026

TOTP Vault es una extensión de Chrome para almacenar, generar, importar y rellenar códigos TOTP de autenticación de dos factores.

[English version](PRIVACY_EN.md)

Su diseño es local: no utiliza servidores propios, analítica, publicidad ni telemetría.

**El desarrollador de TOTP Vault no recibe ni recopila datos de los usuarios.** Los datos necesarios para el funcionamiento de la extensión se procesan localmente en el navegador del usuario, salvo las solicitudes de red iniciadas expresamente por el propio usuario, como descargar una imagen QR desde una URL indicada por él.

## Datos que procesa la extensión

TOTP Vault puede procesar los siguientes datos cuando el usuario utiliza sus funciones:

- Secretos TOTP, nombres o descripciones de cuentas, emisor, algoritmo, número de dígitos y periodo.
- Códigos TOTP generados temporalmente para mostrarlos, copiarlos o rellenarlos.
- Contraseña maestra introducida por el usuario para desbloquear la bóveda.
- Iconos personalizados que el usuario decida asociar a una cuenta.
- Preferencias de la extensión, como idioma, tema visual, bloqueo automático, visibilidad y configuración del selector inline.
- Dominios o sitios autorizados por el usuario para funciones opcionales como el selector inline.
- Contenido de la pestaña activa únicamente cuando el usuario solicita localizar o rellenar un campo OTP/TOTP o leer un QR visible.
- Imágenes QR aportadas por el usuario desde archivo, portapapeles, pestaña visible o URL.

## Almacenamiento y cifrado

La bóveda se almacena localmente en el navegador y se cifra mediante **AES-256-GCM**.

La clave se deriva de la contraseña maestra mediante **PBKDF2-HMAC-SHA-256 con 310.000 iteraciones**.

La contraseña maestra **no se almacena**. La clave de sesión se conserva únicamente de forma temporal mientras la bóveda permanece desbloqueada.

Las preferencias de funcionamiento y los sitios autorizados pueden almacenarse localmente en el perfil de Chrome para conservar la configuración elegida por el usuario.

## Transmisión de datos

TOTP Vault no envía al desarrollador los secretos TOTP, códigos generados, contraseña maestra, contenido de páginas, historial de navegación, imágenes QR ni otros datos de la bóveda.

El desarrollador no recibe estos datos ni dispone de un backend, sistema de analítica o servicio de telemetría que los recopile. No existe un servidor de TOTP Vault que reciba los datos de la bóveda o la actividad del usuario.

Cuando el usuario proporciona explícitamente una URL de imagen para importar un QR, la extensión solicita acceso únicamente al dominio correspondiente y descarga esa imagen para procesarla. Esa solicitud se realiza directamente entre el navegador del usuario y el servidor indicado por el propio usuario.

El lector QR incluido en la extensión se ejecuta localmente. La biblioteca jsQR se incluye dentro del paquete de la extensión y no se descarga ni ejecuta código remoto en tiempo de ejecución.

## Uso de contenido de páginas web

El acceso a una pestaña o sitio web se utiliza exclusivamente para funciones visibles solicitadas por el usuario, como:

- localizar y rellenar un campo OTP/TOTP;
- mostrar el selector inline junto a un campo de verificación;
- buscar un QR visible en la pestaña actual.

TOTP Vault no utiliza esta información para publicidad, perfiles de usuario, analítica, seguimiento entre sitios ni monetización.

## Portapapeles

La extensión puede escribir un código TOTP en el portapapeles cuando el usuario pulsa **Copiar**. TOTP Vault no monitoriza el portapapeles de forma permanente.

Una imagen del portapapeles solo se procesa cuando el usuario activa expresamente la opción de importar desde QR y pega una imagen.

## Compartición y venta de datos

TOTP Vault no vende datos de usuarios.

TOTP Vault no comparte datos de la bóveda con anunciantes, corredores de datos ni terceros para publicidad, marketing o creación de perfiles.

## Retención y eliminación

Los datos permanecen en el navegador del usuario hasta que este los modifica, elimina o desinstala la extensión.

El usuario puede eliminar cuentas individuales desde la propia extensión. Al eliminar los datos de almacenamiento de la extensión o desinstalarla, Chrome elimina los datos locales asociados conforme a su propio funcionamiento.

Las copias de seguridad exportadas quedan bajo el control del usuario y se almacenan donde este decida guardarlas.

## Permisos de Chrome

TOTP Vault utiliza únicamente permisos relacionados con sus funciones:

- **storage**: almacenar la bóveda cifrada, la sesión temporal y preferencias.
- **activeTab**: acceder temporalmente a la pestaña activa cuando el usuario inicia una acción.
- **scripting**: ejecutar el autorrelleno y detección necesaria en la pestaña solicitada.
- **clipboardWrite**: copiar códigos TOTP al portapapeles por orden del usuario.
- **http://*/* y https://*/* (opcionales)**: habilitar funciones por sitio y descargar una imagen QR únicamente cuando el usuario concede el permiso correspondiente.

## Menores

TOTP Vault no está diseñado específicamente para recopilar información de menores y no dispone de sistemas propios de registro o creación de perfiles de usuario.

## Cambios en esta política

Si una futura versión cambia de forma material el tratamiento de datos, esta política se actualizará y los cambios relevantes se reflejarán también en la ficha de Chrome Web Store cuando corresponda.

## Chrome Web Store Limited Use

El uso de datos por parte de TOTP Vault está limitado exclusivamente a proporcionar y mejorar las funciones visibles de autenticación TOTP descritas al usuario. TOTP Vault cumple con la Chrome Web Store User Data Policy, incluidos sus requisitos de Limited Use.

## Contacto

Para consultas, incidencias o solicitudes relacionadas con privacidad:

https://github.com/alalbeniz/totp_vault/issues
