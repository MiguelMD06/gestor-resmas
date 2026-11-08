
---

# Tarea V0 — Verificación independiente de la Etapa 0

**Etapa 0 (Fundaciones), ola 3.** Eres el **verificador**: no escribes ni corriges código del proyecto. Solo pruebas y reportas.

## Objetivo

Comprobar en una copia limpia que la Etapa 0 cumple cada `S#` de su plan, y dar un veredicto por cada uno.

## Qué leer primero

1. `planificacion/etapas/0-fundaciones/PLAN.md` completo, hasta el final del `## Log`.
2. `planificacion/comun/modelo-contable.md`.
3. Las tareas de los bloques en `planificacion/etapas/0-fundaciones/bloques/*/tarea.md`.

## Rutas permitidas

**Ninguna dentro del repositorio.** Trabaja en una copia:

```bash
SCRATCH=$(mktemp -d)
git -C <repo> archive HEAD | tar -x -C "$SCRATCH"
cd "$SCRATCH" && npm ci
```

Lo único que puedes leer del repositorio original es `git diff <base>..HEAD --name-only` para el control de rutas. La base (`<base>`) te la da el coordinador al final de esta tarea.

## Qué verificar

1. **Comandos**, en la copia: `npm run lint`, `npm run test:unit`, `npm run test:e2e` (instala Chromium con `npx playwright install chromium` si falta) y `npm run build`. Copia el resultado de cada uno: cuántas pruebas, cuántas pasaron, si hubo errores o advertencias.
2. **Pruebas de comportamiento** con un script tuyo **dentro de la copia** (por ejemplo `scratch-probe.spec.ts`, que corres con `ng test`), que usa la API pública:
   - Con `SqlJsDatabase` y `migrar`: insertar un lote con `costo_por_caja = 125005` falla; insertar una venta con sobrepago falla; un `RETIRO_GANANCIA` con `delta_capital ≠ 0` falla.
   - Una `transaction` que inserta un `APORTE_CAPITAL` y después lanza un error deja 0 filas en `movimientos_dinero`.
   - `migrar` sobre una base con `user_version = 9` lanza el error de versión más nueva, y el hash del contenido (`SELECT group_concat(name) FROM sqlite_master`) no cambia.
   - `pesos(1.5)` y `cajas(0)` lanzan error; `formatearPesos(pesos(1234567))` devuelve `"$ 1.234.567"`.
   - `capacitor.config.ts` tiene `appId` `com.miguelmedina.gestorresmas` y `appName` `Gestor de Resmas`.
   - `.browserslistrc` no existe y la salida del build no contiene "Unsupported browsers".
   - `.github/workflows/ci.yml` se dispara en `pull_request` y en `push` a `main`, usa Node 24 y corre `npm ci`, `lint`, `test:unit` y `build`.
   - `src/app/shared/domain/**` no importa `@angular`, `@ionic`, `@capacitor` ni `sql.js`.
3. **Control de rutas:** compara `git diff <base>..HEAD --name-only` con la unión de las rutas permitidas de B0.1, B0.2 y B0.3, más `planificacion/**`, `.gitattributes`, `.vscode/extensions.json` y `README.md`. Lista cualquier archivo que esté fuera.

## Severidad

- **Bloqueante:** un defecto causado por esta etapa, o un `S#` sin cumplir, que se reproduce con datos realistas y no ocurría en la base.
- **Advertencia:** un defecto que ya ocurría en la base, o que solo aparece con valores fuera del dominio.
- Ignorar en silencio una opción explícita, o cambiar una salida existente que nadie pidió cambiar, es **siempre bloqueante**.

## Reporte

1. Tabla con `S1` a `S12`: veredicto (`cumple`, `no cumple` o `no verificable`) y evidencia (comando o prueba, y resultado).
2. Resultado de los 4 comandos.
3. Bloqueantes y advertencias, cada uno con cómo reproducirlo.
4. La ruta exacta de `$SCRATCH`, para que el coordinador la borre. **No la borres tú.**
