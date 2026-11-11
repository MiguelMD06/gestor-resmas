import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { ProximamentePage } from './proximamente.page';

describe('ProximamentePage', () => {
  it('displays "Vender" and "Disponible en la Etapa 3" when route data is { titulo: "Vender", etapa: 3 }', async () => {
    await TestBed.configureTestingModule({
      imports: [ProximamentePage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                titulo: 'Vender',
                etapa: 3,
              },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProximamentePage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Vender');
    expect(text).toContain('Disponible en la Etapa 3');
  });

  it('uses the title and stage inputs when they are set', async () => {
    await TestBed.configureTestingModule({
      imports: [ProximamentePage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: {} } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProximamentePage);
    fixture.componentRef.setInput('titulo', 'Finanzas');
    fixture.componentRef.setInput('etapa', 5);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Finanzas');
    expect(text).toContain('Disponible en la Etapa 5');
  });
});
