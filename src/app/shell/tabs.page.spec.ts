import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  it('displays 4 ion-tab-button elements with tabs finanzas, vender, inventario, and clientes, in that order with their labels', async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();

    const tabButtons = fixture.debugElement.queryAll(By.css('ion-tab-button'));
    expect(tabButtons.length).toBe(4);

    const esperados = [
      { tab: 'finanzas', texto: 'Finanzas' },
      { tab: 'vender', texto: 'Vender' },
      { tab: 'inventario', texto: 'Inventario' },
      { tab: 'clientes', texto: 'Clientes' },
    ];

    esperados.forEach((esperado, index) => {
      const boton = tabButtons[index];
      const tabAttr = boton.attributes['tab'] ?? boton.nativeElement.getAttribute('tab');
      expect(tabAttr).toBe(esperado.tab);
      expect(boton.nativeElement.textContent).toContain(esperado.texto);
    });
  });
});
