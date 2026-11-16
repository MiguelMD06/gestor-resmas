# Tarea B3.4 — Campo de pesos y su uso en compra y aporte

**Etapa 3, ola 1.** Trabajas en paralelo con B3.1 (clientes) y B3.2 (venta), que tocan otras rutas. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; sus reglas 1 a 12 son obligatorias) y `planificacion/etapas/3-clientes-venta/PLAN.md` hasta la sección `## Log`. Tu bloque es **B3.4**; si esta tarea y el plan no coinciden, manda el plan y lo informas.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Specs que cubres

D16 y el ejemplo E21. Lee su texto en el plan.

## Rutas permitidas

```
src/app/shared/ui/campo-pesos.component.ts
src/app/shared/ui/campo-pesos.component.spec.ts
src/app/inventario/ui/nueva-compra.modal.ts
src/app/inventario/ui/nueva-compra.modal.spec.ts
src/app/finanzas/ui/aporte.modal.ts
src/app/finanzas/ui/aporte.modal.spec.ts
e2e/inventario.spec.ts
e2e/inventario.acceptance.spec.ts
```

Prohibido todo lo demás.

## Lo que ya existe y debes reutilizar

- **`formatearPesos(valor: Pesos): string`** en `src/app/shared/domain/pesos.ts`. Es el formato oficial ("$3.800"); no crees otro.
- `nueva-compra.modal.ts` y `aporte.modal.ts` ya tienen `guardando`, `calculando` (compra), `peticionActual`, validación y `soloCierreExplicito`. **No cambies nada de eso.**

## Especificación

1. **`shared/ui/campo-pesos.component.ts`** (standalone, con `ControlValueAccessor` o un `model<number | null>()`, lo que encaje mejor con cómo los dos modales manejan hoy sus campos; explica en el reporte cuál elegiste y por qué):
   - un `ion-input` con `inputmode="numeric"` y etiqueta visible (`label` de entrada);
   - mientras se escribe, muestra el valor formateado con `formatearPesos`: escribir "3800" muestra "$3.800";
   - entrega un `number` entero, o `null` si el campo está vacío. **Nunca** convierte vacío en 0 (regla 1 de `CLAUDE.md`);
   - ignora todo lo que no sea dígito al escribir o pegar: pegar "3.800" o "$3.800" da 3800;
   - admite `disabled`, que también se refleja para lectores de pantalla (regla 10), y un texto de error que se muestra junto al campo;
   - el cursor no salta a una posición rara al insertar los puntos: queda al final, como mínimo.
2. **`nueva-compra.modal.ts`:** el campo **costo por caja** pasa a ser el campo de pesos. La cantidad de cajas no cambia.
3. **`aporte.modal.ts`:** el campo **monto** pasa a ser el campo de pesos.
4. En los dos modales, todo lo demás sigue igual: la vista previa, la validación, `guardando`, los mensajes, los textos y los botones.
5. **E2E de inventario:** ajusta solo lo que cambia por el formato (por ejemplo, lo que se lee del campo después de escribir). Lo que no tiene que ver con el formato no cambia. Si `fill('120000')` sigue funcionando con el campo nuevo, no lo cambies.

## Pruebas (primero RED)

- Componente: E21 completo (escribir "3800" → se ve "$3.800" y el valor es 3800; borrar todo → `null`; pegar "3.800" → 3800; pegar "$3.800" → 3800; letras se ignoran); `disabled` deshabilita el `ion-input` y lo anuncia; el error se muestra junto al campo.
- `nueva-compra.modal.spec.ts` y `aporte.modal.spec.ts`: escribir "120000" muestra "$120.000" y lo que se guarda es 120000; con el campo vacío, el botón de guardar sigue deshabilitado. Las pruebas que ya existen siguen pasando **sin cambiar lo que verifican**; si alguna tiene que cambiar solo por cómo se escribe en el campo, explícalo en el reporte.
- E2E: no lo corras (lo corre el coordinador después de la ola), pero deja `e2e/inventario.spec.ts` y `e2e/inventario.acceptance.spec.ts` coherentes con el campo nuevo.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
```

**No corras `npm run build` ni `npm run test:e2e`:** otros dos bloques trabajan en paralelo y comparten `www/`; los corre el coordinador al terminar la ola. Indica qué prueba cubre D16 y cada parte de E21.
