
---

# Tarea B0.1 — Configuración del proyecto

**Etapa 0 (Fundaciones), ola 1.** Otro agente trabaja en paralelo en `src/app/shared/**`: no toques nada de ahí.

## Objetivo

Darle a la app su identidad Android definitiva, quitar la lista de navegadores heredada y agregar un CI en GitHub Actions.

## Specs que cubres

| ID | Requisito (cita textual) |
|----|--------------------------|
| S1 | "El sistema se ejecutará como una aplicación móvil empaquetada para el sistema operativo **Android** mediante **Ionic + Angular + Capacitor**." |
| S11 | "Agregaría GitHub Actions con `lint`, `test` y `build` como parte de la Etapa 0 del plan" |
| S12 | "`io.ionic.starter` hay que cambiarlo **antes** del primer build de Android." |

## Rutas permitidas

```
capacitor.config.ts
.browserslistrc
.github/workflows/ci.yml
```

Prohibido todo lo demás, incluidos `package.json` y `src/**`.

## Qué hacer

1. **`capacitor.config.ts`:**
   - `appId: 'com.miguelmedina.gestorresmas'`
   - `appName: 'Gestor de Resmas'`
   - deja `webDir: 'www'`.

   Hoy Prettier marca este archivo como mal formateado; déjalo pasando `npx prettier --check capacitor.config.ts`, formateando **solo ese archivo**.
2. **Borra `.browserslistrc`.** El build de Angular 22 lo advierte con "Unsupported browsers". Sin el archivo se usan los navegadores por defecto de Angular.
3. **Crea `.github/workflows/ci.yml`:**
   - Nombre del workflow: `CI`. Un único job llamado `verify`.
   - Disparadores: `pull_request` (cualquier rama) y `push` a `main`.
   - `runs-on: ubuntu-latest`, `actions/checkout@v4`, `actions/setup-node@v4` con `node-version: 24` y `cache: npm`.
   - Pasos, en este orden: `npm ci`, `npm run lint`, `npm run test:unit`, `npm run build`.
   - Agrega `concurrency` por rama (`group: ci-${{ github.ref }}`, `cancel-in-progress: true`) y `permissions: contents: read`.
   - Sin e2e: queda para la Etapa 2.

## Verificación

1. `npm run build`: su salida **no** contiene "Unsupported browsers".
2. `npm run lint`, `npm run test:unit` y `npm run build` pasan.
3. Valida que el YAML esté bien formado, por ejemplo con `node -e "require('fs').readFileSync('.github/workflows/ci.yml','utf8')"` más una revisión visual de la indentación.

## Fallos conocidos

`npm run lint` puede fallar mientras el otro agente de la ola trabaja en `src/app/shared/**`. Si el único error de Prettier o ESLint está dentro de `src/app/shared/**`, repórtalo como ajeno a tu bloque y no lo arregles.
