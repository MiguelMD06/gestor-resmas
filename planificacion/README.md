# Planificación

Índice del trabajo por etapas. Para retomar en una sesión nueva, lee este archivo, el `PLAN.md` de la etapa en curso y su reporte en Engram.

## Etapas

| # | Etapa | Requisitos que cubre | Estado | Plan | Reporte (Engram) |
|---|-------|----------------------|--------|------|------------------|
| 0 | Fundaciones | RNF-01, RNF-02, RNF-03, RNF-04; esquema con A1, A2, A5, A6 y las correcciones B | ⏳ por aprobar | [PLAN](etapas/0-fundaciones/PLAN.md) | `etapas/0-fundaciones/reporte` |
| 1 | Motor contable (dominio puro, sin interfaz) | RN-03, RF-16; reglas de RF-12, RF-13, RF-14, RF-17, RF-19 y RF-20; A1, A3, A4 | pendiente | — | — |
| 2 | Inventario y aportes de capital | RN-01, RN-02, RF-01, RF-02, RF-03, RF-04; A2, A3; navegación con pestañas | pendiente | — | — |
| 3 | Clientes y punto de venta | RF-05, RF-07, RF-08, RF-09, RF-10, RNF-05; A4 (aviso) | pendiente | — | — |
| 4 | Cartera y expediente del cliente | RF-06, RF-11, RF-12, RF-13, RF-14, RF-15 | pendiente | — | — |
| 5 | Finanzas: retiros, traspasos y dashboard | RN-04, RF-17, RF-18, RF-19, RF-20, RF-21; A5 (ganancia mensual) | pendiente | — | — |
| 6 | Respaldo y anulaciones | RNF-06; A7 (migración v2) | pendiente | — | — |
| 7 | Build Android firmado y pruebas en dispositivo | RNF-01 (entrega), RNF-05 (pulido) | pendiente | — | — |

El motor contable va antes que las pantallas porque las etapas 2 a 5 ya lo necesitan: las compras mueven bolsillos y los cobros reparten capital y ganancia.

## Estructura

```
planificacion/
├── README.md                                 este índice
├── especificaci_n_y_dise_o_del_sistema.md    documento maestro (fuente de verdad)
├── planteamiento_requerimientos.md           planteamiento inicial
├── comun/
│   ├── base.md                               contexto que va al inicio de toda instrucción de agy
│   └── modelo-contable.md                    reglas contables y esquema v1 corregidos (A1–A7)
└── etapas/
    └── <n>-<nombre>/
        ├── PLAN.md                           Specs, decisiones, bloques, verificación, commits, Por aprobar, Log
        ├── revision/                         prototipos y evidencia
        ├── bloques/<id>-<nombre>/            tarea.md e instruccion.md de cada bloque delegado
        └── logs/                             salida de agy (no se versiona)
```

## Cómo trabajamos

Formato híbrido: la estructura de la skill `planificacion-por-etapas` más la trazabilidad de ODD (gentle-ai).

1. **Plan:** cada etapa tiene un `PLAN.md` con **Specs** (`S#` que citan textualmente los RF, RN o RNF y las decisiones), los bloques y un **Log** con los mensajes del usuario copiados tal cual. No se escribe código hasta que el plan está aprobado.
2. **Bloques:** cada bloque delegado lleva `tarea.md`, con sus `S#` y sus rutas permitidas, e `instruccion.md` = `comun/base.md` + `tarea.md`, en UTF-8 sin BOM.
3. **Lanzamiento de agy** (código: `gemini-3.8-flash-high`; pruebas y verificación: `gemini-4-argon-medium`):

   ```
   agy -p "Lee el archivo planificacion/etapas/<etapa>/bloques/<id>/instruccion.md (UTF-8) y ejecuta al pie de la letra la instruccion completa que contiene. Ese archivo es tu unica tarea." --model "<modelo>" --dangerously-skip-permissions --output-format json *> planificacion/etapas/<etapa>/logs/<id>.log
   ```

4. **Revisión:** el coordinador compara `HEAD` antes y después, revisa el diff contra las rutas permitidas y hace commits atómicos (skill `commits-atomicos`).
5. **Cierre:**
   - el reporte de la etapa va a **Engram** con el `topic_key` `etapas/<n>-<nombre>/reporte`, en lugar de un `REPORTE.md`;
   - el `PLAN.md` se copia en Engram como `etapas/<n>-<nombre>/plan`;
   - se exporta con `engram sync --project gestor-resmas` para que el equipo lo importe.

`agy` tiene acceso de **solo lectura** a Engram; solo el coordinador escribe en él.

## Índice de bloques

| Etapa | Bloque | Estado |
|-------|--------|--------|
| 0 | B0.1 Configuración del proyecto | pendiente de aprobación |
| 0 | B0.2 Persistencia SQLite | pendiente de aprobación |
| 0 | B0.3 Tipos de dominio compartidos | pendiente de aprobación |
| 0 | V0 Verificación independiente | pendiente de aprobación |
