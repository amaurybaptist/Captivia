import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Vérifie les modals "Carnet de santé" et "Modifier l'animal".
 *
 * - Avec identifiants (compte Premium ou opérateur recommandé pour le carnet de santé) :
 *   E2E_EMAIL=xxx E2E_PASSWORD=xxx npm run test:modals
 *
 * - Sans identifiants (connexion manuelle) : le navigateur s'ouvre sur /fr/login.
 *   Connectez-vous dans les 2 minutes (compte avec au moins un animal ; Premium pour le carnet).
 *   Lancer : npm run test:modals
 */
test.describe('Vérification des modals (Carnet de santé + Modifier l\'animal)', () => {
  test('connexion puis vérification des deux modals', async ({ page }) => {
    test.setTimeout(180_000);

    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    const hasCredentials = Boolean(email && password);

    await page.goto(`${BASE_URL}/fr/login`, { waitUntil: 'domcontentloaded' });

    if (hasCredentials) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password|mot de passe/i).fill(password);
      await page.getByRole('button', { name: /se connecter|login|sign in/i }).click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 }).catch(() => {});
    } else {
      await Promise.race([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 120_000 }),
        page.waitForTimeout(120_000),
      ]).catch(() => {});
    }

    if (page.url().includes('/login')) {
      console.log('Connexion non effectuée. Utilisez E2E_EMAIL et E2E_PASSWORD ou connectez-vous manuellement.');
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/fr/mes-animaux`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    let animalLink = page.locator('a[href*="/mes-animaux/"]').first();
    if (!(await animalLink.isVisible().catch(() => false))) {
      const addBtn = page.getByRole('button', { name: /ajouter un animal|add animal/i });
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        const addModal = page.getByRole('dialog');
        await addModal.waitFor({ state: 'visible', timeout: 5000 });
        await addModal.locator('#animal-name').fill('E2E Test');
        await addModal.locator('#animal-species').fill('chat');
        await page.waitForTimeout(2000);
        await addModal.locator('button').filter({ hasText: /felis|Felis|chat/i }).first().click({ timeout: 5000 }).catch(() => {});
        await addModal.getByRole('button', { name: /enregistrer|save|ajouter/i }).click();
        await addModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
        animalLink = page.locator('a[href*="/mes-animaux/"]').first();
      }
    }

    if (!(await animalLink.isVisible().catch(() => false))) {
      console.log('Aucun animal. Ajoutez un animal puis relancez.');
      test.skip();
      return;
    }
    await animalLink.click();
    await page.waitForURL(/\/mes-animaux\/[^/]+/, { timeout: 10000 }).catch(() => {});

    // --- Modal Carnet de santé (visible seulement si compte Premium)
    const addHealthBtn = page.getByRole('button', { name: /ajouter une entrée|add entry/i });
    if (await addHealthBtn.isVisible().catch(() => false)) {
      await addHealthBtn.click();
      const healthDialog = page.getByRole('dialog');
      await expect(healthDialog).toBeVisible({ timeout: 5000 });
      await expect(healthDialog.getByRole('heading', { level: 2 })).toBeVisible();
      await expect(healthDialog.locator('#health-title')).toBeVisible();
      await expect(healthDialog.getByRole('button', { name: /enregistrer|save/i })).toBeVisible();
      await expect(healthDialog.getByRole('button', { name: /annuler|cancel/i })).toBeVisible();
      await healthDialog.getByRole('button', { name: /annuler|cancel/i }).click();
      await expect(healthDialog).not.toBeVisible({ timeout: 3000 });
    }

    // --- Modal Modifier l'animal
    const editAnimalBtn = page.getByRole('button', { name: /modifier l'animal|edit animal/i });
    await editAnimalBtn.click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 5000 });
    await expect(editDialog.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(editDialog.locator('#edit-animal-name')).toBeVisible();
    await expect(editDialog.getByRole('button', { name: /enregistrer|save/i })).toBeVisible();
    await expect(editDialog.getByRole('button', { name: /annuler|cancel/i })).toBeVisible();

    await editDialog.getByRole('button', { name: /annuler|cancel/i }).click();
    await expect(editDialog).not.toBeVisible({ timeout: 3000 });
  });
});
