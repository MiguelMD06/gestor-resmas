import { expect, test } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

test.describe('Inventory flow: capital contribution and box purchase', () => {
  test('allows contributing capital, buying Carta paper boxes and preserves the lot after reloading the page', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    // 1. Open the app at / (redirects to /inventario)
    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);

    // Initially there are no lots, empty message is visible
    await expect(page.locator('[data-testid="mensaje-vacio"]')).toBeVisible();

    // 2. Contribute $300,000 capital in cash
    const fabPrincipal = page.locator('[data-testid="fab-principal"]');
    await fabPrincipal.click();

    const fabAporte = page.locator('[data-testid="fab-aportar-capital"]');
    await expect(fabAporte).toBeVisible();
    await fabAporte.click();

    // Contribution modal open
    await expect(page.locator('ion-title', { hasText: 'Aporte de capital' })).toBeVisible();

    // Save contribution button opens disabled until an amount is entered
    const btnGuardarAporte = page.locator('[data-testid="btn-guardar-aporte"]');
    await expect(btnGuardarAporte).toHaveAttribute('aria-disabled', 'true');
    await expect(btnGuardarAporte).toHaveAttribute('disabled', '');

    // Fill in amount of $300,000
    const inputMonto = page.locator('[data-testid="input-monto"] input');
    await inputMonto.fill('300000');

    // Now it is enabled
    await expect(btnGuardarAporte).not.toHaveAttribute('aria-disabled', 'true');
    await expect(btnGuardarAporte).not.toHaveAttribute('disabled');
    await btnGuardarAporte.click();

    // Wait for contribution modal to close
    await expect(page.locator('app-aporte-modal')).toHaveCount(0);

    // 3. Record purchase of 2 Carta boxes at $120,000 in cash
    await fabPrincipal.click();

    const fabCompra = page.locator('[data-testid="fab-nueva-compra"]');
    await expect(fabCompra).toBeVisible();
    await fabCompra.click();

    // New purchase modal open
    await expect(page.locator('ion-title', { hasText: 'Nueva compra' })).toBeVisible();

    // Quantity of boxes: 2
    const inputCajas = page.locator('[data-testid="input-cajas"] input');
    await inputCajas.fill('2');

    // Cost per box: 120000
    const inputCosto = page.locator('[data-testid="input-costo-caja"] input');
    await inputCosto.fill('120000');

    // Save purchase
    const btnGuardarCompra = page.locator('[data-testid="btn-guardar-compra"]');
    await expect(btnGuardarCompra).toBeEnabled();
    await btnGuardarCompra.click();

    // Wait for purchase modal to close
    await expect(page.locator('app-nueva-compra-modal')).toHaveCount(0);

    // 4. Check lot card with "20 de 20 resmas" at $ 12.000 per ream
    const tarjeta = page.locator('[data-testid="tarjeta-lote"]');
    await expect(tarjeta).toHaveCount(1);
    await expect(tarjeta).toContainText('20 de 20 resmas');
    await expect(tarjeta).toContainText('$ 12.000');

    // 5. Reload the page (data must persist in jeep-sqlite)
    await page.reload();
    await expect(page).toHaveURL(/\/inventario$/);

    const tarjetaDespues = page.locator('[data-testid="tarjeta-lote"]');
    await expect(tarjetaDespues).toHaveCount(1);
    await expect(tarjetaDespues).toContainText('20 de 20 resmas');
    await expect(tarjetaDespues).toContainText('$ 12.000');

    // No console errors
    expect(consoleErrors).toEqual([]);
  });

  test('shows live preview with insufficient balance and disabled button when entering boxes without funds', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);

    // Open new purchase modal directly without previous contribution
    const fabPrincipal = page.locator('[data-testid="fab-principal"]');
    await fabPrincipal.click();

    const fabCompra = page.locator('[data-testid="fab-nueva-compra"]');
    await expect(fabCompra).toBeVisible();
    await fabCompra.click();

    await expect(page.locator('ion-title', { hasText: 'Nueva compra' })).toBeVisible();

    // Fill in 2 boxes at $120,000
    const inputCajas = page.locator('[data-testid="input-cajas"] input');
    await inputCajas.fill('2');

    const inputCosto = page.locator('[data-testid="input-costo-caja"] input');
    await inputCosto.fill('120000');

    // Verify preview with "Costo total" and "$ 240.000"
    const card = page.locator('app-nueva-compra-modal ion-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Costo total: $ 240.000');

    // Insufficient balance warning visible
    const avisoSaldo = page.locator('[data-testid="aviso-saldo-insuficiente"]');
    await expect(avisoSaldo).toBeVisible();
    await expect(avisoSaldo).toContainText('El saldo del bolsillo no alcanza para esta compra');

    // Contribute capital button visible
    const btnAporte = page.locator('[data-testid="btn-aportar-capital"]');
    await expect(btnAporte).toBeVisible();

    // Save purchase button disabled
    const btnGuardarCompra = page.locator('[data-testid="btn-guardar-compra"]');
    await expect(btnGuardarCompra).toHaveAttribute('aria-disabled', 'true');
    await expect(btnGuardarCompra).toHaveAttribute('disabled', '');

    // No console errors
    expect(consoleErrors).toEqual([]);
  });
});
