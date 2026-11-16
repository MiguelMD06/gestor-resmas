# Tarea B3.V — Correcciones de la verificación V3 y pruebas de aceptación

**Etapa 3, correcciones finales.** Nadie más escribe en el árbol mientras trabajas. Antes de empezar, lee `CLAUDE.md` (raíz; reglas 1 a 12) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, **D6**, **D13**, **D15**, **E17**, **E18** y **E19**. La verificación V3 aprobó la etapa sin bloqueantes; esto cierra sus observaciones.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Rutas permitidas

```
src/app/ventas/ui/**
src/app/clientes/ui/cliente.modal.ts
src/app/clientes/ui/cliente.modal.spec.ts
src/app/etapa-3.acceptance.spec.ts
e2e/etapa-3.acceptance.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **V1. Un solo resumen por toque (regla 2, E17).** En `vender.page.ts`, `abrirResumen()` no tiene guarda: dos toques rápidos en **Confirmar venta** pueden abrir dos resúmenes mientras `modalCtrl.create()` resuelve, y cada uno podría guardar una venta. Agrega una signal (por ejemplo `abriendoResumen`) que se activa **antes** del primer `await` de `abrirResumen()` y se libera en `finally`; mientras esté activa, `abrirResumen()` no hace nada y **Confirmar venta** queda deshabilitado (también para lectores de pantalla).
- **V2. Sin código muerto (regla 9).** `VenderPage` declara `guardando` y lo enlaza en la plantilla, pero nunca lo activa: el guardado vive en `resumen-venta.modal.ts`. Haz que la página quede bloqueada mientras el resumen guarda, como pide el plan (por ejemplo, que el modal informe a la página que empezó y terminó de guardar, o que la página mantenga `guardando` activo mientras el resumen está abierto y guardando). Si eliges otra forma que cumpla lo mismo, elimina `guardando` de la página. En ningún caso queda una signal que nunca cambia.
- **V3. Límite de fecha al día (regla 11, D6, D13).** `maxFechaIso` es un `computed` que no lee ninguna signal y queda fijo en el primer render. Calcúlalo con `CLOCK` cada vez que se abre el selector de fecha (por ejemplo, una signal que se actualiza al abrirlo), para que la hora actual siempre se pueda elegir y una futura nunca.
- **V4. Error visible en la búsqueda de clientes (regla 4).** En el selector de clientes de Vender, si `BuscarClientes.buscar` falla, se muestra el error con el texto de `mensajeDeError` y un botón **Reintentar** (deshabilitado mientras busca), en lugar de conservar la lista anterior en silencio. Solo la última búsqueda actualiza la lista (id de petición).
- **V5. Vista bloqueada y accesible (reglas 3 y 10).** En `vender.page.ts`, mientras `cargando()` o mientras se guarda, el botón de fecha y los `ion-segment` de modalidad y medio quedan deshabilitados, como ya pasa con los demás controles. En `cliente.modal.ts`, los campos **Nombre completo** y **Celular** reflejan el estado deshabilitado con `[attr.aria-disabled]`, igual que los botones.
- **V6. Pruebas de aceptación de V3.** El verificador dejó sus pruebas en una copia temporal. Cópialas tal cual, cambiando solo el nombre del archivo y las rutas relativas de los `import` si hace falta:
  - `C:\Users\MIGUEL ANGEL\AppData\Local\Temp\v3-verify-20261115-234107\repo\src\app\verificacion-v3.spec.ts` → `src/app/etapa-3.acceptance.spec.ts`
  - `C:\Users\MIGUEL ANGEL\AppData\Local\Temp\v3-verify-20261115-234107\repo\e2e\verificacion-v3.spec.ts` → `e2e/etapa-3.acceptance.spec.ts`

  No cambies lo que verifican. Si alguna deja de pasar por V1 a V5, ajusta solo lo necesario y explícalo en el reporte. No borres el directorio temporal.

## Pruebas (primero RED)

- V1: dos llamadas seguidas a `abrirResumen()` sin esperar → `modalCtrl.create` se llama **una** vez; **Confirmar venta** deshabilitado mientras abre y habilitado después, también si `create` falla.
- V2: mientras el resumen guarda, la página está bloqueada (o, si eliminaste `guardando`, la prueba que lo cubra); ninguna signal de la página queda sin uso.
- V3: con un `CLOCK` que avanza entre la primera y la segunda apertura del selector de fecha, el `max` es la hora de cada apertura.
- V4: `buscar` rechaza → se ve el error y **Reintentar**; al reintentar con éxito, la lista; una respuesta vieja que llega tarde no pisa la nueva.
- V5: con `cargando()` en `true`, el botón de fecha y los segmentos están deshabilitados; en el modal de cliente, mientras guarda, los dos campos tienen `aria-disabled="true"`.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```
