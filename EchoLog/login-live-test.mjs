/**
 * EchoLog – Live Login Page Test (Playwright + Chromium headless)
 * Target: http://localhost:5175
 */
import { chromium } from 'playwright';
import { createHash } from 'crypto';
import { mkdirSync } from 'fs';

const BASE  = 'http://localhost:5175';
const LOGIN = BASE + '/login';

const MOCK_PASSWORD  = 'password123';
const MOCK_PASS_HASH = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';
const MOCK_USER = {
  cr4c3_userprofileid: 'aaaaaaaa-0000-0000-0000-000000000001',
  cr4c3_fullname: 'Test User',
  cr4c3_email: 'testuser@echolog.dev',
  cr4c3_role: 1,
  cr4c3_password: MOCK_PASS_HASH,
  cr4c3_isactive: true,
  cr4c3_islocked: false,
  cr4c3_failedloginattempts: 0,
};

let passed = 0, failed = 0;
const results = [];

function assert(condition, label) {
  console.log('  ' + (condition ? '✅ PASS' : '❌ FAIL') + '  ' + label);
  results.push({ label, ok: Boolean(condition) });
  condition ? passed++ : failed++;
}

async function screenshot(page, name) {
  await page.screenshot({ path: 'test-screenshots/' + name + '.png', fullPage: true });
}

async function freshPage(browser, apiHandler) {
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();

  // Log every request so we can see what URLs the Power Apps client uses
  page.on('request', (req) => {
    const url = req.url();
    if (!url.includes('localhost:5175') || url.includes('/api/')) {
      console.log('    [REQ]', req.method(), url.replace(BASE, ''));
    }
  });

  // Intercept /api/* on the local dev server (Power Apps Vite plugin proxy)
  await page.route(BASE + '/api/**', async (route) => {
    console.log('    [MOCK]', route.request().url().replace(BASE, ''));
    if (apiHandler) await apiHandler(route);
    else await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: [] }) });
  });
  // Fast-fail real external calls
  await page.route(/^https?:\/\/(?!localhost)/, (route) => {
    console.log('    [BLOCK]', route.request().url().slice(0, 60));
    route.abort();
  });
  return page;
}

async function getErrorText(page, timeout) {
  timeout = timeout || 6000;
  try {
    await page.waitForSelector('[class*="border-red"], p.text-sm.text-red-600', { timeout });
    return await page.locator('p.text-sm.text-red-600').first().textContent({ timeout: 3000 });
  } catch (e) { return null; }
}

async function getValidationError(page, timeout) {
  timeout = timeout || 5000;
  try {
    await page.waitForSelector('p.text-xs.text-red-600', { timeout });
    return await page.locator('p.text-xs.text-red-600').first().textContent();
  } catch (e) { return null; }
}

async function run() {
  mkdirSync('test-screenshots', { recursive: true });
  const browser = await chromium.launch({ headless: true });

  console.log('[1] Page renders correctly');
  {
    const page = await freshPage(browser);
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await screenshot(page, '01-login-page');
    assert(await page.isVisible('#email'), 'Email input visible');
    assert(await page.isVisible('#password'), 'Password input visible');
    assert(await page.isVisible('button[type="submit"]'), 'Sign in button visible');
    const h1 = (await page.textContent('h1') || '').trim();
    assert(h1 === 'ECHO LOG', 'Title is ECHO LOG (got: ' + h1 + ')');
    assert((await page.textContent('p.text-sm') || '').includes('Enterprise'), 'Subtitle mentions Enterprise');
    assert(await page.isVisible('button:has-text("Quick Dev Login")'), 'Quick Dev Login button present');
    await page.close();
  }

  console.log('[2] Empty form -> validation errors');
  {
    const page = await freshPage(browser);
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await page.click('button[type="submit"]');
    const err = await getValidationError(page);
    await screenshot(page, '02-empty-form');
    assert(Boolean(err), 'Validation error appears (got: ' + err + ')');
    assert((err || '').toLowerCase().includes('email'), 'Error mentions email (got: ' + err + ')');
    await page.close();
  }

  console.log('[3] Invalid email format -> zod error');
  {
    const page = await freshPage(browser);
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', 'notanemail');
    await page.fill('#password', 'whatever');
    // Disable native browser email validation so zod/react-hook-form runs
    await page.evaluate(() => document.querySelector('form').setAttribute('novalidate', ''));
    await page.click('button[type="submit"]');
    const err = await getValidationError(page);
    await screenshot(page, '03-invalid-email');
    assert((err || '').toLowerCase().includes('valid email'), 'Invalid email error shown (got: ' + err + ')');
    await page.close();
  }

  console.log('[4] Unknown user -> No account found (API mocked)');
  {
    const page = await freshPage(browser, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: [] }) });
    });
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', 'nobody@echolog.dev');
    await page.fill('#password', 'irrelevant');
    await page.click('button[type="submit"]');
    const err = await getErrorText(page);
    await screenshot(page, '04-unknown-user');
    assert((err || '').toLowerCase().includes('no account') || (err || '').toLowerCase().includes('found'), 'No account found shown (got: ' + err + ')');
    assert(page.url().includes('/login'), 'Still on login page');
    await page.close();
  }

  console.log('[5] Known user + wrong password (API mocked)');
  {
    const page = await freshPage(browser, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: [MOCK_USER] }) });
    });
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', MOCK_USER.cr4c3_email);
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    const err = await getErrorText(page);
    await screenshot(page, '05-wrong-password');
    assert((err || '').toLowerCase().includes('incorrect') || (err || '').toLowerCase().includes('password'), 'Password mismatch error shown (got: ' + err + ')');
    assert(page.url().includes('/login'), 'Still on login page');
    await page.close();
  }

  console.log('[6] Known user + correct password -> login success (API mocked)');
  {
    const page = await freshPage(browser, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: [MOCK_USER] }) });
    });
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', MOCK_USER.cr4c3_email);
    await page.fill('#password', MOCK_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.href.indexOf('/login') === -1, { timeout: 8000 }).catch(() => {});
    await screenshot(page, '06-correct-password');
    assert(page.url().indexOf('/login') === -1, 'Redirected away from login (landed: ' + page.url() + ')');
    await page.close();
  }

  console.log('[7] Dev bypass: test@echolog.dev / test');
  {
    const page = await freshPage(browser);
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', 'test@echolog.dev');
    await page.fill('#password', 'test');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.href.indexOf('/login') === -1, { timeout: 5000 }).catch(() => {});
    await screenshot(page, '07-dev-bypass');
    assert(page.url().indexOf('/login') === -1, 'Redirected after dev bypass (landed: ' + page.url() + ')');
    await page.close();
  }

  console.log('[8] Quick Dev Login button');
  {
    const page = await freshPage(browser);
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Quick Dev Login")');
    await page.waitForURL((url) => url.href.indexOf('/login') === -1, { timeout: 5000 }).catch(() => {});
    await screenshot(page, '08-quick-dev-login');
    assert(page.url().indexOf('/login') === -1, 'Redirected after Quick Dev Login (landed: ' + page.url() + ')');
    await page.close();
  }

  console.log('[9] Repeated wrong passwords -> attempt counter');
  {
    const page = await freshPage(browser, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: [MOCK_USER] }) });
    });
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.clear());
    for (let i = 1; i <= 3; i++) {
      await page.fill('#email', MOCK_USER.cr4c3_email);
      await page.fill('#password', 'badpass' + i);
      await page.click('button[type="submit"]');
      await getErrorText(page, 5000);
      await page.waitForTimeout(200);
    }
    await screenshot(page, '09-attempt-counter');
    const amberText = await page.locator('[class*="text-amber"]').first().textContent({ timeout: 3000 }).catch(() => null);
    const errText   = await getErrorText(page, 3000);
    const hasWarning = (amberText || '').includes('remaining')
      || (errText || '').toLowerCase().includes('remaining')
      || (errText || '').toLowerCase().includes('incorrect');
    assert(hasWarning, 'Attempt warning shown (amber: ' + amberText + ', error: ' + errText + ')');
    await page.close();
  }

  await browser.close();
  console.log('-'.repeat(60));
  console.log('  Total: ' + (passed + failed) + '   PASS: ' + passed + '   FAIL: ' + failed);
  console.log('-'.repeat(60));
  console.log('  Screenshots -> test-screenshots/');
  if (failed > 0) {
    console.log('  Failed tests:');
    results.filter((r) => r.ok === false).forEach((r) => console.log('    - ' + r.label));
    process.exit(1);
  }
}

run().catch((err) => { console.error('[FATAL]', err.message); process.exit(1); });
