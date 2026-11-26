[MODO EJECUTOR]

# Contexto base para bloques delegados

Eres el desarrollador de un bloque del proyecto **Gestor de Resmas**. Tu tarea está al final de este archivo: la parte del plan que va copiada en tu tarea es la fuente de verdad. Si algo de este contexto la contradice, manda la tarea, y lo informas en tu reporte.

## Proyecto

Aplicación Android, 100 % offline, para administrar un negocio de venta de resmas de papel Carta y Oficio: compra de cajas por lotes, ventas con precio por lote, cartera de clientes con abonos y control financiero que separa el capital de la ganancia.

- Requisitos: `planificacion/especificaci_n_y_dise_o_del_sistema.md`, con las correcciones de `planificacion/comun/modelo-contable.md`, que tiene prioridad.
- Montos en pesos colombianos (COP) y cantidades: **siempre enteros**. Nunca uses decimales para dinero.

## Stack (versiones instaladas)

| Área | Versión |
|------|---------|
| Angular | 22, con componentes standalone y signals |
| Ionic | 9 (`@ionic/angular`) |
| Capacitor | 8 |
| TypeScript | 6, con `strict: true` |
| Pruebas unitarias | Vitest 5 mediante `ng test` (builder de Angular, entorno jsdom) |
| Pruebas e2e | Playwright |
| Base de datos | `@capacitor-community/sqlite` 8.x en la app y `sql.js` 1.11.0 en las pruebas |

## Arquitectura

Organización por funcionalidad (screaming) con capas hexagonales:

```
src/app/
├── shared/
│   ├── domain/           tipos de dominio compartidos (pesos, resmas, medios de pago, fecha)
│   └── infrastructure/   puerto SqlDatabase, adaptadores y migraciones
├── <funcionalidad>/      inventario, clientes, ventas, cartera, finanzas
│   ├── domain/           reglas puras: sin Angular, sin SQLite, sin fechas del sistema
│   ├── application/      casos de uso: orquestan el dominio y los puertos dentro de una transacción
│   ├── infrastructure/   repositorios SQLite que implementan los puertos
│   └── ui/               páginas y componentes de Ionic
└── testing/              utilidades solo para pruebas (adaptador sql.js)
```

- `domain/` no importa nada de Angular, Ionic, Capacitor ni SQLite.
- Las dependencias apuntan hacia adentro: `ui` → `application` → `domain`; `infrastructure` implementa los puertos de `domain` o `application`.
- **Nombres:** los conceptos de dominio van en español, igual que el esquema (`Lote`, `Venta`, `registrarAbono`). Los sufijos técnicos van en inglés (`*.port.ts`, `*.adapter.ts`, `*.repository.ts`, `*.spec.ts`). Los comentarios, los textos de las pruebas y los mensajes internos de los errores, en inglés. Las pantallas muestran los errores de negocio en español, traduciéndolos por su `codigo`.
- Para el estado compartido, reutiliza la función que ya existe. Nunca reimplementes con otra forma un paso que ya tiene función (por ejemplo, registrar un movimiento de dinero).

## Reglas de calidad y de interfaz

- **Reglas 1 a 12 de `CLAUDE.md`** (raíz del repositorio): son obligatorias en todo bloque. Léelas antes de empezar: validación de cada campo, guarda contra el doble envío, vista bloqueada mientras procesa, cuatro estados de carga, reintentos seguros, pruebas obligatorias, dinero en enteros, confirmación de acciones irreversibles, sin código muerto, accesibilidad mínima, fechas desde `CLOCK` y checklist del PR.
- **Diseño:** las pantallas siguen `planificacion/comun/diseno.md` y los mockups aprobados.
- **Montos que se escriben:** usa siempre el campo de pesos de `src/app/shared/ui/` (muestra "$ 3.800" y entrega el entero `3800`, o `null` si está vacío). No crees otro campo de dinero.
- **La app es *zoneless*:** el estado que cambia después de un `await` vive en signals; si no, la pantalla no se actualiza.

## Reglas de trabajo

1. **Solo tocas las rutas permitidas** de tu tarea. Si necesitas otra, no la toques: detente y explícalo en el reporte.
2. **No uses git:** nada de `commit`, `add`, `stash`, `checkout` ni `push`. El coordinador revisa y hace los commits.
3. **Pruebas primero** cuando haya una regla con resultado esperado claro: escribe la prueba, mírala fallar (RED), implementa (GREEN) y refactoriza con las pruebas en verde. Escribe una prueba por cada regla que pide la tarea, y cada prueba verifica todos los efectos observables de la regla.
4. **Archivos temporales** fuera del repositorio. Si alguno queda dentro, informa su ruta exacta.
5. **No instales dependencias** salvo que la tarea lo pida, y nunca corras formateadores, generadores ni instalaciones sobre todo el repositorio.
6. **Pruebas que prueban lo que dicen:**
   - prueba intentando romper el código: además del caso feliz, cubre valores límite, el segundo y el último elemento (no solo el primero), repetir la acción (doble envío) y fallos de carga o escritura;
   - cada prueba llama a la función que nombra su título;
   - un rechazo esperado se acota al error exacto: `toThrow(expect.objectContaining({ codigo: '...' }))` o un mensaje concreto, nunca `toThrow()` o `rejects.toThrow()` a secas;
   - nada de `try/catch` para verificar un error: si no se lanza, la prueba tiene que fallar;
   - los casos límite usan el valor límite exacto.
7. **Engram:** tienes acceso de solo lectura. Úsalo si te sirve para tener contexto; nunca intentes escribir en él.
8. **Cierra todo servidor** que levantes para una prueba apenas termine.

## Trampas conocidas del stack

- **`@capacitor-community/sqlite`:** dentro de una transacción manual (`beginTransaction` / `commitTransaction` / `rollbackTransaction`), llama a `run`, `execute` y `executeSet` con `transaction = false`. Si no, el plugin abre su propia transacción.
- **En web (jeep-sqlite)**, después de cada commit hay que llamar a `saveToStore(nombreBD)`, o los datos se pierden al recargar.
- **En web y en las pruebas se usa la misma `sql.js@1.11.0`:** jeep-sqlite 2.8 trae empaquetado el JS de sql.js 1.11 y necesita el `.wasm` de **esa** versión (`angular.json` copia `sql-wasm.wasm` desde `node_modules/sql.js/dist`). No subas `sql.js` sin comprobar la compatibilidad con jeep-sqlite.
- **`sql.js` funciona dentro de `ng test`** con `await initSqlJs()` sin configuración extra (verificado con la versión 1.11.0).
- **SQLite no valida tipos por sí solo:** los CHECK del esquema usan `typeof(col) = 'integer'`. No los quites.
- **`PRAGMA foreign_keys = ON`** se activa en cada conexión, no queda guardado en la base.
- **Windows y PowerShell 5.1:** guarda los archivos en UTF-8 sin BOM.

## Verificación antes de terminar

Corre en primer plano y copia el resultado de cada uno en tu reporte:

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Si tu bloque corre en paralelo con otro, la tarea dice cuáles de estos comandos corre el coordinador (por ejemplo, `build` porque los dos escribirían en `www/`, o `test:e2e` porque ambos usarían el puerto 4200).

## Reporte final

1. Qué hiciste, archivo por archivo.
2. Qué `S#` de la tarea cubriste y con qué prueba.
3. Resultado de cada comando de verificación (`<comando>: <resultado observado>`).
4. Lo que quedó pendiente o no pudiste verificar.
5. Rutas de archivos temporales, si las hubo.

Cierra con una sección `## Key Learnings` de 1 a 5 puntos numerados, cada uno con un aprendizaje reutilizable en una oración completa. Omítela si no hubo ninguno.

# Retoma del B4.6 (intento 5)

- **Intento 1:** fallo de red de agy; el verificador no arrancó.
- **Intento 2:** la tarea no incluía Inventario, Clientes y Finanzas (error del coordinador, corregido).
- **Intento 3:** el C7 viejo pedía algo que el `!important` impide a propósito (error del coordinador, corregido). El verificador también encontró que el selector con `.ion-page` daba 40 px un instante al montar la vista y un fallo intermitente al marcar **Fiado** en la prueba.
- **Intento 4:** detenido a pedido de Juan mientras el implementador comprobaba el C7 nuevo (había quitado temporalmente `@forward 'encabezado';`; el coordinador lo restauró).

**Estado del árbol (sin commit). Todo lo de la tarea ya está hecho:**

- `src/app/shared/ui/estilos/_encabezado.scss`: selector `ion-router-outlet > * > ion-header > ion-toolbar:first-of-type`, `!important` y 16 px por defecto.
- `src/app/shared/ui/estilos/_index.scss`: con `@forward 'encabezado';`.
- `inventario.page.ts`, `clientes.page.ts`, `proximamente.page.ts` y `vender.page.ts`: sin `padding-top: 16px`.
- `expediente.page.ts`: `padding-left: 4px; padding-right: 4px; padding-bottom: 0;` y `--app-encabezado-extra: 4px;` (equivalente a lo que pide la tarea).
- `e2e/area-segura.spec.ts`: el selector nuevo, la espera de **Fiado** y el caso del C7 nuevo ("view-level padding overrides cannot strip safe area inset from header toolbars").

**Qué te toca:** revisar esos archivos contra la tarea y los criterios, corregir solo si algo no cumple, y correr los comandos de verificación. Haz también la comprobación del C7: quita temporalmente `@forward 'encabezado';` de `_index.scss`, corre `npx playwright test e2e/area-segura.spec.ts --workers=1`, confirma que falla y **devuelve la línea antes de seguir**. Al terminar, `_index.scss` debe tener `@forward 'encabezado';`.

# Tarea B4.6 — Área segura superior en todas las vistas (issue #29)

## Objetivo

En Android, el encabezado de las vistas queda casi debajo de la barra de notificaciones (y el del expediente, debajo). Este bloque lo corrige **en un solo lugar** para que ninguna vista nueva pueda volver a taparla, y agrega una prueba e2e que simula la barra de estado y falla si alguna vista la tapa.

## Causa (comprobada)

Ionic deja el espacio de la barra de estado con `ion-header ion-toolbar:first-of-type { padding-top: var(--ion-safe-area-top, 0); }` (especificidad 0-1-2). Ionic 9 calcula `--ion-safe-area-top` como `var(--safe-area-inset-top, env(safe-area-inset-top))`, y Capacitor 8 inyecta `--safe-area-inset-top` en el `html`. Los estilos de componente de Angular tienen más especificidad y la reemplazan con un valor fijo:

- `src/app/inventario/ui/inventario.page.ts:216`, `src/app/clientes/ui/clientes.page.ts:212` y `src/app/shell/proximamente.page.ts:26` (Finanzas): `ion-toolbar { padding-top: 16px; }`
- `src/app/ventas/ui/vender.page.ts:505`: `.vender-toolbar { padding-top: 16px; }`
- `src/app/clientes/ui/expediente.page.ts:372`: `.exp-toolbar { padding: 4px 4px 0; }`

En el navegador el área segura vale 0, así que hoy ninguna prueba lo ve.

## Rutas

**Permitidas** (solo estas):

- `src/app/shared/ui/estilos/_encabezado.scss` (nuevo) y `src/app/shared/ui/estilos/_index.scss` (solo la línea `@forward 'encabezado';`)
- La regla del `ion-toolbar` del encabezado (y nada más) en: `src/app/inventario/ui/inventario.page.ts`, `src/app/clientes/ui/clientes.page.ts`, `src/app/shell/proximamente.page.ts`, `src/app/ventas/ui/vender.page.ts` y `src/app/clientes/ui/expediente.page.ts`
- `e2e/area-segura.spec.ts` (nuevo)

**Prohibidas:** todo lo demás, en especial los modales (`*.modal.ts`), `src/global.scss`, `src/theme/**`, `capacitor.config.ts`, `android/**`, `angular.json` y `e2e/verificacion/b4-6/**` (carpeta del verificador).

## Qué hacer

1. **Regla global** en `src/app/shared/ui/estilos/_encabezado.scss`, con un comentario corto que diga por qué existe (issue #29) y que las vistas no fijan `padding-top` en su toolbar:

   ```scss
   ion-router-outlet > * > ion-header > ion-toolbar:first-of-type {
     padding-top: calc(var(--ion-safe-area-top, 0px) + var(--app-encabezado-extra, 16px)) !important;
   }
   ```

   El espacio del diseño por defecto es **16 px**, así que una vista nueva queda bien sin declarar nada. El selector solo toma el primer toolbar del encabezado de las vistas que carga el router (hijas directas de `ion-router-outlet`); no toma los toolbars de ningún `ion-modal`, y no depende de la clase `ion-page` (Ionic la agrega un instante después de montar la vista). **El `!important` es obligatorio**: es lo que impide que una vista vuelva a quitar el área segura con su propio `padding`. Si al probar ves que el selector no coincide con la estructura real del DOM, ajústalo manteniendo esas dos condiciones y explícalo en tu reporte.
2. Agregar `@forward 'encabezado';` en `_index.scss`.
3. **Inventario, Clientes, Finanzas (`proximamente.page.ts`) y Vender:** quitar `padding-top: 16px;` de la regla del toolbar (el valor por defecto ya da 16 px). Si la regla queda vacía, quitarla. No cambiar ninguna otra propiedad.
4. **Expediente:** en `.exp-toolbar`, reemplazar `padding: 4px 4px 0;` por `padding: 0 4px;` y `--app-encabezado-extra: 4px;`.
5. **Prueba e2e** `e2e/area-segura.spec.ts`: simula la barra de estado como lo hace Capacitor 8, con `--safe-area-inset-top: 40px` en el `html` (por ejemplo, con `page.addStyleTag` después de cargar la vista), y recorre `/inventario`, `/vender`, `/clientes`, `/finanzas` y el expediente de un cliente creado en la prueba. En cada vista revisa el `padding-top` calculado del primer `ion-toolbar` del encabezado y que el borde superior del título o del botón **Volver** quede en 40 px o más. Agrega un caso **sin** la barra simulada que confirme que el espacio del diseño no cambió, y uno que abra el modal de nuevo cliente y el modal de abono y confirme que sus toolbars no coinciden con el selector de la regla.

Sin la barra simulada, la app debe verse exactamente igual que antes.

## Comandos de verificación

`npm run lint`, `npm run test:unit`, `npm run build` (sin advertencias de presupuesto) y `npx playwright test e2e/area-segura.spec.ts --workers=1`.

# Criterios de aceptación — B4.6

"Barra simulada" significa `--safe-area-inset-top: 40px` en el `html`, como lo inyecta Capacitor 8, con la vista ya cargada en el viewport del proyecto e2e (Pixel 7).

- C1: Con la barra simulada, el `padding-top` calculado del primer `ion-toolbar` del `ion-header` es exactamente 56 px en `/inventario`, `/clientes`, `/finanzas` y `/vender`, y 44 px en el expediente (`/clientes/<id>` de un cliente creado en la prueba).
- C2: Con la barra simulada, en cada una de esas cinco vistas el borde superior del título (`ion-title`) o, en el expediente, del botón **Volver** (`data-testid="btn-volver"`) está en 40 px o más.
- C3: Sin la barra simulada, el `padding-top` calculado de ese toolbar es 16 px en `/inventario`, `/clientes`, `/finanzas` y `/vender`, y 4 px en el expediente: es el mismo valor que tenían antes del cambio, así que el diseño no cambia.
- C4: La regla global no toma ningún toolbar de un modal: con la barra simulada, al abrir el modal de nuevo cliente (Clientes) y el modal de abono (expediente), ningún `ion-toolbar` dentro de un `ion-modal` coincide con el selector de la regla (`element.matches(selector)` es falso). El selector no depende de la clase `ion-page`, para que el valor sea correcto desde que la vista entra al DOM.
- C5: El expediente sigue mostrando **Volver** a la izquierda y **Editar** a la derecha, con 4 px de relleno a los lados y 0 abajo (`padding-left`, `padding-right` y `padding-bottom` calculados).
- C6: Ningún archivo de `src/app` fija `padding-top` ni el lado superior de `padding` en el `ion-toolbar` del encabezado de una vista (`inventario.page.ts`, `clientes.page.ts`, `proximamente.page.ts`, `vender.page.ts`, `expediente.page.ts`); los modales quedan fuera de este criterio. El único espacio por vista que queda declarado es `--app-encabezado-extra: 4px` en el expediente.
- C7: La regla global lleva `!important`, a propósito: una vista no puede volver a quitar el área segura aunque fije `padding-top` en su toolbar. `e2e/area-segura.spec.ts` lo demuestra: con la barra simulada, inyecta en la página (`page.addStyleTag`) `.vender-toolbar { padding-top: 16px; } ion-toolbar { padding: 4px; }` y comprueba que el `padding-top` de Vender y el de Inventario siguen en 56 px. Además, la prueba cubre C1, C3 y C4 con valores exactos (`toBe`, no rangos) y falla si se quita la regla global.
  Cómo comprobarlo: quitar temporalmente `@forward 'encabezado';` de `_index.scss`, correr la prueba, ver que falla con la barra simulada y devolver el archivo a como estaba.
- C8: Las pruebas e2e existentes siguen pasando sin cambios (`npx playwright test --workers=1`).
- C9: El bloque solo modifica las rutas permitidas; `npm run lint`, `npm run test:unit` y `npm run build` terminan con código 0 y el build no muestra advertencias (en particular, ninguna de presupuesto de estilos).
