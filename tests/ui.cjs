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
const server = http.createServer(async (req, res) => {
  try {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
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
    runtime: { getURL: file => new URL(file, location.href).href, sendMessage: async () => ({ ok: true }) },
    tabs: { query: async () => [{ id: 1, url: 'https://example.test/login' }] },
    permissions: { request: async () => true, remove: async () => true, contains: async () => true },
    scripting: { executeScript: async ({ args }) => { window.__filled = args?.[0]; return [{ result: { ok: true, message: 'Código rellenado.' } }]; } }
  };
}

(async () => {
  await fs.mkdir(results, { recursive: true });
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
    await page.goto(`http://127.0.0.1:${server.address().port}/popup.html`);
    await page.locator('#setupView:not(.hidden)').waitFor();
    await shot('setup');
    await page.locator('#setupPassword').fill('pastel-test-password');
    await page.locator('#setupPassword2').fill('pastel-test-password');
    await page.locator('#setupForm button[type=submit]').click();
    await page.locator('#vaultView:not(.hidden)').waitFor();
    assert.equal(await page.locator('#emptyState').isVisible(), true);
    await shot('empty');
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
    await add('Google · trabajo', 'otpauth://totp/Google:demo?secret=JBSWY3DPEHPK3PXP&issuer=Google');
    await add('VPN · oficina', 'otpauth://totp/VPN:demo?secret=JBSWY3DPEHPK3PXP&digits=8&algorithm=SHA256&period=60');
    assert.equal(await page.locator('.totp-card').count(), 3);
    assert.equal(await page.locator('#accountCount').innerText(), '3');
    await page.waitForFunction(() => [...document.querySelectorAll('.code')].every(el => /^\d{3,4} \d{3,4}$/.test(el.textContent)));
    await shot('vault');
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
    await shot('settings');
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
    await shot('unlock');
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
    await inline.setViewportSize({ width: 760, height: 540 });
    await inline.goto(`http://127.0.0.1:${server.address().port}/tests/fixture.html`);
    await inline.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(options) { return attach.call(this, { ...options, mode: 'open' }); };
      chrome.runtime.sendMessage = async ({ type }) => type === 'totpVault:inline:code'
        ? { ok: true, code: '123456', autoSubmitMode: 'off' }
        : { ok: true, locked: false, colorTheme: '777778', entries: [
          { id: 'demo', name: 'GitHub · personal', issuer: 'GitHub', code: '123456', remaining: 27, icon: { type: 'builtin', key: 'github' } },
          { id: 'demo2', name: 'Google · trabajo', issuer: 'Google', code: '654321', remaining: 27, icon: { type: 'builtin', key: 'google' } }
        ] };
    });
    await inline.addScriptTag({ url: '/content.js' });
    await inline.locator('[data-totp-vault-inline] .b').click();
    await inline.locator('[data-totp-vault-inline] .r').first().waitFor();
    await inline.screenshot({ path: path.join(results, 'inline.png') });
    await inline.locator('[data-totp-vault-inline] .q').fill('Google');
    assert.equal(await inline.locator('[data-totp-vault-inline] .r').count(), 1);
    await inline.locator('[data-totp-vault-inline] .r').click();
    assert.equal(await inline.locator('#otp').inputValue(), '123456');
    await inline.close();
    assert.deepEqual(errors, []);
    console.log('PASS: setup, encrypted storage, RFC TOTP, add/edit/delete, copy/fill callbacks, search, visibility, 10 themes, theme persistence, keyboard, settings, site authorization, password change, encrypted export/import, inline rendering/search/fill, lock/unlock, restored session, 320px layout.');
    console.log('Chrome storage/permissions/scripting are test doubles; browser integration needs an unpacked-extension check.');
    await context.close();
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
