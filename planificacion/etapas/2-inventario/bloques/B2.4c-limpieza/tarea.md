# Tarea B2.4c — Limpieza final de la Etapa 2

**Etapa 2, bloque de pendientes B2.4.** Se ejecuta después de B2.4a y B2.4b. Lee `CLAUDE.md` en la raíz del repositorio antes de empezar.

## Rutas permitidas

```
src/app/shared/ui/mensajes-error.ts
src/app/shared/ui/mensajes-error.spec.ts
src/app/shell/tabs.page.spec.ts
src/app/shell/proximamente.page.spec.ts
src/app/app.component.spec.ts
src/app/inventario.acceptance.spec.ts
e2e/app.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **S1. Rama inalcanzable (`mensajes-error.ts`).** `MENSAJES_ERROR` es `Record<CodigoRegla, string>`, así que `MENSAJES_ERROR[error.codigo] ?? MENSAJE_ERROR_GENERICO` nunca usa el respaldo. Quita el `??`. `MENSAJE_ERROR_GENERICO` deja de exportarse (solo se usa en ese archivo); si `mensajes-error.spec.ts` lo importa, cambia la prueba para que compare con el texto literal `'Ocurrió un error inesperado'`. El comportamiento observable no cambia.
- **S2. Títulos de pruebas en inglés.** Traduce al inglés los títulos de `describe`/`it`/`test` y los comentarios que estén en español en `tabs.page.spec.ts`, `proximamente.page.spec.ts`, `app.component.spec.ts` y `e2e/app.spec.ts`. No cambies lo que verifican. Los textos que se buscan en pantalla (por ejemplo `'Reintentar'`) siguen en español.
- **S3. Título engañoso (`inventario.acceptance.spec.ts`).** El `describe` dice que usa solo la API pública, pero siembra datos con SQL y llama a repositorios. Cambia el título para que describa lo que hace (por ejemplo, `'Acceptance examples E1-E7 through use cases, with repository-level seeding'`). No cambies las pruebas.

## Verificación

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Copia el resultado de cada comando con el número de pruebas, e indica qué cambiaste para cada `S#`.
