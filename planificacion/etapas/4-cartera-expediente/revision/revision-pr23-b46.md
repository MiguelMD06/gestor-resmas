[MODO EJECUTOR]

# Re-revisión del PR #23: solo el bloque B4.6 (issue #29)

Eres el mismo revisor de solo lectura del PR #23. Ya lo aprobaste sobre `3d137f1` (`revision/resultado-pr23.md`). Después se agregó un cambio y revisas **solo ese cambio**. **No edites archivos, no comentes en GitHub, no hagas commits, push ni merge.**

## Qué revisar

- **Commits nuevos:** `ae15f01` (código) y `e86c6c4` (documentación) en `feat/etapa-4-cartera`. Haz `git fetch` y míralos con `git show ae15f01` y `git diff 66dfe97..origin/feat/etapa-4-cartera -- src e2e`.
- **Qué pide:** la issue #29 (`gh issue view 29`) y la tarea y los criterios del bloque en `planificacion/etapas/4-cartera-expediente/bloques/B4.6-area-segura/` (`tarea.md`, `criterios.md` C1–C9).
- **Reglas:** `CLAUDE.md` de la raíz del repositorio.

## Puntos de revisión

1. **Que resuelva la issue #29:** el primer `ion-toolbar` del encabezado de cada vista del router (Inventario, Vender, Clientes, Finanzas y expediente) reserva el área segura más el espacio del diseño, y ninguna vista puede quitarla con su propio `padding`.
2. **Que no rompa nada:**
   - sin la barra simulada, el espacio de cada vista es el mismo que antes (16 px; 4 px en el expediente);
   - la regla global (`src/app/shared/ui/estilos/_encabezado.scss`, selector `ion-router-outlet > * > ion-header > ion-toolbar:first-of-type` con `!important`) no toma ningún toolbar de un `ion-modal`, ni el segundo toolbar de un encabezado.
3. **Calidad de las pruebas** de `e2e/area-segura.spec.ts` y `e2e/verificacion/b4-6/`: valores exactos (`toBe`), pruebas que fallarían si se quita la regla global, sin esperas frágiles (`waitForTimeout`) donde se pueda esperar un estado.
4. **Commits:** convencionales, sin `Co-Authored-By`, enlaces de sesión ni menciones a IA; la descripción del PR (`gh pr view 23`) tampoco.
5. **CI:** el check `verify` (`gh pr checks 23`) del último commit. En local ya pasaron lint, 570 pruebas unitarias, build sin advertencias y 26 e2e con `--workers=1`.

## Qué devolver

```
VEREDICTO: APROBADO | CAMBIOS NECESARIOS

BLOQUEANTES
- archivo:línea — qué pasa y cómo reproducirlo

DETALLES (no bloqueantes)
- archivo:línea — qué pasa y cómo arreglarlo

REVISADO SIN HALLAZGOS
- lista corta de los puntos 1 a 5
```

Cada hallazgo lleva `archivo:línea` y lo comprobaste en el código; no reportes suposiciones. No repitas observaciones que ya tienen issue (#24 a #28 y #30).
