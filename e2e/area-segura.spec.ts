import { expect, test, type Locator, type Page } from '@playwright/test';

import { capturarErroresConsola } from './helpers/errores-consola';

const SELECTOR_REGLA_GLOBAL = 'ion-router-outlet > * > ion-header > ion-toolbar:first-of-type';

async function obtenerPaddingToolbar(page: Page, selectorVista: string) {
  const toolbar = page.locator(`${selectorVista} > ion-header > ion-toolbar`).first();
  await expect(toolbar).toBeVisible();
  return toolbar.evaluate((el) => {
    const estilos = getComputedStyle(el);
    return {
      paddingTop: estilos.paddingTop,
      paddingRight: estilos.paddingRight,
      paddingBottom: estilos.paddingBottom,
      paddingLeft: estilos.paddingLeft,
    };
  });
}

async function verificarToolbarsModalExcluidos(modal: Locator): Promise<void> {
  const toolbars = modal.locator('ion-toolbar');
  const cantidad = await toolbars.count();
  expect(cantidad).toBeGreaterThan(0);
  for (let i = 0; i < cantidad; i++) {
    const coincide = await toolbars.nth(i).evaluate((el, selector) => el.matches(selector), SELECTOR_REGLA_GLOBAL);
    expect(coincide).toBe(false);
  }
}

async function prepararCapitalYLoteEnInventario(page: Page): Promise<void> {
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
}

async function crearCliente(page: Page, nombre: string, telefono: string): Promise<void> {
  const clientesPage = page.locator('app-clientes');
  await clientesPage.locator('[data-testid="fab-nuevo-cliente"]').click();

  const modal = page.locator('app-cliente-modal');
  await expect(modal.locator('ion-title', { hasText: 'Nuevo cliente' })).toBeVisible();
  await modal.locator('[data-testid="input-nombre"] input').fill(nombre);
  await modal.locator('[data-testid="input-telefono"] input').fill(telefono);
  await modal.locator('[data-testid="btn-guardar-cliente"]').click();
  await expect(modal).toHaveCount(0);
}

async function venderFiadoACliente(page: Page, nombreCliente: string): Promise<void> {
  await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
  await expect(page).toHaveURL(/\/vender$/);

  const venderPage = page.locator('app-vender');
  const modalSelector = page.locator('[data-testid="modal-selector-cliente"]');
  const modalResumenVenta = page.locator('app-resumen-venta-modal');

  await venderPage.locator('[data-testid="selector-cliente"]').click();
  await expect(modalSelector).toBeVisible();
  await modalSelector.locator('[data-testid="item-cliente-vender"]', { hasText: nombreCliente }).click();
  await expect(modalSelector).toBeHidden();

  await venderPage.locator('[data-testid="item-lote"]').first().click();
  const linea = venderPage.locator('[data-testid="linea-venta"]').first();
  await linea.locator('[data-testid="input-cantidad"] input').fill('1');
  await linea.locator('[data-testid="input-precio-unitario"] input').fill('15000');
  const segmentFiado = venderPage.locator('[data-testid="segment-fiado"]');
  await segmentFiado.click();
  await expect(segmentFiado).toHaveClass(/segment-button-checked/);
  await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();
  await expect(modalResumenVenta).toBeVisible();
  await modalResumenVenta.locator('[data-testid="btn-aceptar-venta"]').click();
  await expect(modalResumenVenta).toHaveCount(0);
}

async function abrirExpedienteCliente(page: Page, nombreCliente: string): Promise<void> {
  await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
  await expect(page).toHaveURL(/\/clientes$/);

  const itemCliente = page.locator('app-clientes [data-testid="item-cliente"]', { hasText: nombreCliente }).first();
  await expect(itemCliente).toBeVisible();
  await itemCliente.click();
  await expect(page).toHaveURL(/\/clientes\/\d+$/);
}

test.describe('Top safe area inset on routed page headers (issue #29)', () => {
  test('with simulated status bar, all 5 views reserve 40px safe area plus design extra and modals are excluded', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);
    await page.addStyleTag({ content: 'html { --safe-area-inset-top: 40px; }' });

    const vistasTab = [
      { tab: null, ruta: /\/inventario$/, selector: 'app-inventario', paddingEsperado: '56px' },
      { tab: 'finanzas', ruta: /\/finanzas$/, selector: 'app-proximamente', paddingEsperado: '56px' },
      { tab: 'vender', ruta: /\/vender$/, selector: 'app-vender', paddingEsperado: '56px' },
      { tab: 'clientes', ruta: /\/clientes$/, selector: 'app-clientes', paddingEsperado: '56px' },
    ];

    for (const vista of vistasTab) {
      if (vista.tab) {
        await page.locator(`ion-tab-bar ion-tab-button[tab="${vista.tab}"]`).click();
      }
      await expect(page).toHaveURL(vista.ruta);

      const estilos = await obtenerPaddingToolbar(page, vista.selector);
      expect(estilos.paddingTop).toBe(vista.paddingEsperado);

      const titulo = page.locator(`${vista.selector} > ion-header > ion-toolbar ion-title`).first();
      await expect(titulo).toBeVisible();
      const cajaTitulo = await titulo.boundingBox();
      expect(cajaTitulo).not.toBeNull();
      expect(cajaTitulo!.y).toBeGreaterThanOrEqual(40);
    }

    // Modal toolbars must not match the global routed-page header rule (new client modal).
    await page.locator('app-clientes [data-testid="fab-nuevo-cliente"]').click();
    const modalCliente = page.locator('app-cliente-modal');
    await expect(modalCliente.locator('ion-title', { hasText: 'Nuevo cliente' })).toBeVisible();
    await verificarToolbarsModalExcluidos(modalCliente);
    await modalCliente.locator('ion-button', { hasText: 'Cancelar' }).click();
    await expect(modalCliente).toHaveCount(0);

    // Prepare client with debt so the dossier view and the payment modal can both be verified.
    await crearCliente(page, 'Laura Torres', '3001112233');
    await page.locator('ion-tab-bar ion-tab-button[tab="inventario"]').click();
    await expect(page).toHaveURL(/\/inventario$/);
    await prepararCapitalYLoteEnInventario(page);
    await venderFiadoACliente(page, 'Laura Torres');
    await abrirExpedienteCliente(page, 'Laura Torres');

    // Dossier view (/clientes/:id)
    const estilosExp = await obtenerPaddingToolbar(page, 'app-expediente');
    expect(estilosExp.paddingTop).toBe('44px');
    expect(estilosExp.paddingLeft).toBe('4px');
    expect(estilosExp.paddingRight).toBe('4px');
    expect(estilosExp.paddingBottom).toBe('0px');

    const btnVolver = page.locator('app-expediente [data-testid="btn-volver"]');
    await expect(btnVolver).toBeVisible();
    const cajaVolver = await btnVolver.boundingBox();
    expect(cajaVolver).not.toBeNull();
    expect(cajaVolver!.y).toBeGreaterThanOrEqual(40);

    // Modal toolbars must not match the global routed-page header rule (payment modal).
    await page.locator('app-expediente [data-testid="btn-registrar-abono"]').click();
    const modalAbono = page.locator('app-abono-modal');
    await expect(modalAbono).toBeVisible();
    await verificarToolbarsModalExcluidos(modalAbono);
    await modalAbono.locator('ion-button', { hasText: 'Cancelar' }).click();
    await expect(modalAbono).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });

  test('without simulated status bar, header toolbars preserve exact design spacing', async ({ page }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);

    const vistasTab = [
      { tab: null, ruta: /\/inventario$/, selector: 'app-inventario', paddingEsperado: '16px' },
      { tab: 'finanzas', ruta: /\/finanzas$/, selector: 'app-proximamente', paddingEsperado: '16px' },
      { tab: 'vender', ruta: /\/vender$/, selector: 'app-vender', paddingEsperado: '16px' },
      { tab: 'clientes', ruta: /\/clientes$/, selector: 'app-clientes', paddingEsperado: '16px' },
    ];

    for (const vista of vistasTab) {
      if (vista.tab) {
        await page.locator(`ion-tab-bar ion-tab-button[tab="${vista.tab}"]`).click();
      }
      await expect(page).toHaveURL(vista.ruta);

      const estilos = await obtenerPaddingToolbar(page, vista.selector);
      expect(estilos.paddingTop).toBe(vista.paddingEsperado);
    }

    await crearCliente(page, 'Carlos Ruiz', '3002223344');
    await abrirExpedienteCliente(page, 'Carlos Ruiz');
    const estilosExp = await obtenerPaddingToolbar(page, 'app-expediente');
    expect(estilosExp.paddingTop).toBe('4px');
    expect(estilosExp.paddingLeft).toBe('4px');
    expect(estilosExp.paddingRight).toBe('4px');
    expect(estilosExp.paddingBottom).toBe('0px');

    expect(consoleErrors).toEqual([]);
  });

  test('view-level padding overrides cannot strip safe area inset from header toolbars', async ({ page }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);
    await page.addStyleTag({
      content:
        'html { --safe-area-inset-top: 40px; } .vender-toolbar { padding-top: 16px; } ion-toolbar { padding: 4px; }',
    });

    const estilosInventario = await obtenerPaddingToolbar(page, 'app-inventario');
    expect(estilosInventario.paddingTop).toBe('56px');

    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);
    const estilosVender = await obtenerPaddingToolbar(page, 'app-vender');
    expect(estilosVender.paddingTop).toBe('56px');

    expect(consoleErrors).toEqual([]);
  });
});
