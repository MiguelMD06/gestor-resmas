import { expect, test, type Page } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

async function seleccionarEnIonSelect(page: Page, testId: string, textoOpcion: string): Promise<void> {
  const select = page.locator(`[data-testid="${testId}"]`);
  await select.click();
  const alertButton = page.locator('ion-alert button.alert-radio-button', { hasText: textoOpcion });
  await expect(alertButton).toBeVisible();
  await alertButton.click();
  const okButton = page.locator('ion-alert button', { hasText: 'OK' });
  await okButton.click();
  await expect(page.locator('ion-alert')).toHaveCount(0);
}

test.describe('Independent verification V2: E8, E9 and adversarial UI flows', () => {
  test('E9: shows error screen when database initialization fails on first attempt and loads tabs after clicking Reintentar', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const originalWhenDefined = customElements.whenDefined.bind(customElements);
      let failFirst = true;
      customElements.whenDefined = function (name: string) {
        if (name === 'jeep-sqlite' && failFirst) {
          failFirst = false;
          return Promise.reject(new Error('Simulated jeep-sqlite initialization failure'));
        }
        return originalWhenDefined(name);
      };
    });

    await page.goto('/');

    const errorScreen = page.locator('app-error-arranque');
    const headingError = errorScreen.locator('h2', { hasText: 'No se pudo abrir la base de datos' });
    await expect(headingError).toBeVisible();
    await expect(errorScreen).toContainText('Revisa el espacio disponible en el teléfono y vuelve a intentarlo.');

    const btnReintentar = errorScreen.locator('ion-button', { hasText: 'Reintentar' });
    await expect(btnReintentar).toBeVisible();

    const consoleErrorsPostRetry = capturarErroresConsola(page);

    await btnReintentar.click();

    await expect(page).toHaveURL(/\/inventario$/);
    await expect(page.locator('ion-tab-bar ion-tab-button')).toHaveCount(4);
    await expect(errorScreen).toHaveCount(0);

    expect(consoleErrorsPostRetry).toEqual([]);
  });

  test('Adversarial UI & E8: live preview updates without extra interaction, validation errors for 120005 and 0, Aportar capital from insufficient balance modal, custom purchase date, and Carta/Oficio segment filtering', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);
    await expect(page.locator('[data-testid="mensaje-vacio"]')).toBeVisible();

    // 1. Open Nueva compra modal with $0 balance
    await page.locator('[data-testid="fab-principal"]').click();
    const fabCompra = page.locator('[data-testid="fab-nueva-compra"]');
    await expect(fabCompra).toBeVisible();
    await fabCompra.click();

    const modalCompra = page.locator('app-nueva-compra-modal');
    await expect(modalCompra).toBeVisible();

    const inputFecha = modalCompra.locator('[data-testid="input-fecha"] input');
    const inputCajas = modalCompra.locator('[data-testid="input-cajas"] input');
    const inputCosto = modalCompra.locator('[data-testid="input-costo-caja"] input');
    const btnGuardarCompra = modalCompra.locator('[data-testid="btn-guardar-compra"]');

    // Initially empty and disabled
    await expect(btnGuardarCompra).toHaveAttribute('aria-disabled', 'true');

    // 2. Validation error for 0 boxes -> CANTIDAD_INVALIDA
    await inputCajas.fill('0');
    await inputCosto.fill('120000');

    const errorCajas = modalCompra.locator('[data-testid="error-cajas"]');
    await expect(errorCajas).toBeVisible();
    await expect(errorCajas).toContainText('La cantidad de cajas debe ser un número entero mayor a cero');
    await expect(btnGuardarCompra).toHaveAttribute('aria-disabled', 'true');

    // 3. Validation error for box cost 120005 -> COSTO_CAJA_INVALIDO
    await inputCajas.fill('2');
    await inputCosto.fill('120005');

    await expect(errorCajas).toHaveCount(0);
    const errorCosto = modalCompra.locator('[data-testid="error-costo-caja"]');
    await expect(errorCosto).toBeVisible();
    await expect(errorCosto).toContainText('El costo por caja debe ser un número entero divisible entre 10');
    await expect(btnGuardarCompra).toHaveAttribute('aria-disabled', 'true');

    // 4. Live preview updates automatically upon typing valid quantity (2) and cost (120000) without extra clicks
    await inputCosto.fill('120000');
    await expect(errorCosto).toHaveCount(0);

    const previewCard = modalCompra.locator('ion-card');
    await expect(previewCard).toBeVisible();
    await expect(previewCard).toContainText('Saldo disponible en Efectivo: $ 0');
    await expect(previewCard).toContainText('Costo total: $ 240.000');
    await expect(previewCard).toContainText('Costo por resma: $ 12.000');

    // 5. Insufficient balance disables Guardar compra and offers Aportar capital
    await expect(modalCompra.locator('[data-testid="aviso-saldo-insuficiente"]')).toBeVisible();
    await expect(btnGuardarCompra).toHaveAttribute('aria-disabled', 'true');

    const btnAportarDesdeCompra = modalCompra.locator('[data-testid="btn-aportar-capital"]');
    await expect(btnAportarDesdeCompra).toBeVisible();
    await btnAportarDesdeCompra.click();

    // 6. Save contribution of $300.000 in Efectivo from nested Aporte modal
    const modalAporte = page.locator('app-aporte-modal');
    await expect(modalAporte).toBeVisible();
    await modalAporte.locator('[data-testid="input-monto"] input').fill('300000');
    await modalAporte.locator('[data-testid="btn-guardar-aporte"]').click();
    await expect(modalAporte).toHaveCount(0);

    // Upon returning, preview recalculates automatically and Guardar compra becomes enabled
    await expect(previewCard).toContainText('Saldo disponible en Efectivo: $ 300.000');
    await expect(modalCompra.locator('[data-testid="aviso-saldo-insuficiente"]')).toHaveCount(0);
    await expect(btnGuardarCompra).toBeEnabled();

    // 7. Choose a purchase date different from today (2026-10-15) and save Carta purchase (2 boxes at $120.000)
    await inputFecha.fill('2026-10-15');
    await btnGuardarCompra.click();
    await expect(modalCompra).toHaveCount(0);

    // Verify Carta card shows chosen date 2026-10-15, "20 de 20 resmas", and "$ 12.000"
    const tarjetas = page.locator('[data-testid="tarjeta-lote"]');
    await expect(tarjetas).toHaveCount(1);
    await expect(tarjetas.first()).toContainText('Ingreso: 2026-10-15');
    await expect(tarjetas.first()).toContainText('20 de 20 resmas');
    await expect(tarjetas.first()).toContainText('$ 12.000');

    // 8. E8: Add an Oficio lot (1 box at $130.000 by Transferencia on 2026-10-20)
    await page.locator('[data-testid="fab-principal"]').click();
    const fabAporte = page.locator('[data-testid="fab-aportar-capital"]');
    await expect(fabAporte).toBeVisible();
    await fabAporte.click();

    await expect(modalAporte).toBeVisible();
    await seleccionarEnIonSelect(page, 'select-medio', 'Transferencia');
    await modalAporte.locator('[data-testid="input-monto"] input').fill('130000');
    await modalAporte.locator('[data-testid="btn-guardar-aporte"]').click();
    await expect(modalAporte).toHaveCount(0);

    // Now buy 1 Oficio box at $130.000 by Transferencia on 2026-10-20
    await page.locator('[data-testid="fab-principal"]').click();
    await expect(fabCompra).toBeVisible();
    await fabCompra.click();
    await expect(modalCompra).toBeVisible();

    await seleccionarEnIonSelect(page, 'select-tipo-papel', 'Oficio');
    await seleccionarEnIonSelect(page, 'select-medio', 'Transferencia');
    await inputFecha.fill('2026-10-20');
    await inputCajas.fill('1');
    await inputCosto.fill('130000');

    await expect(previewCard).toContainText('Saldo disponible en Transferencia: $ 130.000');
    await expect(previewCard).toContainText('Costo total: $ 130.000');
    await expect(previewCard).toContainText('Costo por resma: $ 13.000');
    await expect(btnGuardarCompra).toBeEnabled();
    await btnGuardarCompra.click();
    await expect(modalCompra).toHaveCount(0);

    // 9. Verify E8 segment filtering: Carta shows only Carta, Oficio shows only Oficio
    await expect(tarjetas).toHaveCount(1);
    await expect(tarjetas.first()).toContainText('Ingreso: 2026-10-15');
    await expect(tarjetas.first()).toContainText('20 de 20 resmas');
    await expect(tarjetas.first()).toContainText('$ 12.000');

    // Switch to Oficio segment
    await page.locator('[data-testid="segment-oficio"]').click();
    await expect(tarjetas).toHaveCount(1);
    await expect(tarjetas.first()).toContainText('Ingreso: 2026-10-20');
    await expect(tarjetas.first()).toContainText('10 de 10 resmas');
    await expect(tarjetas.first()).toContainText('$ 13.000');

    // Switch back to Carta segment
    await page.locator('[data-testid="segment-carta"]').click();
    await expect(tarjetas).toHaveCount(1);
    await expect(tarjetas.first()).toContainText('20 de 20 resmas');

    expect(consoleErrors).toEqual([]);
  });
});
