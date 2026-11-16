# Chequeo C3.1 — Verificación de la ola 1 de la Etapa 3

Eres el verificador de la ola 1 del proyecto **Gestor de Resmas**. Tres bloques (B3.1 clientes, B3.2 venta y B3.4 campo de pesos) escribieron en paralelo en este mismo árbol de trabajo. Tu única tarea es comprobar que el resultado combinado funciona.

## Reglas

- **Solo lectura.** No modifiques, crees ni borres ningún archivo del repositorio. No uses git para escribir (`commit`, `add`, `stash`, `checkout`, `push`, `reset`). No instales dependencias.
- Si algo falla, **no lo arregles**: copia el error exacto y di qué archivo y qué prueba fallan.
- Archivos temporales, si los necesitas, fuera del repositorio; informa sus rutas.

## Qué correr

En la raíz del repositorio, en primer plano y en este orden, sin detenerte si uno falla:

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

## Reporte

1. Por cada comando: `<comando>: <resultado observado>`, con el número de archivos y pruebas que pasan y fallan.
2. Por cada fallo: el archivo, el título de la prueba y el mensaje de error exacto (las primeras líneas relevantes).
3. Si `test:e2e` falla, di si el fallo es de `e2e/clientes.spec.ts`, de `e2e/inventario.spec.ts`, de `e2e/inventario.acceptance.spec.ts` o de `e2e/app.spec.ts`.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.
