import { expect, test } from '@playwright/test';

test.describe('Navegación principal por pestañas', () => {
  test('abre / y queda en /inventario, con las 4 pestañas visibles en el orden establecido', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

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

  test('un clic en cada pestaña navega a su URL y muestra su título', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

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
});
