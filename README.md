# Gestor de Resmas

Aplicación Android, 100 % offline, para administrar un negocio de venta de resmas de papel Carta y Oficio: compra de cajas por lotes, ventas con precio por lote, cartera de clientes con abonos y control financiero que separa el capital recuperado de la ganancia disponible.

> **Estado:** Etapa 0 (fundaciones). Ya están la base de datos local, las migraciones y los tipos de dominio. Las pantallas y la lógica de negocio llegan en las etapas siguientes ([hoja de ruta](planificacion/README.md)).

## Inicio rápido

```bash
npm install
npm start          # servidor de desarrollo en el navegador
npm test           # pruebas unitarias (Vitest) y e2e (Playwright)
npm run lint       # ESLint, chequeo de tipos e2e y Prettier
```

## Stack

| Área | Tecnología |
|------|------------|
| UI | Ionic 9 + Angular 22 (componentes standalone) |
| Empaquetado Android | Capacitor 8 |
| Base de datos local | SQLite mediante `@capacitor-community/sqlite`; en el navegador usa jeep-sqlite |
| Esquema | Migraciones versionadas con `PRAGMA user_version` en `src/app/shared/infrastructure/sqlite/migrations/` |
| Lenguaje | TypeScript en modo estricto; montos en pesos colombianos como enteros |
| Pruebas | Vitest (unitarias, con SQL real en memoria mediante sql.js) y Playwright (e2e) |
| CI | GitHub Actions: lint, pruebas unitarias y build en cada PR |
| Calidad | ESLint (angular-eslint) y Prettier |

## Documentación del proyecto

Toda la planificación vive en [`planificacion/`](planificacion/):

| Documento | Contenido |
|-----------|-----------|
| [`README.md`](planificacion/README.md) | Índice: hoja de ruta por etapas, requisitos que cubre cada una y forma de trabajo. **Empieza por aquí.** |
| [`comun/modelo-contable.md`](planificacion/comun/modelo-contable.md) | Reglas contables y esquema v1 corregidos. Tienen prioridad sobre el documento maestro. |
| [`especificaci_n_y_dise_o_del_sistema.md`](planificacion/especificaci_n_y_dise_o_del_sistema.md) | Documento maestro: reglas de negocio, requisitos, modelo de datos y arquitectura. |
| [`planteamiento_requerimientos.md`](planificacion/planteamiento_requerimientos.md) | Planteamiento inicial de requisitos funcionales y no funcionales. |

El trabajo se organiza por etapas numeradas dentro de `planificacion/etapas/`, cada una con su plan aprobado antes de implementar.

## Trabajo en equipo

El historial de decisiones se comparte con [Engram](https://github.com/Gentleman-Programming/engram), cuyas memorias se versionan en `.engram/`:

1. Después de hacer `git pull`, importar las memorias nuevas: `engram sync --import`.
2. Antes de hacer `git push`, exportar las propias: `engram sync --project gestor-resmas`.
3. Verificar el estado con `engram sync --status`.

## Licencia

[MIT](LICENSE)
