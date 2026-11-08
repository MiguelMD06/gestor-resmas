
---

# Tarea V1 — Verificación independiente de la Etapa 1

**Etapa 1 (Motor contable), ola 3.** Eres el verificador: **no corriges nada** en el repositorio. Solo lees, pruebas en una copia aparte y reportas un veredicto.

## Qué verificas

El plan completo: `planificacion/etapas/1-motor-contable/PLAN.md`. Léelo **entero**, hasta el final del `## Log`: los `S1`–`S13`, los ejemplos `E1`–`E8`, las decisiones `D1`–`D4`, las rutas permitidas de cada bloque y la entrada `L4` (ajustes de ejecución aprobados). Las tareas que recibió cada bloque están en `planificacion/etapas/1-motor-contable/bloques/*/tarea.md`.

- Base (antes de la etapa): commit `41d35ad`.
- Candidato: el `HEAD` actual de la rama `feat/etapa-1-motor-contable`.

## Rutas permitidas

Ninguna dentro del repositorio: **no crees, edites ni borres ningún archivo del repositorio**. Todo lo que necesites escribir va en una copia limpia fuera del repositorio:

1. Crea un directorio temporal con `mktemp -d` (o `New-Item` en `$env:TEMP` si no tienes `mktemp`).
2. Copia ahí el repositorio con `git clone <ruta del repo> <temp>/repo` y haz `git checkout` del commit `HEAD` del repositorio original.
3. En la copia: `npm ci` (no uses la red para nada más).

## Qué hacer

1. **Comandos en la copia:** `npm run lint`, `npm run test:unit` y `npm run build`. Copia el resultado de cada uno.
2. **Ejemplos E1–E8 con un script propio:** escribe en la copia un archivo de prueba nuevo (por ejemplo, `src/app/verificacion-v1.spec.ts`) que importe **solo la API pública** (`src/app/cartera/domain/index.ts`, `src/app/ventas/domain/index.ts`, `src/app/finanzas/index.ts` o `src/app/finanzas/domain/index.ts` y `src/app/shared/domain/index.ts`) y reproduzca E1 a E8 con los números exactos del plan. Córrelo con `npx ng test --no-watch --include=src/app/verificacion-v1.spec.ts` (o el mecanismo equivalente que funcione) y copia el resultado. Si algo no se puede expresar con la API pública, eso es un hallazgo.
3. **Pruebas adversariales**, también en la copia:
   - la invariante S10 en una secuencia propia (distinta de la simulación existente);
   - la cascada con facturas desordenadas en la entrada y con una factura ya pagada en medio;
   - `liquidarTodo` y luego otra cascada sobre las facturas resultantes (debe dar `SIN_DEUDA`);
   - el repositorio `LibroRepository` con `SqlJsDatabase` y la migración real: un traspaso que falla dentro de la transacción no deja filas, y `saldos(db)` coincide con `calcularSaldos`.
4. **Rutas permitidas:** en el repositorio original, `git diff --name-only 41d35ad HEAD`. Comprueba que cada archivo cae en las rutas permitidas de algún bloque (B1.0, B1.1, B1.2) o en `planificacion/**` (documentación del coordinador). Lista cualquier archivo fuera de ellas.
5. **Pendientes de la Etapa 0 (S13):** confirma en el código los puntos 1 a 5 de B1.0, y que los 3 pendientes declarados fuera de alcance (cifrado, pantalla de error y bloqueo de la cola) siguen documentados como decididos en el plan.

## Severidad

- **Bloqueante:** un defecto causado por esta etapa, o un `S#`/`E#` que no se cumple, que se reproduce con datos realistas y que no se reproducía en `41d35ad`. También lo es ignorar en silencio una opción explícita con éxito, o cambiar una salida existente que nadie pidió cambiar.
- **Observación:** defectos que ya estaban en `41d35ad`, valores fuera de dominio y mejoras de estilo o legibilidad.

## Reporte

1. Resultado de cada comando (`<comando>: <resultado observado>`).
2. **Veredicto por cada `S1`–`S13` y `E1`–`E8`:** `cumple` / `no cumple` / `no verificable`, con la prueba o la línea de código que lo respalda.
3. Bloqueantes, cada uno con pasos para reproducirlo.
4. Observaciones.
5. Rutas fuera de lo permitido (o "ninguna").
6. Las pruebas que escribiste en la copia, **completas**, para que el coordinador pueda agregarlas como pruebas de regresión.
7. La ruta exacta del directorio temporal. **No lo borres**: lo borra el coordinador.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.
