# Tarea B3.1-C — Correcciones de la ola 1 (clientes)

**Etapa 3, correcciones de la ola 1.** Antes de empezar, lee `CLAUDE.md` (raíz del repositorio) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, la decisión **D10** y el ejemplo **E5**. Nadie más escribe en el árbol mientras trabajas.

## Rutas permitidas

```
src/app/clientes/**
e2e/clientes.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **C1. Orden alfabético con tildes (D10).** Hoy `ClienteRepository.todos` ordena con `ORDER BY nombre COLLATE NOCASE`, y `NOCASE` de SQLite solo ignora mayúsculas en ASCII: "Ángela Ruiz" queda después de "Zoe Díaz". Ordena la lista en orden alfabético del español, sin distinguir mayúsculas ni tildes, con `localeCompare(otro, 'es', { sensitivity: 'base' })` y desempate por `idCliente`. Hazlo en un solo lugar (el repositorio o el caso de uso, donde quede más claro) y que `BuscarClientes.buscar` devuelva ese mismo orden, con el Mostrador primero cuando `incluirMostrador` es `true`.
- **C2. Selector del e2e (`e2e/clientes.spec.ts`).** La prueba falla con `strict mode violation: locator('[data-testid="mensaje-vacio"]') resolved to 2 elements`: Ionic mantiene montada la página de Inventario visitada antes. Acota cada selector de la prueba a la página de Clientes (por ejemplo, a su elemento `app-clientes` o a un `data-testid` del contenedor de la página que agregues en `clientes.page.ts`). No cambies los `data-testid` que ya usan otras pruebas.

## Pruebas (primero RED)

- C1: con "Zoe Díaz", "ángela Ruiz", "Ana María Pérez" y "Beatriz Gómez", `todos` y `buscar('')` devuelven Ana María Pérez, ángela Ruiz, Beatriz Gómez, Zoe Díaz; con `incluirMostrador`, Mostrador primero y luego ese orden. Primero mírala fallar con el orden actual.
- C2: `e2e/clientes.spec.ts` pasa.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npx playwright test e2e/clientes.spec.ts
```
