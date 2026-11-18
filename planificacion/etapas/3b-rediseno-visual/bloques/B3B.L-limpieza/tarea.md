# Tarea B3B.L — Limpieza de las observaciones de las revisiones

**Etapa 3B, después de la ola 3.** Eres el único bloque. Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), `planificacion/comun/diseno.md` y `planificacion/etapas/3b-rediseno-visual/PLAN.md` hasta la sección `## Log`.

Las revisiones de gentle-ai de Vender y Clientes **aprobaron** los cambios y dejaron observaciones que no bloquean. Esta tarea corrige las que valen la pena. No cambies conducta fuera de lo que cada punto pide, ni los `data-testid`. La app es *zoneless*.

## Rutas permitidas

```
src/app/ventas/ui/**
src/app/clientes/ui/**
src/app/shared/ui/hoja-fecha.component.ts
src/app/shared/ui/hoja-fecha.component.spec.ts
src/app/shared/ui/iniciales.ts            (nuevo, si el punto 2 lo necesita)
src/app/shared/ui/iniciales.spec.ts       (nuevo)
src/app/shared/ui/estilos/**
```

No uses git.

## Qué corregir

Cada punto cita la ubicación que dio el revisor; verifica primero que el problema siga ahí (la línea puede haber cambiado).

1. **Código muerto (regla 9):** `maxFechaIso` en `src/app/ventas/ui/vender.page.ts` (cerca de la línea 705) ya no se usa. Bórralo, y cualquier otro miembro que haya quedado sin uso tras extraer la hoja de fecha.
2. **Iniciales en un solo lugar:** el selector de Vender (`selector-cliente-contenido.component.ts`, cerca de 304) y Clientes (`clientes.page.ts`) calculan las iniciales de forma distinta, y el selector falla con un nombre de una sola palabra. Crea una función pura `iniciales(nombre)` en `src/app/shared/ui/iniciales.ts`: primera letra del primer nombre y del último apellido, en mayúsculas; un solo nombre da una letra; ignora espacios repetidos. Úsala en los dos lugares. Pruebas: "Ana María Pérez" → "AP", "Sofía" → "S", "  juan   gómez " → "JG".
3. **Colores de respaldo equivocados:** `src/app/shared/ui/estilos/_listas.scss` (cerca de 81-82) usa colores de respaldo en `var(--…, respaldo)` que no coinciden con la paleta. Corrígelos a los valores de `src/theme/variables.scss`, o quita el respaldo si la variable siempre existe. Revisa también la regla de fila de cliente que el revisor vio en conflicto (cerca de 90-100) y deja una sola.
4. **El selector de clientes oculta la lista mientras busca:** en `selector-cliente-contenido.component.ts` (cerca de 86-98), mientras `buscando` es verdadero se reemplaza la lista por el esqueleto. Con resultados ya cargados, debe mantener la lista visible y mostrar el indicador de carga sin vaciarla (regla 3: la vista se bloquea, no desaparece). El esqueleto queda solo para la primera carga.
5. **La hoja de fecha descarta en silencio una fecha inválida:** `hoja-fecha.component.ts` (cerca de 116-118). Si el `ion-datetime` entrega un valor que no se puede convertir o que es futuro, hoy no emite nada y no avisa. Muestra el texto de ayuda en rojo, o mantén el último valor válido en el `ion-datetime`, para que el usuario vea por qué no cambió (regla 4: nada falla en silencio). Prueba el caso.
6. **Prueba de "Queda debiendo" en Vender:** los `computed` nuevos de `vender.page.ts` (cerca de 789-797) no tienen prueba. Agrega pruebas de componente: con Fiado de una venta de $ 110.000 "Queda debiendo" muestra $ 110.000; con Abono inicial de $ 50.000, $ 60.000; con Contado no se muestra.
7. **Textos de estado cambiados en Vender:** `vender.page.ts` (cerca de 155-174). Compara los textos de los estados (vacío, error, sin lotes) con los que había antes de la etapa (`git` no: usa la lista de `data-testid` y textos de `e2e/vender.spec.ts` y `src/app/etapa-3.acceptance.spec.ts`, y el mockup `VenderEstados.dc.html`). Si un texto que ve el usuario cambió sin que el plan lo pida, vuelve al texto anterior. Informa cuáles cambiaste.
8. **Clientes:**
   - `cliente.modal.ts` (cerca de 116-117): la condición que muestra la ayuda no coincide con `puedeGuardar`; que usen la misma regla.
   - `cliente.modal.ts` (cerca de 59-76): el máximo de 80 caracteres del nombre está como número literal; usa la constante que ya exporta el dominio de clientes (`src/app/clientes/domain/cliente.ts`), o expórtala si no existe y no tocas otra cosa del dominio. Si exportarla requiere tocar `domain/`, no lo hagas y dilo en el reporte.
   - `cliente.modal.ts` (cerca de 84): el celular debe tener `inputmode="numeric"`.
   - `clientes.page.ts` (cerca de 51-54): el subtítulo cuenta los clientes filtrados por la búsqueda; debe contar el total de clientes, o decir "N resultados" mientras hay texto en el buscador. Elige lo más claro y explícalo.
9. **Aserciones del modal en `vender.page.spec.ts` (cerca de 275-297):** se pasaron a `expect.objectContaining`. Vuelve a verificar el objeto completo que recibe `ModalController.create`, incluidos los parámetros de la hoja (`breakpoints`, `initialBreakpoint`, `cssClass`), para que un cambio no previsto haga fallar la prueba.
10. **El buscador de Clientes se come lo que se escribe (CRITICAL, confirmado):** `clientes.page.ts` (cerca de 61-70) enlaza `[disabled]="cargando()"` en el `ion-searchbar`, y `onBuscarInput` llama a `cargarClientes()`, que pone `cargando` en verdadero antes del `await` (cerca de 300-321). Al tipear rápido, cada tecla deshabilita el campo: pierde el foco y se descartan letras. Lo encontró la revisión con `agy` (lente reliability) sobre `a9fafda` y el refutador lo corroboró con `ion-searchbar.js` de Ionic. El buscador no se deshabilita mientras busca: se mantiene editable y con foco, se muestra el indicador de carga, y el patrón de id de petición (`peticionActual`) descarta las respuestas viejas (regla 3). Si hoy se deshabilita también algo más por `cargando()` que no sea el buscador, no lo cambies. Prueba: dos `ionInput` seguidos con la primera búsqueda pendiente dejan el buscador habilitado y la lista muestra solo el resultado de la última búsqueda.

## Pruebas

Primero RED cuando el punto tenga una regla con resultado claro (2, 4, 5, 6, 10). Las pruebas que ya existen siguen pasando sin cambiar lo que verifican.

## Verificación

Corre en primer plano y copia el resultado:

```
npm run lint
npm run test:unit
npm run build
npx playwright test
```

Reporta, punto por punto, qué cambiaste o por qué no hacía falta.
