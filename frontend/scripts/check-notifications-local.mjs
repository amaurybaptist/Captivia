// Contrôle manuel local : API, permission et PushManager simulés; service worker et interface réels.
import { chromium } from 'playwright';
import { createECDH } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
function generateVAPIDKeys() { const pair = createECDH('prime256v1'); pair.generateKeys(); return { publicKey: pair.getPublicKey().toString('base64url') }; }
const fr = JSON.parse(readFileSync(new URL('../messages/fr.json', import.meta.url), 'utf8'));
import assert from 'node:assert/strict';
const base = process.env.NOTIFICATION_TEST_URL || 'http://localhost:4317';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Ce contrôle doit cibler un serveur local.');
(async () => {
  const manifestResponse = await fetch(base + '/manifest.webmanifest'); assert.equal(manifestResponse.status, 200);
  const manifest = await manifestResponse.json(); assert.equal(manifest.display, 'standalone');
  for (const path of ['/icon.png', '/icon-512.png', '/apple-touch-icon.png', '/sw.js']) assert.equal((await fetch(base + path)).status, 200, path);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 740 }]) {
      const context = await browser.newContext({ viewport, locale: 'fr-BE', timezoneId: 'Europe/Brussels', permissions: ['notifications'] });
      await context.grantPermissions(['notifications'], { origin: base });
      const keys = generateVAPIDKeys();
      let subscriptions = [];
      let prefs = { types: {}, typeSchedules: {}, schedule: { start: '00:00', end: '23:59' }, snooze: 15, timeZone: 'Europe/Brussels', deliveryChannel: 'push' };
      let event = { id: 'browser-event', type: 'nourrissage', label: 'Nourrir Kiwi', routineId: 'routine', scheduledAt: '2026-10-17T10:35:00Z', status: 'pending', pointsAwarded: 0 };
      let points = 0;
      const errors = [];
      const invalidRefresh = [];
      await context.addInitScript(({ key }) => {
        localStorage.setItem('token', 'local-browser-test'); localStorage.setItem('user', JSON.stringify({ id: 'user', email: 'local@example.test', locale: 'fr', isPremium: false }));
        // Le navigateur headless ne vérifie pas la réception OS : permission et transport sont simulés.
        Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
        const endpoint = 'https://fcm.googleapis.com/fcm/send/local-browser-test';
        const sub = () => ({ endpoint, options: { applicationServerKey: Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer },
          unsubscribe: async () => { sessionStorage.removeItem('local-push'); return true; },
          toJSON: () => ({ endpoint, keys: { p256dh: key, auth: 'AAAAAAAAAAAAAAAAAAAAAA' } }) });
        Object.defineProperty(PushManager.prototype, 'getSubscription', { value: async () => sessionStorage.getItem('local-push') ? sub() : null });
        Object.defineProperty(PushManager.prototype, 'subscribe', { value: async () => { sessionStorage.setItem('local-push', 'yes'); return sub(); } });
      }, { key: keys.publicKey });
      await context.route('**/*', async route => {
        const request = route.request(); const url = new URL(request.url());
        if (!url.pathname.startsWith('/users/me/') && url.pathname !== '/auth/me') return route.continue();
        const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        let body = {};
        if (url.pathname === '/auth/me') body = { id: 'user', email: 'local@example.test', locale: 'fr', isPremium: false };
        else if (url.pathname.endsWith('/notification-capabilities')) body = { push: true, email: false, publicKey: keys.publicKey };
        else if (url.pathname.endsWith('/notification-preferences')) { if (request.method() === 'PATCH') prefs = { ...prefs, ...request.postDataJSON() }; body = prefs; }
        else if (url.pathname.endsWith('/push-subscriptions')) {
          if (request.method() === 'POST') subscriptions = [{ id: 'sub', ...request.postDataJSON() }];
          if (request.method() === 'DELETE') subscriptions = [];
          body = request.method() === 'GET' ? subscriptions : { success: true };
        } else if (url.pathname.endsWith('/notification-events')) { if (url.searchParams.has('refresh')) invalidRefresh.push(url.href); body = [event]; }
        else if (url.pathname.endsWith('/notification-events/browser-event')) { event = { ...event, status: request.postDataJSON().status, pointsAwarded: 2 }; points = 2; body = { event, grade: { points: 2, grade: 'bronze', nextGrade: 'silver', progressPercent: 0.4, pointsNeededForNext: 500, pointsInCurrent: 2 } }; }
        else if (url.pathname.endsWith('/grade')) body = { points, grade: 'bronze', nextGrade: 'silver', progressPercent: points / 5, pointsNeededForNext: 500, pointsInCurrent: points };
        return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
      });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/parametres/notifications');
      await page.getByRole('button', { name: fr.notifications.enablePush, exact: true }).click();
      await page.getByText(fr.notifications.pushEnabled, { exact: true }).waitFor({timeout:10000}).catch(async e => { console.log(await page.locator('body').innerText()); console.log(await page.evaluate(async () => ({ permission: Notification.permission, secure:isSecureContext, sw:!!(await navigator.serviceWorker.getRegistration('/'))?.active, mock: sessionStorage.getItem('local-push') }))); console.log({ subscriptions, errors }); await page.screenshot({path:join(tmpdir(), 'captivia-notifications-debug.png'),fullPage:true}); throw e; });
      assert.equal(subscriptions.length, 1);
      assert.ok(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration('/'))?.active));
      await page.reload(); await page.getByText(fr.notifications.pushEnabled, { exact: true }).waitFor();
      await page.getByRole('button', { name: fr.notifications.disablePush, exact: true }).click();
      await page.getByRole('button', { name: fr.notifications.enablePush, exact: true }).waitFor(); assert.equal(subscriptions.length, 0);
      await page.getByRole('button', { name: '+ Bain', exact: true }).click();
      await page.getByLabel(fr.notifications.time, { exact: true }).fill('08:35');
      await page.waitForTimeout(150);
      assert.equal(prefs.typeSchedules.Bain.time, '08:35');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      await page.screenshot({ path: join(tmpdir(), `captivia-notifications-${viewport.width}.png`), fullPage: true });
      assert.equal(overflow, false, 'débordement écran ' + viewport.width);
      await page.goto(base + '/parametres/grade');
      await page.getByText('Nourrir Kiwi', { exact: true }).waitFor();
      await page.getByText('12:35', { exact: true }).waitFor();
      await page.getByRole('button', { name: fr.grade.markDoneRoutine, exact: true }).click();
      await page.getByText(fr.grade.done + ' (+2 pts)', { exact: true }).waitFor();
      await page.reload(); await page.getByText(fr.grade.done + ' (+2 pts)', { exact: true }).waitFor();
      assert.deepEqual(invalidRefresh, []); assert.deepEqual(errors, []);
      console.log(`Navigateur ${viewport.width}px : SW actif, activation/désactivation, sauvegarde, horaires locaux, reload et débordement validés (permission et transport simulés, service worker réel).`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
