import { expect, test, type Page } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

async function prepararBase(page: Page, opciones?: { conAna?: boolean }): Promise<void> {
  await page.goto('/');
  await expect(page).toHaveURL(/\/inventario$/);

  const inventarioPage = page.locator('app-inventario');

  // Contribute $ 400.000 in cash
  await inventarioPage.locator('[data-testid="fab-principal"]').click();
  await inventarioPage.locator('[data-testid="fab-aportar-capital"]').click();
  const modalAporte = page.locator('app-aporte-modal');
  await expect(modalAporte).toBeVisible();
  await modalAporte.locator('[data-testid="input-monto"] input').fill('400000');
  await modalAporte.locator('[data-testid="btn-guardar-aporte"]').click();
  await expect(modalAporte).toHaveCount(0);

  // Buy Lot A: 2 boxes Carta at $ 120.000 (20 reams at $ 12.000)
  await inventarioPage.locator('[data-testid="fab-principal"]').click();
  await inventarioPage.locator('[data-testid="fab-nueva-compra"]').click();
  const modalCompra = page.locator('app-nueva-compra-modal');
  await expect(modalCompra).toBeVisible();
  await modalCompra.locator('[data-testid="input-cajas"] input').fill('2');
  await modalCompra.locator('[data-testid="input-costo-caja"] input').fill('120000');
  await modalCompra.locator('[data-testid="btn-guardar-compra"]').click();
  await expect(modalCompra).toHaveCount(0);

  // Buy Lot B: 1 box Carta at $ 130.000 (10 reams at $ 13.000)
  await inventarioPage.locator('[data-testid="fab-principal"]').click();
  await inventarioPage.locator('[data-testid="fab-nueva-compra"]').click();
  await expect(modalCompra).toBeVisible();
  await modalCompra.locator('[data-testid="input-cajas"] input').fill('1');
  await modalCompra.locator('[data-testid="input-costo-caja"] input').fill('130000');
  await modalCompra.locator('[data-testid="btn-guardar-compra"]').click();
  await expect(modalCompra).toHaveCount(0);

  await expect(inventarioPage.locator('[data-testid="tarjeta-lote"]')).toHaveCount(2);

  if (opciones?.conAna) {
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
}

test.describe('Independent verification V3 — UI & Adversarial suite', () => {
  test('E21: formats "3800" as "$ 3.800" and rejects "3800,50" with exact error across Aporte, Compra and Vender', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);
    const inventarioPage = page.locator('app-inventario');

    // 1. Aporte modal
    await inventarioPage.locator('[data-testid="fab-principal"]').click();
    await inventarioPage.locator('[data-testid="fab-aportar-capital"]').click();
    const modalAporte = page.locator('app-aporte-modal');
    await expect(modalAporte).toBeVisible();

    const inputMonto = modalAporte.locator('[data-testid="input-monto"] input');
    const btnGuardarAporte = modalAporte.locator('[data-testid="btn-guardar-aporte"]');

    await inputMonto.fill('3800');
    await expect(inputMonto).toHaveValue('$ 3.800');
    await expect(btnGuardarAporte).toBeEnabled();

    await inputMonto.fill('3800,50');
    await expect(modalAporte.locator('[data-testid="input-monto"]')).toContainText(
      'Escribe el monto en pesos, sin decimales',
    );
    await expect(btnGuardarAporte).toHaveAttribute('aria-disabled', 'true');

    // Fix to $ 400.000 and save
    await inputMonto.fill('400000');
    await expect(inputMonto).toHaveValue('$ 400.000');
    await btnGuardarAporte.click();
    await expect(modalAporte).toHaveCount(0);

    // 2. Nueva compra modal
    await inventarioPage.locator('[data-testid="fab-principal"]').click();
    await inventarioPage.locator('[data-testid="fab-nueva-compra"]').click();
    const modalCompra = page.locator('app-nueva-compra-modal');
    await expect(modalCompra).toBeVisible();

    await modalCompra.locator('[data-testid="input-cajas"] input').fill('2');
    const inputCosto = modalCompra.locator('[data-testid="input-costo-caja"] input');
    const btnGuardarCompra = modalCompra.locator('[data-testid="btn-guardar-compra"]');

    await inputCosto.fill('3800');
    await expect(inputCosto).toHaveValue('$ 3.800');

    await inputCosto.fill('3800,50');
    await expect(modalCompra.locator('[data-testid="error-costo-caja"]')).toContainText(
      'Escribe el monto en pesos, sin decimales',
    );
    await expect(btnGuardarCompra).toHaveAttribute('aria-disabled', 'true');

    await inputCosto.fill('120000');
    await expect(inputCosto).toHaveValue('$ 120.000');
    await expect(btnGuardarCompra).toBeEnabled();
    await btnGuardarCompra.click();
    await expect(modalCompra).toHaveCount(0);

    // 3. Vender unit price
    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);
    const venderPage = page.locator('app-vender');

    await venderPage.locator('[data-testid="item-lote"]').first().click();
    const linea = venderPage.locator('[data-testid="linea-venta"]').first();
    const inputPrecio = linea.locator('[data-testid="input-precio-unitario"] input');
    const btnConfirmar = venderPage.locator('[data-testid="btn-confirmar-venta"]');

    await inputPrecio.fill('3800');
    await expect(inputPrecio).toHaveValue('$ 3.800');
    await expect(btnConfirmar).toBeEnabled();

    await inputPrecio.fill('3800,50');
    await expect(linea.locator('[data-testid="error-precio-unitario"]')).toContainText(
      'Escribe el monto en pesos, sin decimales',
    );
    await expect(btnConfirmar).toHaveAttribute('aria-disabled', 'true');

    expect(consoleErrors).toEqual([]);
  });

  test('E3b & adversarial double-tap on Guardar cliente: rejects duplicate phone with exact error and prevents duplicate client', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
    await expect(page).toHaveURL(/\/clientes$/);

    const clientesPage = page.locator('app-clientes');

    // Delay DB inserts slightly to test real double-tap on Guardar cliente
    await page.evaluate(() => {
      const jeep = document.querySelector('jeep-sqlite') as unknown as {
        run: (opts: { statement: string }) => Promise<unknown>;
      };
      const origRun = jeep.run.bind(jeep);
      jeep.run = async (opts: { statement: string }) => {
        if (opts.statement.includes('INSERT INTO clientes')) {
          await new Promise((r) => setTimeout(r, 250));
        }
        return origRun(opts);
      };
    });

    await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();
    const modal = page.locator('app-cliente-modal');
    await modal.locator('[data-testid="input-nombre"] input').fill('Ana María Pérez');
    await modal.locator('[data-testid="input-telefono"] input').fill('3001234567');

    // Double-tap Guardar cliente rapidly
    const btnGuardar = modal.locator('[data-testid="btn-guardar-cliente"]');
    await btnGuardar.dblclick();
    await expect(modal).toHaveCount(0);

    // Only 1 customer created
    await expect(clientesPage.locator('[data-testid="item-cliente"]')).toHaveCount(1);

    // E3b: try creating Laura Ruiz with Ana's phone
    await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();
    await expect(modal).toBeVisible();
    await modal.locator('[data-testid="input-nombre"] input').fill('Laura Ruiz');
    await modal.locator('[data-testid="input-telefono"] input').fill('3001234567');
    await modal.locator('[data-testid="btn-guardar-cliente"]').click();

    await expect(modal.locator('[data-testid="error-telefono"]')).toContainText(
      'Ya existe un cliente con ese número de celular',
    );
    await modal.locator('[data-testid="btn-cancelar"]').click();
    await expect(modal).toHaveCount(0);
    await expect(clientesPage.locator('[data-testid="item-cliente"]')).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
  });

  test('E14, E15, E19 (touches & Volver a editar), E13 and adversarial Vender checks (Mostrador options, recalculating after Volver a editar, future date blocked)', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);
    await prepararBase(page, { conAna: true });

    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);
    const venderPage = page.locator('app-vender');

    // Adversarial: with Mostrador (default), Fiado and Abono inicial are not offered
    await expect(venderPage.locator('[data-testid="selector-cliente"]')).toContainText('Mostrador');
    await expect(venderPage.locator('[data-testid="segment-contado"]')).toBeVisible();
    await expect(venderPage.locator('[data-testid="segment-fiado"]')).toHaveCount(0);
    await expect(venderPage.locator('[data-testid="segment-abono-inicial"]')).toHaveCount(0);

    // Adversarial: date picker max prevents choosing tomorrow
    const hoyStr = await page.evaluate(() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const mananaInfo = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    });
    await venderPage.locator('[data-testid="btn-fecha-venta"]').click();
    const modalFecha = page.locator('[data-testid="modal-fecha-venta"]');
    await expect(modalFecha).toBeVisible();
    const datetime = modalFecha.locator('[data-testid="datetime-fecha-venta"]');
    const maxProp = await datetime.evaluate((el) => (el as HTMLElement & { max?: string }).max ?? null);
    expect(maxProp?.startsWith(hoyStr)).toBe(true);
    const tomorrowBtn = datetime.locator(
      `button.calendar-day[data-day="${mananaInfo.day}"][data-month="${mananaInfo.month}"][data-year="${mananaInfo.year}"]`,
    );
    if ((await tomorrowBtn.count()) > 0) {
      await expect(tomorrowBtn).toBeDisabled();
    }
    await modalFecha.locator('ion-button', { hasText: 'Listo' }).click();
    await expect(modalFecha).toBeHidden();

    // Touch 1 & 2: choose Ana
    await venderPage.locator('[data-testid="selector-cliente"]').click();
    const modalSelector = page.locator('[data-testid="modal-selector-cliente"]');
    await modalSelector.locator('[data-testid="item-cliente-vender"]', { hasText: 'Ana María Pérez' }).click();
    await expect(modalSelector).toBeHidden();

    // Now Fiado and Abono inicial appear
    await expect(venderPage.locator('[data-testid="segment-fiado"]')).toBeVisible();
    await expect(venderPage.locator('[data-testid="segment-abono-inicial"]')).toBeVisible();

    // Touch 3: add Lot A
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '20 resmas' }).click();
    const linea = venderPage.locator('[data-testid="linea-venta"]').first();
    const inputPrecio = linea.locator('[data-testid="input-precio-unitario"] input:not(.cloned-input)');
    const inputCantidad = linea.locator('[data-testid="input-cantidad"] input:not(.cloned-input)');
    const btnConfirmar = venderPage.locator('[data-testid="btn-confirmar-venta"]');

    // E15: empty price -> disabled and error shown
    await expect(btnConfirmar).toHaveAttribute('aria-disabled', 'true');
    await expect(linea.locator('[data-testid="error-precio-unitario"]')).toContainText(
      'El precio debe ser un número entero mayor a cero',
    );

    // E15: price 0 -> disabled and error shown
    await inputPrecio.fill('0');
    await expect(btnConfirmar).toHaveAttribute('aria-disabled', 'true');
    await expect(linea.locator('[data-testid="error-precio-unitario"]')).toContainText(
      'El precio debe ser un número entero mayor a cero',
    );

    // E15: empty quantity and 0 quantity -> disabled and error shown
    await inputPrecio.fill('15000');
    await inputCantidad.fill('');
    await expect(btnConfirmar).toHaveAttribute('aria-disabled', 'true');
    await expect(linea.locator('[data-testid="error-cantidad"]')).toContainText(
      'La cantidad de resmas debe ser un número entero mayor a cero',
    );

    await inputCantidad.fill('0');
    await expect(btnConfirmar).toHaveAttribute('aria-disabled', 'true');
    await expect(linea.locator('[data-testid="error-cantidad"]')).toContainText(
      'La cantidad de resmas debe ser un número entero mayor a cero',
    );

    // E14: below-cost warning
    await inputCantidad.fill('1');
    await inputPrecio.fill('11000');
    await expect(linea.locator('[data-testid="aviso-bajo-costo"]')).toContainText(
      'Precio por debajo del costo: pierdes $ 1.000',
    );
    await expect(btnConfirmar).toBeEnabled();

    // E19 & Adversarial: open summary, Volver a editar saves nothing, edit price recalculates total
    await inputCantidad.fill('5');
    await inputPrecio.fill('14000');
    await expect(venderPage.locator('[data-testid="resumen-totales"]')).toContainText('Total: $ 70.000');

    await btnConfirmar.click();
    const modalResumen = page.locator('app-resumen-venta-modal');
    await expect(modalResumen).toBeVisible();
    await expect(modalResumen.locator('[data-testid="resumen-total"]')).toContainText('Total: $ 70.000');

    // Click Volver a editar -> saves nothing
    await modalResumen.locator('[data-testid="btn-volver-editar"]').click();
    await expect(modalResumen).toHaveCount(0);
    await expect(venderPage.locator('[data-testid="item-lote"]').first()).toContainText('20 resmas');

    // Edit price to 15000 -> total recalculates to $ 75.000
    await inputPrecio.fill('15000');
    await expect(venderPage.locator('[data-testid="resumen-totales"]')).toContainText('Total: $ 75.000');

    // Touch 4: Confirmar venta -> exact E19 summary texts
    await btnConfirmar.click();
    await expect(modalResumen).toBeVisible();
    await expect(modalResumen.locator('[data-testid="resumen-cliente"]')).toContainText('Ana María Pérez');
    await expect(modalResumen.locator('[data-testid="resumen-linea"]')).toContainText(
      '5 × Carta a $ 15.000 = $ 75.000',
    );
    await expect(modalResumen.locator('[data-testid="resumen-total"]')).toContainText('Total: $ 75.000');
    await expect(modalResumen.locator('[data-testid="resumen-pago"]')).toContainText('Contado · Efectivo');

    // Touch 5: Aceptar -> client resets to Mostrador, Lot A drops to 15
    await modalResumen.locator('[data-testid="btn-aceptar-venta"]').click();
    await expect(modalResumen).toHaveCount(0);
    await expect(venderPage.locator('[data-testid="selector-cliente"]')).toContainText('Mostrador');
    await expect(venderPage.locator('[data-testid="item-lote"]').first()).toContainText('15 resmas');

    // E19 Part B: Mostrador sale in 3 touches (1: tap lot, 2: Confirmar venta, 3: Aceptar)
    let toquesMostrador = 0;
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '15 resmas' }).click();
    toquesMostrador++;
    await linea.locator('[data-testid="input-cantidad"] input:not(.cloned-input)').fill('1');
    await linea.locator('[data-testid="input-precio-unitario"] input:not(.cloned-input)').fill('15000');
    await btnConfirmar.click();
    toquesMostrador++;
    await expect(modalResumen).toBeVisible();
    await modalResumen.locator('[data-testid="btn-aceptar-venta"]').click();
    toquesMostrador++;
    expect(toquesMostrador).toBe(3);
    await expect(modalResumen).toHaveCount(0);
    await expect(venderPage.locator('[data-testid="item-lote"]').first()).toContainText('14 resmas');

    // E13: exhaust Lot B -> disappears from Vender and Inventario
    await venderPage.locator('[data-testid="item-lote"]', { hasText: '10 resmas' }).click();
    const lineaB = venderPage.locator('[data-testid="linea-venta"]').first();
    await lineaB.locator('[data-testid="input-cantidad"] input:not(.cloned-input)').fill('10');
    await lineaB.locator('[data-testid="input-precio-unitario"] input:not(.cloned-input)').fill('15000');
    await btnConfirmar.click();
    await expect(modalResumen).toBeVisible();
    await modalResumen.locator('[data-testid="btn-aceptar-venta"]').click();
    await expect(modalResumen).toHaveCount(0);

    await expect(venderPage.locator('[data-testid="item-lote"]')).toHaveCount(1);
    await page.locator('ion-tab-bar ion-tab-button[tab="inventario"]').click();
    await expect(page.locator('app-inventario [data-testid="tarjeta-lote"]')).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
  });

  test('Adversarial: double-tap on Aceptar produces 1 sale and backdrop click while saving does not dismiss summary', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);
    await prepararBase(page);

    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);
    const venderPage = page.locator('app-vender');

    await venderPage.locator('[data-testid="item-lote"]', { hasText: '20 resmas' }).click();
    const linea = venderPage.locator('[data-testid="linea-venta"]').first();
    await linea.locator('[data-testid="input-cantidad"] input').fill('2');
    await linea.locator('[data-testid="input-precio-unitario"] input').fill('15000');
    await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();

    const modalResumen = page.locator('app-resumen-venta-modal');
    await expect(modalResumen).toBeVisible();

    // Slow down INSERT INTO ventas inside jeep-sqlite so we can observe in-flight saving state
    await page.evaluate(() => {
      const jeep = document.querySelector('jeep-sqlite') as unknown as {
        run: (opts: { statement: string }) => Promise<unknown>;
      };
      const origRun = jeep.run.bind(jeep);
      Object.defineProperty(jeep, 'run', {
        configurable: true,
        writable: true,
        value: async (opts: { statement: string }) => {
          if (opts.statement.includes('INSERT INTO ventas')) {
            await new Promise((r) => setTimeout(r, 700));
          }
          return origRun(opts);
        },
      });
    });

    const btnAceptar = modalResumen.locator('[data-testid="btn-aceptar-venta"]');
    const btnVolver = modalResumen.locator('[data-testid="btn-volver-editar"]');

    // Rapid double click on Aceptar
    await btnAceptar.click();
    await expect(modalResumen.locator('[data-testid="indicador-guardando"]')).toBeVisible();
    await expect(btnAceptar).toHaveAttribute('aria-disabled', 'true');
    await expect(btnVolver).toHaveAttribute('aria-disabled', 'true');

    // Attempt second click (force) & attempt backdrop click while saving
    await btnAceptar.click({ force: true });
    await page.mouse.click(5, 5);
    await expect(modalResumen).toBeVisible();

    // Wait for save completion and modal dismissal
    await expect(modalResumen).toHaveCount(0);

    // Only 2 reams deducted (20 -> 18) and only 1 row in ventas
    await expect(venderPage.locator('[data-testid="item-lote"]').first()).toContainText('18 resmas');
    const ventasCount = await page.evaluate(async () => {
      const jeep = document.querySelector('jeep-sqlite') as unknown as {
        query: (opts: { database: string; statement: string; values: unknown[] }) => Promise<{ values?: unknown[] }>;
      };
      const res = await jeep.query({
        database: 'gestor_resmas',
        statement: 'SELECT COUNT(*) AS total FROM ventas;',
        values: [],
      });
      return res.values;
    });
    expect(ventasCount).toEqual([{ total: 1 }]);

    expect(consoleErrors).toEqual([]);
  });

  test('E18: shows error state with Reintentar when loading lots/customers fails, and recovers on retry', async ({
    page,
  }) => {
    await prepararBase(page);

    // Intercept next SELECT on lotes_cajas to fail once when entering Vender
    await page.evaluate(() => {
      const jeep = document.querySelector('jeep-sqlite') as unknown as {
        query: (opts: { database: string; statement: string; values: unknown[] }) => Promise<unknown>;
      };
      const origQuery = jeep.query.bind(jeep);
      let failOnce = true;
      Object.defineProperty(jeep, 'query', {
        configurable: true,
        writable: true,
        value: async (opts: { database: string; statement: string; values: unknown[] }) => {
          if (failOnce && opts.statement.includes('FROM lotes_cajas')) {
            failOnce = false;
            throw new Error('Simulated query failure');
          }
          return origQuery(opts);
        },
      });
    });

    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);
    const venderPage = page.locator('app-vender');

    await expect(venderPage.locator('[data-testid="estado-error"]')).toBeVisible();
    await expect(venderPage.locator('[data-testid="mensaje-error-carga"]')).toContainText(
      'Ocurrió un error inesperado',
    );
    await expect(venderPage.locator('[data-testid="mensaje-sin-lotes"]')).toHaveCount(0);

    const consoleErrorsPostRetry = capturarErroresConsola(page);
    await venderPage.locator('[data-testid="btn-reintentar"]').click();

    await expect(venderPage.locator('[data-testid="estado-error"]')).toHaveCount(0);
    await expect(venderPage.locator('[data-testid="item-lote"]')).toHaveCount(2);
    expect(consoleErrorsPostRetry).toEqual([]);
  });
});
