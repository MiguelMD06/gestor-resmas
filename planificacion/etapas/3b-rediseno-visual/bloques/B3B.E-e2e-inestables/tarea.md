# Tarea B3B.E — E2E inestables (issues #19 y #20)

**Etapa 3B, antes del PR.** Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12) y el contexto de `planificacion/etapas/3b-rediseno-visual/bloques/B3B.1-inventario/instruccion.md` (la parte anterior a la línea `---`). Lee también las issues con `gh issue view 19` y `gh issue view 20` (solo lectura). No uses git para escribir.

## Rutas permitidas — ESTRICTAS

```
e2e/app.spec.ts
e2e/vender.spec.ts
```

Prohibido tocar cualquier otro archivo, incluido el código de la app. Si un arreglo lo necesitara, detente y explícalo.

## Qué corregir

1. **#19, E1 (`e2e/app.spec.ts`, cerca de 82):** el color de la pestaña activa se lee una sola vez justo después de la redirección a `/inventario`, antes de que `ion-tab-button.tab-selected` exista. Haz que la prueba espere con aserciones de Playwright que reintentan (por ejemplo `await expect(locator).toHaveClass(...)` y `await expect(locator).toHaveCSS('color', ...)`) en vez de leer el estado una vez. Lo que la prueba verifica (fondo negro, fuente Inter, pestaña activa en lima) no cambia.
2. **#20, E6 (`e2e/vender.spec.ts`):** la comparación de alturas de las filas del selector de clientes falla por redondeo subpíxel (`1.00006103515625 <= 1`). Haz que tolere el redondeo del navegador (por ejemplo, redondear las alturas a enteros antes de comparar, o un margen explícito de 1,5 px), sin dejar de detectar filas de alturas realmente distintas (el error L16 que motivó E6, donde Mostrador era más baja).

## Verificación

Corre en primer plano, uno por vez (la máquina tiene poca RAM):

```
npm run lint
npx playwright test e2e/app.spec.ts e2e/vender.spec.ts --repeat-each=5
npm run test:e2e
```

La segunda línea debe pasar todas las repeticiones. No dejes procesos de node, playwright ni chrome abiertos. Reporta en español qué cambiaste por issue y el resultado de cada comando con el número de pruebas.
