[MODO EJECUTOR]

# Hallazgos de la verificación (ronda 1)

Corrige solo esto. Archivos permitidos: `src/app/cartera/domain/**`, `src/app/cartera/application/**`, `src/app/cartera/infrastructure/**`, `src/app/cartera/index.ts`, `src/app/shared/domain/regla-negocio.error.ts`, `src/app/shared/ui/mensajes-error.ts`, `src/app/shared/ui/mensajes-error.spec.ts`. No modifiques `src/verificacion/b4-0`.

## Criterios que no se cumplen
- C22: Revisión de los `.spec.ts` nuevos: los rechazos de regla de negocio usan `expect.objectContaining({ codigo: '...' })` y no hay `try/catch`, pero en `src/app/cartera/application/registrar-abono.spec.ts` solo las pruebas de C1, C2 y C3 comprueban las cuatro tablas tras escribir; las escrituras aceptadas en C4 (l.328-338), C5 (l.354-368), C7 (l.411-419), C8 (l.435-453), C10 (l.483-516), C13 (l.632-669) y el reintento de C14 (l.689-700) no verifican las cuatro tablas (`ventas`, `abonos`, `abonos_detalle_facturas` y `movimientos_dinero`).

## Hallazgos bloqueantes
- `src/app/cartera/application/registrar-abono.spec.ts:328` (C22): Las pruebas con escrituras aceptadas en C4 (l.328-338), C5 (l.354-368), C7 (l.411-419), C8 (l.435-453), C10 (l.483-516), C13 (l.632-669) y el reintento de C14 (l.689-700) no comprueban las cuatro tablas (`ventas`, `abonos`, `abonos_detalle_facturas`, `movimientos_dinero`). En particular, C7 solo verifica `res.idAbono > 0` sin consultar ninguna tabla; C4, C5, C8 y C10 solo consultan `ventas`; C13 solo cuenta `abonos` y `movimientos_dinero`; y el reintento de C14 no consulta ninguna de las cuatro tablas directamente. Esto incumple el requisito explícito de C22 ("cada prueba de escritura comprueba las cuatro tablas").
