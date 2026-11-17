# Corrección de B3B.0 — prueba E1

El coordinador corrió `npx playwright test`: 15 pasan y falla **una**, tu caso E1 en `e2e/app.spec.ts`:

```
E1: mantiene fondo negro, fuente Inter y pestaña activa lima incluso con el sistema en modo claro
Expected: "rgb(0, 0, 0)"
Received: "rgba(0, 0, 0, 0)"
  at e2e/app.spec.ts:92  expect(estilos.backgroundColor).toBe('rgb(0, 0, 0)');
```

Causa probable: el host de `ion-content` es transparente; Ionic pinta el fondo dentro de su shadow DOM con la variable `--background`. La prueba mide el elemento equivocado, no prueba lo que la pantalla muestra.

## Qué hacer

1. Corrige solo E1 en `e2e/app.spec.ts` para que verifique el color que **se ve**. Opciones válidas, elige la más robusta y explícala: leer `backgroundColor` del elemento de fondo dentro del shadow root de `ion-content` (`ionContent.shadowRoot.querySelector('#background-content')`), y además el de `body`; o leer el píxel de una captura de una zona vacía de la pantalla. No relajes la aserción (sigue siendo `rgb(0, 0, 0)`) y mantén las de fuente y pestaña.
2. Si al medir bien el fondo **no** es negro, el defecto está en el tema: corrígelo dentro de tus rutas permitidas (`src/global.scss`, `src/theme/variables.scss`, `src/app/shared/ui/estilos/**`). Revisa también el orden de `global.scss`: hoy `@use './app/shared/ui/estilos/index'` va **antes** de los `@import` del CSS de Ionic, así que una regla de Ionic con la misma especificidad puede pisar tus estilos compartidos. Si es así, ordénalo para que tus estilos vayan después, sin romper la regla de Sass que exige `@use` al principio (por ejemplo, con `@import` o moviendo los estilos a un archivo que se cargue después).
3. Esta vez **sí** puedes correr el e2e, solo ese archivo: `npx playwright test e2e/app.spec.ts`.

## Rutas permitidas

Las mismas de tu tarea B3B.0. No uses git.

## Verificación

Corre en primer plano y copia el resultado:

```
npx playwright test e2e/app.spec.ts
npm run lint
npm run test:unit
npm run build
```

Reporta qué cambiaste, la causa real y el resultado de cada comando. Cierra con `## Key Learnings` si hubo alguno.
