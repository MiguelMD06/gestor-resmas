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

    // 2. Create "Ana Pérez" with "3001234567" and "Juan Gómez" with "3109876543"
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

    await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();
    await expect(modal.locator('ion-title', { hasText: 'Nuevo cliente' })).toBeVisible();
    await modal.locator('[data-testid="input-nombre"] input').fill('Juan Gómez');
    await modal.locator('[data-testid="input-telefono"] input').fill('3109876543');
    await btnGuardar.click();
    await expect(modal).toHaveCount(0);

    const items = clientesPage.locator('[data-testid="item-cliente"]');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('Ana Pérez');
    await expect(items.nth(0)).toContainText('3001234567');
    await expect(items.nth(1)).toContainText('Juan Gómez');

    // 3. Search for "ana" -> returns only Ana
    const searchInput = clientesPage.locator('[data-testid="searchbar-clientes"] input');
    await searchInput.fill('ana');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Ana Pérez');

    // Clear search
    await searchInput.fill('');
    await expect(items).toHaveCount(2);

    // 4. Tap Ana Pérez to open her dossier, then edit to "Ana María Pérez"
    await items.first().click();
    await expect(page).toHaveURL(/\/clientes\/\d+$/);

    const expedientePage = page.locator('app-expediente');
    await expect(expedientePage.locator('[data-testid="expediente-nombre"]')).toHaveText('Ana Pérez');
    await expedientePage.locator('[data-testid="btn-editar-cliente"]').click();
    await expect(modal.locator('ion-title', { hasText: 'Editar cliente' })).toBeVisible();

    await modal.locator('[data-testid="input-nombre"] input').fill('Ana María Pérez');
    await modal.locator('[data-testid="btn-guardar-cliente"]').click();
    await expect(modal).toHaveCount(0);

    await expect(expedientePage.locator('[data-testid="expediente-nombre"]')).toHaveText('Ana María Pérez');

    await expedientePage.locator('[data-testid="btn-volver"]').click();
    await expect(page).toHaveURL(/\/clientes$/);

    await expect(items.first()).toContainText('Ana María Pérez');

    // 5. Reload page and verify persistence
    await page.reload();
    await expect(page).toHaveURL(/\/clientes$/);

    const itemsDespues = clientesPage.locator('[data-testid="item-cliente"]');
    await expect(itemsDespues).toHaveCount(2);
    await expect(itemsDespues.first()).toContainText('Ana María Pérez');
    await expect(itemsDespues.first()).toContainText('3001234567');

    expect(consoleErrors).toEqual([]);
  });

  test('C12: displays debt, "Al día", total receivable, and "Con deuda" filter after a credit sale', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    // 1. Contribute capital and buy 1 box Carta (10 reams)
    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);

    const inventarioPage = page.locator('app-inventario');
    await inventarioPage.locator('[data-testid="fab-principal"]').click();
    await inventarioPage.locator('[data-testid="fab-aportar-capital"]').click();
    const modalAporte = page.locator('app-aporte-modal');
    await expect(modalAporte).toBeVisible();
    await modalAporte.locator('[data-testid="input-monto"] input').fill('200000');
    await modalAporte.locator('[data-testid="btn-guardar-aporte"]').click();
    await expect(modalAporte).toHaveCount(0);

    await inventarioPage.locator('[data-testid="fab-principal"]').click();
    await inventarioPage.locator('[data-testid="fab-nueva-compra"]').click();
    const modalCompra = page.locator('app-nueva-compra-modal');
    await expect(modalCompra).toBeVisible();
    await modalCompra.locator('[data-testid="input-cajas"] input').fill('1');
    await modalCompra.locator('[data-testid="input-costo-caja"] input').fill('100000');
    await modalCompra.locator('[data-testid="btn-guardar-compra"]').click();
    await expect(modalCompra).toHaveCount(0);

    // 2. Create Ana Pérez (will buy on credit) and Beto (no purchases)
    await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
    await expect(page).toHaveURL(/\/clientes$/);

    const clientesPage = page.locator('app-clientes');
    const modalCliente = page.locator('app-cliente-modal');

    await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();
    await expect(modalCliente).toBeVisible();
    await modalCliente.locator('[data-testid="input-nombre"] input').fill('Ana Pérez');
    await modalCliente.locator('[data-testid="input-telefono"] input').fill('3001112233');
    await modalCliente.locator('[data-testid="btn-guardar-cliente"]').click();
    await expect(modalCliente).toHaveCount(0);

    await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();
    await expect(modalCliente).toBeVisible();
    await modalCliente.locator('[data-testid="input-nombre"] input').fill('Beto');
    await modalCliente.locator('[data-testid="input-telefono"] input').fill('3002223344');
    await modalCliente.locator('[data-testid="btn-guardar-cliente"]').click();
    await expect(modalCliente).toHaveCount(0);

    // 3. Make a credit sale (Fiado) to Ana Pérez for $30.000
    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);

    const venderPage = page.locator('app-vender');
    await venderPage.locator('[data-testid="selector-cliente"]').click();
    const modalSelector = page.locator('[data-testid="modal-selector-cliente"]');
    await expect(modalSelector).toBeVisible();
    await modalSelector.locator('[data-testid="item-cliente-vender"]', { hasText: 'Ana Pérez' }).click();
    await expect(modalSelector).toBeHidden();

    await venderPage.locator('[data-testid="item-lote"]').first().click();
    const linea = venderPage.locator('[data-testid="linea-venta"]').first();
    await linea.locator('[data-testid="input-cantidad"] input').fill('2');
    await linea.locator('[data-testid="input-precio-unitario"] input').fill('15000');

    await venderPage.locator('[data-testid="segment-fiado"]').click();
    await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();

    const modalResumen = page.locator('app-resumen-venta-modal');
    await expect(modalResumen).toBeVisible();
    await modalResumen.locator('[data-testid="btn-aceptar-venta"]').click();
    await expect(modalResumen).toHaveCount(0);

    // 4. Return to Clientes tab and verify debt, "Al día", total receivable, and filter
    await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
    await expect(page).toHaveURL(/\/clientes$/);

    await expect(clientesPage.locator('[data-testid="cantidad-clientes"]')).toContainText('2 clientes');
    await expect(clientesPage.locator('[data-testid="total-por-cobrar"]')).toContainText('$ 30.000');
    await expect(clientesPage.locator('[data-testid="cantidad-con-deuda"]')).toContainText('1 cliente con deuda');

    const items = clientesPage.locator('[data-testid="item-cliente"]');
    await expect(items).toHaveCount(2);

    const filaAna = items.filter({ hasText: 'Ana Pérez' });
    await expect(filaAna.locator('[data-testid="deuda-cliente"]')).toContainText('$ 30.000');
    await expect(filaAna.locator('[data-testid="facturas-cliente"]')).toContainText('1 factura');

    const filaBeto = items.filter({ hasText: 'Beto' });
    await expect(filaBeto.locator('[data-testid="al-dia-cliente"]')).toContainText('Al día');

    // Filter: "Con deuda"
    await clientesPage.locator('[data-testid="segment-filtro-con-deuda"]').click();
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Ana Pérez');

    // Filter: "Todos"
    await clientesPage.locator('[data-testid="segment-filtro-todos"]').click();
    await expect(items).toHaveCount(2);

    expect(consoleErrors).toEqual([]);
  });
});
