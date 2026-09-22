const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const results = path.join(root, 'test-results');
const out = path.join(root, 'dist', 'store-assets');
const localizedOut = path.join(out, 'localized');
const globalOut = path.join(out, 'global');

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

async function dataUrl(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'application/octet-stream';
  return `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
}

function listingHtml({ image, title, subtitle, inline = false, icon }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: 1280px; height: 800px; overflow: hidden; }
body {
  background:
    radial-gradient(circle at 12% 8%, rgba(255,255,255,.95) 0 11%, transparent 32%),
    linear-gradient(135deg, #edf4f8 0%, #e7eff4 54%, #dce9f1 100%);
  color: #253744;
  font-family: Arial, Helvetica, sans-serif;
  position: relative;
}
.brand {
  position: absolute; left: 62px; top: 54px;
  display: flex; align-items: center; gap: 14px;
  font-size: 24px; font-weight: 700; letter-spacing: -.2px;
}
.brand img { width: 48px; height: 48px; object-fit: contain; }
.copy {
  position: absolute; left: 62px; top: 180px;
  width: ${inline ? '390px' : '405px'};
}
.copy h1 {
  margin: 0;
  font-size: ${inline ? '39px' : '42px'};
  line-height: 1.12;
  letter-spacing: -1.2px;
}
.copy p {
  margin: 18px 0 0;
  font-size: 22px;
  line-height: 1.4;
  color: #61727d;
}
.rule {
  width: 74px; height: 5px; border-radius: 999px;
  margin-top: 28px; background: #58788d;
}
.shot {
  position: absolute;
  right: ${inline ? '28px' : '54px'};
  top: 50%;
  transform: translateY(-50%);
  max-width: ${inline ? '650px' : '520px'};
  max-height: 716px;
  object-fit: contain;
  filter: drop-shadow(10px 16px 18px rgba(40,55,70,.18));
}
</style>
</head>
<body>
  <div class="brand"><img src="${icon}" alt=""><span>TOTP Vault</span></div>
  <div class="copy"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><div class="rule"></div></div>
  <img class="shot" src="${image}" alt="">
</body>
</html>`;
}

function promoHtml({ width, height, icon }) {
  const compact = width < 600;
  const titleSize = compact ? 31 : 80;
  const iconSize = Math.round(height * (compact ? .40 : .46));
  const gap = Math.round(width * (compact ? .05 : .055));
  const dot = Math.max(7, Math.round(height * .025));
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
body {
  background:
    radial-gradient(circle at 82% 18%, rgba(130,181,207,.24), transparent 28%),
    linear-gradient(135deg, #243f52 0%, #355b72 58%, #3e6d86 100%);
  color: white;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wrap { display: flex; align-items: center; gap: ${gap}px; }
img { width: ${iconSize}px; height: ${iconSize}px; object-fit: contain; }
h1 { margin: 0; font-size: ${titleSize}px; line-height: 1; letter-spacing: -1px; }
.code { display: flex; gap: ${Math.max(4, Math.round(dot * .7))}px; margin-top: ${Math.round(height * .07)}px; }
.code span { width: ${dot}px; height: ${dot}px; border-radius: 50%; background: rgba(255,255,255,.76); }
.code span:nth-child(4) { margin-left: ${Math.max(5, dot)}px; }
</style>
</head>
<body>
  <div class="wrap">
    <img src="${icon}" alt="">
    <div>
      <h1>TOTP Vault</h1>
      <div class="code" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const localizedShots = {
  es: [
    ['01-vault.png', 'vault-es.png', 'Tus códigos 2FA, a mano', 'Bóveda local y cifrada.', false],
    ['02-qr-import.png', 'qr-import-es.png', 'Importa un QR en segundos', 'Página, imagen, portapapeles o URL.', false],
    ['03-inline-fill.png', 'inline-es.png', 'Rellena sin copiar y pegar', 'Selector junto a campos OTP/TOTP.', true],
    ['04-settings.png', 'settings-es.png', 'Tu bóveda, a tu manera', 'Idioma, bloqueo, temas y autorrelleno.', false],
    ['05-unlock.png', 'unlock-es.png', 'Protegida por contraseña maestra', 'Tu contraseña no se almacena.', false],
  ],
  en: [
    ['01-vault.png', 'vault-en.png', 'Your 2FA codes, at hand', 'A local encrypted vault.', false],
    ['02-qr-import.png', 'qr-import-en.png', 'Import a QR code in seconds', 'Page, image, clipboard, or URL.', false],
    ['03-inline-fill.png', 'inline-en.png', 'Fill codes without copy and paste', 'Picker next to OTP/TOTP fields.', true],
    ['04-settings.png', 'settings-en.png', 'Your vault, your way', 'Language, locking, themes, and autofill.', false],
    ['05-unlock.png', 'unlock-en.png', 'Protected by your master password', 'Your password is not stored.', false],
  ],
};

(async () => {
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(localizedOut, { recursive: true });
  await fs.mkdir(path.join(globalOut, 'screenshots'), { recursive: true });

  const iconFile = path.join(root, 'icons', 'icon128.png');
  const icon = await dataUrl(iconFile);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    for (const [locale, shots] of Object.entries(localizedShots)) {
      const localeOut = path.join(localizedOut, locale);
      await fs.mkdir(localeOut, { recursive: true });
      for (const [output, input, title, subtitle, inline] of shots) {
        const image = await dataUrl(path.join(results, input));
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.setContent(listingHtml({ image, title, subtitle, inline, icon }), { waitUntil: 'load' });
        await page.screenshot({ path: path.join(localeOut, output), type: 'png' });
      }
    }

    for (const [output, width, height] of [
      ['promo-small-440x280.png', 440, 280],
      ['promo-marquee-1400x560.png', 1400, 560],
    ]) {
      await page.setViewportSize({ width, height });
      await page.setContent(promoHtml({ width, height, icon }), { waitUntil: 'load' });
      await page.screenshot({ path: path.join(globalOut, output), type: 'png' });
    }
  } finally {
    await browser.close();
  }

  await fs.copyFile(iconFile, path.join(globalOut, 'store-icon-128.png'));

  await fs.writeFile(
    path.join(globalOut, 'screenshots', 'README.txt'),
    [
      'GLOBAL SCREENSHOTS: intentionally left empty.',
      '',
      'Upload the five screenshots under localized/es when the Store listing language is Spanish,',
      'and the five screenshots under localized/en when the Store listing language is English.',
      '',
      'Chrome Web Store displays localized screenshots before global screenshots. Because both',
      'supported locales already have a complete five-image set, uploading global screenshots would',
      'duplicate the same product story after the localized images.',
      '',
      'If the Developer Dashboard ever requires a global fallback screenshot, use localized/es/01-vault.png',
      'as the default-locale fallback only.'
    ].join('\n') + '\n'
  );

  await fs.writeFile(
    path.join(out, 'README.txt'),
    [
      'TOTP Vault - Chrome Web Store assets',
      '',
      'localized/es/   -> Localized screenshots, select Spanish in the Dashboard.',
      'localized/en/   -> Localized screenshots, select English in the Dashboard.',
      'global/         -> Store icon and promo tiles. These assets cannot be localized.',
      'global/screenshots/README.txt -> Why global screenshots are intentionally not supplied.',
      '',
      'Do not upload the localized screenshots into the Global screenshots field.'
    ].join('\n') + '\n'
  );

  const expected = [
    ...Object.keys(localizedShots).flatMap(locale =>
      localizedShots[locale].map(([file]) => path.join('localized', locale, file))
    ),
    path.join('global', 'promo-small-440x280.png'),
    path.join('global', 'promo-marquee-1400x560.png'),
    path.join('global', 'store-icon-128.png'),
  ];

  for (const file of expected) {
    const stat = await fs.stat(path.join(out, file));
    if (!stat.size) throw new Error(`Empty store asset: ${file}`);
  }

  console.log(`Chrome Web Store assets generated in ${path.relative(root, out)}`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
