# Tarea B2.3-C — Corrección de las pantallas de compra y aporte

**Etapa 2, ola 2.** Trabajas solo. B2.3 ya dejó las pantallas en el árbol de trabajo, sin commit (`src/app/inventario/ui/`, `src/app/finanzas/ui/`, `src/app/shared/ui/`, `consultar-inventario.ts`, `e2e/inventario.spec.ts`). La revisión del coordinador encontró defectos en `nueva-compra.modal` y `aporte.modal`. Los corriges todos en esta tarea. La tarea original está en `planificacion/etapas/2-inventario/bloques/B2.3-pantallas/tarea.md`: léela, porque sigue mandando para todo lo que esta no cambia.

## Contexto clave: la app es *zoneless*

`src/main.ts` no usa `zone.js`. Angular solo vuelve a pintar cuando cambia una **signal**, cuando se dispara un evento de la plantilla o cuando se llama a `markForCheck`. Un campo común que se asigna **después de un `await`** (por ejemplo, `this.vistaPrevia = await ...`) no se ve en pantalla hasta el próximo evento. `inventario.page` ya usa signals y está bien. Las pruebas de componente no lo detectan porque llaman a `fixture.detectChanges()` a mano.

## Rutas permitidas

```
src/app/inventario/ui/**
src/app/finanzas/ui/**
e2e/inventario.spec.ts
```

Prohibido todo lo demás.

## Qué corregir

| # | Defecto | Dónde | Qué hacer |
|---|---------|-------|-----------|
| 1 | La vista previa no se repinta en una app zoneless | `nueva-compra.modal.ts` | Pasa a signals todo lo que la plantilla muestra y que cambia después de un `await`: `vistaPrevia`, `errorCajas`, `errorCosto` y `puedeGuardar` (este último, como `computed`). Lo más simple es que los campos del formulario también sean signals. Lo que importa es que la pantalla se actualice sola cuando llega la respuesta de `previsualizar`. |
| 2 | Valores inventados en el formulario | `nueva-compra.modal.ts` | La cantidad de cajas y el costo por caja empiezan **vacíos**, no en `1` y `120000`. Mientras alguno de los dos esté vacío, no se llama a `previsualizar`, no se muestra la vista previa ni ningún mensaje de error, y **Guardar compra** queda deshabilitado. Los errores de `CANTIDAD_INVALIDA` y `COSTO_CAJA_INVALIDO` solo aparecen cuando el usuario escribió un valor inválido (por ejemplo, `0` cajas o un costo de `120005`). |
| 3 | Respuestas desordenadas | `nueva-compra.modal.ts` | `previsualizar` se llama en cada tecla y las respuestas pueden llegar en otro orden. Descarta toda respuesta (o error) que no sea de la última llamada, por ejemplo con un contador de peticiones. |
| 4 | Errores inesperados silenciados | `nueva-compra.modal.ts` | Si `previsualizar` lanza algo que no es un `ReglaNegocioError` de `CANTIDAD_INVALIDA` o `COSTO_CAJA_INVALIDO`, hoy la vista previa desaparece sin ningún mensaje. Muestra `mensajeDeError(error)` en un `ion-note` de color `danger` y deja **Guardar compra** deshabilitado. |
| 5 | La fecha es texto libre | `nueva-compra.modal.ts` y `aporte.modal.ts` | Hoy se escribe a mano `YYYY-MM-DD HH:mm:ss` y un error de formato termina en "Ocurrió un error inesperado". Usa `<ion-input type="date">` (valor `YYYY-MM-DD`), con la fecha de `CLOCK.ahora()` por defecto. Al guardar, la `FechaHora` es la fecha elegida más la hora de `CLOCK.ahora()` en ese momento (`fechaHora(\`${fecha} ${hora}\`)`). Si la fecha queda vacía, se muestra "Elige una fecha" y el botón de guardar queda deshabilitado. |
| 6 | Alias de exportación innecesarios | `nueva-compra.modal.ts`, `aporte.modal.ts` | Quita `export { NuevaCompraModalComponent as NuevaCompraModal }` y `export { AporteModalComponent as AporteModal }`, y usa los nombres `...Component` en todos los lugares que los importan dentro de las rutas permitidas. |

## Pruebas

Primero escribe las pruebas y míralas fallar (regla 3 de `base.md`). Sigue la regla 6.

- **Componente (`nueva-compra.modal.spec.ts`):**
  - al abrir, cajas y costo están vacíos, no se llama a `previsualizar` y **Guardar compra** está deshabilitado;
  - con `0` cajas aparece el mensaje de `CANTIDAD_INVALIDA`;
  - si llegan dos respuestas de `previsualizar` en orden inverso (la primera llamada resuelve después que la segunda), la pantalla muestra la de la **segunda** llamada;
  - si `previsualizar` rechaza con un `Error` común, se ve "Ocurrió un error inesperado" y el botón queda deshabilitado;
  - al guardar con la fecha `2026-11-05` y un `CLOCK` simulado que da `2026-11-11 10:30:00`, `registrar` recibe `fecha: '2026-11-05 10:30:00'`;
  - con la fecha vacía se ve "Elige una fecha" y el botón queda deshabilitado.
- **Componente (`aporte.modal.spec.ts`):** la misma prueba de fecha: con `2026-11-05` y el reloj en `2026-11-11 10:30:00`, `registrar` recibe `fecha: '2026-11-05 10:30:00'`.
- **E2E (`e2e/inventario.spec.ts`):** agrega una prueba que **no** llama a `fixture.detectChanges()`, porque en el navegador no hay atajo. Sin aporte previo, abre **Nueva compra**, escribe 2 cajas a $120.000 y verifica que se ven "Costo total" con $240.000 (en el formato de `formatearPesos`), el aviso de saldo insuficiente y el botón **Aportar capital**, y que **Guardar compra** está deshabilitado. En la prueba que ya existe, el formulario ahora empieza vacío: ajústala si hace falta.

## Verificación

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Copia el resultado de cada uno, con el número de pruebas. Para cada punto 1 a 6, indica qué cambiaste y qué prueba lo cubre.
