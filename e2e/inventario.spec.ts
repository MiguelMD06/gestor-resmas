import { expect, test } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

test.describe('Flujo de inventario: aporte de capital y compra de cajas', () => {
  test('permite aportar capital, comprar cajas de papel Carta y conserva el lote tras recargar la página', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    // 1. Abrir la app en / (redirige a /inventario)
    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);

    // Inicialmente no hay lotes, se ve el mensaje vacío
    await expect(page.locator('[data-testid="mensaje-vacio"]')).toBeVisible();

    // 2. Aportar capital de $300.000 en efectivo
    const fabPrincipal = page.locator('[data-testid="fab-principal"]');
    await fabPrincipal.click();

    const fabAporte = page.locator('[data-testid="fab-aportar-capital"]');
    await expect(fabAporte).toBeVisible();
    await fabAporte.click();

    // Modal de aporte abierto
    await expect(page.locator('ion-title', { hasText: 'Aporte de capital' })).toBeVisible();

    // El botón Guardar aporte abre deshabilitado hasta escribir un monto
    const btnGuardarAporte = page.locator('[data-testid="btn-guardar-aporte"]');
    await expect(btnGuardarAporte).toHaveAttribute('aria-disabled', 'true');
    await expect(btnGuardarAporte).toHaveAttribute('disabled', '');

    // Diligenciar monto de $300.000
    const inputMonto = page.locator('[data-testid="input-monto"] input');
    await inputMonto.fill('300000');

    // Ahora se habilita
    await expect(btnGuardarAporte).not.toHaveAttribute('disabled', '');
    await btnGuardarAporte.click();

    // Esperar a que el modal de aporte se cierre
    await expect(page.locator('app-aporte-modal')).toHaveCount(0);

    // 3. Registrar compra de 2 cajas Carta a $120.000 en efectivo
    await fabPrincipal.click();

    const fabCompra = page.locator('[data-testid="fab-nueva-compra"]');
    await expect(fabCompra).toBeVisible();
    await fabCompra.click();

    // Modal de nueva compra abierto
    await expect(page.locator('ion-title', { hasText: 'Nueva compra' })).toBeVisible();

    // Cantidad de cajas: 2
    const inputCajas = page.locator('[data-testid="input-cajas"] input');
    await inputCajas.fill('2');

    // Costo por caja: 120000
    const inputCosto = page.locator('[data-testid="input-costo-caja"] input');
    await inputCosto.fill('120000');

    // Guardar compra
    const btnGuardarCompra = page.locator('[data-testid="btn-guardar-compra"]');
    await expect(btnGuardarCompra).toBeEnabled();
    await btnGuardarCompra.click();

    // Esperar a que el modal de compra se cierre
    await expect(page.locator('app-nueva-compra-modal')).toHaveCount(0);

    // 4. Ver la tarjeta con "20 de 20 resmas" a $ 12.000 por resma
    const tarjeta = page.locator('[data-testid="tarjeta-lote"]');
    await expect(tarjeta).toHaveCount(1);
    await expect(tarjeta).toContainText('20 de 20 resmas');
    await expect(tarjeta).toContainText('$ 12.000');

    // 5. Recargar la página (los datos deben persistir en jeep-sqlite)
    await page.reload();
    await expect(page).toHaveURL(/\/inventario$/);

    const tarjetaDespues = page.locator('[data-testid="tarjeta-lote"]');
    await expect(tarjetaDespues).toHaveCount(1);
    await expect(tarjetaDespues).toContainText('20 de 20 resmas');
    await expect(tarjetaDespues).toContainText('$ 12.000');

    // Sin errores en consola
    expect(consoleErrors).toEqual([]);
  });

  test('muestra vista previa con saldo insuficiente y boton deshabilitado al ingresar cajas sin fondos', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);

    // Abrir modal de nueva compra directamente sin aporte previo
    const fabPrincipal = page.locator('[data-testid="fab-principal"]');
    await fabPrincipal.click();

    const fabCompra = page.locator('[data-testid="fab-nueva-compra"]');
    await expect(fabCompra).toBeVisible();
    await fabCompra.click();

    await expect(page.locator('ion-title', { hasText: 'Nueva compra' })).toBeVisible();

    // Diligenciar 2 cajas a $120.000
    const inputCajas = page.locator('[data-testid="input-cajas"] input');
    await inputCajas.fill('2');

    const inputCosto = page.locator('[data-testid="input-costo-caja"] input');
    await inputCosto.fill('120000');

    // Verificar vista previa con "Costo total" y "$ 240.000"
    const card = page.locator('app-nueva-compra-modal ion-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Costo total: $ 240.000');

    // Aviso de saldo insuficiente visible
    const avisoSaldo = page.locator('[data-testid="aviso-saldo-insuficiente"]');
    await expect(avisoSaldo).toBeVisible();
    await expect(avisoSaldo).toContainText('El saldo del bolsillo no alcanza para esta compra');

    // Botón Aportar capital visible
    const btnAporte = page.locator('[data-testid="btn-aportar-capital"]');
    await expect(btnAporte).toBeVisible();

    // Botón Guardar compra deshabilitado
    const btnGuardarCompra = page.locator('[data-testid="btn-guardar-compra"]');
    await expect(btnGuardarCompra).toHaveAttribute('aria-disabled', 'true');
    await expect(btnGuardarCompra).toHaveAttribute('disabled', '');

    // Sin errores en consola
    expect(consoleErrors).toEqual([]);
  });
});
