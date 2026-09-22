# Publicación en Chrome Web Store

## Extensión publicada

- **Extension ID:** `abiekbjdmcanmkjcimgfojklngfnpkok`
- **Ficha pública:** https://chromewebstore.google.com/detail/totp-vault/abiekbjdmcanmkjcimgfojklngfnpkok
- **API usada por CI:** Chrome Web Store API v2

La publicación automática se realiza mediante el workflow manual
`.github/workflows/chrome-web-store-release.yml`.

## Configuración inicial de GitHub

La API necesita conocer el publisher propietario de la extensión y autenticarse
con una cuenta de servicio autorizada en Chrome Web Store.

### 1. Variable de Actions

Crear en **Settings → Secrets and variables → Actions → Variables**:

- `CWS_PUBLISHER_ID`: Publisher ID mostrado en Chrome Web Store Developer Dashboard.

### 2. Service account de Google Cloud

1. Crear o seleccionar un proyecto en Google Cloud.
2. Habilitar **Chrome Web Store API**.
3. Crear una service account.
4. Conceder a la service account el rol **Service Account Token Creator sobre sí misma**,
   necesario para que GitHub genere el access token con el scope de Chrome Web Store.
5. En Chrome Web Store Developer Dashboard, añadir el correo de esa service account
   en la sección de cuenta/publisher con acceso a la API.
6. Crear una clave JSON para la service account.
7. Guardar el JSON completo en GitHub como secreto de Actions:
   - `CWS_SERVICE_ACCOUNT_JSON`

El JSON de la cuenta de servicio es secreto y nunca debe guardarse en el repositorio.

## Publicar una nueva versión

1. Actualizar `version` en `manifest.json`. Chrome Web Store no acepta volver a
   subir la misma versión.
2. Integrar el cambio en `main` y comprobar que CI está en verde.
3. Ir a **Actions → Chrome Web Store release → Run workflow**.
4. Introducir exactamente la versión indicada en `manifest.json`.
5. Elegir:
   - **Submit for review = false**: solo sube el paquete como borrador.
   - **Submit for review = true**: sube el paquete y lo envía a revisión.

El workflow:

- ejecuta los tests;
- regenera la copia local de jsQR;
- genera un ZIP con `manifest.json` en la raíz;
- valida la longitud de `description` del manifest;
- sube directamente ese ZIP a Chrome Web Store;
- espera a que Google confirme la carga;
- opcionalmente llama a `publish` para enviarlo a revisión.

## Nota sobre los artifacts de GitHub

GitHub envuelve los artifacts descargables en su propio ZIP. Por tanto, un artifact
llamado `totp-vault-vX.Y.Z-cws` puede contener dentro el ZIP real de Chrome Web
Store. El workflow de publicación no usa ese wrapper: envía directamente el archivo
`dist/totp-vault-vX.Y.Z-cws.zip` generado en el runner.

## Política de privacidad

URL pública:

https://github.com/alalbeniz/totp_vault/blob/main/PRIVACY.md
