[MODO EJECUTOR]

# Revisión del PR #23 — Etapa 4, cartera y expediente del cliente

Eres el revisor de solo lectura de un pull request. **No edites ningún archivo, no comentes en GitHub, no hagas commits, push ni merge.** Solo lees, ejecutas comandos de lectura y devuelves tu veredicto.

## Qué revisar

- **PR:** #23 en `MiguelMD06/gestor-resmas`, rama `feat/etapa-4-cartera` hacia `main`. Lo ves con `gh pr view 23` y el diff con `git diff origin/main...origin/feat/etapa-4-cartera` (haz `git fetch` antes).
- **Reglas:** lee primero el `CLAUDE.md` de la raíz del repositorio (reglas 1 a 12) y `planificacion/comun/base.md`.
- **Lo que el PR dice que hace:** `planificacion/etapas/4-cartera-expediente/PLAN.md` (Specs S1–S16, ejemplos E1–E15, decisiones D1–D16) y la descripción del PR.
- **Alcance:** el código y las pruebas de `src/` y `e2e/`. Los archivos de `planificacion/` y `.engram/` son documentación interna del proceso: léelos solo para comprobar lo que el PR afirma.

## Puntos de revisión

1. **Que el código haga lo que dice el PR**, contra S1–S16 y E1–E15: el directorio con deuda y filtro, el modal de abono en sus tres modos con resumen, el expediente con sus pestañas y `RegistrarAbono`.
2. **Alto riesgo, a fondo** (mueve dinero y cambia filas existentes de `ventas`):
   - `src/app/cartera/application/registrar-abono.ts`: todo dentro de una sola transacción; si algo falla, no queda nada escrito; validaciones de fecha (`FECHA_FUTURA`, `ABONO_ANTERIOR_A_FACTURA`) y de monto antes de escribir.
   - `src/app/cartera/infrastructure/cartera.repository.ts` (`aplicarPago`, consultas de facturas abiertas, deuda por cliente y expediente): SQL correcto, orden `fecha_venta ASC, id_venta ASC` en la cascada, sin sobrepago posible.
   - Las guardas de doble envío y de vista bloqueada (reglas 2 y 3) en `abono.modal.ts`, `resumen-abono.modal.ts` y `expediente.page.ts`.
3. **Casos límite y de error:** monto igual a la deuda o al saldo y un peso más, $0, decimales, fecha futura y anterior a una factura, segunda y última factura de la cascada, empate de fechas, doble toque en **Aceptar**, fallo al escribir, carga fallida con **Reintentar** (cuatro estados de la regla 4).
4. **Seguridad y datos de otro cliente:** un abono a un cliente nunca toca facturas de otro; una factura de otro cliente se rechaza; el Mostrador no recibe abonos.
5. **Calidad de las pruebas** ("Calidad antes del PR"): cada prueba ejercita la función que nombra su título; los rechazos se acotan al error exacto (código o mensaje), nunca un `toThrow()` o `rejects.toThrow()` a secas; nada de `try/catch` sin una aserción que falle si no se lanza el error; los casos límite se prueban con el valor límite exacto; el texto exacto que ve el usuario (regla 6).
6. **Reglas 7 a 11:** dinero en enteros (`Pesos`), confirmación antes de escribir, sin código muerto exportado, accesibilidad mínima (etiquetas visibles, `aria-label` en botones de ícono, estados deshabilitados para lectores) y fechas solo desde `CLOCK` (nada de `new Date()` en dominio, aplicación o UI).
7. **Formato de los commits:** commits convencionales (`git log origin/main..origin/feat/etapa-4-cartera`); sin `Co-Authored-By`, enlaces de sesión ni atribución o menciones a IA en commits, en la descripción del PR ni en comentarios del código.
8. **Sin datos reales:** nombres, teléfonos o montos de prueba ficticios.
9. **Que compile y pasen las pruebas:** en local ya pasaron `npm run lint`, `npm run test:unit` (71 archivos, 570 pruebas), `npm run build` sin advertencias y `npm run test:e2e -- --workers=1` (20 pruebas), y el check `verify` del CI pasó (`gh pr checks 23`). Si puedes, confírmalo con el CI.

Ya hay issues abiertas para observaciones conocidas que **no** debes reportar otra vez: #24 (botones deshabilitados lima y no gris), #25 (la fecha del abono no muestra "Hoy"), #26 (el aviso "Abono registrado" tapa un botón), #27 ("Pagar todo" deshabilitado u oculto) y #28 (indicador del `ion-segment` pegado al borde). La prueba manual en Android está pendiente y no la puedes hacer tú.

## Qué devolver

Un informe en español con este formato:

```
VEREDICTO: APROBADO | CAMBIOS NECESARIOS

BLOQUEANTES
- archivo:línea — qué pasa, por qué rompe una regla o un Spec, y cómo reproducirlo

DETALLES (no bloqueantes)
- archivo:línea — qué pasa y cómo arreglarlo

REVISADO SIN HALLAZGOS
- lista corta de los puntos 1 a 9 que revisaste y estaban bien
```

Es **bloqueante** todo lo que rompe una regla de `CLAUDE.md`, un Spec o un ejemplo E#, o que puede perder o duplicar dinero o stock. Cada hallazgo lleva `archivo:línea` y lo comprobaste en el código; no reportes suposiciones.
