import { Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonNote,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  alertCircleOutline,
  calendarOutline,
  checkmark,
  chevronForwardOutline,
  cubeOutline,
  personOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons';

import { BuscarClientes } from '../../clientes/application/buscar-clientes';
import type { Cliente } from '../../clientes/domain/cliente';
import { ClienteModalComponent } from '../../clientes/ui/cliente.modal';
import { ConsultarInventario } from '../../inventario/application/consultar-inventario';
import type { Lote } from '../../inventario/domain/lote';
import {
  fechaHora,
  formatearPesos,
  pesos,
  pesosPositivos,
  resmasPositivas,
  restarPesos,
  sumarPesos,
  type FechaHora,
  type MedioPago,
  type Pesos,
  type TipoPapel,
} from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { CampoPesosComponent } from '../../shared/ui/campo-pesos.component';
import { ROL_GUARDADO, soloCierreExplicito } from '../../shared/ui/formulario';
import { HojaFechaComponent } from '../../shared/ui/hoja-fecha.component';
import { MENSAJES_ERROR, MENSAJE_ERROR_GENERICO, mensajeDeError } from '../../shared/ui/mensajes-error';
import { evaluarLinea, perdida } from '../domain/margen';
import { ultimaFechaCompra, type PagoVenta } from '../domain/venta';

import { type LineaResumenVenta, ROL_ERROR, ResumenVentaModalComponent } from './resumen-venta.modal';
import { SelectorClienteContenidoComponent } from './selector-cliente-contenido.component';
import { etiquetaPapel, leerValorEvento } from './venta-ui.helpers';

export type ModalidadVenta = 'CONTADO' | 'FIADO' | 'ABONO_INICIAL';

interface LineaBorrador {
  readonly idLote: number;
  readonly tipoPapel: TipoPapel;
  readonly fechaCompra: FechaHora;
  readonly costoUnitario: Pesos;
  readonly disponibles: number;
  readonly cantidadTexto: string;
  readonly precioUnitario: number | null;
}

interface LineaEvaluadaUI extends LineaBorrador {
  readonly cantidadNum: number | null;
  readonly errorCantidad: string | null;
  readonly errorPrecio: string | null;
  readonly subtotalVenta: Pesos | null;
  readonly subtotalCosto: Pesos | null;
  readonly margen: Pesos | null;
  readonly bajoCosto: boolean;
  readonly perdidaLinea: Pesos;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

@Component({
  selector: 'app-vender',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="vender-toolbar">
        <ion-title>Vender</ion-title>
      </ion-toolbar>
      <div class="vender-subtitulo-contenedor">
        <p class="vender-subtitulo">Nueva venta</p>
      </div>
      @if (cargando() || guardando()) {
        <ion-progress-bar
          type="indeterminate"
          color="primary"
          [attr.data-testid]="guardando() ? 'indicador-guardando' : 'indicador-carga'"
        ></ion-progress-bar>
      }
    </ion-header>

    <ion-content class="vender-contenido">
      <div class="vender-cuerpo">
        <!-- Cliente -->
        <div class="campo-selector" [class.campo-inactivo]="guardando() || cargando() || errorCarga() !== null">
          <span class="campo-selector-etiqueta">Cliente</span>
          <button
            type="button"
            class="campo-selector-boton"
            [disabled]="guardando() || cargando() || errorCarga() !== null"
            [attr.aria-disabled]="guardando() || cargando() || errorCarga() !== null ? 'true' : null"
            (click)="abrirSelectorCliente()"
            data-testid="selector-cliente"
          >
            <ion-icon name="person-outline" color="secondary" aria-hidden="true"></ion-icon>
            <span class="campo-selector-valor">{{ clienteSeleccionado()?.nombre ?? '' }}</span>
            <ion-icon name="chevron-forward-outline" class="campo-selector-flecha" aria-hidden="true"></ion-icon>
          </button>
        </div>

        <!-- Fecha de la venta -->
        <div>
          <div
            class="campo-selector"
            [class.campo-error]="errorFecha() !== null"
            [class.campo-inactivo]="guardando() || cargando()"
          >
            <span class="campo-selector-etiqueta">Fecha de la venta</span>
            <button
              type="button"
              class="campo-selector-boton"
              [disabled]="guardando() || cargando()"
              [attr.aria-disabled]="guardando() || cargando() ? 'true' : null"
              (click)="abrirSelectorFecha()"
              data-testid="btn-fecha-venta"
            >
              <ion-icon name="calendar-outline" color="secondary" aria-hidden="true"></ion-icon>
              <span class="campo-selector-valor">{{ fechaLegible() }}</span>
              <ion-icon name="chevron-forward-outline" class="campo-selector-flecha" aria-hidden="true"></ion-icon>
            </button>
          </div>
          @if (errorFecha(); as errFecha) {
            <ion-note color="danger" class="ayuda-campo ayuda-error" data-testid="error-fecha">
              {{ errFecha }}
            </ion-note>
          }
        </div>

        @if (errorCarga(); as error) {
          <div class="app-estado-error" role="alert" data-testid="estado-error">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <p class="estado-titulo" data-testid="mensaje-error-carga">{{ error }}</p>
            <ion-button
              expand="block"
              color="primary"
              (click)="cargarDatos()"
              [disabled]="cargando()"
              [attr.aria-disabled]="cargando() ? 'true' : null"
              data-testid="btn-reintentar"
            >
              Reintentar
            </ion-button>
          </div>
        } @else if (!cargando() && lotes().length === 0) {
          <div class="app-estado-vacio" data-testid="mensaje-sin-lotes">
            <ion-icon name="cube-outline" aria-hidden="true"></ion-icon>
            <p class="estado-titulo">No hay lotes activos. Registra una compra en Inventario</p>
          </div>
        } @else {
          @if (cargando() && lotes().length === 0) {
            <div class="app-tarjeta tarjeta-esqueleto" aria-busy="true" aria-label="Cargando lotes disponibles">
              @for (item of [1, 2, 3]; track item) {
                <div class="esqueleto-lote">
                  <div class="esqueleto-lote-texto">
                    <ion-skeleton-text animated style="width: 45%; height: 14px"></ion-skeleton-text>
                    <ion-skeleton-text animated style="width: 65%; height: 12px"></ion-skeleton-text>
                  </div>
                  <ion-skeleton-text animated class="esqueleto-circulo"></ion-skeleton-text>
                </div>
              }
            </div>
          } @else {
            <!-- Lotes disponibles -->
            <section class="vender-seccion" aria-label="Lotes disponibles">
              <div class="seccion-cabecera">
                <h2 class="seccion-titulo">Lotes disponibles</h2>
                <span class="seccion-subtitulo">Toca para agregar</span>
              </div>
              <div class="app-tarjeta tarjeta-lista" data-testid="lista-lotes">
                @for (lote of lotes(); track lote.idLote) {
                  <button
                    type="button"
                    class="fila-lote"
                    [class.fila-lote-agregada]="loteYaAgregado(lote.idLote)"
                    [disabled]="guardando() || loteYaAgregado(lote.idLote)"
                    [attr.aria-disabled]="guardando() || loteYaAgregado(lote.idLote) ? 'true' : null"
                    [attr.aria-label]="
                      loteYaAgregado(lote.idLote)
                        ? etiquetaPapel(lote.tipoPapel) + ' · Lote ' + lote.idLote + ' agregado'
                        : 'Agregar ' + etiquetaPapel(lote.tipoPapel) + ' · Lote ' + lote.idLote
                    "
                    (click)="agregarLote(lote)"
                    data-testid="item-lote"
                  >
                    <span class="fila-lote-info">
                      <span class="fila-lote-nombre">{{ etiquetaPapel(lote.tipoPapel) }} · Lote {{ lote.idLote }}</span>
                      <span class="fila-lote-detalle">
                        {{ lote.resmasDisponibles }} resmas · costo {{ formatearPesos(lote.costoUnitarioResma) }} c/u
                      </span>
                    </span>
                    @if (loteYaAgregado(lote.idLote)) {
                      <span class="lote-agregado">
                        <ion-icon name="checkmark" aria-hidden="true"></ion-icon>
                        Agregado
                      </span>
                    } @else {
                      <span class="lote-agregar-circulo" aria-hidden="true">
                        <ion-icon name="add"></ion-icon>
                      </span>
                    }
                  </button>
                }
              </div>
            </section>
          }

          <!-- Detalle de venta -->
          @if (lineasEvaluadas().length > 0) {
            <section class="vender-seccion" aria-label="Detalle de venta">
              <h2 class="seccion-titulo">Detalle de venta</h2>
              @for (linea of lineasEvaluadas(); track linea.idLote) {
                <div class="app-tarjeta tarjeta-linea" data-testid="linea-venta">
                  <div class="linea-cabecera">
                    <div class="linea-titulo-grupo">
                      <span class="linea-titulo">{{ etiquetaPapel(linea.tipoPapel) }} · Lote {{ linea.idLote }}</span>
                      <span class="linea-costo">
                        Costo {{ formatearPesos(linea.costoUnitario) }} · Disponibles {{ linea.disponibles }}
                      </span>
                    </div>
                    <ion-button
                      fill="clear"
                      color="danger"
                      class="btn-quitar"
                      aria-label="Quitar línea"
                      [disabled]="guardando()"
                      [attr.aria-disabled]="guardando() ? 'true' : null"
                      (click)="quitarLinea(linea.idLote)"
                      data-testid="btn-quitar-linea"
                    >
                      <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                    </ion-button>
                  </div>

                  <div class="linea-campos-grid">
                    <div>
                      <ion-input
                        fill="outline"
                        label="Cantidad (resmas)"
                        labelPlacement="stacked"
                        type="number"
                        inputmode="numeric"
                        [value]="linea.cantidadTexto"
                        [disabled]="guardando()"
                        [class.ion-invalid]="linea.errorCantidad !== null"
                        [class.ion-touched]="linea.errorCantidad !== null"
                        [attr.aria-disabled]="guardando() ? 'true' : null"
                        [attr.aria-invalid]="linea.errorCantidad ? 'true' : null"
                        (ionInput)="onCantidadInput(linea.idLote, $event)"
                        data-testid="input-cantidad"
                      ></ion-input>
                      @if (linea.errorCantidad; as errCant) {
                        <ion-note color="danger" class="ayuda-campo ayuda-error" data-testid="error-cantidad">
                          {{ errCant }}
                        </ion-note>
                      } @else {
                        <p class="ayuda-campo">Máximo {{ linea.disponibles }}</p>
                      }
                    </div>

                    <div>
                      <app-campo-pesos
                        label="Precio por resma"
                        [valor]="linea.precioUnitario"
                        (valorChange)="actualizarPrecio(linea.idLote, $event)"
                        [disabled]="guardando()"
                        [error]="linea.errorPrecio"
                        errorTestId="error-precio-unitario"
                        [generacion]="generacionReinicio()"
                        class="app-campo-contorno"
                        [class.app-campo-aviso]="linea.bajoCosto"
                        placeholder="Ej: 22000"
                        data-testid="input-precio-unitario"
                      />
                      @if (!linea.errorPrecio && !linea.bajoCosto) {
                        <p class="ayuda-campo">Costo {{ formatearPesos(linea.costoUnitario) }}</p>
                      }
                    </div>
                  </div>

                  @if (linea.bajoCosto) {
                    <ion-note color="warning" class="ayuda-campo aviso-bajo-costo" data-testid="aviso-bajo-costo">
                      <ion-icon name="warning-outline" aria-hidden="true"></ion-icon>
                      Precio por debajo del costo: pierdes {{ formatearPesos(linea.perdidaLinea) }}
                    </ion-note>
                  }

                  @if (linea.subtotalVenta !== null && linea.margen !== null) {
                    <div class="linea-totales">
                      <span class="linea-total-dato">
                        Subtotal <strong>{{ formatearPesos(linea.subtotalVenta) }}</strong>
                      </span>
                      <span class="linea-total-dato">
                        Ganancia
                        <strong
                          [class.ganancia-positiva]="linea.margen > 0"
                          [class.ganancia-negativa]="linea.margen < 0"
                        >
                          {{ linea.margen > 0 ? '+ ' : '' }}{{ formatearPesos(linea.margen) }}
                        </strong>
                      </span>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- Cierre de la venta -->
          <section class="app-tarjeta tarjeta-cierre" aria-label="Cierre de la venta" data-testid="resumen-totales">
            <div class="totales-grid">
              <div class="total-celda">
                <span class="total-etiqueta">Total: </span>
                <span class="total-valor">{{ formatearPesos(totalVenta()) }}</span>
              </div>
              <div class="total-celda">
                <span class="total-etiqueta">Costo: </span>
                <span class="total-valor">{{ formatearPesos(costoTotal()) }}</span>
              </div>
              <div class="total-celda">
                <span class="total-etiqueta">Ganancia: </span>
                <span
                  class="total-valor"
                  [class.ganancia-positiva]="margenTotal() > 0"
                  [class.ganancia-negativa]="margenTotal() < 0"
                >
                  {{ formatearPesos(margenTotal()) }}
                </span>
              </div>
            </div>

            <div class="cierre-grupo">
              <span class="cierre-etiqueta">Forma de pago</span>
              <ion-segment
                [value]="modalidad()"
                [disabled]="guardando() || cargando()"
                [attr.aria-disabled]="guardando() || cargando() ? 'true' : null"
                (ionChange)="onModalidadChange($event)"
                data-testid="segment-modalidad"
              >
                <ion-segment-button value="CONTADO" data-testid="segment-contado">
                  <ion-label>Contado</ion-label>
                </ion-segment-button>
                @if (!esMostrador()) {
                  <ion-segment-button value="FIADO" data-testid="segment-fiado">
                    <ion-label>Fiado</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="ABONO_INICIAL" data-testid="segment-abono-inicial">
                    <ion-label>Abono inicial</ion-label>
                  </ion-segment-button>
                }
              </ion-segment>
            </div>

            @if (modalidad() === 'CONTADO' || modalidad() === 'ABONO_INICIAL') {
              <div class="cierre-grupo">
                <span class="cierre-etiqueta">Medio de pago</span>
                <ion-segment
                  [value]="medio()"
                  [disabled]="guardando() || cargando()"
                  [attr.aria-disabled]="guardando() || cargando() ? 'true' : null"
                  (ionChange)="onMedioChange($event)"
                  data-testid="segment-medio"
                >
                  <ion-segment-button value="EFECTIVO" data-testid="segment-efectivo">
                    <ion-label>Efectivo</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="TRANSFERENCIA" data-testid="segment-transferencia">
                    <ion-label>Transferencia</ion-label>
                  </ion-segment-button>
                </ion-segment>
              </div>
            }

            @if (modalidad() === 'ABONO_INICIAL') {
              <div>
                <app-campo-pesos
                  label="Abono inicial"
                  [(valor)]="montoAbonoInicial"
                  [disabled]="guardando()"
                  [error]="errorAbonoInicial()"
                  errorTestId="error-abono-inicial"
                  [generacion]="generacionReinicio()"
                  class="app-campo-contorno"
                  placeholder="Ej: 50000"
                  data-testid="input-abono-inicial"
                />
                @if (!errorAbonoInicial()) {
                  <p class="ayuda-campo">Mayor a cero y menor que el total de {{ formatearPesos(totalVenta()) }}</p>
                }
              </div>
            }

            @if (modalidad() === 'FIADO' || modalidad() === 'ABONO_INICIAL') {
              <div class="queda-debiendo" data-testid="queda-debiendo">
                <span class="queda-debiendo-etiqueta">Queda debiendo</span>
                <span class="queda-debiendo-valor">{{ formatearPesos(quedaDebiendo()) }}</span>
              </div>
            }
          </section>
        }
      </div>
    </ion-content>

    <ion-footer class="vender-footer ion-no-border">
      <ion-button
        expand="block"
        color="primary"
        [disabled]="!puedeConfirmar()"
        [attr.aria-disabled]="!puedeConfirmar() ? 'true' : null"
        (click)="abrirResumen()"
        data-testid="btn-confirmar-venta"
      >
        {{ textoBotonConfirmar() }}
      </ion-button>
      @if (mostrarAyudaConfirmar()) {
        <p class="ayuda-confirmar">Corrige los campos marcados para continuar</p>
      }
    </ion-footer>

    <!-- Modal selector de cliente -->
    <ion-modal
      [isOpen]="selectorClienteAbierto()"
      [breakpoints]="[0, 0.92, 1]"
      [initialBreakpoint]="0.92"
      class="modal-sheet"
      (didDismiss)="cerrarSelectorCliente()"
      data-testid="modal-selector-cliente"
    >
      <ng-template>
        <app-selector-cliente-contenido
          [busqueda]="busquedaCliente()"
          [clientes]="clientesSelector()"
          [buscando]="buscandoClientes()"
          [errorBusqueda]="errorBusquedaClientes()"
          [clienteSeleccionadoId]="clienteSeleccionado()?.idCliente ?? null"
          (cerrar)="cerrarSelectorCliente()"
          (buscar)="onBuscarClienteTexto($event)"
          (limpiarBusqueda)="onBuscarClienteClear()"
          (nuevoCliente)="crearNuevoCliente()"
          (reintentar)="reintentarBusquedaClientes()"
          (seleccionar)="seleccionarCliente($event)"
        />
      </ng-template>
    </ion-modal>

    <!-- Modal fecha (hoja compartida D5) -->
    <ion-modal
      [isOpen]="selectorFechaAbierto()"
      [breakpoints]="[0, 0.85, 1]"
      [initialBreakpoint]="0.85"
      class="modal-sheet"
      (didDismiss)="cerrarSelectorFecha()"
      data-testid="modal-fecha-venta"
    >
      <ng-template>
        <app-hoja-fecha
          titulo="Fecha de la venta"
          [valor]="fechaSeleccionada()"
          [maximo]="maxFecha()"
          ayuda="No puede ser una fecha futura ni anterior a la compra del lote."
          datetimeTestId="datetime-fecha-venta"
          (fechaChange)="onFechaSeleccionada($event)"
          (cerrar)="cerrarSelectorFecha()"
        />
      </ng-template>
    </ion-modal>
  `,
  styles: `
    .vender-toolbar {
      --background: var(--ion-background-color);
      --border-width: 0;
      padding-top: 16px;
    }

    ion-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .vender-subtitulo-contenedor {
      background: var(--ion-background-color);
      padding: 0 20px 8px;
    }

    .vender-subtitulo {
      margin: 0;
      font-size: 13px;
      color: var(--app-texto-secundario);
    }

    .vender-contenido {
      --background: var(--ion-background-color);
    }

    .vender-cuerpo {
      padding: 16px 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .vender-seccion {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .tarjeta-linea {
      padding: 16px 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .linea-cabecera {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .linea-titulo-grupo {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .linea-titulo {
      font-size: 15px;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .linea-costo {
      font-size: 12px;
      color: var(--app-texto-secundario);
    }

    .btn-quitar {
      margin: -8px -8px 0 0;
      --padding-start: 10px;
      --padding-end: 10px;
    }

    .linea-campos-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    }

    .tarjeta-cierre {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .cierre-grupo {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cierre-etiqueta {
      font-size: 13px;
      color: var(--app-texto-secundario);
    }

    .vender-footer {
      padding: 12px 20px 16px;
      border-top: 1px solid var(--app-borde);
      background: var(--ion-background-color);
    }

    .ayuda-confirmar {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--app-texto-secundario);
      text-align: center;
    }

    .tarjeta-esqueleto {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .esqueleto-lote {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .esqueleto-lote-texto {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .estado-titulo {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .app-estado-error ion-button {
      width: 100%;
    }
  `,
  imports: [
    CampoPesosComponent,
    HojaFechaComponent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    IonLabel,
    IonInput,
    IonNote,
    IonProgressBar,
    IonSegment,
    IonSegmentButton,
    IonSkeletonText,
    IonModal,
    SelectorClienteContenidoComponent,
  ],
})
export class VenderPage {
  private readonly consultarInventario = inject(ConsultarInventario);
  private readonly buscarClientes = inject(BuscarClientes);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly clock = inject(CLOCK);

  private peticionActual = 0;
  private peticionClientes = 0;
  private fechaEditadaManualmente = false;
  private abriendoModalCliente = false;

  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly abriendoResumen = signal(false);
  readonly buscandoClientes = signal(false);
  readonly errorBusquedaClientes = signal<string | null>(null);

  readonly lotes = signal<Lote[]>([]);
  readonly clientesSelector = signal<Cliente[]>([]);
  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly busquedaCliente = signal('');

  readonly lineas = signal<LineaBorrador[]>([]);
  readonly fechaSeleccionada = signal<FechaHora>(this.clock.ahora());
  readonly modalidad = signal<ModalidadVenta>('CONTADO');
  readonly medio = signal<MedioPago>('EFECTIVO');
  readonly montoAbonoInicial = signal<number | null>(null);
  readonly generacionReinicio = signal(0);

  readonly selectorClienteAbierto = signal(false);
  readonly selectorFechaAbierto = signal(false);

  readonly formatearPesos = formatearPesos;
  readonly etiquetaPapel = etiquetaPapel;
  readonly esMostrador = computed(() => this.clienteSeleccionado()?.esMostrador ?? true);
  readonly maxFecha = signal<FechaHora>(this.clock.ahora());

  readonly fechaLegible = computed(() => {
    const f = this.fechaSeleccionada();
    const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(f);
    if (!match) {
      return f;
    }
    const [, anio, mesStr, diaStr, horaStr, minStr] = match;
    const mes = MESES_CORTOS[Number(mesStr) - 1] ?? mesStr;
    const dia = Number(diaStr);
    const hora24 = Number(horaStr);
    const sufijo = hora24 >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
    return `${dia} ${mes} ${anio} · ${hora12}:${minStr} ${sufijo}`;
  });

  readonly lineasEvaluadas = computed<LineaEvaluadaUI[]>(() => {
    return this.lineas().map((linea) => {
      const cantidadTrim = linea.cantidadTexto.trim();
      const parsedCant = cantidadTrim === '' ? NaN : Number(cantidadTrim);
      const cantidadValida = Number.isSafeInteger(parsedCant) && parsedCant > 0;

      let errorCantidad: string | null = null;
      if (linea.disponibles <= 0) {
        errorCantidad = MENSAJES_ERROR.STOCK_INSUFICIENTE;
      } else if (!cantidadValida) {
        errorCantidad = MENSAJES_ERROR.CANTIDAD_RESMAS_INVALIDA;
      } else if (parsedCant > linea.disponibles) {
        errorCantidad = MENSAJES_ERROR.STOCK_INSUFICIENTE;
      }

      const precioValido =
        linea.precioUnitario !== null && Number.isSafeInteger(linea.precioUnitario) && linea.precioUnitario > 0;
      const errorPrecio = precioValido ? null : MENSAJES_ERROR.PRECIO_INVALIDO;

      if (cantidadValida && precioValido && linea.precioUnitario !== null) {
        const evalRes = evaluarLinea(
          resmasPositivas(parsedCant),
          linea.costoUnitario,
          pesosPositivos(linea.precioUnitario),
        );
        return {
          ...linea,
          cantidadNum: parsedCant,
          errorCantidad,
          errorPrecio,
          subtotalVenta: evalRes.subtotalVenta,
          subtotalCosto: evalRes.subtotalCosto,
          margen: evalRes.margen,
          bajoCosto: evalRes.bajoCosto,
          perdidaLinea: evalRes.bajoCosto ? perdida(evalRes.subtotalVenta, evalRes.subtotalCosto) : pesos(0),
        };
      }

      return {
        ...linea,
        cantidadNum: cantidadValida ? parsedCant : null,
        errorCantidad,
        errorPrecio,
        subtotalVenta: null,
        subtotalCosto: null,
        margen: null,
        bajoCosto: false,
        perdidaLinea: pesos(0),
      };
    });
  });

  readonly totalVenta = computed<Pesos>(() =>
    this.lineasEvaluadas().reduce(
      (acc, l) => (l.subtotalVenta !== null ? sumarPesos(acc, l.subtotalVenta) : acc),
      pesos(0),
    ),
  );

  readonly costoTotal = computed<Pesos>(() =>
    this.lineasEvaluadas().reduce(
      (acc, l) => (l.subtotalCosto !== null ? sumarPesos(acc, l.subtotalCosto) : acc),
      pesos(0),
    ),
  );

  readonly margenTotal = computed<Pesos>(() => restarPesos(this.totalVenta(), this.costoTotal()));

  readonly quedaDebiendo = computed<Pesos>(() => {
    const total = this.totalVenta();
    if (this.modalidad() !== 'ABONO_INICIAL') {
      return total;
    }
    const abono = this.montoAbonoInicial();
    if (abono === null || !Number.isSafeInteger(abono) || abono < 0 || abono >= total) {
      return total;
    }
    return restarPesos(total, pesos(abono));
  });

  readonly errorFecha = computed<string | null>(() => {
    const fecha = this.fechaSeleccionada();
    if (fecha > this.clock.ahora()) {
      return MENSAJES_ERROR.FECHA_FUTURA;
    }
    const ultimaCompra = ultimaFechaCompra(this.lineas());
    if (ultimaCompra !== null && fecha < ultimaCompra) {
      const [anio, mes, dia] = ultimaCompra.slice(0, 10).split('-');
      return `${MENSAJES_ERROR.VENTA_ANTERIOR_A_COMPRA} (${dia}/${mes}/${anio})`;
    }
    return null;
  });

  readonly errorAbonoInicial = computed<string | null>(() => {
    if (this.modalidad() !== 'ABONO_INICIAL') {
      return null;
    }
    const monto = this.montoAbonoInicial();
    const total = this.totalVenta();
    if (monto === null || !Number.isSafeInteger(monto) || monto < 1 || monto >= total) {
      return MENSAJES_ERROR.ABONO_INICIAL_INVALIDO;
    }
    return null;
  });

  readonly puedeConfirmar = computed(() => {
    if (this.abriendoResumen() || this.guardando() || this.cargando() || this.errorCarga() !== null) {
      return false;
    }
    if (!this.clienteSeleccionado()) {
      return false;
    }
    const evals = this.lineasEvaluadas();
    if (evals.length === 0) {
      return false;
    }
    if (evals.some((l) => l.errorCantidad !== null || l.errorPrecio !== null)) {
      return false;
    }
    if (this.errorFecha() !== null || this.errorAbonoInicial() !== null) {
      return false;
    }
    return true;
  });

  readonly textoBotonConfirmar = computed(() => {
    const total = this.totalVenta();
    return this.puedeConfirmar() && total > 0 ? `Confirmar venta · ${formatearPesos(total)}` : 'Confirmar venta';
  });

  readonly mostrarAyudaConfirmar = computed(
    () => this.lineasEvaluadas().length > 0 && !this.puedeConfirmar() && !this.guardando() && !this.cargando(),
  );

  constructor() {
    addIcons({
      personOutline,
      calendarOutline,
      chevronForwardOutline,
      trashOutline,
      add,
      checkmark,
      alertCircleOutline,
      cubeOutline,
      warningOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    if (!this.fechaEditadaManualmente) {
      this.fechaSeleccionada.set(this.clock.ahora());
    }
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    const idPeticion = ++this.peticionActual;
    this.cargando.set(true);

    try {
      const [inventario, clientes] = await Promise.all([
        this.consultarInventario.activos(),
        this.buscarClientes.buscar('', { incluirMostrador: true }),
      ]);
      if (idPeticion !== this.peticionActual) {
        return;
      }

      const nuevosLotes = [...inventario.CARTA, ...inventario.OFICIO];
      this.lotes.set(nuevosLotes);
      this.sincronizarLineasConLotes(nuevosLotes);
      this.clientesSelector.set(clientes);
      if (this.clienteSeleccionado() === null) {
        const mostrador = clientes.find((c) => c.esMostrador) ?? null;
        if (!mostrador) {
          this.errorCarga.set(MENSAJE_ERROR_GENERICO);
          return;
        }
        this.clienteSeleccionado.set(mostrador);
      }
      this.errorCarga.set(null);
    } catch (error: unknown) {
      if (idPeticion !== this.peticionActual) {
        return;
      }
      this.errorCarga.set(mensajeDeError(error));
    } finally {
      if (idPeticion === this.peticionActual) {
        this.cargando.set(false);
      }
    }
  }

  loteYaAgregado(idLote: number): boolean {
    return this.lineas().some((l) => l.idLote === idLote);
  }

  agregarLote(lote: Lote): void {
    if (this.guardando() || this.loteYaAgregado(lote.idLote)) {
      return;
    }
    this.lineas.update((actuales) => [
      ...actuales,
      {
        idLote: lote.idLote,
        tipoPapel: lote.tipoPapel,
        fechaCompra: lote.fechaCompra,
        costoUnitario: lote.costoUnitarioResma,
        disponibles: lote.resmasDisponibles,
        cantidadTexto: '1',
        precioUnitario: null,
      },
    ]);
  }

  quitarLinea(idLote: number): void {
    if (this.guardando()) {
      return;
    }
    this.lineas.update((actuales) => actuales.filter((l) => l.idLote !== idLote));
  }

  onCantidadInput(idLote: number, event: CustomEvent | Event): void {
    this.actualizarCantidad(idLote, leerValorEvento(event));
  }

  actualizarCantidad(idLote: number, cantidadTexto: string): void {
    this.lineas.update((actuales) => actuales.map((l) => (l.idLote === idLote ? { ...l, cantidadTexto } : l)));
  }

  actualizarPrecio(idLote: number, precioUnitario: number | null): void {
    this.lineas.update((actuales) => actuales.map((l) => (l.idLote === idLote ? { ...l, precioUnitario } : l)));
  }

  abrirSelectorCliente(): void {
    if (this.guardando() || this.cargando() || this.errorCarga() !== null) {
      return;
    }
    this.busquedaCliente.set('');
    this.selectorClienteAbierto.set(true);
    void this.buscarClientesSelector('');
  }

  cerrarSelectorCliente(): void {
    this.selectorClienteAbierto.set(false);
  }

  onBuscarClienteTexto(texto: string): void {
    this.busquedaCliente.set(texto);
    void this.buscarClientesSelector(texto);
  }

  onBuscarClienteClear(): void {
    this.busquedaCliente.set('');
    void this.buscarClientesSelector('');
  }

  reintentarBusquedaClientes(): void {
    void this.buscarClientesSelector(this.busquedaCliente());
  }

  private async buscarClientesSelector(texto: string): Promise<void> {
    const idPeticion = ++this.peticionClientes;
    this.buscandoClientes.set(true);
    try {
      const lista = await this.buscarClientes.buscar(texto, { incluirMostrador: true });
      if (idPeticion !== this.peticionClientes) {
        return;
      }
      this.clientesSelector.set(lista);
      this.errorBusquedaClientes.set(null);
    } catch (error: unknown) {
      if (idPeticion !== this.peticionClientes) {
        return;
      }
      this.errorBusquedaClientes.set(mensajeDeError(error));
    } finally {
      if (idPeticion === this.peticionClientes) {
        this.buscandoClientes.set(false);
      }
    }
  }

  seleccionarCliente(cliente: Cliente): void {
    this.clienteSeleccionado.set(cliente);
    if (cliente.esMostrador) {
      this.modalidad.set('CONTADO');
    }
    this.selectorClienteAbierto.set(false);
  }

  async crearNuevoCliente(): Promise<void> {
    if (this.abriendoModalCliente || this.guardando()) {
      return;
    }

    this.abriendoModalCliente = true;
    try {
      const modal = await this.modalCtrl.create({
        component: ClienteModalComponent,
        breakpoints: [0, 0.72, 1],
        initialBreakpoint: 0.72,
        cssClass: 'modal-sheet',
        canDismiss: soloCierreExplicito,
      });
      await modal.present();
      const { data, role } = await modal.onDidDismiss<Cliente>();
      if (role === ROL_GUARDADO && data) {
        this.seleccionarCliente(data);
      }
    } catch (error: unknown) {
      await this.mostrarToastError(error);
    } finally {
      this.abriendoModalCliente = false;
    }
  }

  abrirSelectorFecha(): void {
    if (this.guardando() || this.cargando()) {
      return;
    }
    this.maxFecha.set(this.clock.ahora());
    this.selectorFechaAbierto.set(true);
  }

  cerrarSelectorFecha(): void {
    this.selectorFechaAbierto.set(false);
  }

  onFechaSeleccionada(fechaTexto: string): void {
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/.exec(fechaTexto);
    if (!match) {
      return;
    }
    const [, datePart, hmPart, secPart] = match;
    this.fechaEditadaManualmente = true;
    this.fechaSeleccionada.set(fechaHora(`${datePart} ${hmPart}:${secPart ?? '00'}`));
  }

  onModalidadChange(event: CustomEvent): void {
    const val = event.detail?.value as ModalidadVenta | undefined;
    if (val === 'CONTADO' || (!this.esMostrador() && (val === 'FIADO' || val === 'ABONO_INICIAL'))) {
      this.modalidad.set(val);
    }
  }

  onMedioChange(event: CustomEvent): void {
    const val = event.detail?.value as MedioPago | undefined;
    if (val === 'EFECTIVO' || val === 'TRANSFERENCIA') {
      this.medio.set(val);
    }
  }

  async abrirResumen(): Promise<void> {
    if (!this.puedeConfirmar()) {
      return;
    }
    const cliente = this.clienteSeleccionado();
    if (!cliente) {
      return;
    }

    const lineasResumen: LineaResumenVenta[] = [];
    for (const l of this.lineasEvaluadas()) {
      if (l.cantidadNum === null || l.precioUnitario === null || l.subtotalVenta === null) {
        return;
      }
      lineasResumen.push({
        idLote: l.idLote,
        tipoPapel: l.tipoPapel,
        cantidad: l.cantidadNum,
        precioUnitario: pesos(l.precioUnitario),
        subtotalVenta: l.subtotalVenta,
      });
    }

    const pago = this.construirPago();
    if (!pago) {
      return;
    }

    if (!this.fechaEditadaManualmente) {
      this.fechaSeleccionada.set(this.clock.ahora());
    }

    let ventaGuardada = false;
    let recargaPendiente: Promise<void> | null = null;

    this.abriendoResumen.set(true);
    try {
      const modal = await this.modalCtrl.create({
        component: ResumenVentaModalComponent,
        breakpoints: [0, 0.85, 1],
        initialBreakpoint: 0.85,
        cssClass: 'modal-sheet',
        componentProps: {
          cliente,
          lineas: lineasResumen,
          totalVenta: this.totalVenta(),
          pago,
          fecha: this.fechaSeleccionada(),
          alCambiarGuardando: (estado: boolean) => this.guardando.set(estado),
          alGuardar: () => {
            ventaGuardada = true;
            this.reiniciarFormulario();
            recargaPendiente = this.cargarDatos();
          },
        },
        canDismiss: soloCierreExplicito,
      });

      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === ROL_GUARDADO || ventaGuardada) {
        if (!ventaGuardada) {
          this.reiniciarFormulario();
          await this.cargarDatos();
        } else if (recargaPendiente) {
          await recargaPendiente;
        }
      } else if (role === ROL_ERROR) {
        await this.cargarDatos();
      }
    } catch (error: unknown) {
      await this.mostrarToastError(error);
    } finally {
      this.guardando.set(false);
      this.abriendoResumen.set(false);
    }
  }

  private async mostrarToastError(error: unknown): Promise<void> {
    try {
      const toast = await this.toastCtrl.create({
        message: mensajeDeError(error),
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    } catch {
      // Avoid unhandled rejection if toast fails
    }
  }

  private construirPago(): PagoVenta | null {
    switch (this.modalidad()) {
      case 'CONTADO':
        return { modalidad: 'CONTADO', medio: this.medio() };
      case 'FIADO':
        return { modalidad: 'FIADO' };
      case 'ABONO_INICIAL': {
        const monto = this.montoAbonoInicial();
        if (monto === null) {
          return null;
        }
        return {
          modalidad: 'ABONO_INICIAL',
          monto,
          medio: this.medio(),
        };
      }
    }
  }

  private sincronizarLineasConLotes(nuevosLotes: readonly Lote[]): void {
    const porId = new Map(nuevosLotes.map((l) => [l.idLote, l]));
    this.lineas.update((actuales) =>
      actuales.map((linea) => {
        const loteActual = porId.get(linea.idLote);
        if (!loteActual) {
          return {
            ...linea,
            disponibles: 0,
          };
        }
        return {
          ...linea,
          disponibles: loteActual.resmasDisponibles,
          fechaCompra: loteActual.fechaCompra,
        };
      }),
    );
  }

  private reiniciarFormulario(): void {
    const mostrador = this.clientesSelector().find((c) => c.esMostrador) ?? null;
    this.clienteSeleccionado.set(mostrador);
    this.lineas.set([]);
    this.modalidad.set('CONTADO');
    this.medio.set('EFECTIVO');
    this.montoAbonoInicial.set(null);
    this.generacionReinicio.update((g) => g + 1);
    this.fechaEditadaManualmente = false;
    this.fechaSeleccionada.set(this.clock.ahora());
  }
}
