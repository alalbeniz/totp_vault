# Actualización Chrome Web Store — TOTP Vault v2.15.0

## Paquete

Subir en **Package → Upload New Package**:

`totp-vault-v2.15.0-cws.zip`

## Cambios principales

- Importación de exportaciones de Google Authenticator (`otpauth-migration://`).
- Soporte para varias cuentas dentro del mismo QR.
- Soporte para exportaciones divididas en varios QR: la extensión acumula el lote y solo habilita la importación cuando están todos.
- Las entradas HOTP o con parámetros no compatibles se omiten y se informa al usuario.
- Las cuentas detectadas se revisan antes de importarlas y no se muestran los secretos.
- Tarjetas TOTP más compactas.
- Tipografía de los botones de Ajustes más legible.
- Contador TOTP en rojo suave cuando quedan menos de 5 segundos.

## Permisos y privacidad

No se añaden permisos nuevos.

La exportación de Google Authenticator se decodifica completamente en el navegador. No se envía el contenido del QR, los secretos ni las cuentas a ningún servidor.

**Remote code:** No.

## Release notes ES

Añadida importación de Google Authenticator con soporte para múltiples cuentas y lotes de varios QR. También se han compactado las tarjetas, mejorado la legibilidad de los botones y añadido aviso visual en rojo suave durante los últimos 4 segundos del TOTP.

## Release notes EN

Added Google Authenticator import with support for multiple accounts and multi-QR batches. TOTP cards are more compact, buttons are easier to read, and the countdown now uses a soft red during the final 4 seconds.
