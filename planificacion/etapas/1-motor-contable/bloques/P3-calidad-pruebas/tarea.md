# Tarea P3 — Calidad de las pruebas y regresiones de la verificación V2

**Cierre de pendientes de la Etapa 1, ola 3 (corrección).** Trabajas solo. Solo cambias pruebas: **no toques código de producción**. La verificación V2 no encontró bloqueantes en P1 ni en P2, pero sí observaciones que ya venían de la Etapa 1 y que contradicen la regla 6 de las reglas de trabajo ("Pruebas que prueban lo que dicen"). Según `planificacion/README.md`, un hallazgo que se corrige en pocas líneas se arregla antes del PR.

## Specs que cubres

| ID | Requisito |
|----|-----------|
| P3.1 | Regla 6: "un rechazo esperado se acota al error exacto: `toThrow(expect.objectContaining({ codigo: '...' }))` o un mensaje concreto, nunca `toThrow()` o `rejects.toThrow()` a secas" y "nada de `try/catch` para verificar un error: si no se lanza, la prueba tiene que fallar". |
| P3.2 | Regla 6: "cada prueba llama a la función que nombra su título". |
| P3.3 | Las pruebas adversariales de V2 sobre P1 y P2 quedan en el repositorio como pruebas de regresión. |

## Rutas permitidas

```
src/app/cartera/domain/reparto-pago.spec.ts
src/app/cartera/domain/abonos.spec.ts
src/app/cartera/domain/factura.spec.ts
src/app/finanzas/domain/operaciones.spec.ts
src/app/finanzas/domain/saldos.spec.ts
src/app/finanzas/infrastructure/libro.repository.spec.ts
src/app/shared/infrastructure/sqlite/capacitor-sql-database.adapter.spec.ts
```

Prohibido todo lo demás, incluidos todos los archivos que no son `*.spec.ts`.

## Qué hacer

### P3.1 — Rechazos sin `try/catch`

Reemplaza cada combinación de `expect(fn).toThrowError(ReglaNegocioError)` + `try { fn() } catch (e) { expect(e.codigo)... }` por **una** aserción por llamada:

```ts
expect(() => fn()).toThrow(expect.objectContaining({ name: 'ReglaNegocioError', codigo: 'CODIGO' }));
```

Lugares que encontró V2 (las líneas pueden haberse movido un poco):

| Archivo | Prueba |
|---------|--------|
| `reparto-pago.spec.ts` | `rejects zero or negative payment amounts with MONTO_INVALIDO` (L60–82) |
| `abonos.spec.ts` | `E4: rejects general payment exceeding total customer debt with MONTO_SUPERA_DEUDA` (L58–82) |
| `abonos.spec.ts` | `distribuirCascada` > `rejects zero or negative amounts with MONTO_INVALIDO` (L169–193) |
| `abonos.spec.ts` | `distribuirCascada` > `rejects with SIN_DEUDA when there is no outstanding debt` (L195–219) |
| `abonos.spec.ts` | `abonarFactura` > `rejects zero or negative amounts with MONTO_INVALIDO` (L264–286) |
| `abonos.spec.ts` | `abonarFactura` > `rejects with SIN_DEUDA when invoice has zero balance` (L288–303) |
| `abonos.spec.ts` | `abonarFactura` > `rejects when payment exceeds invoice balance with MONTO_SUPERA_SALDO_FACTURA` (L317–332) |
| `abonos.spec.ts` | `liquidarTodo` > `rejects with SIN_DEUDA when there is no debt to settle` (L387–410) |
| `operaciones.spec.ts` | el helper `expectReglaError` (L8–16), que usa `try { fn(); expect.unreachable() } catch`. Cámbialo para que use `expect(fn).toThrow(expect.objectContaining({ name: 'ReglaNegocioError', codigo }))` y conserva su firma, para que los usos que ya existen no cambien. |

Conserva los mismos valores de entrada y los mismos códigos esperados. Cada prueba sigue verificando exactamente los mismos casos que hoy, incluidos el valor 0 y el negativo cuando estén los dos. Al terminar, `grep -n "catch" src/app/cartera src/app/finanzas -r --include=*.spec.ts` no debe devolver nada.

### P3.2 — Títulos que nombran la función

Cambia **solo el texto del título** (`it(...)`) para que nombre la función que la prueba llama. No cambies los cuerpos:

| Archivo | Pruebas |
|---------|---------|
| `factura.spec.ts` | L9 y L21 llaman a `saldo`: por ejemplo, `saldo calculates invoice balance as total minus paid amount`. |
| `saldos.spec.ts` | L11 y L21 llaman a `calcularSaldos`; L80 y L91 llaman a `verificarInvariante`. |
| `operaciones.spec.ts` | L22, L33 y L52 (los ejemplos E5, E6 y E7, hoy en español): título en inglés que conserve el ID del ejemplo y nombre la función, por ejemplo `E5: retiroGanancia rejects ... with SALDO_INSUFICIENTE`. Revisa en el cuerpo qué función llama cada una y usa ese nombre exacto. |
| `libro.repository.spec.ts` | L161 y L203 llaman a `registrarTraspaso`; L60 llama a `registrar`, `registrarTraspaso` y `saldos`: nómbralas. |
| `capacitor-sql-database.adapter.spec.ts` | L37, L67 y L106 llaman a `transaction`, y L166 llama a `run`: inclúyelos en el título. |

### P3.3 — Regresiones de V2

El archivo `C:/Users/MIGUEL ANGEL/.claude/jobs/d8480fad/tmp/verificacion-v2.spec.ts` (fuera del repositorio, solo lectura) tiene las pruebas de V2. Copia **estas cinco** al spec que corresponde, adaptando las rutas de los imports y quitando el prefijo "V2" de los títulos:

| Prueba de V2 | Destino |
|--------------|---------|
| `run and transaction recover from a pending save when guardar() succeeds on transaction, and a third failing run reports escrituraAplicada === true` | `capacitor-sql-database.adapter.spec.ts` |
| `run, exec and transaction in native mode (esWeb = false) never call guardar() and never throw GuardadoWebError` | `capacitor-sql-database.adapter.spec.ts` |
| `distribuirCascada and liquidarTodo reject with FACTURA_INVALIDA when an invoice has pagado > total` | `abonos.spec.ts` |
| `abonarFactura, repartirPago, saldo and deudaTotal reject with FACTURA_INVALIDA when pagado > total` | `abonos.spec.ts` |
| `saldo, repartirPago, abonarFactura and distribuirCascada accept a below-cost sale (costoBase > total) and allocate the entire payment to capital` | `abonos.spec.ts` |

Reutiliza el doble de `SQLiteDBConnection` que ya existe en `capacitor-sql-database.adapter.spec.ts` si te sirve. **No** copies las pruebas de regresión E1 a E4 de V2, porque ya existen. Las pruebas copiadas también cumplen la regla 6.

## Verificación

```
npm run lint
npm run test:unit
npm run build
```

Copia el resultado de cada uno. El número de pruebas debe ser **156** (las 151 de hoy más las 5 copiadas), salvo que expliques la diferencia. Además, copia la salida de `grep -rn "catch" src/app/cartera src/app/finanzas --include=*.spec.ts`, que debe venir vacía.
