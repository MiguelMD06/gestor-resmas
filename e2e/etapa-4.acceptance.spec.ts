import { expect, test } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

test.describe('Etapa 4 — Aceptación cartera y expediente', () => {
  test('C16: flujo completo de expediente, abono a la deuda, resumen, pagar todo y cliente sin compras', async ({
    page,
  }) => {
    test.setTimeout(60000);
    const consoleErrors = capturarErroresConsola(page);

    // 1. Aportar capital y comprar 1 caja Carta (10 resmas, costo $10.000 c/u)
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

    // 2. Crear Ana Pérez y Beto (sin compras)
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

    // Verificar cliente sin compras en su expediente
    await clientesPage.locator('[data-testid="item-cliente"]', { hasText: 'Beto' }).click();
    await expect(page).toHaveURL(/\/clientes\/\d+$/);
    const expedientePage = page.locator('app-expediente');
    await expect(expedientePage.locator('[data-testid="expediente-nombre"]')).toHaveText('Beto');
    await expect(expedientePage.locator('[data-testid="mensaje-sin-compras"]')).toHaveText(
      'Este cliente todavía no tiene compras',
    );
    await expedientePage.locator('[data-testid="btn-volver"]').click();
    await expect(page).toHaveURL(/\/clientes$/);

    // 3. Vender a fiado dos veces a Ana Pérez: F1 ($30.000 fiado) y F2 ($15.000 con abono inicial $5.000)
    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);

    const venderPage = page.locator('app-vender');
    const modalSelector = page.locator('[data-testid="modal-selector-cliente"]');
    const modalResumenVenta = page.locator('app-resumen-venta-modal');

    // Venta 1: Fiado $30.000 (2 x $15.000)
    await venderPage.locator('[data-testid="selector-cliente"]').click();
    await expect(modalSelector).toBeVisible();
    await modalSelector.locator('[data-testid="item-cliente-vender"]', { hasText: 'Ana Pérez' }).click();
    await expect(modalSelector).toBeHidden();

    await venderPage.locator('[data-testid="item-lote"]').first().click();
    const linea1 = venderPage.locator('[data-testid="linea-venta"]').first();
    await linea1.locator('[data-testid="input-cantidad"] input').fill('2');
    await linea1.locator('[data-testid="input-precio-unitario"] input').fill('15000');
    await venderPage.locator('[data-testid="segment-fiado"]').click();
    await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();
    await expect(modalResumenVenta).toBeVisible();
    await modalResumenVenta.locator('[data-testid="btn-aceptar-venta"]').click();
    await expect(modalResumenVenta).toHaveCount(0);

    // Venta 2: Abono inicial $5.000 sobre $15.000 (1 x $15.000)
    await venderPage.locator('[data-testid="selector-cliente"]').click();
    await expect(modalSelector).toBeVisible();
    await modalSelector.locator('[data-testid="item-cliente-vender"]', { hasText: 'Ana Pérez' }).click();
    await expect(modalSelector).toBeHidden();

    await venderPage.locator('[data-testid="item-lote"]').first().click();
    const linea2 = venderPage.locator('[data-testid="linea-venta"]').first();
    await linea2.locator('[data-testid="input-cantidad"] input').fill('1');
    await linea2.locator('[data-testid="input-precio-unitario"] input').fill('15000');
    await venderPage.locator('[data-testid="segment-abono-inicial"]').click();
    await venderPage.locator('[data-testid="input-abono-inicial"] input').fill('5000');
    await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();
    await expect(modalResumenVenta).toBeVisible();
    await modalResumenVenta.locator('[data-testid="btn-aceptar-venta"]').click();
    await expect(modalResumenVenta).toHaveCount(0);

    // 4. Abrir expediente de Ana desde el directorio
    await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
    await expect(page).toHaveURL(/\/clientes$/);
    await clientesPage.locator('[data-testid="item-cliente"]', { hasText: 'Ana Pérez' }).click();
    await expect(page).toHaveURL(/\/clientes\/\d+$/);

    await expect(expedientePage.locator('[data-testid="expediente-nombre"]')).toHaveText('Ana Pérez');
    await expect(expedientePage.locator('[data-testid="expediente-deuda-total"]')).toHaveText('$ 40.000');
    await expect(expedientePage.locator('[data-testid="expediente-capital"]')).toHaveText('$ 25.000');
    await expect(expedientePage.locator('[data-testid="expediente-ganancia"]')).toHaveText('$ 15.000');
    await expect(expedientePage.locator('[data-testid="expediente-facturas-con-saldo"]')).toHaveText(
      '2 facturas con saldo',
    );

    const tarjetasFactura = expedientePage.locator('[data-testid="tarjeta-factura"]');
    await expect(tarjetasFactura).toHaveCount(2);
    await expect(tarjetasFactura.nth(0).locator('[data-testid="estado-factura"]')).toHaveText('Abonada parcialmente');
    await expect(tarjetasFactura.nth(1).locator('[data-testid="estado-factura"]')).toHaveText('Pendiente');

    // 5. Registrar abono "A la deuda" por $35.000 y verificar resumen + expediente
    await expedientePage.locator('[data-testid="btn-registrar-abono"]').click();
    const modalAbono = page.locator('app-abono-modal');
    await expect(modalAbono).toBeVisible();
    await modalAbono.locator('[data-testid="input-monto-abono"] input').fill('35000');
    await modalAbono.locator('[data-testid="btn-revisar-abono"]').click();

    const modalResumenAbono = page.locator('app-resumen-abono-modal');
    await expect(modalResumenAbono).toBeVisible();
    await expect(modalResumenAbono.locator('[data-testid="resumen-linea-factura"]')).toHaveCount(2);
    await expect(modalResumenAbono.locator('[data-testid="resumen-linea-factura"]').nth(0)).toContainText(
      'Queda pagada',
    );
    await expect(modalResumenAbono.locator('[data-testid="resumen-linea-factura"]').nth(1)).toContainText(
      'Queda debiendo $ 5.000',
    );
    await expect(modalResumenAbono.locator('[data-testid="resumen-capital"]')).toHaveText('$ 25.000');
    await expect(modalResumenAbono.locator('[data-testid="resumen-ganancia"]')).toHaveText('$ 10.000');
    await expect(modalResumenAbono.locator('[data-testid="resumen-deuda-despues"]')).toHaveText('$ 5.000');

    await modalResumenAbono.locator('[data-testid="btn-aceptar-abono"]').click();
    await expect(modalResumenAbono).toHaveCount(0);
    await expect(modalAbono).toHaveCount(0);

    await expect(expedientePage.locator('[data-testid="expediente-deuda-total"]')).toHaveText('$ 5.000');
    await expect(tarjetasFactura.nth(0).locator('[data-testid="estado-factura"]')).toHaveText('Abonada parcialmente');
    await expect(tarjetasFactura.nth(1).locator('[data-testid="estado-factura"]')).toHaveText('Pagada');

    // Pestaña Abonos: el abono nuevo de $35.000 va primero
    await expedientePage.locator('[data-testid="segment-abonos"]').click();
    const tarjetasAbono = expedientePage.locator('[data-testid="tarjeta-abono"]');
    await expect(tarjetasAbono).toHaveCount(2);
    await expect(tarjetasAbono.nth(0)).toContainText('$ 35.000');
    await expect(tarjetasAbono.nth(0)).toContainText('A la deuda');
    await expect(tarjetasAbono.nth(0)).toContainText('quedó pagada');

    // 6. Pagar todo y comprobar "Al día" en expediente y directorio
    await expedientePage.locator('[data-testid="btn-pagar-todo"]').click();
    await expect(modalAbono).toBeVisible();
    await modalAbono.locator('[data-testid="btn-revisar-abono"]').click();
    await expect(modalResumenAbono).toBeVisible();
    await expect(modalResumenAbono.locator('[data-testid="resumen-deuda-despues"]')).toHaveText('$ 0');
    await modalResumenAbono.locator('[data-testid="btn-aceptar-abono"]').click();
    await expect(modalResumenAbono).toHaveCount(0);
    await expect(modalAbono).toHaveCount(0);

    await expect(expedientePage.locator('[data-testid="expediente-deuda-total"]')).toHaveText('$ 0');
    await expect(expedientePage.locator('[data-testid="expediente-facturas-con-saldo"]')).toHaveText('Al día');

    await expedientePage.locator('[data-testid="btn-volver"]').click();
    await expect(page).toHaveURL(/\/clientes$/);
    const filaAna = clientesPage.locator('[data-testid="item-cliente"]', { hasText: 'Ana Pérez' });
    await expect(filaAna.locator('[data-testid="al-dia-cliente"]')).toContainText('Al día');

    expect(consoleErrors).toEqual([]);
  });
});
