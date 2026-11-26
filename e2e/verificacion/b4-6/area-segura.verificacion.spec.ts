import { expect, test, type Locator, type Page } from '@playwright/test';

import { capturarErroresConsola } from '../../helpers/errores-consola';

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

async function verificarModalesEnVista(modal: Locator): Promise<void> {
  const toolbars = modal.locator('ion-toolbar');
  const cantidad = await toolbars.count();
  expect(cantidad).toBeGreaterThan(0);
  for (let i = 0; i < cantidad; i++) {
    const coincide = await toolbars.nth(i).evaluate((el, selector) => el.matches(selector), SELECTOR_REGLA_GLOBAL);
    expect(coincide).toBe(false);
  }
}

async function verificarReglaSinIonPage(page: Page, selectorVista: string, paddingEsperado: string): Promise<void> {
  const resultado = await page.evaluate(
    ({ vistaSel, reglaSel }) => {
      const vista = document.querySelector(vistaSel);
      const toolbar = vista?.querySelector(':scope > ion-header > ion-toolbar');
      if (!vista || !toolbar) {
        return null;
      }
      const teniaIonPage = vista.classList.contains('ion-page');
      vista.classList.remove('ion-page');
      const coincideSinIonPage = toolbar.matches(reglaSel);
      const paddingSinIonPage = getComputedStyle(toolbar).paddingTop;
      if (teniaIonPage) {
        vista.classList.add('ion-page');
      }
      return { coincideSinIonPage, paddingSinIonPage };
    },
    { vistaSel: selectorVista, reglaSel: SELECTOR_REGLA_GLOBAL },
  );
  expect(resultado).not.toBeNull();
  expect(resultado!.coincideSinIonPage).toBe(true);
  expect(resultado!.paddingSinIonPage).toBe(paddingEsperado);
}

test.describe('Verificacion B4.6 — Area segura superior', () => {
  test('C1, C2, C4, C5: expediente en segundo cliente, posicion izquierda/derecha de Volver y Editar, independencia de ion-page y modales excluidos', async ({
    page,
  }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);
    await page.addStyleTag({ content: 'html { --safe-area-inset-top: 40px; }' });

    // C4: la regla aplica incluso sin la clase .ion-page en la vista
    await verificarReglaSinIonPage(page, 'app-inventario', '56px');

    // Modales de inventario tambien deben quedar excluidos de la regla global
    await page.locator('app-inventario [data-testid="fab-principal"]').click();
    await page.locator('app-inventario [data-testid="fab-aportar-capital"]').click();
    const modalAporte = page.locator('app-aporte-modal');
    await expect(modalAporte).toBeVisible();
    await verificarModalesEnVista(modalAporte);
    await modalAporte.locator('[data-testid="input-monto"] input').fill('300000');
    await modalAporte.locator('[data-testid="btn-guardar-aporte"]').click();
    await expect(modalAporte).toHaveCount(0);

    await page.locator('app-inventario [data-testid="fab-principal"]').click();
    await page.locator('app-inventario [data-testid="fab-nueva-compra"]').click();
    const modalCompra = page.locator('app-nueva-compra-modal');
    await expect(modalCompra).toBeVisible();
    await verificarModalesEnVista(modalCompra);
    await modalCompra.locator('[data-testid="input-cajas"] input').fill('1');
    await modalCompra.locator('[data-testid="input-costo-caja"] input').fill('100000');
    await modalCompra.locator('[data-testid="btn-guardar-compra"]').click();
    await expect(modalCompra).toHaveCount(0);

    // Crear dos clientes para probar el segundo elemento, no solo el primero
    await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
    await expect(page).toHaveURL(/\/clientes$/);
    await verificarReglaSinIonPage(page, 'app-clientes', '56px');

    for (const c of [
      { nombre: 'Primer Cliente', tel: '3001000001' },
      { nombre: 'Segundo Cliente', tel: '3001000002' },
    ]) {
      await page.locator('app-clientes [data-testid="fab-nuevo-cliente"]').click();
      const modal = page.locator('app-cliente-modal');
      await expect(modal).toBeVisible();
      await verificarModalesEnVista(modal);
      await modal.locator('[data-testid="input-nombre"] input').fill(c.nombre);
      await modal.locator('[data-testid="input-telefono"] input').fill(c.tel);
      await modal.locator('[data-testid="btn-guardar-cliente"]').click();
      await expect(modal).toHaveCount(0);
    }

    // Venta fiada al segundo cliente y verificacion de modales de Vender
    await page.locator('ion-tab-bar ion-tab-button[tab="vender"]').click();
    await expect(page).toHaveURL(/\/vender$/);
    await verificarReglaSinIonPage(page, 'app-vender', '56px');

    const venderPage = page.locator('app-vender');
    await venderPage.locator('[data-testid="selector-cliente"]').click();
    const modalSelector = page.locator('[data-testid="modal-selector-cliente"]');
    await expect(modalSelector).toBeVisible();
    await verificarModalesEnVista(modalSelector);
    await modalSelector.locator('[data-testid="item-cliente-vender"]', { hasText: 'Segundo Cliente' }).click();
    await expect(modalSelector).toBeHidden();

    await venderPage.locator('[data-testid="item-lote"]').first().click();
    const linea = venderPage.locator('[data-testid="linea-venta"]').first();
    await linea.locator('[data-testid="input-cantidad"] input').fill('1');
    await linea.locator('[data-testid="input-precio-unitario"] input').fill('15000');
    const segmentFiado = venderPage.locator('[data-testid="segment-fiado"]');
    await segmentFiado.click();
    await expect(segmentFiado).toHaveClass(/segment-button-checked/);
    await venderPage.locator('[data-testid="btn-confirmar-venta"]').click();
    const modalResumenVenta = page.locator('app-resumen-venta-modal');
    await expect(modalResumenVenta).toBeVisible();
    await verificarModalesEnVista(modalResumenVenta);
    await modalResumenVenta.locator('[data-testid="btn-aceptar-venta"]').click();
    await expect(modalResumenVenta).toHaveCount(0);

    // Abrir expediente del segundo cliente
    await page.locator('ion-tab-bar ion-tab-button[tab="clientes"]').click();
    await expect(page).toHaveURL(/\/clientes$/);
    await page.locator('app-clientes [data-testid="item-cliente"]', { hasText: 'Segundo Cliente' }).click();
    await expect(page).toHaveURL(/\/clientes\/\d+$/);

    // C1, C4 y C5: padding calculado del expediente (con y sin .ion-page)
    const paddingExp = await obtenerPaddingToolbar(page, 'app-expediente');
    expect(paddingExp.paddingTop).toBe('44px');
    expect(paddingExp.paddingLeft).toBe('4px');
    expect(paddingExp.paddingRight).toBe('4px');
    expect(paddingExp.paddingBottom).toBe('0px');
    await verificarReglaSinIonPage(page, 'app-expediente', '44px');

    // C2 y C5: Volver a la izquierda y Editar a la derecha, ambos >= 40px desde arriba
    const btnVolver = page.locator('app-expediente [data-testid="btn-volver"]');
    const btnEditar = page.locator('app-expediente [data-testid="btn-editar-cliente"]');
    await expect(btnVolver).toBeVisible();
    await expect(btnEditar).toBeVisible();

    const cajaVolver = await btnVolver.boundingBox();
    const cajaEditar = await btnEditar.boundingBox();
    const anchoViewport = page.viewportSize()!.width;

    expect(cajaVolver).not.toBeNull();
    expect(cajaEditar).not.toBeNull();
    expect(cajaVolver!.y).toBeGreaterThanOrEqual(40);
    expect(cajaEditar!.y).toBeGreaterThanOrEqual(40);
    expect(cajaVolver!.x).toBeLessThan(anchoViewport / 3);
    expect(cajaEditar!.x).toBeGreaterThan((anchoViewport * 2) / 3);
    expect(cajaVolver!.x + cajaVolver!.width).toBeLessThan(cajaEditar!.x);

    // Modal de editar cliente desde expediente también excluido
    await btnEditar.click();
    const modalEditar = page.locator('app-cliente-modal');
    await expect(modalEditar).toBeVisible();
    await verificarModalesEnVista(modalEditar);
    await modalEditar.locator('ion-button', { hasText: 'Cancelar' }).click();
    await expect(modalEditar).toHaveCount(0);

    // Modal de abono también excluido
    await page.locator('app-expediente [data-testid="btn-registrar-abono"]').click();
    const modalAbono = page.locator('app-abono-modal');
    await expect(modalAbono).toBeVisible();
    await verificarModalesEnVista(modalAbono);
    await modalAbono.locator('ion-button', { hasText: 'Cancelar' }).click();
    await expect(modalAbono).toHaveCount(0);

    // Volver al listado de clientes y repetir navegacion entre tabs para asegurar persistencia de la regla
    await btnVolver.click();
    await expect(page).toHaveURL(/\/clientes$/);

    for (const vista of [
      { tab: 'finanzas', ruta: /\/finanzas$/, selector: 'app-proximamente' },
      { tab: 'vender', ruta: /\/vender$/, selector: 'app-vender' },
      { tab: 'clientes', ruta: /\/clientes$/, selector: 'app-clientes' },
      { tab: 'inventario', ruta: /\/inventario$/, selector: 'app-inventario' },
    ]) {
      await page.locator(`ion-tab-bar ion-tab-button[tab="${vista.tab}"]`).click();
      await expect(page).toHaveURL(vista.ruta);
      const estilos = await obtenerPaddingToolbar(page, vista.selector);
      expect(estilos.paddingTop).toBe('56px');
      await verificarReglaSinIonPage(page, vista.selector, '56px');
      const titulo = page.locator(`${vista.selector} > ion-header > ion-toolbar ion-title`).first();
      const cajaTitulo = await titulo.boundingBox();
      expect(cajaTitulo).not.toBeNull();
      expect(cajaTitulo!.y).toBeGreaterThanOrEqual(40);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('C1/C2 en ruta directa a expediente inexistente (estado de error) con barra simulada', async ({ page }) => {
    await page.goto('/clientes/99999');
    await expect(page.locator('app-expediente [data-testid="estado-error"]')).toBeVisible();
    await page.addStyleTag({ content: 'html { --safe-area-inset-top: 40px; }' });

    const paddingExp = await obtenerPaddingToolbar(page, 'app-expediente');
    expect(paddingExp.paddingTop).toBe('44px');
    expect(paddingExp.paddingLeft).toBe('4px');
    expect(paddingExp.paddingRight).toBe('4px');
    expect(paddingExp.paddingBottom).toBe('0px');

    const btnVolver = page.locator('app-expediente [data-testid="btn-volver"]');
    const cajaVolver = await btnVolver.boundingBox();
    expect(cajaVolver).not.toBeNull();
    expect(cajaVolver!.y).toBeGreaterThanOrEqual(40);
  });

  test('C3: valor limite --safe-area-inset-top: 0px conserva 16px en tabs y 4px en expediente', async ({ page }) => {
    const consoleErrors = capturarErroresConsola(page);

    await page.goto('/');
    await expect(page).toHaveURL(/\/inventario$/);
    await page.addStyleTag({ content: 'html { --safe-area-inset-top: 0px; }' });

    for (const vista of [
      { tab: null, selector: 'app-inventario' },
      { tab: 'finanzas', selector: 'app-proximamente' },
      { tab: 'vender', selector: 'app-vender' },
      { tab: 'clientes', selector: 'app-clientes' },
    ]) {
      if (vista.tab) {
        await page.locator(`ion-tab-bar ion-tab-button[tab="${vista.tab}"]`).click();
      }
      const estilos = await obtenerPaddingToolbar(page, vista.selector);
      expect(estilos.paddingTop).toBe('16px');
    }

    await page.locator('app-clientes [data-testid="fab-nuevo-cliente"]').click();
    const modal = page.locator('app-cliente-modal');
    await modal.locator('[data-testid="input-nombre"] input').fill('Cliente Cero');
    await modal.locator('[data-testid="input-telefono"] input').fill('3009998877');
    await modal.locator('[data-testid="btn-guardar-cliente"]').click();
    await expect(modal).toHaveCount(0);

    await page.locator('app-clientes [data-testid="item-cliente"]', { hasText: 'Cliente Cero' }).click();
    await expect(page).toHaveURL(/\/clientes\/\d+$/);

    const paddingExp = await obtenerPaddingToolbar(page, 'app-expediente');
    expect(paddingExp.paddingTop).toBe('4px');
    expect(paddingExp.paddingLeft).toBe('4px');
    expect(paddingExp.paddingRight).toBe('4px');
    expect(paddingExp.paddingBottom).toBe('0px');

    expect(consoleErrors).toEqual([]);
  });
});
