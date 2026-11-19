import { expect, test, type Page } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

async function prepararEstadoInicial(page: Page): Promise<void> {
  // 1. Open app at /inventario
  await page.goto('/');
  await expect(page).toHaveURL(/\/inventario$/);

  const inventarioPage = page.locator('app-inventario');

  // 2. Contribute $400,000 in cash
  await inventarioPage.locator('[data-testid="fab-principal"]').click();
  await inventarioPage.locator('[data-testid="fab-aportar-capital"]').click();

  const modalAporte = page.locator('app-aporte-modal');
  await expect(modalAporte).toBeVisible();
  await modalAporte.locator('[data-testid="input-monto"] input').fill('400000');
  await modalAporte.locator('[data-testid="btn-guardar-aporte"]').click();
  await expect(modalAporte).toHaveCount(0);

  // 3. Buy Lot A: 2 boxes Carta at $120,000 (20 reams at $12,000)
  await inventarioPage.locator('[data-testid="fab-principal"]').click();
  await inventarioPage.locator('[data-testid="fab-nueva-compra"]').click();

  const modalCompra = page.locator('app-nueva-compra-modal');
  await expect(modalCompra).toBeVisible();
  await modalCompra.locator('[data-testid="input-cajas"] input').fill('2');
  await modalCompra.locator('[data-testid="input-costo-caja"] input').fill('120000');
  await modalCompra.locator('[data-testid="btn-guardar-compra"]').click();
  await expect(modalCompra).toHaveCount(0);

  // 4. Buy Lot B: 1 box Carta at $130,000 (10 reams at $13,000)
  await inventarioPage.locator('[data-testid="fab-principal"]').click();
  await inventarioPage.locator('[data-testid="fab-nueva-compra"]').click();

  await expect(modalCompra).toBeVisible();
  await modalCompra.locator('[data-testid="input-cajas"] input').fill('1');
  await modalCompra.locator('[data-testid="input-costo-caja"] input').fill('130000');
  await modalCompra.locator('[data-testid="btn-guardar-compra"]').click();
  await expect(modalCompra).toHaveCount(0);

  await expect(inventarioPage.locator('[data-testid="tarjeta-lote"]')).toHaveCount(2);

  // 5. Create customer "Ana María Pérez" in Clientes tab
  await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
  await expect(page).toHaveURL(/\/clientes$/);

  const clientesPage = page.locator('app-clientes');
  await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();

  const modalCliente = page.locator('app-cliente-modal');
  await expect(modalCliente).toBeVisible();
  await modalCliente.locator('[data-testid="input-nombre"] input').fill('Ana María Pérez');
  await modalCliente.locator('[data-testid="input-telefono"] input').fill('3001234567');
  await modalCliente.locator('[data-testid="btn-guardar-cliente"]').click();
  await expect(modalCliente).toHaveCount(0);
}

test.describe('Vender flow: POS sales, touches, multilote, lot exhaustion and persistence', () => {
  test('E6 & E19: completes sale to Ana in 5 touches and Mostrador sale in 3 touches', async ({ page }) => {
    const consoleErrors = capturarErroresConsola(page);
    await prepararEstadoInicial(page);

    // Navigate to Vender tab
    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);

    const venderPage = page.locator('app-vender');
    await expect(venderPage.locator('[data-testid="item-lote"]')).toHaveCount(2);

    // --- Part A: E6 / E19 to Ana in 5 touches (excluding typing) ---
    let toques = 0;

    // Touch 1: open customer selector
    await venderPage.locator('[data-testid="selector-cliente"]').click();
    toques++;

    const modalCliente = page.locator('[data-testid="modal-selector-cliente"]');
    await expect(modalCliente).toBeVisible();

    // Touch 2: tap Ana in results
    await modalCliente.locator('[data-testid="item-cliente-vender"]', { hasText: 'Ana María Pérez' }).click();
    toques++;
    await expect(modalCliente).toBeHidden();

    // Touch 3: tap Lot A (20 resmas)
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '20 resmas' }).click();
    toques++;

    // Type quantity (5) and price (15000) — typing does not count as touches
    const linea = venderPage.locator('[data-testid="linea-venta"]').first();
    await linea.locator('[data-testid="input-cantidad"] input').fill('5');
    await linea.locator('[data-testid="input-precio-unitario"] input').fill('15000');

    // Touch 4: tap Confirmar venta
    const btnConfirmar = venderPage.locator('[data-testid="btn-confirmar-venta"]');
    await expect(btnConfirmar).toBeEnabled();
    await btnConfirmar.click();
    toques++;

    const modalResumen = page.locator('app-resumen-venta-modal');
    await expect(modalResumen).toBeVisible();
    await expect(modalResumen.locator('[data-testid="resumen-cliente"]')).toContainText('Ana María Pérez');
    await expect(modalResumen.locator('[data-testid="resumen-linea"]')).toContainText(
      '5 × Carta a $ 15.000 = $ 75.000',
    );
    await expect(modalResumen.locator('[data-testid="resumen-total"]')).toContainText('Total: $ 75.000');
    await expect(modalResumen.locator('[data-testid="resumen-pago"]')).toContainText('Contado · Efectivo');

    // Touch 5: tap Aceptar
    await modalResumen.locator('[data-testid="btn-aceptar-venta"]').click();
    toques++;

    expect(toques).toBe(5);
    await expect(modalResumen).toHaveCount(0);

    // Client resets to Mostrador and Lot A now has 15 resmas
    await expect(venderPage.locator('[data-testid="selector-cliente"]')).toContainText('Mostrador');
    await expect(venderPage.locator('[data-testid="item-lote"]').first()).toContainText('15 resmas');

    // --- Part B: Mostrador & cash sale in 3 touches ---
    let toquesMostrador = 0;

    // Touch 1: tap Lot A
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '15 resmas' }).click();
    toquesMostrador++;

    const lineaMostrador = venderPage.locator('[data-testid="linea-venta"]').first();
    await lineaMostrador.locator('[data-testid="input-cantidad"] input').fill('1');
    await lineaMostrador.locator('[data-testid="input-precio-unitario"] input').fill('15000');

    // Touch 2: Confirmar venta
    await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();
    toquesMostrador++;

    // Touch 3: Aceptar
    await expect(modalResumen).toBeVisible();
    await modalResumen.locator('[data-testid="btn-aceptar-venta"]').click();
    toquesMostrador++;

    expect(toquesMostrador).toBe(3);
    await expect(modalResumen).toHaveCount(0);
    await expect(venderPage.locator('[data-testid="item-lote"]').first()).toContainText('14 resmas');

    expect(consoleErrors).toEqual([]);
  });

  test('E7 & E13: sells multilote, exhausts Lot B so it disappears from Vender and Inventario, and persists after reload', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);
    await prepararEstadoInicial(page);

    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);

    const venderPage = page.locator('app-vender');

    // Select Ana
    await venderPage.locator('[data-testid="selector-cliente"]').click();
    const modalCliente = page.locator('[data-testid="modal-selector-cliente"]');
    await modalCliente.locator('[data-testid="item-cliente-vender"]', { hasText: 'Ana María Pérez' }).click();
    await expect(modalCliente).toBeHidden();

    // E7: Multilote sale (3 from A at 15000, 2 from B at 16000, Transferencia)
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '20 resmas' }).click();
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '10 resmas' }).click();

    const lineas = venderPage.locator('[data-testid="linea-venta"]');
    await expect(lineas).toHaveCount(2);

    await lineas.nth(0).locator('[data-testid="input-cantidad"] input').fill('3');
    await lineas.nth(0).locator('[data-testid="input-precio-unitario"] input').fill('15000');

    await lineas.nth(1).locator('[data-testid="input-cantidad"] input').fill('2');
    await lineas.nth(1).locator('[data-testid="input-precio-unitario"] input').fill('16000');

    await venderPage.locator('[data-testid="segment-transferencia"]').click();
    await expect(venderPage.locator('[data-testid="resumen-totales"]')).toContainText('$ 77.000');

    await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();
    const modalResumen = page.locator('app-resumen-venta-modal');
    await expect(modalResumen).toBeVisible();
    await expect(modalResumen.locator('[data-testid="resumen-total"]')).toContainText('Total: $ 77.000');
    await expect(modalResumen.locator('[data-testid="resumen-pago"]')).toContainText('Contado · Transferencia');
    await modalResumen.locator('[data-testid="btn-aceptar-venta"]').click();
    await expect(modalResumen).toHaveCount(0);

    // A has 17 resmas, B has 8 resmas
    await expect(venderPage.locator('[data-testid="item-lote"]').nth(0)).toContainText('17 resmas');
    await expect(venderPage.locator('[data-testid="item-lote"]').nth(1)).toContainText('8 resmas');

    // E13: Sell remaining 8 reams of Lot B to exhaust it
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '8 resmas' }).click();
    const lineaB = venderPage.locator('[data-testid="linea-venta"]').first();
    await lineaB.locator('[data-testid="input-cantidad"] input').fill('8');
    await lineaB.locator('[data-testid="input-precio-unitario"] input').fill('15000');

    await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();
    await expect(modalResumen).toBeVisible();
    await modalResumen.locator('[data-testid="btn-aceptar-venta"]').click();
    await expect(modalResumen).toHaveCount(0);

    // Lot B disappears from Vender (only Lot A with 17 resmas remains)
    await expect(venderPage.locator('[data-testid="item-lote"]')).toHaveCount(1);
    await expect(venderPage.locator('[data-testid="item-lote"]').first()).toContainText('17 resmas');

    // Lot B also disappears from Inventario
    await page.locator('ion-tab-bar ion-tab-button[tab="inventario"]').click();
    await expect(page).toHaveURL(/\/inventario$/);
    const inventarioPage = page.locator('app-inventario');
    await expect(inventarioPage.locator('[data-testid="tarjeta-lote"]')).toHaveCount(1);
    await expect(inventarioPage.locator('[data-testid="tarjeta-lote"]').first()).toContainText('17 de 20 resmas');

    // Reload page and verify stock remains deducted
    await page.reload();
    await expect(page).toHaveURL(/\/inventario$/);
    await expect(inventarioPage.locator('[data-testid="tarjeta-lote"]')).toHaveCount(1);
    await expect(inventarioPage.locator('[data-testid="tarjeta-lote"]').first()).toContainText('17 de 20 resmas');

    expect(consoleErrors).toEqual([]);
  });

  test('E6 (3B): customer selector rows have uniform height and Mostrador shows "Venta rápida · solo contado"', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);
    await prepararEstadoInicial(page);

    // Add a second customer with phone so selector has Mostrador + 2 customers with phone
    const clientesPage = page.locator('app-clientes');
    await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();
    const modalNuevo = page.locator('app-cliente-modal');
    await expect(modalNuevo).toBeVisible();
    await modalNuevo.locator('[data-testid="input-nombre"] input').fill('Carlos Díaz');
    await modalNuevo.locator('[data-testid="input-telefono"] input').fill('3205550101');
    await modalNuevo.locator('[data-testid="btn-guardar-cliente"]').click();
    await expect(modalNuevo).toHaveCount(0);

    // Navigate to Vender and open customer selector
    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);
    const venderPage = page.locator('app-vender');
    await venderPage.locator('[data-testid="selector-cliente"]').click();

    const modalSelector = page.locator('[data-testid="modal-selector-cliente"]');
    await expect(modalSelector).toBeVisible();

    const filas = modalSelector.locator('[data-testid="item-cliente-vender"]');
    await expect(filas).toHaveCount(3);

    const filaMostrador = filas.filter({ hasText: 'Mostrador' });
    await expect(filaMostrador).toContainText('Venta rápida · solo contado');

    const alturas: number[] = [];
    for (let i = 0; i < 3; i++) {
      const box = await filas.nth(i).boundingBox();
      expect(box).not.toBeNull();
      alturas.push(box!.height);
    }

    expect(Math.max(...alturas) - Math.min(...alturas)).toBeLessThanOrEqual(1.5);
    expect(consoleErrors).toEqual([]);
  });

  test('formats unit price keystroke by keystroke without rejecting thousands separator (B3B.P)', async ({ page }) => {
    const consoleErrors = capturarErroresConsola(page);
    await prepararEstadoInicial(page);

    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);

    const venderPage = page.locator('app-vender');
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '20 resmas' }).click();

    const linea = venderPage.locator('[data-testid="linea-venta"]').first();
    await linea.locator('[data-testid="input-cantidad"] input:not(.cloned-input)').fill('2');

    const inputPrecio = linea.locator('[data-testid="input-precio-unitario"] input:not(.cloned-input)');
    await inputPrecio.click();
    await inputPrecio.pressSequentially('17500');

    await expect(inputPrecio).toHaveValue('$ 17.500');
    await expect(linea.locator('[data-testid="error-precio-unitario"]')).toHaveCount(0);
    await expect(venderPage.locator('[data-testid="resumen-totales"]')).toContainText('$ 35.000');

    expect(consoleErrors).toEqual([]);
  });
});
