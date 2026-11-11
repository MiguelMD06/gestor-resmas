# Tarea B2.4b — Pantallas: estados de carga, validación y bloqueo durante procesos

**Etapa 2, bloque de pendientes B2.4.** Trabajas en paralelo con B2.4a, que toca otras rutas. Lee `CLAUDE.md` en la raíz del repositorio antes de empezar: sus reglas 1 a 6 son obligatorias y esta tarea las aplica a las pantallas de la Etapa 2.

Recuerda que la app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Estado actual relevante

- `nueva-compra.modal.ts` y `aporte.modal.ts` ya tienen una signal `guardando` que deshabilita **Guardar** mientras se guarda (commits `d880fc5` y `60202a3`). Reutilízala; no crees otra.
- `nueva-compra.modal.ts` descarta respuestas viejas de `previsualizar` con `peticionActual`. Reutiliza ese contador.

## Rutas permitidas

```
src/app/inventario/ui/**
src/app/finanzas/ui/**
e2e/inventario.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **S1. Vista previa desactualizada (`nueva-compra.modal.ts`).** Mientras haya una llamada a `previsualizar` en curso (la vigente según `peticionActual`), **Guardar compra** está deshabilitado. Agrega una signal `calculando` que se activa al iniciar el cálculo y se apaga cuando termina la llamada vigente (con éxito o error). `puedeGuardar` devuelve `false` mientras `calculando()` sea `true`. Una respuesta descartada por ser vieja no apaga `calculando`.
- **S2. Modales bloqueados mientras guardan (`nueva-compra.modal.ts` y `aporte.modal.ts`).** Mientras `guardando()` sea `true`: el botón **Cancelar** está deshabilitado, `cancelar()` no hace nada, los campos del formulario están deshabilitados y el botón **Aportar capital** del modal de compra también. Bloquea además el cierre por backdrop o gesto mientras se guarda, usando el mecanismo de Ionic que corresponda (por ejemplo `canDismiss` en el modal, configurado desde quien lo crea dentro de las rutas permitidas, o la propiedad equivalente); explica en el reporte cuál usaste.
- **S3. Aporte sin monto (`aporte.modal.ts`).** **Guardar aporte** está deshabilitado mientras el monto esté vacío. Elimina la conversión silenciosa `Number(this.monto() ?? 0)`: con el botón deshabilitado ya no hace falta. Un monto escrito pero inválido (por ejemplo `0`) sigue llegando al dominio y su error `MONTO_INVALIDO` se muestra como hoy.
- **S4. Error de carga del inventario (`inventario.page.ts`).** `cargarLotes()` maneja el error: con una signal `errorCarga` muestra un estado de error con el texto de `mensajeDeError(error)` y un botón **Reintentar** que vuelve a llamar a `cargarLotes()`. Mientras hay error **no** se muestra el estado vacío ("registra tu primera compra"). Al reintentar con éxito, el error desaparece y se ven los lotes. Agrega también una signal `cargando` con un indicador mientras la consulta está en curso.
- **S5. Carga doble (`inventario.page.ts`).** Quita la llamada de `ngOnInit`: Ionic ya ejecuta `ionViewWillEnter` en la primera entrada. Si quitas `OnInit`, quita también su import. Verifica que la primera entrada carga los lotes una sola vez.
- **S6. Mensajes de error verificados.** En las pruebas de guardado fallido que agregaron `d880fc5` y `60202a3`, cambia `expect(mockToastCtrl.create).toHaveBeenCalled()` por una verificación del mensaje exacto (`'Ocurrió un error inesperado'` para un `Error` común).

## Pruebas (primero RED)

Una prueba por regla, verificando todos sus efectos observables:

- `nueva-compra.modal.spec.ts`: con `previsualizar` pendiente (promesa diferida), **Guardar compra** está deshabilitado aunque la vista previa anterior tuviera `alcanza: true`; al resolverse, se habilita. Una respuesta vieja que llega después de la vigente no reactiva el botón ni cambia la vista previa.
- `nueva-compra.modal.spec.ts` y `aporte.modal.spec.ts`: con `registrar` pendiente, **Cancelar** y los campos están deshabilitados y `cancelar()` no llama a `dismiss`; tras un error, todo se habilita de nuevo.
- `aporte.modal.spec.ts`: con el monto vacío, **Guardar aporte** está deshabilitado y `guardar()` no llama a `registrar`; con `300000` se habilita.
- `inventario.page.spec.ts`: si `activos()` rechaza, se ve el mensaje de error y **Reintentar**, y **no** se ve el estado vacío; al pulsar **Reintentar** con `activos()` resolviendo lotes, se ven los lotes. En la primera entrada, `activos()` se llama **una** vez.
- `e2e/inventario.spec.ts`: el modal de aporte abre con el botón **Guardar aporte** deshabilitado hasta escribir un monto.

## Verificación

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Copia el resultado de cada comando con el número de pruebas, e indica qué prueba cubre cada `S#`.
