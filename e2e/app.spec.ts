import { expect, test } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

test.describe('Main tab navigation', () => {
  test('opens / and redirects to /inventario with 4 visible tabs in the expected order', async ({ page }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');

    await expect(page).toHaveURL(/\/inventario$/);

    const tabButtons = page.locator('ion-tab-bar ion-tab-button');
    await expect(tabButtons).toHaveCount(4);

    await expect(tabButtons.nth(0)).toHaveAttribute('tab', 'finanzas');
    await expect(tabButtons.nth(0)).toContainText('Finanzas');

    await expect(tabButtons.nth(1)).toHaveAttribute('tab', 'vender');
    await expect(tabButtons.nth(1)).toContainText('Vender');

    await expect(tabButtons.nth(2)).toHaveAttribute('tab', 'inventario');
    await expect(tabButtons.nth(2)).toContainText('Inventario');

    await expect(tabButtons.nth(3)).toHaveAttribute('tab', 'clientes');
    await expect(tabButtons.nth(3)).toContainText('Clientes');

    await expect(page.locator('ion-title', { hasText: 'Inventario' })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('clicking each tab navigates to its URL and displays its title', async ({ page }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);

    const pestanas = [
      { tab: 'finanzas', ruta: '/finanzas', titulo: 'Finanzas' },
      { tab: 'vender', ruta: '/vender', titulo: 'Vender' },
      { tab: 'inventario', ruta: '/inventario', titulo: 'Inventario' },
      { tab: 'clientes', ruta: '/clientes', titulo: 'Clientes' },
    ];

    for (const p of pestanas) {
      const boton = page.locator(`ion-tab-bar ion-tab-button[tab="${p.tab}"]`);
      await boton.click();
      await expect(page).toHaveURL(new RegExp(`${p.ruta}$`));
      await expect(page.locator('ion-title', { hasText: p.titulo })).toBeVisible();
    }

    expect(consoleErrors).toEqual([]);
  });

  test('opening /no-existe redirects to /inventario', async ({ page }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/no-existe');
    await expect(page).toHaveURL(/\/inventario$/);
    await expect(page.locator('ion-title', { hasText: 'Inventario' })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});
