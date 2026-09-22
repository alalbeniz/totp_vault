# TOTP Vault Privacy Policy

**Last updated:** September 22, 2026

TOTP Vault is a Chrome extension for storing, generating, importing, and filling TOTP two-factor authentication codes.

[Versión en español](PRIVACY.md)

TOTP Vault is designed to operate locally. It does not use developer-operated servers, first-party analytics, advertising, or telemetry.

**The developer of TOTP Vault does not receive or collect user data.** Data required for the extension to work is processed locally in the user's browser, except for network requests explicitly initiated by the user, such as downloading a QR image from a URL provided by the user.

## Data processed by the extension

TOTP Vault may process:

- TOTP secrets, account names or descriptions, issuer, algorithm, digits, and period.
- TOTP codes generated temporarily for display, copying, or filling.
- The master password entered by the user to unlock the vault.
- Custom account icons selected by the user.
- Preferences such as language, theme, automatic locking, visibility, and inline picker configuration.
- Sites or domains explicitly authorized by the user for optional features.
- Active-tab content only when the user asks the extension to locate or fill an OTP/TOTP field or scan a visible QR code.
- QR images supplied from a file, clipboard, visible tab, or URL.

## Storage and encryption

The vault is stored locally in the browser and encrypted with **AES-256-GCM**.

The key is derived from the master password using **PBKDF2-HMAC-SHA-256 with 310,000 iterations**.

The master password is **not stored**. The session key is kept only temporarily while the vault remains unlocked.

## Data transmission

TOTP Vault does not send TOTP secrets, generated codes, the master password, page content, browsing history, QR images, or vault data to the developer.

The developer does not operate a backend, analytics system, or telemetry service that receives this information.

When the user explicitly provides an image URL for QR import, the extension requests access only to the relevant domain and downloads the image directly from the server chosen by the user so it can be processed locally.

QR decoding runs locally. The jsQR library is bundled with the extension and no remote code is downloaded or executed at runtime.

## Website content

Access to a tab or website is used only for visible, user-requested features such as:

- locating and filling an OTP/TOTP field;
- displaying the optional inline picker next to a verification field;
- scanning a QR code visible on the current tab.

TOTP Vault does not use this information for advertising, profiling, analytics, cross-site tracking, or monetization.

## Clipboard

The extension may write a TOTP code to the clipboard when the user explicitly clicks **Copy**. It does not continuously monitor clipboard content.

A clipboard image is processed only when the user explicitly starts QR import and pastes an image.

## Sharing and sale of data

TOTP Vault does not sell user data and does not share vault data with advertisers, data brokers, or third parties for advertising, marketing, or profiling.

## Retention and deletion

Data remains in the user's browser until the user modifies it, removes it, clears extension storage, or uninstalls the extension.

Exported backups remain under the user's control and are stored wherever the user chooses.

## Chrome permissions

TOTP Vault uses permissions only for its visible functionality:

- **storage**: store the encrypted vault, temporary session data, and preferences.
- **activeTab**: temporarily access the active tab when the user initiates an action.
- **scripting**: run the requested autofill and field-detection logic.
- **clipboardWrite**: copy TOTP codes to the clipboard on user request.
- **http://*/* and https://*/* (optional)**: enable site-specific optional features and download a QR image only after the user grants the relevant permission.

## Children

TOTP Vault is not specifically designed to collect information from children and does not operate its own account or profiling system.

## Changes to this policy

If a future version materially changes how data is handled, this policy will be updated and relevant changes will also be reflected in the Chrome Web Store listing when appropriate.

## Chrome Web Store Limited Use

TOTP Vault uses data only to provide and improve the visible TOTP authentication features described to the user. Its use of data is limited to the disclosed single purpose and related operational requirements.

## Contact

For privacy questions or issues:

https://github.com/alalbeniz/totp_vault/issues
