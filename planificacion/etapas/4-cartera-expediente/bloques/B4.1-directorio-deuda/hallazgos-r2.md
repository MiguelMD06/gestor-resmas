[MODO EJECUTOR]

# Hallazgos de la verificación (ronda 2)

Corrige solo esto. Archivos permitidos: `src/app/clientes/ui/clientes.page.ts`, `src/app/clientes/ui/clientes.page.spec.ts`, `src/app/cartera/application/consultar-cartera.ts`, `src/app/cartera/application/consultar-cartera.spec.ts`, `src/app/cartera/infrastructure/cartera.repository.ts`, `src/app/cartera/infrastructure/cartera.repository.spec.ts`, `src/app/shared/ui/estilos/**`, `e2e/clientes.spec.ts`. No modifiques `src/verificacion/b4-1`.

## Criterios que no se cumplen
- C14: `git status --short` confirma solo rutas permitidas modificadas y los 10 `data-testid` previos conservados; `npm run lint` (`EXIT_LINT=0`) y `npm run build` (`EXIT_BUILD=0`) pasaron sin advertencias; pero `npm run test:unit` sigue fallando (`EXIT_UNIT=1`: 499 passed, 3 failed de 502; 61 passed, 2 failed de 63 archivos) en `src/app/cartera/application/registrar-abono.spec.ts` (líneas 879 y 940) y `src/verificacion/b4-0/b4-0.verificacion.spec.ts` (línea 696).

## Hallazgos bloqueantes
- `src/app/cartera/application/registrar-abono.spec.ts:879` (C14): Persiste el fallo en `npm run test:unit`: las pruebas existentes C13 (línea 879) y C14 (línea 940) esperan `expect(cartera.porCliente.get(idAna)).toBe(5000)`, pero `ConsultarCartera.consultar()` ahora devuelve `{ deuda: 5000, facturas: 1 }`. Este archivo no figuraba en las rutas permitidas de B4.1 ni de `hallazgos-r1.md`. Reproducción: correr `npm run test:unit`.
- `src/verificacion/b4-0/b4-0.verificacion.spec.ts:696` (C14): Persiste el fallo en `npm run test:unit`: la prueba `C16-C18` (línea 696, y también línea 756) espera `[[idAna, 40000]]` de `ConsultarCartera.porCliente`, y recibe `[[idAna, { deuda: 40000, facturas: 2 }]]`. Reproducción: correr `npm run test:unit`.

## Detalles (corrige solo si es barato)
- `src/app/clientes/ui/clientes.page.ts:77` (C13): Diferencia visual menor frente a `Clientes.dc.html`: el buscador usa `ion-searchbar` con `aria-label` y placeholder, sin la etiqueta flotante `<label>Buscar cliente</label>` sobre el borde superior del mockup.
