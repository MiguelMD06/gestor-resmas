# Flujo de trabajo: issues, ramas y pull requests

Cómo se registra y se resuelve el trabajo en GitHub (`MiguelMD06/gestor-resmas`).
Vigente desde la Etapa 3B (2026-11-18).

## Las tres piezas

| Pieza | Qué es | Cuándo nace | Cuándo termina |
|---|---|---|---|
| **Issue** | El registro de **un** problema o trabajo pendiente | Apenas se descubre | Al integrarse el PR que lo resuelve |
| **Rama y commits** | El trabajo que lo resuelve | Al empezar a resolverlo | Con el PR integrado |
| **Pull request (PR)** | La propuesta de integrar ese trabajo en `main`, con su revisión | Cuando el trabajo está listo | Se integra o se rechaza |

Una issue **no** se crea al abrir el PR: se crea en el momento en que aparece el
problema. El PR es el que la cierra.

## Flujo por etapa

1. **Planificación.** Cada etapa tiene un *milestone* en GitHub (por ejemplo,
   "Etapa 4"). Los bloques grandes pueden tener su issue con la etiqueta
   `enhancement`, asignada al *milestone*.
2. **Desarrollo.** Todo bug o problema que aparezca (prueba manual, revisión con
   `agy`, verificación, prueba inestable) se registra en el momento como issue
   con la etiqueta `bug`. Contenido, en español: descripción, comportamiento
   observado, cómo reproducirlo, comportamiento esperado y contexto (rama,
   commit y entrada del `## Log` del plan).
3. **Commits.** El commit que resuelve una issue la menciona:
   `fix: descripción corta (#19)`.
4. **Fin de la etapa.** Un PR por etapa hacia `main`, con el checklist de la
   regla 12 de `CLAUDE.md` y una línea `Closes #N` por cada issue que resuelve.
   Al integrarse, GitHub cierra esas issues.
5. **Revisión del PR.**
   - Un problema causado por el PR que bloquea se corrige **en el mismo PR**
     (nuevo commit en la rama). No necesita issue: nunca llegó a `main`, y
     queda registrado en los comentarios de la revisión.
   - Lo que se deja para después (fuera de alcance, ya existía antes o es una
     mejora) se registra como **issue nueva**, para que no se pierda al cerrar
     el PR.
6. **Inicio de la etapa siguiente.** Se revisan las issues abiertas y se decide
   cuáles entran en la etapa.

## Etiquetas

- `bug`: algo no funciona como debe.
- `enhancement`: funcionalidad nueva o mejora.
- `documentation`: solo documentación.

## Primeras issues

- #19: E2E E1 inestable (pestaña activa tras la redirección).
- #20: E2E E6 inestable (redondeo subpíxel en el selector de clientes).

Ambas se resuelven en el commit `985a405` y se cierran con el PR de la Etapa 3B.
