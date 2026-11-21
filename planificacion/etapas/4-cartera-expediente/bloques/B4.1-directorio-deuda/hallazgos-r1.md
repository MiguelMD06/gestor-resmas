[MODO EJECUTOR]

# Hallazgos de la verificación (ronda 1)

Corrige solo esto. Archivos permitidos: `src/app/clientes/ui/clientes.page.ts`, `src/app/clientes/ui/clientes.page.spec.ts`, `src/app/cartera/application/consultar-cartera.ts`, `src/app/cartera/application/consultar-cartera.spec.ts`, `src/app/cartera/infrastructure/cartera.repository.ts`, `src/app/cartera/infrastructure/cartera.repository.spec.ts`, `src/app/shared/ui/estilos/**`, `e2e/clientes.spec.ts`. No modifiques `src/verificacion/b4-1`.

## Criterios que no se cumplen
- C14: `git status` confirma solo rutas permitidas tocadas y los 10 `data-testid` previos conservados; `npm run lint` y `npm run build` pasaron sin advertencias; pero `npm run test:unit` FALLÓ con 3 pruebas rotas (498 passed, 3 failed de 501): `src/app/cartera/application/registrar-abono.spec.ts` (líneas 879 y 940) y `src/verificacion/b4-0/b4-0.verificacion.spec.ts` (línea 696), que aún esperan un número en `ConsultarCartera.porCliente` en lugar de `{ deuda, facturas }`.

## Hallazgos bloqueantes
- `src/app/cartera/application/registrar-abono.spec.ts:879` (C14): Al cambiar `ConsultarCartera.consultar()` para devolver `porCliente: ReadonlyMap<number, DeudaCliente>` (`{ deuda, facturas }`) en lugar de `Pesos`, dos pruebas existentes en `registrar-abono.spec.ts` (C13 en línea 879 y C14 en línea 940) que asertan `expect(cartera.porCliente.get(idAna)).toBe(5000)` fallan al ejecutar `npm run test:unit` (reciben `{ deuda: 5000, facturas: 1 }`). Reproducción: correr `npm run test:unit`.
- `src/verificacion/b4-0/b4-0.verificacion.spec.ts:696` (C14): La prueba `C16-C18` de la verificación de B4.0 (línea 696, y también línea 756) aserta `expect(Array.from(cInicial.porCliente.entries())).toEqual([[idAna, 40000]])`, por lo que falla en `npm run test:unit` al recibir `{ deuda: 40000, facturas: 2 }`. (Nota: ni este archivo ni `registrar-abono.spec.ts` estaban en las rutas permitidas de B4.1). Reproducción: correr `npm run test:unit`.

## Detalles (corrige solo si es barato)
- `src/app/clientes/ui/clientes.page.ts:386` (C2): `cantidadConDeuda` calcula `this.deudasPorCliente().size`, mientras que `clientesConDeudaCount`, `clientesFiltrados` y `deudaDe` filtran explícitamente `deuda > 0`. Con el repositorio real (`WHERE saldo_pendiente > 0`) coinciden, pero ante una entrada simulada con `deuda: 0` diferirían.
- `src/app/clientes/ui/clientes.page.ts:77` (C13): Diferencia visual menor frente a `Clientes.dc.html`: el buscador usa `ion-searchbar` con `aria-label` y placeholder, sin la etiqueta flotante `<label>Buscar cliente</label>` sobre el borde superior del mockup.
