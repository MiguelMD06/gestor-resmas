
---

# Retoma de B0.2 (intento 2)

El intento 1 se cortó porque el sistema se quedó sin memoria: no fue un error del código. **No empieces de cero.** Ya existen estos archivos, escritos por el intento 1 y todavía sin verificar:

```
package.json, package-lock.json, angular.json, src/main.ts, e2e/app.spec.ts (modificados)
src/app/shared/infrastructure/sqlite/** (puerto, token, cola serial, adaptador Capacitor, factory, DatabaseProvider, migraciones, runner y sus pruebas)
src/testing/sqljs-sql-database.adapter.ts y su prueba
```

## Qué hacer

1. **Revisa** cada archivo contra la tarea de abajo (reglas R1 a R7, la tabla de pruebas y las rutas permitidas). Completa lo que falte y corrige lo que no cumpla. Mantén lo que ya esté bien.
2. **Verifica que las dependencias estén instaladas** (`npm ls @capacitor-community/sqlite jeep-sqlite sql.js @types/sql.js`). Si alguna falta, instálala como dice la tarea.
3. **Ahorra memoria; esto es obligatorio:**
   - corre **un comando por vez, en primer plano**; nunca dos a la vez ni en segundo plano;
   - orden: `npm run test:unit`, después `npm run lint`, después `npm run build` y al final `npm run test:e2e`;
   - después del e2e, confirma que no quedó ningún `ng serve` ni navegador abierto;
   - si una prueba falla, corrige y vuelve a correr **solo ese archivo** (`npx ng test --no-watch --include <ruta>`) antes de volver a correr todo.
4. Entrega el reporte final completo que pide `base.md`.
