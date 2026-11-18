# Tarea B3B.F — Cierre: los 4 WARNING de V3B

**Etapa 3B, después de V3B.** Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), `planificacion/comun/diseno.md`, el contexto de `planificacion/etapas/3b-rediseno-visual/bloques/B3B.1-inventario/instruccion.md` (la parte anterior a la línea `---`) y `planificacion/etapas/3b-rediseno-visual/PLAN.md` hasta el final del `## Log` (la entrada **V3B** describe estos hallazgos).

Corrige solo estos 4 puntos. No cambies conducta fuera de lo que cada punto pide, ni los `data-testid`, ni lo que verifican las pruebas que ya existen. La app es *zoneless*. No uses git.

## Rutas permitidas

```
src/app/inventario/domain/lote.ts
src/app/inventario/domain/lote.spec.ts
src/app/ventas/ui/vender.page.ts
src/app/ventas/ui/vender.page.spec.ts
src/app/shared/ui/hoja-fecha.component.ts
src/app/shared/ui/hoja-fecha.component.spec.ts
src/app/shared/ui/campo-pesos.component.ts
src/app/shared/ui/campo-pesos.component.spec.ts
src/app/shared/ui/estilos/_segmento.scss
src/app/shared/ui/estilos/_selectores.scss
src/app/shared/ui/estilos/_campos.scss
```

Prohibido todo lo demás.

## Qué corregir

1. **Código muerto (regla 9):** `progreso` en `src/app/inventario/domain/lote.ts` (cerca de 98) ya solo lo usa `lote.spec.ts`. Bórralo junto con su bloque de prueba (`describe('progreso', ...)`). Confirma con una búsqueda que nadie más lo importa.
2. **"Abono inicial" cortado a 390 px:** en Vender, el segmento de **Forma de pago** (Contado, Fiado, Abono inicial) muestra "Abono i..." a 390 px de ancho. Haz que las tres opciones se lean completas a 390 px (por ejemplo, permitir dos líneas o ajustar el relleno o el tamaño de letra del botón del segmento), sin cambiar los textos ni los `data-testid`. Si el ajuste va en `_segmento.scss`, comprueba que el segmento de compra y aporte siga viéndose bien. Compáralo con `planificacion/diseno/mockups/Vender.dc.html`.
3. **"Time" en inglés en la hoja de fecha:** `hoja-fecha.component.ts` muestra la etiqueta de la hora como "Time". Debe decir "Hora", como `planificacion/diseno/mockups/ModalFecha.dc.html` (cerca de 57), usando el slot `time-label` de `ion-datetime`. Prueba de componente con el texto exacto "Hora".
4. **Campo de pesos con error:** cuando `app-campo-pesos` muestra un error, hoy solo el texto va en rojo. El borde del campo y su etiqueta también deben pasar al color de error del tema (variable de `src/theme/variables.scss`, `#FF6B6B`; no repitas el hexadecimal), como `planificacion/diseno/mockups/ModalAporteEstados.dc.html`. Prueba de componente: con error, el host o el campo lleva la clase o atributo de error que aplica ese estilo; sin error, no.

## Pruebas

Primero RED en los puntos 3 y 4. Las pruebas que ya existen siguen pasando sin cambiar lo que verifican (salvo borrar la de `progreso` en el punto 1).

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Para el punto 2, toma una captura a 390 px de Vender con la Forma de pago visible y guárdala fuera del repositorio; informa su ruta.

Reporta, punto por punto, qué cambiaste.
