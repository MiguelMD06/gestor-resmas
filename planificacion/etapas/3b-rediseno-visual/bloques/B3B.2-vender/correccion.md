# Corrección de la ola 2 (B3B.2 Vender y B3B.3 Clientes)

Antes de empezar, relee `planificacion/etapas/3b-rediseno-visual/bloques/B3B.2-vender/instruccion.md` (sus reglas valen aquí) y la sección de B3B.3 del plan. Ya no hay otro bloque trabajando en paralelo.

El coordinador corrió la verificación completa después de la ola 2:

- `npm run lint`: pasa. `npm run test:unit`: 406 pasan.
- **`npm run build` falla:**
  ```
  ERROR angular:styles/component ... src/app/ventas/ui/vender.page.ts exceeded maximum budget. Budget 4.00 kB was not met by 2.03 kB with a total of 6.03 kB.
  WARNING ... src/app/clientes/ui/clientes.page.ts exceeded maximum budget. Budget 2.00 kB was not met by 90 bytes with a total of 2.09 kB.
  ```
- **`npx playwright test`: 2 de 17 fallan:**
  1. `e2e/app.spec.ts:33` "clicking each tab navigates to its URL and displays its title": no encuentra `ion-title` con el texto "Vender" (la prueba recorre las 4 pestañas y espera un `ion-title` con el nombre de cada una).
  2. `e2e/etapa-3.acceptance.spec.ts:57` "E21": `locator('[data-testid="input-precio-unitario"] input')` resuelve a **2 elementos**: el `input` real y otro con la clase `cloned-input` (`disabled`, `tabindex="-1"`). Ionic crea ese clon con su *scroll assist* del teclado. Antes del rediseño no pasaba.

## Qué hacer (una sola tanda)

1. **Presupuesto de estilos, sin subir los límites de `angular.json`:** mueve a parciales nuevos de `src/app/shared/ui/estilos/` las reglas reutilizables de Vender (por ejemplo, selectores con contorno, filas de lista en tarjeta, botón circular de agregar, bloques de totales, avatar con iniciales) e impórtalas desde `src/app/shared/ui/estilos/_index.scss`. Deja en cada componente solo lo propio. Objetivo: `vender.page.ts` por debajo de 4 kB (error) y, si se puede, de 2 kB (advertencia); `clientes.page.ts` por debajo de 2 kB. Si Clientes y el selector de Vender comparten el avatar o las filas, que usen la misma regla.
2. **`ion-title` en cada pestaña:** Vender y Clientes deben tener un `ion-title` con el texto exacto "Vender" y "Clientes", como lo hace la página de Finanzas (`src/app/shell/proximamente.page.ts`) después de B3B.0: título grande del mockup (28px, 700), dentro de un `ion-header`/`ion-toolbar` transparente, o la solución equivalente que mantenga el aspecto del mockup. No cambies `e2e/app.spec.ts`.
3. **E21 y el `cloned-input`:** encuentra por qué ahora se activa el *scroll assist* (por ejemplo, el campo quedó dentro de un contenedor con desplazamiento propio en vez del `ion-content`, o cambió la estructura del `ion-footer`) y corrígelo en Vender para que vuelva a haber un solo `input`. Si la causa es inevitable con el diseño del mockup, puedes ajustar **solo el selector** de esa prueba a `input:not(.cloned-input)`, sin cambiar lo que verifica, y explicas por qué en el reporte. Primero intenta corregir la causa.

## Rutas permitidas

```
src/app/ventas/ui/**
src/app/clientes/ui/**
src/app/shared/ui/estilos/**        (parciales nuevos y _index.scss)
e2e/etapa-3.acceptance.spec.ts      (solo el selector de E21, y solo si el punto 3 lo justifica)
```

No toques `src/app/shared/ui/hoja-fecha.component.ts` salvo que el punto 3 lo exija, ni `angular.json`, ni `e2e/app.spec.ts`. No uses git.

## Verificación

Corre en primer plano y copia el resultado, en este orden:

```
npm run lint
npm run test:unit
npm run build                       (sin errores; anota las advertencias que queden)
npx playwright test
```

Reporta, para cada uno de los 3 puntos, qué cambiaste y la causa real. Cierra con `## Key Learnings` si hubo alguno.
