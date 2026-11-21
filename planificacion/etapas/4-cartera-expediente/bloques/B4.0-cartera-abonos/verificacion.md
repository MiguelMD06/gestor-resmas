[MODO EJECUTOR]

# Verificación del bloque B4.0-cartera-abonos

Eres el verificador independiente de este bloque. Otro agente lo implementó
siguiendo `C:\Users\MIGUEL ANGEL\Documents\PROYECTOS MIGUEL MEDINA DIAZ\gestor-resmas\.claude\worktrees\docs-revision-plan\planificacion\etapas\4-cartera-expediente\bloques\B4.0-cartera-abonos\instruccion.md`: léelo para entender la tarea. Tu trabajo es
comprobar con pruebas reales que cumple todos los criterios de aceptación de
abajo, e intentar romperlo. No lo arreglas tú.

## Reglas

1. No modificas ningún archivo fuera de `src/verificacion/b4-0`. Ahí puedes crear tus propias pruebas para comprobar los criterios y los casos que pueden fallar.
2. Cada criterio se comprueba ejecutando algo de verdad (una prueba, un
   comando, una petición). Solo si no se puede ejecutar, se comprueba leyendo
   el código, y la evidencia lo dice. La evidencia nombra qué corriste y qué
   salió. Nunca inventes un resultado.
3. Intenta romperlo aunque el criterio no lo nombre: valor límite exacto, el
   segundo y el último elemento (no solo el primero), repetir la acción, fallo
   de red, datos de otro usuario y otro rol.
4. Revisa también las pruebas que escribió el implementador. Es un hallazgo
   bloqueante si:
   - una prueba no ejercita la función que nombra su título;
   - un rechazo esperado no se acota al error exacto (código o mensaje), por
     ejemplo un `toThrow()` o `rejects.toThrow()` a secas;
   - hay un `try/catch` sin una aserción que falle si no se lanza el error;
   - un caso límite no se prueba con el valor límite exacto.
5. Los archivos que el implementador podía tocar son: `src/app/cartera/domain/**`, `src/app/cartera/application/**`, `src/app/cartera/infrastructure/**`, `src/app/cartera/index.ts`, `src/app/shared/domain/regla-negocio.error.ts`, `src/app/shared/ui/mensajes-error.ts`, `src/app/shared/ui/mensajes-error.spec.ts`. Si
   cambió algo fuera, es un hallazgo bloqueante.
6. Lee el `CLAUDE.md` del proyecto antes de empezar. Cierra todo servidor que
   levantes para probar.
7. Al final corre el comando de prueba del bloque y anota su resultado:
   `npm run test:unit`

## Criterios de aceptación

# Criterios de aceptación — B4.0

Datos de partida en todos los criterios (salvo que el criterio diga otra cosa): `CLOCK` fijo en 2026-11-20 12:00:00; **Ana** con **F1** (2026-11-01 10:00:00, total $30.000, costo $20.000, pagado $0, `PENDIENTE`) y **F2** (2026-11-10 10:00:00, total $15.000, costo $10.000, pagado $5.000 por un `ABONO_INICIAL`, `PARCIAL`); **Beto** sin compras; el Mostrador. Base `SqlJsDatabase` con las `MIGRACIONES`.

"No escribe nada" significa: `ventas`, `abonos`, `abonos_detalle_facturas` y `movimientos_dinero` quedan exactamente como antes de la llamada.

- C1: `RegistrarAbono` en modo `CASCADA_GLOBAL` con $35.000 en `EFECTIVO` y fecha 2026-11-20 12:00:00 deja F1 con `monto_pagado` 30000, `saldo_pendiente` 0 y `PAGADA`, y F2 con `monto_pagado` 10000, `saldo_pendiente` 5000 y `PARCIAL`. Escribe un abono `CASCADA_GLOBAL` de 35000 en `EFECTIVO` con dos filas de detalle (F1: 30000, capital 20000, ganancia 10000; F2: 5000, capital 5000, ganancia 0) y un `COBRO` en `EFECTIVO` con `delta_bolsillo` 35000, `delta_capital` 25000, `delta_ganancia` 10000 e `id_abono` del abono nuevo. Devuelve ese `idAbono` y las dos aplicaciones.
  Cómo comprobarlo: prueba del caso de uso que lee las cuatro tablas después de llamarlo.
- C2: `FACTURA_INDIVIDUAL` a F2 con $3.000 en `TRANSFERENCIA` deja F2 con `monto_pagado` 8000, `saldo_pendiente` 7000 y `PARCIAL`; F1 no cambia. Abono `FACTURA_INDIVIDUAL` con una sola fila de detalle (F2: 3000, capital 3000, ganancia 0) y `COBRO` en `TRANSFERENCIA` con capital 3000 y ganancia 0.
- C3: `LIQUIDACION_TOTAL` en `TRANSFERENCIA` deja F1 y F2 `PAGADA` con saldo 0; abono `LIQUIDACION_TOTAL` de 40000 con dos filas de detalle (F1: 30000, capital 20000, ganancia 10000; F2: 10000, capital 5000, ganancia 5000) y `COBRO` con capital 25000 y ganancia 15000. Después, `ConsultarCartera` ya no incluye a Ana y otra `LIQUIDACION_TOTAL` sobre Ana se rechaza con `SIN_DEUDA` sin escribir nada.
- C4: Límite de la cascada: con $40.000 se acepta y deja las dos facturas `PAGADA`; con $40.001 se rechaza con `MONTO_SUPERA_DEUDA` y no escribe nada.
- C5: Límite de una factura: `FACTURA_INDIVIDUAL` a F2 con $10.000 se acepta y la deja `PAGADA`; con $10.001 se rechaza con `MONTO_SUPERA_SALDO_FACTURA` y no escribe nada.
- C6: Un monto de $0 se rechaza con `MONTO_INVALIDO` en `CASCADA_GLOBAL` y en `FACTURA_INDIVIDUAL`, sin escribir nada.
- C7: Fecha futura: 2026-11-20 12:00:01 se rechaza con `FECHA_FUTURA` y no escribe nada; 2026-11-20 12:00:00 (igual al `CLOCK`) se acepta.
- C8: Abono anterior a una factura que paga (D14): `CASCADA_GLOBAL` de $35.000 con fecha 2026-11-05 10:00:00 se rechaza con `ABONO_ANTERIOR_A_FACTURA` (F2 recibiría dinero y es del 2026-11-10) y no escribe nada. Con la misma fecha, $30.000 se acepta porque solo F1 recibe dinero. `CASCADA_GLOBAL` de $35.000 con fecha 2026-11-10 10:00:00 (igual a la de F2) se acepta.
- C9: `MENSAJES_ERROR.ABONO_ANTERIOR_A_FACTURA` es exactamente «La fecha del abono es anterior a una factura que paga», y `ABONO_ANTERIOR_A_FACTURA` es parte de `CodigoRegla`.
- C10: Orden de la cascada con empate (segundo y último elemento): la clienta Carla tiene G1 (2026-11-02 10:00:00, total $10.000, costo $8.000), G2 y G3 (las dos del 2026-11-03 10:00:00, total $10.000, costo $8.000; G2 con menor `id_venta`). Una cascada de $25.000 deja G1 y G2 `PAGADA` y G3 con `monto_pagado` 5000 y `PARCIAL` (capital 5000, ganancia 0 en G3). Las facturas de Ana no cambian.
- C11: Otro cliente: un abono a Ana nunca cambia ventas de otro cliente. `FACTURA_INDIVIDUAL` de Ana con el `idVenta` de una factura de Carla se rechaza con `FACTURA_INVALIDA`; con un `idVenta` que no existe, también `FACTURA_INVALIDA`; con una factura de Ana ya `PAGADA`, `SIN_DEUDA`. Ninguno escribe nada.
- C12: Cliente inexistente: cualquier modo con un `idCliente` que no existe se rechaza con `CLIENTE_INEXISTENTE` sin escribir nada. Beto (sin compras) en `CASCADA_GLOBAL` o `LIQUIDACION_TOTAL` se rechaza con `SIN_DEUDA`.
- C13: Doble envío: dos llamadas concurrentes (`Promise.allSettled`) a `CASCADA_GLOBAL` de $35.000 sobre Ana producen **una** sola fila nueva en `abonos` y **un** solo `COBRO`; la otra se rechaza con `MONTO_SUPERA_DEUDA` porque las facturas se leen dentro de la transacción. La deuda de Ana queda en $5.000.
- C14: Transacción única (R-11): si `LibroRepository.registrar` falla (por ejemplo, con un espía que lanza), la llamada se rechaza y no queda el abono, ni su detalle, ni cambios en `ventas`. Una llamada correcta después del fallo se aplica normalmente (reintento seguro).
- C15: `CarteraRepository.aplicarPago` sobre F2 con $10.001 (más que su saldo) lanza error y no cambia la fila; con $10.000 la deja con `saldo_pendiente` 0 y `PAGADA`; con $1 la deja `PARCIAL`.
- C16: `ConsultarCartera.consultar()` con los datos de partida y Carla sin deuda devuelve `total` 40000 y un mapa con solo Ana → 40000 (sin Beto, sin el Mostrador). Después de C1 devuelve 5000.
- C17: `ConsultarExpediente.consultar(Ana)` devuelve `deuda` `{ total: 40000, capital: 25000, ganancia: 15000 }`, las facturas en orden F2, F1 con su `estado` (`PARCIAL`, `PENDIENTE`), `saldo` y `lineas` (cantidad, `tipoPapel`, precio unitario y subtotal), y los abonos del más nuevo al más antiguo. Después de C1, el primer abono es el de $35.000 con aplicaciones F1 30000 y F2 5000, y el segundo el `ABONO_INICIAL` de $5.000 a F2. Con un `idCliente` inexistente, `CLIENTE_INEXISTENTE`.
- C18: El expediente no muestra `PAGO_CONTADO` (D15): una venta de contado a Ana aparece en `facturas` como `PAGADA`, pero no en `abonos`.
- C19: `porCobrar`: para F2 devuelve capital 5000 y ganancia 5000; para F1, capital 20000 y ganancia 10000; para una venta bajo costo (total $8.000, costo $10.000, pagado $3.000), capital 5000 y ganancia 0, nunca negativa; para una factura pagada, 0 y 0.
- C20: Se reutiliza lo que existe: `RegistrarAbono` calcula con `distribuirCascada`, `abonarFactura` y `liquidarTodo`, escribe con `AbonoRepository.insertar` y registra el dinero con `cobro()` y `LibroRepository.registrar`; no hay otra implementación del reparto ni otro `INSERT` en `abonos` o `movimientos_dinero`.
  Cómo comprobarlo: revisión del código.
- C21: Solo se tocaron las rutas permitidas, sin migraciones nuevas, y `npm run lint`, `npm run test:unit` y `npm run build` pasan (las 443 pruebas que ya existían siguen en verde).
- C22: Calidad de las pruebas (regla 6 de `comun/base.md`): cada rechazo se acota con `expect.objectContaining({ codigo: '...' })`, sin `try/catch` para verificar errores, y cada prueba de escritura comprueba las cuatro tablas.
  Cómo comprobarlo: revisión de los `.spec.ts` nuevos.

## Respuesta

Responde con el formato JSON pedido:

- `veredicto`: `APROBADO` solo si todos los criterios se cumplen y no hay
  hallazgos bloqueantes; si no, `CAMBIOS`.
- `criterios`: uno por cada id de arriba, sin omitir ninguno, con `cumple` y
  `evidencia` (qué corriste y qué salió).
- `hallazgos`: cada uno con `archivo`, `linea` si aplica, `criterio` (el id, o
  vacío si no corresponde a uno), `bloqueante` y una `descripcion` concreta:
  qué falla y cómo reproducirlo. Es bloqueante todo lo que incumple un
  criterio, rompe algo o es un riesgo; es un detalle lo que no cambia el
  comportamiento.
- `resumen`: una o dos frases.
