# Tarea B3B.P — Correcciones de la prueba manual del APK

**Etapa 3B, después de B3B.F.** Antes de empezar, lee completos `CLAUDE.md` (raíz del repositorio; reglas 1 a 12), el contexto de `planificacion/etapas/3b-rediseno-visual/bloques/B3B.1-inventario/instruccion.md` (la parte anterior a la línea `---`) y la entrada **L15** del `## Log` de `planificacion/etapas/3b-rediseno-visual/PLAN.md`. No uses git. La app es *zoneless*.

## Rutas permitidas — ESTRICTAS

```
src/app/shared/ui/campo-pesos.component.ts
src/app/shared/ui/campo-pesos.component.spec.ts
src/app/ventas/ui/vender.page.ts
src/app/ventas/ui/vender.page.spec.ts
e2e/vender.spec.ts
```

Prohibido tocar cualquier otro archivo. Si un punto lo necesita, detén ese punto y explícalo en el reporte.

## 1. El campo de pesos rechaza lo que escribe el usuario tecla por tecla

En el celular, al escribir `17500` tecla por tecla: con `1750` el campo muestra `1.750` (pone solo el punto de miles); al escribir el último `0` el texto queda `1.7500`, que `FORMATO_PESOS` (`campo-pesos.component.ts:8`) rechaza como decimal, aunque ese punto lo puso el propio campo. Lo mismo pasa con millones y al borrar.

Corrección (decidida por el coordinador; no uses temporizadores ni *debounce*):

- Guarda el último texto formateado que mostró el campo.
- En `onInput`, un punto del texto nuevo que **ya estaba** en el texto mostrado antes es separador de miles: quita los puntos, toma los dígitos y vuelve a formatear al instante (`17500` → `17.500`).
- Un punto o una coma **nuevos**, escritos por el usuario, siguen siendo un decimal: se rechazan con `MENSAJE_MONTO_SIN_DECIMALES`, como hoy. Escribir `1.75` o `1,5` de una vez en un campo vacío se sigue rechazando.
- No conviertas en silencio (regla 1). El campo vacío sigue emitiendo `null`.

Pruebas (primero RED), en `campo-pesos.component.spec.ts`, simulando un `ionInput` por tecla con el texto que dejaría el teclado (el texto mostrado más la tecla nueva):

- `1`,`7`,`5`,`0`,`0` → valor `17500` y texto `17.500`;
- tecla por tecla hasta `1250000` → valor `1250000` y texto `1.250.000`;
- desde `17.500`, borrar el último dígito (`17.50`) → valor `1750` y texto `1.750`;
- `1.75` y `1,5` escritos de una vez en un campo vacío → rechazados con el texto exacto de `MENSAJE_MONTO_SIN_DECIMALES` y valor `null`;
- las pruebas que ya existen siguen pasando sin cambiar lo que verifican.

En `e2e/vender.spec.ts`, agrega una prueba que escriba el precio por resma **tecla por tecla** con `pressSequentially('17500')` (no `fill`) y compruebe que el campo muestra `17.500` y que el subtotal usa `17500`. Ten en cuenta el *scroll assist* de Ionic (`input:not(.cloned-input)`), como las otras pruebas.

## 2. Ayuda para vender fiado o con abono

En Vender, con el cliente **Mostrador** el segmento de Forma de pago solo muestra Contado (`vender.page.ts:369`, correcto según S9), pero el usuario no sabe por qué. Debajo del segmento, solo mientras el cliente sea Mostrador, muestra el texto de ayuda:

`Para vender fiado o con abono, elige un cliente.`

con `data-testid="ayuda-forma-pago"`, estilo de texto secundario del tema (no repitas hexadecimales). Prueba de componente: con Mostrador se muestra con el texto exacto; con un cliente con nombre no se muestra.

## Verificación

Corre en primer plano, **uno por vez** (la máquina tiene poca RAM), y copia el resultado con el número de pruebas:

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

No dejes procesos de node, ng, vitest, playwright ni chrome abiertos al terminar. Reporta en español: qué cambiaste por punto, el resultado de cada comando y la lista de archivos modificados.
