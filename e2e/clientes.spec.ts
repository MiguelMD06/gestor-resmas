import { expect, test } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

test.describe('Customers flow: create, search, edit and persistence', () => {
  test('creates Ana Pérez with phone, searches her, edits her to Ana María Pérez and preserves her after reload', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    // 1. Open app and navigate to Clientes tab
    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);

    await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
    await expect(page).toHaveURL(/\/clientes$/);

    const clientesPage = page.locator('app-clientes');
    await expect(clientesPage.locator('ion-title', { hasText: 'Clientes' })).toBeVisible();
    await expect(clientesPage.locator('[data-testid="mensaje-vacio"]')).toContainText('Todavía no hay clientes');

    // 2. Create "Ana Pérez" with "3001234567"
    await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();
    const modal = page.locator('app-cliente-modal');
    await expect(modal.locator('ion-title', { hasText: 'Nuevo cliente' })).toBeVisible();

    const btnGuardar = modal.locator('[data-testid="btn-guardar-cliente"]');
    await expect(btnGuardar).toHaveAttribute('aria-disabled', 'true');

    await modal.locator('[data-testid="input-nombre"] input').fill('Ana Pérez');
    await modal.locator('[data-testid="input-telefono"] input').fill('3001234567');
    await expect(btnGuardar).not.toHaveAttribute('aria-disabled', 'true');
    await btnGuardar.click();

    await expect(modal).toHaveCount(0);

    const items = clientesPage.locator('[data-testid="item-cliente"]');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Ana Pérez');
    await expect(items.first()).toContainText('3001234567');

    // 3. Search for "ana"
    const searchInput = clientesPage.locator('[data-testid="searchbar-clientes"] input');
    await searchInput.fill('ana');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Ana Pérez');

    // Clear search
    await searchInput.fill('');
    await expect(items).toHaveCount(1);

    // 4. Tap Ana Pérez to edit to "Ana María Pérez"
    await items.first().click();
    await expect(modal.locator('ion-title', { hasText: 'Editar cliente' })).toBeVisible();

    await modal.locator('[data-testid="input-nombre"] input').fill('Ana María Pérez');
    await modal.locator('[data-testid="btn-guardar-cliente"]').click();
    await expect(modal).toHaveCount(0);

    await expect(items.first()).toContainText('Ana María Pérez');

    // 5. Reload page and verify persistence
    await page.reload();
    await expect(page).toHaveURL(/\/clientes$/);

    const itemsDespues = clientesPage.locator('[data-testid="item-cliente"]');
    await expect(itemsDespues).toHaveCount(1);
    await expect(itemsDespues.first()).toContainText('Ana María Pérez');
    await expect(itemsDespues.first()).toContainText('3001234567');

    expect(consoleErrors).toEqual([]);
  });
});
