# Criterios de aceptación — B4.1

Datos de partida, salvo que el criterio diga otra cosa: **Ana** con F1 (saldo $30.000) y F2 (total $15.000, pagado $5.000, saldo $10.000), es decir, debe $40.000 en 2 facturas; **Carla** con una factura de saldo $22.000 (debe $22.000 en 1 factura); **Beto** sin compras; y el Mostrador.

- C1: `CarteraRepository.deudasPorCliente` devuelve, en una sola consulta, Ana → `{ deuda: 40000, facturas: 2 }` y Carla → `{ deuda: 22000, facturas: 1 }`; Beto, el Mostrador y los clientes con todas sus facturas pagadas no aparecen. `ConsultarCartera.consultar()` devuelve `total` 62000.
  Cómo comprobarlo: prueba contra `SqlJsDatabase` con las `MIGRACIONES`.
- C2: La cabecera muestra "3 clientes", "Por cobrar" con "$ 62.000" en `total-por-cobrar` y "2 clientes con deuda"; con un solo deudor dice "1 cliente con deuda".
- C3: La fila de Ana muestra "$ 40.000" en rojo (`#FF6B6B`) en `deuda-cliente` y "2 facturas" en `facturas-cliente`; la de Carla "$ 22.000" y "1 factura"; la de Beto "Al día" en gris en `al-dia-cliente` y sin monto. El Mostrador no aparece en la lista.
- C4: El filtro: "Todos · 3" muestra a Ana, Beto y Carla; "Con deuda · 2" muestra solo a Ana y Carla. Con el filtro "Con deuda" y la búsqueda "an", solo queda Ana. Volver a "Todos" muestra de nuevo a los tres.
- C5: Estados con el texto exacto: sin clientes, "Todavía no hay clientes" y «Agrega el primero con el botón +.»; búsqueda sin resultados, "No se encontraron clientes"; filtro "Con deuda" sin deudores (solo Beto), «Ningún cliente tiene deuda».
- C6: Error de carga: si falla `BuscarClientes` **o** `ConsultarCartera`, se ve `estado-error` con el mismo texto de error que muestra hoy el directorio y **Reintentar**; nunca la lista con "Al día" ni el estado vacío. Reintentar con la carga ya funcionando muestra la lista con las deudas.
- C7: Mientras carga, se ve `indicador-carga`, el filtro está deshabilitado (también para lectores de pantalla) y el buscador sigue habilitado: escribir durante la carga no pierde letras.
- C8: Respuestas viejas: si se escribe "a" y después "an", y la respuesta de "a" llega después de la de "an", la lista muestra el resultado de "an".
- C9: Al volver a la pestaña (`ionViewWillEnter`) se recargan los clientes y la cartera: después de registrar un abono que deja a Carla en $0, la fila de Carla dice "Al día" y el total baja a "$ 40.000".
- C10: Tocar un cliente sigue abriendo el modal de editar cliente, como hoy, y crear un cliente con el botón flotante lo agrega a la lista como "Al día".
- C11: Accesibilidad: cada fila tiene un texto para lectores de pantalla con la deuda ("Debe $ 40.000 en 2 facturas") o "Al día", y el segmento del filtro tiene etiqueta.
- C12: e2e en `e2e/clientes.spec.ts`: crea por la app un cliente con una venta a fiado y otro sin compras, y comprueba su deuda, "Al día", el total por cobrar y el filtro "Con deuda". Las pruebas e2e que ya existían siguen pasando sin cambiar lo que verifican.
  Cómo comprobarlo: `npx playwright test e2e/clientes.spec.ts` y revisión del diff de ese archivo.
- C13: Revisión visual: a 390 px de ancho, el directorio coincide con `Clientes.dc.html` en estructura, textos y colores (fondo `#000`, tarjetas `#0F1012`, rojo solo en la deuda), con las diferencias anotadas en el reporte.
  Cómo comprobarlo: captura con Playwright a 390 px y comparación con el mockup.
- C14: Solo se tocaron las rutas permitidas; se conservan los `data-testid` que ya existían; `npm run lint`, `npm run test:unit` y `npm run build` pasan sin advertencias (las 487 pruebas que ya existían siguen en verde salvo las de `deudasPorCliente` y `ConsultarCartera`, actualizadas al nuevo valor).
- C15: Calidad de las pruebas (regla 6 de `CLAUDE.md` y de `comun/base.md`): cada estado se comprueba con el texto exacto que ve el usuario, no solo con `toHaveBeenCalled`; sin `try/catch` para verificar errores.
  Cómo comprobarlo: revisión de los `.spec.ts` tocados.
