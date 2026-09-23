// Real popup scripts and WebCrypto, with Chrome APIs replaced by isolated test doubles.
// No personal browser profile or real account secrets are used.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const results = path.join(root, 'test-results');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const qrRows = `000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000
000011111110010101010111001111100011111110000
000010000010111010010111001011101010000010000
000010111010101010111011111110111010111010000
000010111010101101001101010011001010111010000
000010111010001011101011100110011010111010000
000010000010010001110010111010101010000010000
000011111110101010101010101010101011111110000
000000000000101000100001010110111000000000000
000010000010110001010010111011101110011100000
000010011001100110100000101101010111101100000
000011011010010101100000111000011100010110000
000011000100011111111000000000110100010010000
000000001011100100100001100100011111011010000
000000101001000001101101100100110000000110000
000010000110011101011100110001010000110110000
000000010000110011110110000010101010011010000
000001001110111011011000010001011111011110000
000001001001001010100010101100111111010100000
000000111011010101010100110111010000001010000
000010110101100101100011101010010100010100000
000000110010010100011111001100111111110100000
000010011101001100000001011101110100101010000
000011011111101111011010101010110010000110000
000001001100111010110001010110101010110100000
000010011011011000011111010011010110000110000
000011111101010001001100010001011000001000000
000010101111101011100000111010011111110110000
000010111000101001110000100000101010011100000
000010010111100101101000101001101111100010000
000000000000101010101111100110111000110100000
000011111110000001011001011110001010101110000
000010000010001100010111101110111000110110000
000010111010010010111001010001111111101000000
000010111010011110001110010100110110001010000
000010111010010001111111001000101001010110000
000010000010011111000011101010101110010010000
000011111110100110011100001010001100111010000
000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000`.trim().split('\n');
function testQrSvg() {
  const size = qrRows.length;
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (qrRows[y][x] === '1') cells.push(`M${x} ${y}h1v1h-1z`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="450" height="450"><rect width="100%" height="100%" fill="white"/><path d="${cells.join('')}" fill="black"/></svg>`;
}

function protoVarint(value) {
  let n = BigInt(value);
  const out = [];
  do {
    let byte = Number(n & 0x7fn);
    n >>= 7n;
    if (n) byte |= 0x80;
    out.push(byte);
  } while (n);
  return Buffer.from(out);
}

function protoFieldVarint(field, value) {
  return Buffer.concat([protoVarint((field << 3) | 0), protoVarint(value)]);
}

function protoFieldBytes(field, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return Buffer.concat([protoVarint((field << 3) | 2), protoVarint(bytes.length), bytes]);
}

function migrationOtp({ secret, name, issuer, algorithm = 1, digits = 1, type = 2 }) {
  return Buffer.concat([
    protoFieldBytes(1, secret),
    protoFieldBytes(2, Buffer.from(name, 'utf8')),
    protoFieldBytes(3, Buffer.from(issuer, 'utf8')),
    protoFieldVarint(4, algorithm),
    protoFieldVarint(5, digits),
    protoFieldVarint(6, type)
  ]);
}

function migrationUri(entries, { batchSize = 1, batchIndex = 0, batchId = 4242 } = {}) {
  const payload = Buffer.concat([
    ...entries.map(entry => protoFieldBytes(1, migrationOtp(entry))),
    protoFieldVarint(2, 1),
    protoFieldVarint(3, batchSize),
    protoFieldVarint(4, batchIndex),
    protoFieldVarint(5, batchId)
  ]);
  return `otpauth-migration://offline?data=${encodeURIComponent(payload.toString('base64'))}`;
}
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/__test_qr.svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.end(testQrSvg());
      return;
    }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) throw Error('Invalid path');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end(); }
});

async function mockChrome() {
  const listeners = [];
  const area = (name) => ({
    async setAccessLevel() {},
    async get(key) {
      const data = JSON.parse(localStorage.getItem('__test_' + name) || '{}');
      if (!key) return data;
      if (typeof key === 'string') return { [key]: data[key] };
      return Object.fromEntries(key.map(k => [k, data[k]]));
    },
    async set(values) {
      const data = await this.get();
      const changes = {};
      for (const [key, value] of Object.entries(values)) changes[key] = { oldValue: data[key], newValue: value };
      localStorage.setItem('__test_' + name, JSON.stringify({ ...data, ...values }));
      listeners.forEach(fn => fn(changes, name));
    },
    async remove(key) {
      const data = await this.get(); delete data[key];
      localStorage.setItem('__test_' + name, JSON.stringify(data));
    }
  });
  window.__copied = '';
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copied = text; } } });
  window.chrome = {
    storage: { local: area('local'), session: area('session'), onChanged: { addListener: fn => listeners.push(fn) } },
    runtime: { getURL: file => new URL('/' + file, location.origin).href, sendMessage: async () => ({ ok: true }) },
    i18n: { getMessage: () => '', getUILanguage: () => 'es-ES' },
    tabs: {
      query: async () => [{ id: 1, windowId: 1, url: 'https://example.test/login' }],
      captureVisibleTab: async () => window.__testCaptureDataUrl || ''
    },
    permissions: { request: async () => true, remove: async () => true, contains: async () => true },
    scripting: { executeScript: async ({ args }) => { window.__filled = args?.[0]; return [{ result: { ok: true, message: 'Código rellenado.' } }]; } }
  };
}

(async () => {
  await fs.mkdir(results, { recursive: true });
  const packageMeta = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const bundledJsQrVersion = (await fs.readFile(path.join(root, 'vendor', 'jsQR-VERSION'), 'utf8')).trim();
  assert.equal(bundledJsQrVersion, packageMeta.dependencies.jsqr);
  assert.equal((await fs.stat(path.join(root, 'vendor', 'jsQR.js'))).size > 100000, true);

  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.default_locale, 'es');
  assert.equal(manifest.name, '__MSG_extensionName__');
  assert.equal(manifest.description, '__MSG_extensionDescription__');
  assert.equal(manifest.version, '2.15.0');
  const esLocale = JSON.parse(await fs.readFile(path.join(root, '_locales', 'es', 'messages.json'), 'utf8'));
  const enLocale = JSON.parse(await fs.readFile(path.join(root, '_locales', 'en', 'messages.json'), 'utf8'));
  assert.deepEqual(Object.keys(enLocale).sort(), Object.keys(esLocale).sort());
  assert.equal(esLocale.extensionDescription.message.length <= 132, true);
  assert.equal(enLocale.extensionDescription.message.length <= 132, true);
  const localizedSources = await Promise.all(
    ['popup-core.js','popup-ui.js','popup-qr.js','popup-migration.js','popup.js','visibility.js','content.js','service_worker.js']
      .map(file => fs.readFile(path.join(root, file), 'utf8'))
  );
  const usedLocaleKeys = new Set();
  for (const source of localizedSources) {
    for (const match of source.matchAll(/\b(?:tvt|tr)\(\s*["']([^"']+)["']/g)) usedLocaleKeys.add(match[1]);
  }
  for (const key of usedLocaleKeys) assert.ok(esLocale[key] && enLocale[key], `Missing locale key: ${key}`);
  for (const size of [16, 32, 48, 128]) {
    const iconPath = `icons/icon${size}.png`;
    assert.equal(manifest.icons[String(size)], iconPath);
    assert.equal(manifest.action.default_icon[String(size)], iconPath);
    const icon = await fs.readFile(path.join(root, iconPath));
    assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(icon.readUInt32BE(16), size);
    assert.equal(icon.readUInt32BE(20), size);
  }

  // Chrome action popups derive their viewport from the document's intrinsic
  // dimensions. Root viewport-relative sizing (vw/vh/dvh) can collapse the
  // popup before Chrome has a stable viewport, even though normal-page tests pass.
  const inlineJs = await fs.readFile(path.join(root, 'content.js'), 'utf8');
  assert.doesNotMatch(inlineJs, /\.innerHTML\s*=/);

  const popupCss = await fs.readFile(path.join(root, 'popup-core.css'), 'utf8');
  const rootSizing = popupCss.match(/html\s*\{[\s\S]*?\}\s*body\s*\{[\s\S]*?\}/)?.[0] || '';
  assert.match(rootSizing, /width:\s*420px/);
  assert.match(rootSizing, /height:\s*600px/);
  assert.doesNotMatch(rootSizing, /\b(?:vw|vh|dvh|svh|lvh)\b/);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 420, height: 600 }, deviceScaleFactor: 2 });
    await context.addInitScript(mockChrome);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? 'pastel-test-password' : undefined));
    const shot = name => page.screenshot({ path: path.join(results, name + '.png') });
    const setLanguage = async language => {
      await page.evaluate(async value => {
        const data = await chrome.storage.local.get('settings');
        await chrome.storage.local.set({ settings: { ...(data.settings || {}), language: value } });
      }, language);
      await page.reload();
      await page.locator('#vaultView:not(.hidden), #unlockView:not(.hidden), #setupView:not(.hidden)').first().waitFor();
    };
    await page.goto(`http://127.0.0.1:${server.address().port}/popup.html`);
    await page.locator('#setupView:not(.hidden)').waitFor();
    await page.evaluate(() => {
      chrome.i18n.getUILanguage = () => 'en-US';
      chrome.i18n.getMessage = key => ({ setupTitle: 'Everything starts with a key.' }[key] || '');
      TotpI18n.localizeDocument();
    });
    assert.equal(await page.locator('#setupView h1').innerText(), 'Everything starts with a key.');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await shot('setup');
    await page.locator('#setupPassword').fill('pastel-test-password');
    await page.locator('#setupPassword2').fill('pastel-test-password');
    await page.locator('#setupForm button[type=submit]').click();
    await page.locator('#vaultView:not(.hidden)').waitFor();
    assert.equal(await page.locator('#emptyState').isVisible(), true);
    await shot('empty');

    // Manual language override: System follows Chrome; explicit English overrides it.
    await page.locator('#settingsBtn').click();
    await page.locator('#settingsPanel:not(.hidden)').waitFor();
    assert.equal(await page.locator('#languageSelect').inputValue(), 'system');
    assert.equal(await page.locator('#supportLink').getAttribute('href'), 'https://buymeacoffee.com/alalbeniz');
    assert.equal(await page.locator('#supportLink').getAttribute('target'), '_blank');
    assert.match(await page.locator('#supportLink').innerText(), /Invítame a una cerveza/);
    await page.locator('#languageSelect').selectOption('en');
    await page.locator('#vaultView:not(.hidden)').waitFor();
    await page.locator('#settingsPanel.hidden').waitFor({ state: 'attached' });
    assert.match(await page.locator('.collection-heading h2').innerText(), /My codes/);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');

    await page.locator('#settingsBtn').click();
    await page.locator('#settingsPanel:not(.hidden)').waitFor();
    assert.equal(await page.locator('#languageSelect').inputValue(), 'en');
    assert.equal(await page.locator('.language-setting').first().innerText().then(text => text.split('\n')[0].trim()), 'Language');
    assert.match(await page.locator('#supportTitle').innerText(), /Support TOTP Vault/);
    assert.match(await page.locator('#supportLink').innerText(), /Buy me a beer/);
    await page.locator('#languageSelect').selectOption('system');
    await page.locator('#vaultView:not(.hidden)').waitFor();
    assert.match(await page.locator('.collection-heading h2').innerText(), /Mis códigos/);
    assert.equal(await page.locator('html').getAttribute('lang'), 'es');

    // QR import: local file, direct image URL, pasted image and current-page capture
    // all use the same real jsQR decoder and end in the existing review form.
    const assertQrReview = async () => {
      await page.locator('#addPanel:not(.hidden)').waitFor();
      assert.equal(await page.locator('#name').inputValue(), 'GitHub · qr-demo');
      assert.match(await page.locator('#secret').inputValue(), /^otpauth:\/\/totp\/GitHub:qr-demo/);
      assert.match(await page.locator('#formError').innerText(), /Revisa los datos/);
      await page.locator('#cancelAdd').click();
      await page.locator('#addPanel.hidden').waitFor({ state: 'attached' });
    };

    await page.locator('#qrImportBtn').click();
    await page.locator('#qrPanel:not(.hidden)').waitFor();
    assert.equal(await page.locator('#qrPanel').evaluate(el => el.scrollHeight > el.clientHeight + 2), false);
    await shot('qr-import-es');
    await page.locator('#qrFileInput').setInputFiles({
      name: 'qr.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(testQrSvg())
    });
    await assertQrReview();

    await page.locator('#qrImportBtn').click();
    await page.locator('#qrUrlInput').fill(`http://127.0.0.1:${server.address().port}/__test_qr.svg`);
    await page.locator('#qrUrlBtn').click();
    await assertQrReview();

    await page.locator('#qrImportBtn').click();
    await page.locator('#qrPasteBtn').click();
    await page.evaluate(async () => {
      const blob = await fetch('/__test_qr.svg').then(r => r.blob());
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], 'qr.svg', { type: 'image/svg+xml' }));
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: transfer });
      document.dispatchEvent(event);
    });
    await assertQrReview();

    await page.evaluate(async () => {
      const blob = await fetch('/__test_qr.svg').then(r => r.blob());
      window.__testCaptureDataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    });
    await page.locator('#qrImportBtn').click();
    await page.locator('#qrPageBtn').click();
    await assertQrReview();

    await setLanguage('en');
    await page.locator('#qrImportBtn').click();
    await page.locator('#qrPanel:not(.hidden)').waitFor();
    await shot('qr-import-en');
    await setLanguage('es');

    // Google Authenticator migration exports use a protobuf payload inside
    // otpauth-migration://. Multi-QR batches are accumulated before importing.
    const migrationPart1 = migrationUri([
      { secret: Buffer.from('Hello!\\xde\\xad\\xbe\\xef', 'binary'), name: 'demo@example.com', issuer: 'Google', algorithm: 1, digits: 1, type: 2 },
      { secret: Buffer.from('HOTP-secret', 'utf8'), name: 'legacy', issuer: 'Legacy', algorithm: 1, digits: 1, type: 1 }
    ], { batchSize: 2, batchIndex: 0, batchId: 77 });
    const migrationPart2 = migrationUri([
      { secret: Buffer.from('1234567890', 'utf8'), name: 'demo-user', issuer: 'GitHub', algorithm: 2, digits: 2, type: 2 }
    ], { batchSize: 2, batchIndex: 1, batchId: 77 });

    await page.locator('#qrImportBtn').click();
    await page.locator('#qrUrlInput').fill(migrationPart1);
    await page.locator('#qrUrlBtn').click();
    await page.locator('#qrMigrationReview:not(.hidden)').waitFor();
    assert.equal(await page.locator('#qrMigrationCount').innerText(), '1');
    assert.equal(await page.locator('#qrMigrationImportBtn').isDisabled(), true);
    assert.match(await page.locator('#qrMigrationBatchInfo').innerText(), /1 de 2/);

    await page.locator('#qrUrlInput').fill(migrationPart2);
    await page.locator('#qrUrlBtn').click();
    assert.equal(await page.locator('#qrMigrationCount').innerText(), '2');
    assert.equal(await page.locator('.qr-migration-item').count(), 2);
    assert.equal(await page.locator('#qrMigrationImportBtn').isEnabled(), true);
    assert.match(await page.locator('#qrMigrationSummary').innerText(), /1 entrada no compatible/);
    await shot('qr-google-authenticator');

    await page.locator('#qrMigrationImportBtn').click();
    await page.locator('#qrPanel.hidden').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.totp-card').count(), 2);
    assert.deepEqual(
      (await page.locator('.card-title').allInnerTexts()).sort(),
      ['GitHub · demo-user', 'Google · demo@example.com'].sort()
    );
    assert.match(await page.locator('#vaultStatus').innerText(), /2 cuentas importadas/);

    // Remove migration fixtures before the rest of the CRUD tests.
    while (await page.locator('.totp-card').count()) {
      await page.locator('.menu-btn').first().click();
      await page.locator('.delete-item').first().click();
      await page.waitForTimeout(20);
    }
    assert.equal(await page.locator('.totp-card').count(), 0);

    const add = async (name, secret) => {
      await page.locator('#toggleAdd').click();
      await page.locator('#name').fill(name);
      await page.locator('#secret').fill(secret);
      await page.locator('#saveAddBtn').click();
      await page.locator('#addPanel.hidden').waitFor({ state: 'attached' });
    };
    await page.locator('#toggleAdd').click();
    await shot('add');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#toggleAdd').evaluate(el => el === document.activeElement), true);
    await add('GitHub · personal', 'otpauth://totp/GitHub:demo?secret=JBSWY3DPEHPK3PXP&issuer=GitHub');
    await add('Google · Workspace', 'otpauth://totp/Google:demo?secret=JBSWY3DPEHPK3PXP&issuer=Google');
    await add('VPN · Corp', 'otpauth://totp/VPN:demo?secret=JBSWY3DPEHPK3PXP&digits=8&algorithm=SHA256&period=60');
    assert.equal(await page.locator('.totp-card').count(), 3);
    assert.equal(await page.locator('#accountCount').innerText(), '3');
    const compactCardHeight = (await page.locator('.totp-card').first().boundingBox()).height;
    assert.ok(compactCardHeight <= 112, `Expected compact TOTP card, got ${compactCardHeight}px`);
    await page.waitForFunction(() => [...document.querySelectorAll('.code')].every(el => /^\d{3,4} \d{3,4}$/.test(el.textContent)));

    const expiringState = await page.evaluate(async () => {
      const originalNow = Date.now;
      Date.now = () => 26000;
      try {
        await refreshCodes();
        await new Promise(resolve => setTimeout(resolve, 240));
        const timer = document.querySelector('.timer-wrap');
        return {
          expiring: timer.classList.contains('is-expiring'),
          color: getComputedStyle(timer.querySelector('.seconds')).color
        };
      } finally {
        Date.now = originalNow;
        await refreshCodes();
      }
    });
    assert.equal(expiringState.expiring, true);
    assert.equal(expiringState.color, 'rgb(201, 97, 106)');
    await page.waitForTimeout(240);
    await shot('vault-es');
    await setLanguage('en');
    await page.waitForFunction(() => [...document.querySelectorAll('.code')].every(el => /^\d{3,4} \d{3,4}$/.test(el.textContent)));
    assert.equal((await page.locator('.fill-btn').first().innerText()).trim(), 'Fill');
    assert.equal((await page.locator('.copy-btn').first().innerText()).trim(), 'Copy');
    await shot('vault-en');
    await setLanguage('es');
    await page.waitForFunction(() => [...document.querySelectorAll('.code')].every(el => /^\d{3,4} \d{3,4}$/.test(el.textContent)));
    // Real cryptography: RFC 6238 SHA-1 vector, and stored vault contains no plaintext seed.
    assert.equal(await page.evaluate(() => generateTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 30, 8, 'SHA-1', 59)), '94287082');
    assert.equal(await page.evaluate(() => localStorage.getItem('__test_local').includes('JBSWY3DPEHPK3PXP')), false);
    await page.locator('.copy-btn').first().click();
    assert.match(await page.evaluate(() => window.__copied), /^\d{6}$/);
    await page.locator('.fill-btn').first().click();
    assert.match(await page.evaluate(() => window.__filled), /^\d{6}$/);
    await page.locator('#toggleCodesVisibility').click();
    assert.equal(await page.locator('.code-hidden').count(), 3);
    assert.equal(await page.locator('.code-hidden').first().evaluate(el => getComputedStyle(el).fontSize), '0px');
    await shot('hidden');
    await page.locator('.code-visibility-btn').first().click();
    assert.equal(await page.locator('.code-hidden').count(), 2);
    await page.locator('#toggleCodesVisibility').click();
    await page.locator('#searchInput').fill('impossible-account');
    assert.equal(await page.locator('#emptyState strong').innerText(), 'Sin coincidencias');
    await shot('search-empty');
    await page.locator('#searchInput').fill('VPN');
    assert.equal(await page.locator('.totp-card').count(), 1);
    await shot('eight-digits');
    await page.locator('#searchInput').fill('');
    await page.locator('.menu-btn').first().click();
    await shot('account-menu');
    await page.locator('.edit-item').first().click();
    await page.locator('#name').fill('GitHub · editada');
    await page.locator('#saveAddBtn').click();
    await page.locator('#addPanel.hidden').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.card-title').first().innerText(), 'GitHub · editada');
    await page.locator('#settingsBtn').click();
    const themes = await page.locator('.theme-swatch').evaluateAll(els => els.map(el => el.dataset.theme));
    assert.equal(themes.length, 10);
    assert.equal(await page.locator('.theme-swatch[aria-label="Grafito"]').count(), 1);
    assert.equal(await page.locator('.theme-swatch[aria-label="Aguamarina"]').count(), 0);
    const backgrounds = new Set();
    for (const theme of themes) {
      await page.locator(`.theme-swatch[data-theme="${theme}"]`).click();
      await page.waitForFunction(t => document.documentElement.dataset.theme === t, theme);
      backgrounds.add(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor));
      assert.equal(await page.locator('.theme-swatch[aria-checked=true]').count(), 1);
      await page.locator('#closeSettings').click();
      await shot('theme-' + theme);
      await page.locator('#settingsBtn').click();
    }
    assert.equal(backgrounds.size, 10);
    await page.locator('.theme-swatch[data-theme="1c485f"]').click();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.documentElement.dataset.theme === '08709c');
    await page.locator('#autoLockSelect').selectOption('15');
    assert.equal(await page.evaluate(async () => (await chrome.storage.local.get('settings')).settings.colorTheme), '08709c');
    await page.locator('#autoSubmitMode').selectOption('conservative');
    assert.equal(await page.evaluate(async () => (await chrome.storage.local.get('settings')).settings.autoSubmitMode), 'conservative');
    await page.locator('.theme-swatch[data-theme="1c485f"]').click();
    for (const selector of ['#exportBtn', '#importBtn', '#changePasswordToggle', '#supportLink']) {
      const fontSize = Number.parseFloat(await page.locator(selector).evaluate(el => getComputedStyle(el).fontSize));
      assert.ok(fontSize >= 13, `Expected readable settings button text for ${selector}, got ${fontSize}px`);
    }
    await shot('settings-es');
    await setLanguage('en');
    await page.locator('#settingsBtn').click();
    await page.locator('#settingsPanel:not(.hidden)').waitFor();
    await shot('settings-en');
    await setLanguage('es');
    await page.locator('#settingsBtn').click();
    await page.locator('#settingsPanel:not(.hidden)').waitFor();
    await page.locator('#inlinePickerMode').selectOption('site');
    await page.locator('#inlineSiteToggle').click();
    assert.match(await page.locator('#inlineSiteStatus').innerText(), /autorizado/);
    await page.locator('#changePasswordToggle').click();
    await page.locator('#currentPassword').fill('pastel-test-password');
    await page.locator('#newPassword').fill('pastel-new-password');
    await page.locator('#newPassword2').fill('pastel-new-password');
    await page.locator('#changePasswordForm button[type=submit]').click();
    await page.locator('#changePasswordForm.hidden').waitFor({ state: 'attached' });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportBtn').click();
    const download = await downloadPromise;
    const backup = path.join(results, 'test-backup.json');
    await download.saveAs(backup);
    assert.equal((await fs.readFile(backup, 'utf8')).includes('JBSWY3DPEHPK3PXP'), false);
    await page.locator('#closeSettings').click();
    await page.locator('#lockBtn').click();
    await page.locator('#unlockView:not(.hidden)').waitFor();
    await shot('unlock-es');
    await setLanguage('en');
    await page.locator('#unlockView:not(.hidden)').waitFor();
    await shot('unlock-en');
    await setLanguage('es');
    await page.locator('#unlockView:not(.hidden)').waitFor();
    await page.locator('#unlockPassword').fill('wrong-password');
    await page.locator('#unlockForm button[type=submit]').click();
    await page.locator('#unlockError:not(.hidden)').waitFor();
    await shot('unlock-error');
    await page.locator('#unlockPassword').fill('pastel-new-password');
    await page.locator('#unlockForm button[type=submit]').click();
    await page.locator('#vaultView:not(.hidden)').waitFor();
    await page.reload();
    await page.locator('#vaultView:not(.hidden)').waitFor();
    assert.equal(await page.locator('.totp-card').count(), 3);
    // Narrow popup: eight digits and all controls remain inside their ticket.
    await page.setViewportSize({ width: 320, height: 600 });
    await page.locator('#searchInput').fill('VPN');
    await shot('narrow');
    const overflow = await page.locator('.totp-card').evaluate(el => el.scrollWidth > el.clientWidth);
    assert.equal(overflow, false);
    await page.locator('#settingsBtn').click();
    await shot('narrow-settings');
    await page.locator('#changePasswordToggle').click();
    await page.locator('#changePasswordForm button[type=submit]').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#changePasswordForm button[type=submit]').isVisible(), true);
    await page.locator('#closeSettings').click();
    await page.setViewportSize({ width: 420, height: 600 });
    await page.locator('#searchInput').fill('');
    await page.locator('.menu-btn').last().click();
    await page.locator('.delete-item').last().click();
    await page.waitForFunction(() => document.querySelectorAll('.totp-card').length === 2);
    await page.locator('#settingsBtn').click();
    await page.locator('#importFile').setInputFiles(backup);
    await page.locator('#unlockView:not(.hidden)').waitFor();
    await page.locator('#unlockPassword').fill('pastel-new-password');
    await page.locator('#unlockForm button[type=submit]').click();
    await page.locator('#vaultView:not(.hidden)').waitFor();
    assert.equal(await page.locator('.totp-card').count(), 3);

    // Exercise the actual inline renderer and trusted clicks against a demo OTP form.
    const inline = await context.newPage();
    inline.on('pageerror', e => errors.push(e.message));
    await inline.setViewportSize({ width: 760, height: 640 });
    await inline.goto(`http://127.0.0.1:${server.address().port}/tests/fixture.html`);
    await inline.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) { return attach.call(this, { ...options, mode: 'open' }); };
      chrome.runtime.sendMessage = async ({ type }) => type === 'totpVault:inline:code'
        ? { ok: true, code: '123456', autoSubmitMode: 'off' }
        : { ok: true, locked: false, colorTheme: '777778', entries: [
          { id: 'demo', name: 'GitHub · personal', issuer: 'GitHub', code: '123456', remaining: 27, icon: { type: 'builtin', key: 'github' } },
          { id: 'demo2', name: 'Google · Workspace', issuer: 'Google', code: '654321', remaining: 27, icon: { type: 'builtin', key: 'google' } }
        ] };
    });
    await inline.addScriptTag({ url: '/content.js' });
    const inlineButtonBox = await inline.locator('[data-totp-vault-inline] .b').boundingBox();
    const inlineIconBox = await inline.locator('[data-totp-vault-inline] .b svg').boundingBox();
    assert.equal(Math.round(inlineButtonBox.width), 30);
    assert.equal(Math.round(inlineButtonBox.height), 30);
    assert.equal(Math.round(inlineIconBox.width), 20);
    assert.equal(Math.round(inlineIconBox.height), 20);
    assert.ok(Math.abs((inlineButtonBox.x + inlineButtonBox.width / 2) - (inlineIconBox.x + inlineIconBox.width / 2)) < 0.6);
    assert.ok(Math.abs((inlineButtonBox.y + inlineButtonBox.height / 2) - (inlineIconBox.y + inlineIconBox.height / 2)) < 0.6);
    await inline.locator('[data-totp-vault-inline] .b').click();
    await inline.locator('[data-totp-vault-inline] .r').first().waitFor();
    await inline.waitForFunction(() => [...document.querySelector('[data-totp-vault-inline]').shadowRoot.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0));
    await inline.screenshot({ path: path.join(results, 'inline-es.png') });
    await inline.locator('[data-totp-vault-inline] .q').fill('Google');
    assert.equal(await inline.locator('[data-totp-vault-inline] .r').count(), 1);
    await inline.locator('[data-totp-vault-inline] .r').click();
    assert.equal(await inline.locator('#otp').inputValue(), '123456');
    await inline.close();

    const inlineEn = await context.newPage();
    inlineEn.on('pageerror', e => errors.push(e.message));
    await inlineEn.setViewportSize({ width: 760, height: 640 });
    await inlineEn.goto(`http://127.0.0.1:${server.address().port}/tests/fixture.html`);
    await inlineEn.evaluate(() => {
      document.documentElement.lang = 'en';
      document.title = 'Verification demo';
      const main = document.querySelector('main');
      main.querySelector('p').textContent = 'DEMO ACCOUNT';
      main.querySelector('h1').textContent = 'Verify it is you';
      main.querySelectorAll('p')[1].textContent = 'Enter the code from your authenticator.';
      main.querySelector('label').textContent = 'Verification code';

      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) { return attach.call(this, { ...options, mode: 'open' }); };
      const messages = {
        chooseTotp: 'Choose TOTP',
        searchAccount: 'Search an account…',
        loading: 'Loading…',
        inlineVaultOpenError: 'Could not read the vault.',
        vaultLocked: 'The vault is locked.',
        openTotpVault: 'Open TOTP Vault',
        updatesAutomatically: 'It will update automatically after unlocking.',
        unlockVaultHelp: 'Unlock TOTP Vault to choose an account.',
        noMatches: 'No matches',
        noTotpSaved: 'No TOTP accounts saved'
      };
      chrome.runtime.sendMessage = async ({ type }) => {
        if (type === 'totpVault:i18n:inline') return { ok: true, language: 'en', messages };
        if (type === 'totpVault:inline:code') return { ok: true, code: '123456', autoSubmitMode: 'off' };
        return { ok: true, locked: false, colorTheme: '777778', entries: [
          { id: 'demo', name: 'GitHub · personal', issuer: 'GitHub', code: '123456', remaining: 27, icon: { type: 'builtin', key: 'github' } },
          { id: 'demo2', name: 'Google · work', issuer: 'Google', code: '654321', remaining: 27, icon: { type: 'builtin', key: 'google' } }
        ] };
      };
    });
    await inlineEn.addScriptTag({ url: '/content.js' });
    await inlineEn.locator('[data-totp-vault-inline] .b').click();
    await inlineEn.locator('[data-totp-vault-inline] .r').first().waitFor();
    await inlineEn.waitForFunction(() => [...document.querySelector('[data-totp-vault-inline]').shadowRoot.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0));
    await inlineEn.screenshot({ path: path.join(results, 'inline-en.png') });
    await inlineEn.close();

    // "Código postal" is not an OTP field even though it contains the word "código".
    const postal = await context.newPage();
    await postal.goto(`http://127.0.0.1:${server.address().port}/tests/fixture.html`);
    await postal.evaluate(() => {
      document.querySelector('main').innerHTML = '<label for="postal">Código postal</label><input id="postal" type="number" name="postal_code" value="28770">';
    });
    await postal.addScriptTag({ url: '/content.js' });
    await postal.waitForTimeout(300);
    assert.equal(await postal.locator('[data-totp-vault-inline]').count(), 0);
    await postal.close();

    assert.deepEqual(errors, []);
    console.log('PASS: setup, QR import from file/URL/paste/page, encrypted storage, RFC TOTP, add/edit/delete, copy/fill callbacks, search, visibility, 10 themes, theme persistence, keyboard, settings, site authorization, password change, encrypted export/import, inline rendering/search/fill, lock/unlock, restored session, 320px layout.');
    console.log('Chrome storage/permissions/scripting are test doubles; browser integration needs an unpacked-extension check.');
    await context.close();
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
