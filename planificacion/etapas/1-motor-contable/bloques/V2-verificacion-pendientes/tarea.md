# Tarea V2 — Verificación independiente de los pendientes P1 y P2

**Cierre de pendientes de la Etapa 1, ola 2.** Eres el verificador: **no corriges nada** en el repositorio. Solo lees, pruebas en una copia aparte y reportas un veredicto.

## Qué verificas

- Las tareas: `planificacion/etapas/1-motor-contable/bloques/P1-guardado-web-error/tarea.md` y `planificacion/etapas/1-motor-contable/bloques/P2-validar-factura/tarea.md`. Léelas enteras; sus specs `P1` y `P2` son lo que verificas.
- El contexto: `planificacion/etapas/1-motor-contable/PLAN.md`, sección "Pendientes para la Etapa 2".
- Base (antes del código): commit `1602fe2`.
- Candidato: el `HEAD` actual de la rama `fix/pendientes-etapa-1` (commits `a91af2b` para P1 y `8199de1` para P2).

## Rutas permitidas

Ninguna dentro del repositorio: **no crees, edites ni borres ningún archivo del repositorio**. Todo lo que tengas que escribir va en una copia limpia fuera de él:

1. Crea un directorio temporal con `mktemp -d` o, si no tienes `mktemp`, con `New-Item` en `$env:TEMP`.
2. Clona el repositorio con `git clone <ruta del repo> <temp>/repo` y haz `git checkout` del `HEAD` del repositorio original.
3. En la copia corre `npm ci`, y no uses la red para nada más.

## Qué hacer

1. **Comandos en la copia:** `npm run lint`, `npm run test:unit` y `npm run build`. Copia el resultado de cada uno con el número de pruebas.
2. **Pruebas adversariales** en un archivo nuevo de la copia (por ejemplo, `src/app/verificacion-v2.spec.ts`). Córrelo con `npx ng test --no-watch --include=src/app/verificacion-v2.spec.ts` o con el mecanismo equivalente que funcione:
   - **P1:** con un doble de `SQLiteDBConnection` y `esWeb = true`, deja el adaptador pendiente con un `run` cuyo `guardar()` falle. Después, el siguiente `transaction` con `guardar()` funcionando ejecuta el trabajo, y un tercer `run` cuyo `guardar()` falle da `escrituraAplicada === true`. Comprueba también que en nativo (`esWeb = false`) no se llama a `guardar()` y no se lanza `GuardadoWebError`.
   - **P2:** a través de la API pública de `src/app/cartera/domain/index.ts`, la cascada de abonos y el pago de una factura específica con una factura inválida (`pagado > total`) rechazan con `codigo === 'FACTURA_INVALIDA'`. Una venta bajo costo (`costoBase > total`) sigue siendo válida y reparte todo el pago a capital.
   - **Regresión:** los ejemplos E1 a E4 de `PLAN.md` dan los mismos números que en la base.
3. **Calidad de las pruebas** (regla 6 de `planificacion/comun/base.md`), en los specs que cambiaron entre `1602fe2` y `HEAD` y además en todos los `*.spec.ts` de `src/app/cartera/` y `src/app/finanzas/`: lista cada prueba que use `try/catch` para verificar un error, `toThrow()` o `rejects.toThrow()` sin acotar, o un título que no corresponda a la función que llama. Para cada una indica el archivo, la línea y si venía de la base o la introdujo este cambio.
4. **Rutas permitidas:** en el repositorio original corre `git diff --name-only 1602fe2 HEAD`. Comprueba que cada archivo cae en las rutas permitidas de P1 o de P2 y lista los que no.

## Severidad

- **Bloqueante:** un defecto causado por este cambio, o un spec `P1`/`P2` que no se cumple, que se reproduce con datos realistas y que no se reproducía en `1602fe2`. También cuenta ignorar en silencio una opción explícita con éxito, o cambiar una salida existente que nadie pidió cambiar.
- **Observación:** defectos que ya estaban en `1602fe2`, valores fuera de dominio y mejoras de estilo o de legibilidad. Las faltas a la regla 6 que ya venían de la base son observaciones.

## Reporte

1. Resultado de cada comando (`<comando>: <resultado observado>`).
2. Veredicto para `P1` y `P2`: `cumple`, `no cumple` o `no verificable`, con la prueba o la línea de código que lo respalda.
3. Bloqueantes, cada uno con los pasos para reproducirlo.
4. Observaciones, incluida la lista completa del punto 3.
5. Rutas fuera de lo permitido, o "ninguna".
6. Las pruebas que escribiste en la copia, **completas**, para que el coordinador pueda agregarlas como pruebas de regresión.
7. La ruta exacta del directorio temporal. **No lo borres**: lo borra el coordinador.
