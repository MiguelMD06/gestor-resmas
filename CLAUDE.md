# gestor-resmas — reglas del proyecto

Estas reglas aplican a todo cambio de código, lo escriba una persona o un agente
(Claude, agy u otro). Quien delega una tarea debe incluirlas en la instrucción
del bloque. Un PR que no las cumpla no está listo para revisión.

## Reglas de calidad (OBLIGATORIAS)

Origen: la revisión del PR #11 (Etapa 2) encontró un doble envío que duplicaba
compras y aportes, un formulario que se podía guardar sin monto, una vista
previa desactualizada que habilitaba el guardado y una carga que fallaba en
silencio. Ninguno debió llegar al PR.

### 1. Validación de cada campo
- Cada campo valida tipo, obligatoriedad, rango y formato **en la UI y en el
  dominio**. La UI guía al usuario; el dominio es la última barrera.
- El botón de acción queda deshabilitado mientras algún campo obligatorio esté
  vacío o sea inválido. No se depende de que el dominio rechace para avisar.
- Prohibido convertir valores en silencio (`?? 0`, `Number('')`, `|| ''`) para
  "hacer pasar" un campo vacío.
- El mensaje de error se muestra junto al campo, en español y con el texto de
  `shared/ui/mensajes-error.ts`.

### 2. Idempotencia y doble envío
- Toda acción que escribe (guardar, registrar, pagar, aportar, eliminar) tiene
  una guarda de proceso en curso (`guardando`/`procesando`): mientras la
  petición no termina, la acción no puede volver a ejecutarse.
- La guarda se activa **antes** del primer `await` y se libera en `finally`,
  también cuando hay error, para que el usuario pueda reintentar.
- Las escrituras que afectan dinero o stock corren en una sola transacción: o se
  aplica todo, o no se aplica nada.

### 3. La vista se bloquea mientras carga o procesa
- Mientras haya un proceso en curso en una ventana o vista (guardado, cálculo,
  carga), no se puede enviar otra petición ni modificar los datos de los que
  depende: botones y campos afectados quedan deshabilitados y se muestra un
  indicador de carga.
- Un modal no se cierra (botón cancelar, backdrop, gesto) mientras guarda.
- Si una acción depende de un cálculo asíncrono (por ejemplo, una vista previa),
  queda deshabilitada hasta que el cálculo vigente termine. Las respuestas
  viejas se descartan (patrón de id de petición).

### 4. Errores visibles, nunca silenciosos
- Toda carga asíncrona distingue cuatro estados: cargando, con datos, vacío y
  error. Un error nunca se muestra como "vacío".
- Ninguna promesa queda sin manejar en componentes (`ngOnInit`,
  `ionViewWillEnter`, manejadores de eventos).
- El estado de error ofrece una salida: reintentar o volver.

### 5. Reintentos seguros
- Todo reintento es idempotente y no deja recursos a medias: conexiones,
  transacciones o archivos abiertos por un intento fallido se cierran o se
  reutilizan en el siguiente.

### 6. Tests obligatorios para cada regla anterior
Cada formulario o vista nueva incluye, como mínimo, tests de:
- validación de cada campo (vacío, inválido, válido) y estado del botón;
- doble envío: dos ejecuciones concurrentes producen **una sola** escritura;
- botón deshabilitado durante el proceso y habilitado de nuevo tras un error;
- carga fallida: se muestra el error, no el estado vacío;
- el texto exacto que ve el usuario en errores (no solo `toHaveBeenCalled`).

### 7. Dinero y cantidades solo como enteros
Los montos se manejan como enteros en pesos (`Pesos`) y las cantidades como
enteros. Nada de decimales flotantes en cálculos de dinero.

### 8. Confirmación en acciones irreversibles
Eliminar, anular o revertir movimientos de dinero o stock pide confirmación
explícita.

### 9. Sin código muerto
No se exporta nada que nadie use. El código preparado para una etapa futura
se documenta en el `PLAN.md` de la etapa como "base para la Etapa N".

### 10. Accesibilidad mínima
Cada campo tiene etiqueta visible, cada botón de solo ícono tiene
`aria-label`, y los estados deshabilitados se reflejan también para lectores
de pantalla.

### 11. Fechas y horas desde `CLOCK`
Nunca `new Date()` directo en dominio, aplicación o UI; siempre el token
`CLOCK`, para que los tests sean deterministas.

### 12. Checklist antes de abrir un PR
Quien abre el PR confirma en la descripción que revisó las reglas 1 a 12, y
que `npm run lint`, `npm run test:unit`, `npm run build` y
`npm run test:e2e` pasan en local.
