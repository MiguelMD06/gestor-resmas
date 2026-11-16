# Tarea B3.R — Correcciones de la revisión de la ola 1

**Etapa 3, correcciones.** Antes de empezar, lee `CLAUDE.md` (raíz del repositorio) y, en `planificacion/etapas/3-clientes-venta/PLAN.md`, **D9**, **D16**, **E21** y la entrada **L13** del Log. Nadie más escribe en el árbol mientras trabajas.

La app es *zoneless*: todo lo que la plantilla muestra y cambia después de un `await` debe ser una **signal**.

## Rutas permitidas

```
src/app/shared/ui/campo-pesos.component.ts
src/app/shared/ui/campo-pesos.component.spec.ts
src/app/shared/ui/mensajes-error.ts
src/app/shared/ui/mensajes-error.spec.ts
src/app/shared/infrastructure/sqlite/migrations/002-telefono-unico.ts
src/app/shared/infrastructure/sqlite/migrations/002-telefono-unico.spec.ts
src/app/inventario/ui/nueva-compra.modal.spec.ts
src/app/finanzas/ui/aporte.modal.spec.ts
```

Prohibido todo lo demás.

## Especificación

- **R1. El campo de pesos no convierte en silencio (E21, L13).** Hoy `campo-pesos.component.ts` descarta todo lo que no es dígito: pegar "3800,50" da 380050 sin aviso.
  - Se aceptan solo dígitos, puntos (separador de miles), el signo `$` y espacios: "3800", "3.800", "$3.800" y "$ 3.800" dan 3800.
  - Si el texto trae cualquier otro carácter (coma, letras, signo `-`, etc.), el valor que entrega el campo es `null`, el campo muestra junto a él "Escribe el monto en pesos, sin decimales" y queda marcado como inválido (también para lectores de pantalla, `aria-invalid`). En cuanto el texto vuelve a ser válido, el error desaparece y el valor se actualiza.
  - El texto del mensaje va en `shared/ui/mensajes-error.ts` como una constante exportada (por ejemplo `MENSAJE_MONTO_SIN_DECIMALES`), con su prueba de texto exacto. No es un `CodigoRegla`: es una validación del campo.
  - Como el valor es `null`, el botón de guardar de quien usa el campo queda deshabilitado, igual que con el campo vacío.
- **R2. Migración `002` a prueba de datos viejos (D9).** Antes de crear el índice, la migración convierte en `NULL` los teléfonos vacíos o de solo espacios: `UPDATE clientes SET telefono = NULL WHERE telefono IS NOT NULL AND trim(telefono) = '';`, y después `CREATE UNIQUE INDEX ux_clientes_telefono ON clientes (telefono) WHERE telefono IS NOT NULL;`. Las dos sentencias van en el mismo `script`, que el runner ya corre en una transacción.

## Pruebas (primero RED)

- R1, en `campo-pesos.component.spec.ts`: pegar "3800,50", "3.800,5", "38a0" y "-3800" → valor `null`, se ve "Escribe el monto en pesos, sin decimales" y `aria-invalid="true"`; luego escribir "3800" → valor 3800, sin error. "3800", "3.800", "$3.800" y "$ 3.800" → 3800, sin error. Mira fallar primero las de rechazo.
- R1, en `nueva-compra.modal.spec.ts` y `aporte.modal.spec.ts`: con "3800,50" en el campo de dinero, el botón de guardar está deshabilitado y guardar no llama al caso de uso.
- R1, en `mensajes-error.spec.ts`: el texto exacto de la constante nueva.
- R2, en `002-telefono-unico.spec.ts`: sobre una base con la `001` y dos clientes con `telefono = ''` y uno con `'   '`, la `002` corre sin error y los tres quedan con `telefono` `NULL`; el Mostrador sigue existiendo después de la `002` (consulta que lo verifica); las pruebas que ya existen siguen pasando.

## Verificación

Corre en primer plano y copia el resultado (con el número de pruebas):

```
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```
