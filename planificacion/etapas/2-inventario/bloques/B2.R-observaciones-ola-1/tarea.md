# Tarea B2.R — Observaciones de la revisión de la ola 1

**Etapa 2, después de la ola 1.** Trabajas solo. La revisión nativa de la ola 1 (B2.1 y B2.2) se aprobó sin bloqueantes, pero dejó observaciones de legibilidad y confiabilidad. Las corriges antes de la ola 2. **No cambias ningún comportamiento visible**, salvo lo que se indica en el punto 1. El plan está en `planificacion/etapas/2-inventario/PLAN.md`.

## Rutas permitidas

```
src/app/shell/error-arranque.component.ts
src/app/shell/error-arranque.component.spec.ts
src/app/shell/tabs.page.ts
src/app/shell/proximamente.page.ts
src/app/shell/proximamente.page.spec.ts
src/app/app.component.spec.ts
src/app/inventario/domain/lote.ts
src/app/inventario/infrastructure/lote.repository.ts
src/app/inventario/application/registrar-compra.ts
src/app/inventario/application/registrar-compra.spec.ts
e2e/app.spec.ts
```

Prohibido todo lo demás.

## Qué hacer

| # | ID | Dónde | Qué cambiar |
|---|----|-------|-------------|
| 1 | R2-dead-cargando-branch y R3-unreachable-retry-spinner | `src/app/shell/error-arranque.component.ts:13-18` | Este componente solo se muestra cuando `estado()` es `'error'`. Al tocar **Reintentar**, el estado pasa a `'cargando'` y `app.component` lo reemplaza por su propio spinner, así que el `@if (... === 'cargando')` y el `[disabled]` nunca se ven. Quita los dos (y `IonSpinner` de los `imports` si ya no se usa). Si alguna prueba verificaba ese spinner o el `disabled`, cámbiala por una que compruebe que, en `app.component`, al reintentar se ve el spinner global mientras el estado es `'cargando'`. |
| 2 | R2-duplicate-icon-registration | `src/app/shell/tabs.page.ts:37-46` | Registra cada ícono una sola vez: `addIcons({ walletOutline, cartOutline, cubeOutline, peopleOutline })`. `ionicons` convierte el nombre camelCase al nombre con guiones que usa la plantilla (`wallet-outline`, etc.). |
| 3 | R2-duplicated-select-columns | `src/app/inventario/infrastructure/lote.repository.ts` | La lista de columnas del `SELECT` aparece repetida en `activos`, `porId` (y en cualquier otro `SELECT` del archivo). Sácala a una constante del módulo (por ejemplo, `const COLUMNAS_LOTE = \`id_lote, tipo_papel, ...\``) y úsala en todos. El SQL resultante debe ser equivalente. |
| 4 | R2-getter-returns-closure | `src/app/shell/proximamente.page.ts:25-31` | `displayTitulo` y `displayEtapa` son getters que devuelven una función. Reemplázalos por `computed(() => ...)` con la misma lógica, y ajusta la plantilla para que los llame como signals (`displayTitulo()`). |
| 5 | R2-magic-reams-per-box | `src/app/inventario/domain/lote.ts:47-57` | Usa `RESMAS_POR_CAJA` de `shared/domain` en lugar del `10` literal, tanto en `% 10` como en `/ 10`, y también en el mensaje de error. |
| 6 | R2-preview-sentinels | `src/app/inventario/application/registrar-compra.ts:19` y `:66-75` | La fecha `'2000-01-01 00:00:00'` y el `idLote` `0` que se le pasan a `compraLote` en `previsualizar` son valores de relleno que nunca se guardan. Dales nombre con constantes del módulo (`FECHA_PREVISUALIZACION`, `ID_LOTE_PREVISUALIZACION = 0`) y un comentario en inglés de una línea que explique que `compraLote` los pide para armar el movimiento, pero `previsualizar` solo lee `reinversion` y descarta el movimiento. |
| 7 | R3-registrar-validation-path | `src/app/inventario/application/registrar-compra.ts:37` | Comprueba si `registrar-compra.spec.ts` ya tiene una prueba de que `registrar` (no `previsualizar`) rechaza E5 (`COSTO_CAJA_INVALIDO`, costo por caja $120.005) y E6 (`CANTIDAD_INVALIDA`, 0 cajas) **sin dejar filas** en `lotes_cajas` ni en `movimientos_dinero`. Si falta alguna de esas aserciones, agrégala. Si ya está completa, no cambies nada e indícalo en el reporte con el nombre de la prueba. |
| 8 | R3-wildcard-route-untested | `src/app/app.routes.ts:11-14` | Agrega una prueba en `e2e/app.spec.ts`: abrir `/no-existe` termina en `/inventario`. |

La observación `R2-unused-clock-provider` (`src/main.ts:29-32`) **no** se cambia: el `CLOCK` lo va a usar la ola 2 (B2.3).

Sigue la regla 6 en las pruebas que toques o agregues.

## Verificación

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Copia el resultado de cada uno, con el número de pruebas. Indica, para cada punto 1 a 8, qué cambiaste (o por qué no hizo falta).
