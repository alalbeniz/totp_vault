const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const results = path.join(root, 'test-results');
const out = path.join(root, 'dist', 'store-assets');

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
  background: #eff4f8;
  color: #2a3742;
  font-family: Arial, Helvetica, sans-serif;
  position: relative;
}
.brand {
  position: absolute; left: 72px; top: 66px;
  display: flex; align-items: center; gap: 18px;
  font-size: 28px; font-weight: 700;
}
.brand img { width: 58px; height: 58px; object-fit: contain; }
.copy { position: absolute; left: 72px; top: 180px; width: ${inline ? '390px' : '550px'}; }
.copy h1 { margin: 0; font-size: ${inline ? '40px' : '44px'}; line-height: 1.18; letter-spacing: -1.2px; }
.copy p { margin: 20px 0 0; font-size: 25px; line-height: 1.45; color: #657480; }
.shot {
  position: absolute; right: ${inline ? '40px' : '78px'}; top: 50%;
  transform: translateY(-50%);
  max-width: ${inline ? '620px' : '500px'};
  max-height: 690px;
  object-fit: contain;
  filter: drop-shadow(8px 12px 13px rgba(40,55,70,.16));
}
</style>
</head>
<body>
  <div class="brand"><img src="${icon}" alt=""><span>TOTP Vault</span></div>
  <div class="copy"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
  <img class="shot" src="${image}" alt="">
</body>
</html>`;
}

function promoHtml({ width, height, icon }) {
  const titleSize = width < 600 ? 30 : 78;
  const subSize = width < 600 ? 18 : 38;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
body {
  background: #365469; color: white; font-family: Arial, Helvetica, sans-serif;
  display: flex; align-items: center; padding: 0 ${Math.round(width * .08)}px;
}
img { width: ${Math.round(height * .48)}px; height: ${Math.round(height * .48)}px; object-fit: contain; margin-right: ${Math.round(width * .06)}px; }
h1 { margin: 0; font-size: ${titleSize}px; line-height: 1.1; }
p { margin: ${Math.round(height * .05)}px 0 0; font-size: ${subSize}px; color: #e0ebf3; }
</style>
</head>
<body>
  <img src="${icon}" alt="">
  <div><h1>TOTP Vault</h1><p>TOTP local y cifrado</p></div>
</body>
</html>`;
}

(async () => {
  await fs.mkdir(out, { recursive: true });
  const iconFile = path.join(root, 'icons', 'icon128.png');
  const icon = await dataUrl(iconFile);
  const shots = [
    ['01-vault.png', 'vault.png', 'Tus códigos TOTP, a mano', 'Bóveda local y cifrada para tus cuentas.', false],
    ['02-qr-import.png', 'qr-import.png', 'Importa desde QR', 'Página, imagen, portapapeles o URL.', false],
    ['03-inline-fill.png', 'inline.png', 'Rellena sin copiar y pegar', 'Selector junto a campos OTP/TOTP.', true],
    ['04-settings.png', 'settings.png', 'Ajustes y seguridad', 'Bloqueo automático, temas y selector inline.', false],
    ['05-unlock.png', 'unlock.png', 'Protegido por contraseña maestra', 'La contraseña no se almacena.', false],
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    for (const [output, input, title, subtitle, inline] of shots) {
      const image = await dataUrl(path.join(results, input));
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.setContent(listingHtml({ image, title, subtitle, inline, icon }), { waitUntil: 'load' });
      await page.screenshot({ path: path.join(out, output), type: 'png' });
    }

    for (const [output, width, height] of [
      ['promo-small-440x280.png', 440, 280],
      ['promo-marquee-1400x560.png', 1400, 560],
    ]) {
      await page.setViewportSize({ width, height });
      await page.setContent(promoHtml({ width, height, icon }), { waitUntil: 'load' });
      await page.screenshot({ path: path.join(out, output), type: 'png' });
    }
  } finally {
    await browser.close();
  }

  await fs.copyFile(iconFile, path.join(out, 'store-icon-128.png'));

  const expected = [
    ['01-vault.png', 1280, 800],
    ['02-qr-import.png', 1280, 800],
    ['03-inline-fill.png', 1280, 800],
    ['04-settings.png', 1280, 800],
    ['05-unlock.png', 1280, 800],
    ['promo-small-440x280.png', 440, 280],
    ['promo-marquee-1400x560.png', 1400, 560],
    ['store-icon-128.png', 128, 128],
  ];

  for (const [file] of expected) {
    const stat = await fs.stat(path.join(out, file));
    if (!stat.size) throw new Error(`Empty store asset: ${file}`);
  }

  console.log(`Chrome Web Store assets generated in ${path.relative(root, out)}`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
