// Local verification only: real WebGL scene, API and isolated test database.
import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { readFile, mkdir } from 'node:fs/promises';
const base = process.env.HABITAT_TEST_URL || 'http://localhost:4318';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname))
  throw new Error('Serveur local obligatoire.');
const fixture = JSON.parse(
  await readFile(
    process.env.HABITAT_TEST_USERS || '/tmp/captivia-habitat-browser-users.json',
    'utf8',
  ),
);
for (const account of fixture.users) {
  assert.match(
    account.user.email,
    /^habitat-browser-[ab]-\d+@example\.test$/,
    'Use isolated browser test accounts only',
  );
  const response = await fetch('http://localhost:3001/users/me/habitats', {
    headers: { Authorization: `Bearer ${account.token}` },
  });
  assert.equal(response.status, 200);
  for (const project of await response.json()) {
    const deleted = await fetch(
      `http://localhost:3001/users/me/habitats/${project.id}?revision=${project.revision}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${account.token}` } },
    );
    assert.equal(deleted.status, 200);
  }
}
const output = '/tmp/captivia-habitat-browser-results';
await mkdir(output, { recursive: true });
const engine = process.env.HABITAT_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({
  headless: true,
  ...(engine === chromium
    ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
    : {}),
});
const errors = [];
const loadedModels = new Set();
async function contextFor(user, viewport = { width: 1440, height: 1000 }, mobile = false) {
  const context = await browser.newContext({
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    locale: 'fr-BE',
    timezoneId: 'Europe/Brussels',
    colorScheme: viewport.width === 390 ? 'dark' : 'light',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(({ user, token }) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  }, user);
  return context;
}
async function download(page, name) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const item = await pending;
  const target = `${output}/${item.suggestedFilename()}`;
  await item.saveAs(target);
  return readFile(target);
}
try {
  const context = await contextFor(fixture.users[0]);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (/\/models\/habitat\/.*\.glb$/.test(response.url())) {
      assert.equal(response.status(), 200);
      loadedModels.add(response.url().split('/').pop());
    }
  });
  page.on('dialog', (dialog) => dialog.accept());
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('BROWSER:', message.text().slice(0, 300));
  });
  await page.goto(base + '/guide');
  await page
    .locator('#habitat-animal option')
    .filter({ hasText: 'Bulle de test' })
    .waitFor({ state: 'attached' });
  await page.locator('canvas').waitFor();
  await page.getByRole('button', { name: 'Image PNG', exact: true }).click({ trial: true });
  await page.screenshot({ path: `${output}/desktop.png` });
  await page.locator('.habitat-scene-toolbar select').selectOption('light');
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
  );
  console.log('Initial scene loaded');
  for (const id of [
    'crested',
    'betta',
    'bearded',
    'corn',
    'python',
    'shrimp',
    'marine',
    'leopard',
  ]) {
    await page.locator('#habitat-species').selectOption(id);
    await page.getByRole('button', { name: 'Générer mon aménagement', exact: true }).click();
    await page.locator('.habitat-dirty').waitFor({ state: 'hidden' });
    await page
      .locator('canvas')
      .waitFor()
      .catch(async (error) => {
        console.log(await page.locator('.habitat-preview').innerText());
        console.log(errors);
        await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
        throw error;
      });
    const data = JSON.parse((await download(page, 'Exporter le projet')).toString());
    assert.equal((data.snapshot || data).profileId, id);
    console.log('Profile', id, 'generated and exported');
  }
  await page.locator('.habitat-scene-toolbar select').selectOption('standard');
  await page.getByRole('button', { name: 'Explorer et modifier en 3D', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer l’exploration', exact: true }).click();
  const png = await download(page, 'Image PNG');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const glb = await download(page, 'Modèle 3D GLB');
  assert.equal(glb.subarray(0, 4).toString(), 'glTF');
  assert.equal(glb.readUInt32LE(8), glb.length);
  const svg = (await download(page, 'Plan coté SVG')).toString();
  assert.ok(svg.includes('<svg') && svg.includes('Plan indicatif'));
  console.log('PNG, GLB and dimensioned SVG exports valid');
  for (const model of ['rock-real.glb', 'branch-real.glb', 'foliage-real.glb'])
    assert.ok(loadedModels.has(model), model);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#habitat-print').isVisible(), true);
  assert.equal(await page.locator('.habitat-workspace').isVisible(), false);
  const pdf = await page.pdf({ path: `${output}/plan.pdf`, format: 'A4', printBackground: true });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  await page.emulateMedia({ media: 'screen' });
  console.log('Realistic model loading and printable PDF valid');
  await page.getByRole('button', { name: 'Roche stable', exact: true }).click();
  const position = await Promise.all(
    ['X', 'Hauteur', 'Profondeur'].map(
      async (axis) =>
        Number(await page.getByLabel(`Position ${axis}`, { exact: true }).inputValue()) / 100,
    ),
  );
  await page.getByRole('button', { name: 'Explorer et modifier en 3D', exact: true }).click();
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const bounds = await page.locator('canvas').boundingBox();
  const camera = new PerspectiveCamera(40, bounds.width / bounds.height, 0.01, 50);
  camera.position.set(1.62, 1.14, 1.92);
  camera.lookAt(0, 0.3, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const center = new Vector3(...position);
  const scale =
    (center.distanceTo(camera.position) * 1.9 * Math.tan((Math.PI * 40) / 360) * 0.7) / 4;
  const project = (vector) => {
    const point = vector.project(camera);
    return {
      x: bounds.x + ((point.x + 1) * bounds.width) / 2,
      y: bounds.y + ((1 - point.y) * bounds.height) / 2,
    };
  };
  const start = project(center.clone().add(new Vector3(0.4 * scale, 0, 0)));
  const end = project(center.clone().add(new Vector3(0.4 * scale + 0.08, 0, 0)));
  await page.mouse.move(start.x, start.y);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
  assert.ok(
    Math.abs(
      Number(await page.getByLabel('Position X', { exact: true }).inputValue()) - position[0] * 100,
    ) > 1,
  );
  await page.getByRole('button', { name: 'Terminer l’exploration', exact: true }).click();
  await page.locator('.habitat-editor input[type=range]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.habitat-editor output').innerText(), '15°');
  console.log('Real 3D translation gizmo and rotation field valid');

  await page.getByLabel('Position X', { exact: true }).fill('5');
  assert.equal(await page.getByLabel('Position X', { exact: true }).inputValue(), '5');
  await page.getByRole('button', { name: 'Verrouiller', exact: true }).click();
  assert.equal(await page.getByLabel('Position X', { exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Déverrouiller', exact: true }).click();
  await page.getByRole('button', { name: 'Retirer', exact: true }).click();
  await page.getByRole('button', { name: 'Annuler la dernière modification', exact: true }).click();
  await page.getByRole('button', { name: 'Rétablir la modification', exact: true }).click();
  await page.getByLabel('Notes du projet', { exact: true }).fill('Mesures vérifiées — essai local');
  const csv = (await download(page, 'Exporter la liste de matériel')).toString();
  assert.ok(csv.includes('Support stable'));
  console.log('Numeric editing, lock, remove, undo/redo and equipment CSV valid');
  await page.locator('#habitat-project-name').fill('Vérification habitat locale');
  await page.getByRole('button', { name: 'Enregistrer ici', exact: true }).click();
  await page.getByText('Projet à jour', { exact: true }).waitFor();
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/users/me/habitats') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Enregistrer dans mon compte', exact: true }).click();
  assert.equal((await saved).status(), 201);
  await page.waitForFunction(() => document.querySelectorAll('.habitat-project-card').length === 2);
  await page.getByText('Projet à jour', { exact: true }).waitFor();
  assert.equal(await page.locator('.habitat-project-card').count(), 2);
  await page.reload();
  await page
    .locator('.habitat-project-card')
    .getByRole('button', { name: 'Ouvrir', exact: true })
    .last()
    .click();
  await page.getByText('Projet à jour', { exact: true }).waitFor();
  assert.equal(
    await page.locator('#habitat-project-name').inputValue(),
    'Vérification habitat locale',
  );
  console.log('Local/cloud persistence and JSONB round trip valid');
  await page.screenshot({ path: `${output}/saved-desktop.png`, fullPage: true });
  assert.deepEqual(errors, []);
  await page.getByLabel('Notes du projet', { exact: true }).fill('Brouillon à reprendre');
  await page.waitForTimeout(1800);
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le brouillon', exact: true }).click();
  assert.equal(
    await page.getByLabel('Notes du projet', { exact: true }).inputValue(),
    'Brouillon à reprendre',
  );
  const exported = await download(page, 'Exporter le projet');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'projet.json', mimeType: 'application/json', buffer: exported });
  await page.getByText('Projet importé.', { exact: false }).waitFor();
  assert.equal(
    await page.getByLabel('Notes du projet', { exact: true }).inputValue(),
    'Brouillon à reprendre',
  );
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalide.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"snapshot":{}}'),
  });
  await page.getByText('Fichier invalide ou incompatible.', { exact: false }).waitFor();
  assert.equal(
    await page.getByLabel('Notes du projet', { exact: true }).inputValue(),
    'Brouillon à reprendre',
  );
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('captivia:habitats:'))
        throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Enregistrer ici', exact: true }).click();
  await page.getByText('Le stockage de cet appareil est plein', { exact: false }).waitFor();
  console.log('Draft restore, valid/invalid import and storage failure handling valid');
  await page.locator('#habitat-animal').selectOption(fixture.animalId);
  await page.waitForFunction(() => document.querySelector('#habitat-species')?.value === 'betta');
  await page.getByRole('button', { name: 'Générer mon aménagement', exact: true }).click();
  await page.locator('.habitat-dirty').waitFor({ state: 'hidden' });
  const linked = JSON.parse((await download(page, 'Exporter le projet')).toString());
  assert.equal(linked.snapshot.profileId, 'betta');
  assert.equal(linked.snapshot.animalId, fixture.animalId);
  console.log('Species matching from a real saved animal valid');
  await context.close();
  const other = await contextFor(fixture.users[1]);
  const otherPage = await other.newPage();
  await otherPage.goto(base + '/guide');
  await otherPage.locator('#habitat-animal').waitFor();
  await otherPage
    .getByRole('button', { name: 'Enregistrer dans mon compte', exact: true })
    .waitFor();
  await otherPage.waitForFunction(() =>
    document.querySelector('.habitat-library')?.textContent.includes('Aucun projet enregistré.'),
  );
  assert.equal(await otherPage.locator('.habitat-project-card').count(), 0);
  await other.close();
  for (const width of [320, 390, 768]) {
    const mobile = await contextFor(fixture.users[0], { width, height: 844 }, true);
    if (width === 768) await mobile.route('**/users/me/habitats', (route) => route.abort('failed'));
    const screen = await mobile.newPage();
    screen.on('pageerror', (error) => errors.push(error.message));
    await screen.goto(base + '/guide');
    await screen.locator('canvas').waitFor();
    await screen.locator('.habitat-scene').scrollIntoViewIfNeeded();
    assert.equal(
      await screen.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
      `overflow ${width}`,
    );
    if (engine === chromium) {
      const bounds = await screen.locator('canvas').boundingBox();
      const x = bounds.x + bounds.width / 2;
      const y = Math.min(700, bounds.y + bounds.height * 0.8);
      const before = await screen.evaluate(() => scrollY);
      const cdp = await mobile.newCDPSession(screen);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y - step * 25 }],
        });
        await screen.waitForTimeout(20);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.ok(
        (await screen.evaluate(() => scrollY)) > before + 30,
        'native touch scrolling on inactive 3D',
      );
    }
    await screen.screenshot({ path: `${output}/mobile-${engine.name()}-${width}.png` });
    await screen.getByRole('button', { name: 'Plan 2D', exact: true }).click();
    await screen.locator('.habitat-plan-container svg').waitFor();
    await screen.getByRole('button', { name: '3D', exact: true }).click();
    await screen.locator('canvas').waitFor();
    if (engine === chromium && width === 320) {
      await download(screen, 'Image PNG');
      await screen.getByRole('button', { name: 'Image PNG', exact: true }).click({ trial: true });
      await screen
        .locator('canvas')
        .evaluate((canvas) =>
          canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(),
        );
      await screen.locator('.habitat-plan-container svg').waitFor();
      console.log('Genuine context loss: 2D fallback valid');
    }
    if (width === 768) {
      await screen
        .getByText('Les projets du compte sont indisponibles.', { exact: false })
        .waitFor();
      await screen.locator('#habitat-project-name').fill('Copie sans réseau');
      await screen.getByRole('button', { name: 'Enregistrer ici', exact: true }).click();
      await screen.getByText('Projet à jour', { exact: true }).waitFor();
      console.log('Cloud API failure: local saving remains available');
    }
    console.log(`Mobile ${width}px: no overflow, plan/3D switching valid`);
    await mobile.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
