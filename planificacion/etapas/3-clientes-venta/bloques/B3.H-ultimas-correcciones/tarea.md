# Tarea B3.H — Últimas correcciones de la revisión

**Etapa 3, cierre.** Nadie más escribe en el árbol mientras trabajas. Antes de empezar, lee `CLAUDE.md` (raíz; reglas 1 a 12) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, **D15**, **D16**, **E17** y **E18**.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Rutas permitidas

```
src/app/ventas/ui/**
src/app/shared/ui/campo-pesos.component.ts
src/app/shared/ui/campo-pesos.component.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **H1. El resumen nunca guarda dos veces (E17).** En `resumen-venta.modal.ts`, si `registrar` resolvió y después falla `dismiss`, hoy el `finally` libera `guardando` y **Aceptar** vuelve a estar habilitado: un segundo toque registra otra venta. Agrega una traba `guardado` (como la de `cliente.modal.ts`): en cuanto `registrar` resuelve, `guardado` pasa a `true` y no se libera nunca; mientras sea `true`, **Aceptar** y **Volver a editar** quedan deshabilitados, `aceptar()` no hace nada y se muestra "Venta registrada". Además, la página se entera del éxito aunque falle el `dismiss` (por ejemplo, con el mismo callback `alCambiarGuardando` u otro), reinicia el borrador y recarga los lotes.
- **H2. Stock del borrador al día (E18).** En `vender.page.ts`, cada vez que se recargan los lotes (al entrar, al reintentar y después de un error de guardado), las líneas del borrador toman de la lista nueva el `disponibles` y la `fechaCompra` de su lote. Si un lote del borrador ya no está activo (agotado), su línea se marca con el error de `STOCK_INSUFICIENTE` y **Confirmar venta** queda deshabilitado hasta que el usuario la quite.
- **H3. Reinicio al mismo valor (D16).** En `campo-pesos.component.ts`, si el padre vuelve a poner el mismo valor que ya tenía (por ejemplo, `null` mientras se ve un texto inválido), el texto inválido, el error de formato y `aria-invalid` igual desaparecen. Usa un mecanismo explícito (por ejemplo, un método `reiniciar()` que el padre llama, o una entrada de "generación" que cambia en cada reinicio) y úsalo desde `vender.page.ts` al reiniciar el formulario.

## Pruebas (primero RED)

- H1: `registrar` resuelve y `dismiss` rechaza → **Aceptar** queda deshabilitado, un segundo `aceptar()` no vuelve a llamar a `registrar`, se ve "Venta registrada" y la página reinicia el borrador y recarga los lotes.
- H2: con una línea de 5 resmas de un lote que pasa a tener 3 disponibles al recargar, se ve el error de `STOCK_INSUFICIENTE` y el botón queda deshabilitado; con un lote que desaparece de la lista, igual.
- H3: con "3800,50" en el campo (valor `null`), el reinicio desde el padre deja el campo vacío, sin error y con `aria-invalid` distinto de `"true"`.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```
