# Tarea P1 — Distinguir si la escritura se aplicó en `GuardadoWebError`

**Cierre de pendientes de la Etapa 1, ola 1.** Trabajas en paralelo con P2, que toca otros archivos. Resuelves el pendiente `R4-ambiguous-guardado-error` de `planificacion/etapas/1-motor-contable/PLAN.md` ("Pendientes para la Etapa 2"). Esta tarea manda sobre el plan si algo no coincide.

## Spec que cubres

| ID | Requisito |
|----|-----------|
| P1 | "`GuardadoWebError` se lanza tanto si la escritura se hizo y falló el guardado como si falló el reintento previo y la escritura **no** se ejecutó. Quien llama no puede distinguirlos." Decisión aprobada: agregar `readonly escrituraAplicada: boolean` a `GuardadoWebError` (`true` = el guardado falló después de la escritura; `false` = falló el guardado pendiente antes de la escritura y la escritura no se ejecutó), con pruebas para `run`, `exec` y `transaction` en los dos casos. |

## Rutas permitidas

```
src/app/shared/infrastructure/sqlite/guardado-web.error.ts
src/app/shared/infrastructure/sqlite/capacitor-sql-database.adapter.ts
src/app/shared/infrastructure/sqlite/capacitor-sql-database.adapter.spec.ts
```

Prohibido todo lo demás.

## Qué hacer

1. **`guardado-web.error.ts`:** el constructor pasa a ser `constructor(message: string, readonly escrituraAplicada: boolean, cause?: unknown)`. Se mantienen `name = 'GuardadoWebError'` y `super(message, { cause })`. Reescribe el JSDoc: ya no dice que los dos casos no se pueden distinguir, sino que `escrituraAplicada` los separa:
   - `true`: la escritura (o el commit) ya se aplicó en memoria y solo falló el guardado. Repetir la operación de negocio la duplicaría.
   - `false`: falló el guardado pendiente de una escritura anterior y la escritura nueva **no** se ejecutó. Se puede reintentar la operación.

   Conserva la nota de que el guardado pendiente se reintenta solo antes de la siguiente escritura.
2. **`capacitor-sql-database.adapter.ts`:**
   - el guardado después de la escritura, en `run`, `exec` y `transaction`, lanza `GuardadoWebError` con `escrituraAplicada = true`;
   - el reintento del guardado pendiente (`flushPendingSaveIfWeb`), antes de la escritura, lanza `GuardadoWebError` con `escrituraAplicada = false`;
   - el resto no cambia: la marca de pendiente, `query` sin reintento, nativo sin `guardar()` y el rollback solo alrededor de `work` y `commitTransaction`;
   - el mensaje sigue en inglés. Puede ser distinto para cada caso, por ejemplo `'Failed to persist web database store after write.'` y `'Failed to flush pending web database save; write was not executed.'`.
3. **Pruebas** (`capacitor-sql-database.adapter.spec.ts`), en web y con el doble de `SQLiteDBConnection` que ya existe en el archivo:
   - Para cada una de `run`, `exec` y `transaction`, **después de la escritura:** `guardar()` falla, el error es `GuardadoWebError` con `escrituraAplicada === true` y la causa original, y la escritura del doble (`db.run`, `db.execute` o `commitTransaction`) se llamó una vez.
   - Para cada una de `run`, `exec` y `transaction`, **guardado pendiente que vuelve a fallar:** primero se deja el adaptador pendiente; en la siguiente llamada `guardar()` falla otra vez, el error es `GuardadoWebError` con `escrituraAplicada === false` y la causa nueva, y la escritura nueva **no** se ejecutó (`db.run`, `db.execute` o `beginTransaction` no se llamó en esa segunda operación).
   - Las pruebas que ya existen tienen que seguir pasando. Ajústalas solo si dejan de compilar por la firma nueva, y agrega la aserción de `escrituraAplicada` donde ya verifican un `GuardadoWebError`.
   - Sigue la regla 6 de las reglas de trabajo: nada de `try/catch` sin una aserción que falle si no se lanza el error. Para revisar campos del error usa `rejects.toMatchObject({ escrituraAplicada: true, cause })` o `rejects.toThrow(expect.objectContaining({ ... }))`.

## Fuera de alcance

- No cambies `database.provider.ts`, la factory ni el puerto `SqlDatabase`.
- No agregues reintentos automáticos de la operación de negocio.

## Verificación

```
npm run lint
npm run test:unit
npm run build
```

Copia el resultado de cada uno, junto con el número de pruebas que pasan.
