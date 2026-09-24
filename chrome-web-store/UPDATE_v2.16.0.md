# Actualización Chrome Web Store — TOTP Vault 2.16.0

Extensión existente: abiekbjdmcanmkjcimgfojklngfnpkok

## Subida manual

1. Abre https://chrome.google.com/webstore/devconsole y selecciona TOTP Vault.
2. En Package / Paquete, usa Upload New Package / Subir nuevo paquete.
3. Sube `totp-vault-v2.16.0-cws.zip` tal cual, sin descomprimirlo. Contiene manifest.json en la raíz y los cuatro idiomas.
4. En la ficha, actualiza las descripciones ES y EN y añade las traducciones FR e IT si quieres localizar también la página de la tienda. Copia los archivos DESCRIPTION_*.txt adjuntos; las traducciones de la extensión ya están en el ZIP.
5. Guarda y envía la actualización a revisión. Se actualiza la extensión existente; no crees una ficha nueva.

La versión del manifiesto es 2.16.0, superior a las versiones 2.15.x usadas durante los ajustes anteriores. Si el panel tuviera una versión igual o superior, habrá que incrementar de nuevo el manifiesto antes de subir.

## Novedades ES

Añadidos francés e italiano, junto con español e inglés, con selección manual o automática según Chrome. Tarjetas TOTP rediseñadas con código central, acciones inferiores y altura adaptable, manteniendo el popup de 420 px. El contador se muestra en rojo cuando quedan 5 segundos o menos. Incluye importación de Google Authenticator con múltiples cuentas y lotes de varios QR.

## Release notes EN

Added French and Italian alongside Spanish and English, with manual selection or Chrome language detection. Redesigned TOTP cards with centered codes, bottom actions and adaptive height in the 420px popup. The countdown turns red at 5 seconds or less. Includes Google Authenticator import with multiple accounts and multi-QR batches.

## Nouveautés FR

Ajout du français et de l’italien aux côtés de l’espagnol et de l’anglais. Cartes TOTP avec code central, actions en bas et hauteur adaptable dans une fenêtre de 420 px. Compteur rouge à 5 secondes ou moins. Importation Google Authenticator avec plusieurs comptes et lots de QR.

## Novità IT

Aggiunti francese e italiano, oltre a spagnolo e inglese. Schede TOTP con codice centrale, azioni inferiori e altezza adattabile nel popup di 420 px. Contatore rosso a 5 secondi o meno. Importazione da Google Authenticator con più account e lotti di QR.

## Permisos y privacidad

Estos cambios no añaden permisos ni recopilación de datos. Se mantiene el almacenamiento local cifrado y el procesamiento local de las importaciones. No requieren cambiar las declaraciones de privacidad por sí mismos.

## Alternativa con GitHub Actions

Actions → Chrome Web Store release → Run workflow, rama main, versión 2.16.0.
`submit_for_review=false` sube un borrador; `true` solicita revisión. Requiere que la cuenta de servicio y CWS_PUBLISHER_ID estén configurados. El workflow incluye i18n.js y los cuatro catálogos.

## Validación

Catálogos completos y variables preservadas; cambio de idioma y persistencia; pruebas de interfaz, cifrado, TOTP, QR, copia/relleno y tarjetas adaptables. APIs de Chrome simuladas en las pruebas; no se ha realizado una publicación ni una instalación real desde CWS.

Referencia oficial: https://developer.chrome.com/docs/webstore/update
