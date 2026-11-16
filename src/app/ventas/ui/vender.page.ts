import { Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonDatetime,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, calendarOutline, closeOutline, personOutline, trashOutline } from 'ionicons/icons';

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
import { MENSAJES_ERROR, MENSAJE_ERROR_GENERICO, mensajeDeError } from '../../shared/ui/mensajes-error';
import { evaluarLinea, perdida } from '../domain/margen';
import type { PagoVenta } from '../domain/venta';

import { type LineaResumenVenta, ROL_ERROR, ResumenVentaModalComponent } from './resumen-venta.modal';
import { SelectorClienteContenidoComponent } from './selector-cliente-contenido.component';
import { etiquetaPapel, leerValorEvento } from './venta-ui.helpers';

export type ModalidadVenta = 'CONTADO' | 'FIADO' | 'ABONO_INICIAL';

interface LineaBorrador {
  readonly idLote: number;
  readonly tipoPapel: TipoPapel;
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

@Component({
  selector: 'app-vender',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Vender</ion-title>
      </ion-toolbar>
      @if (cargando() || guardando()) {
        <ion-progress-bar
          type="indeterminate"
          [attr.data-testid]="guardando() ? 'indicador-guardando' : 'indicador-carga'"
        ></ion-progress-bar>
      }
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Cliente -->
      <ion-item
        button
        detail="true"
        [disabled]="guardando() || cargando() || errorCarga() !== null"
        [attr.aria-disabled]="guardando() || cargando() || errorCarga() !== null ? 'true' : null"
        (click)="abrirSelectorCliente()"
        data-testid="selector-cliente"
      >
        <ion-icon name="person-outline" slot="start"></ion-icon>
        <ion-label>
          <p>Cliente</p>
          <h2>{{ clienteSeleccionado()?.nombre ?? '' }}</h2>
        </ion-label>
      </ion-item>

      @if (errorCarga(); as error) {
        <div class="estado-error ion-text-center ion-padding" data-testid="estado-error">
          <p data-testid="mensaje-error-carga">{{ error }}</p>
          <ion-button
            (click)="cargarDatos()"
            [disabled]="cargando()"
            [attr.aria-disabled]="cargando() ? 'true' : null"
            data-testid="btn-reintentar"
          >
            Reintentar
          </ion-button>
        </div>
      } @else if (!cargando() && lotes().length === 0) {
        <div class="mensaje-vacio ion-text-center ion-padding" data-testid="mensaje-sin-lotes">
          <p>No hay lotes activos. Registra una compra en Inventario</p>
        </div>
      } @else {
        <!-- Lotes activos -->
        <h3 class="seccion-titulo">Lotes activos</h3>
        <ion-list data-testid="lista-lotes">
          @for (lote of lotes(); track lote.idLote) {
            <ion-item
              button
              [disabled]="guardando() || loteYaAgregado(lote.idLote)"
              [attr.aria-disabled]="guardando() || loteYaAgregado(lote.idLote) ? 'true' : null"
              (click)="agregarLote(lote)"
              data-testid="item-lote"
            >
              <ion-label>
                <h2>{{ etiquetaPapel(lote.tipoPapel) }} · {{ lote.resmasDisponibles }} resmas</h2>
                <p>Costo por resma: {{ formatearPesos(lote.costoUnitarioResma) }}</p>
              </ion-label>
              <ion-icon name="add" slot="end"></ion-icon>
            </ion-item>
          }
        </ion-list>

        <!-- Líneas de venta -->
        @if (lineasEvaluadas().length > 0) {
          <h3 class="seccion-titulo">Detalle de venta</h3>
          @for (linea of lineasEvaluadas(); track linea.idLote) {
            <ion-card class="tarjeta-linea" data-testid="linea-venta">
              <ion-card-header>
                <div class="linea-cabecera">
                  <div>
                    <ion-card-title>{{ etiquetaPapel(linea.tipoPapel) }}</ion-card-title>
                    <p class="linea-costo">
                      Costo: {{ formatearPesos(linea.costoUnitario) }} · Disp: {{ linea.disponibles }}
                    </p>
                  </div>
                  <ion-button
                    fill="clear"
                    color="danger"
                    aria-label="Quitar línea"
                    [disabled]="guardando()"
                    [attr.aria-disabled]="guardando() ? 'true' : null"
                    (click)="quitarLinea(linea.idLote)"
                    data-testid="btn-quitar-linea"
                  >
                    <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-header>

              <ion-card-content>
                <ion-item>
                  <ion-input
                    label="Cantidad (resmas)"
                    labelPlacement="stacked"
                    type="number"
                    inputmode="numeric"
                    [value]="linea.cantidadTexto"
                    [disabled]="guardando()"
                    [attr.aria-disabled]="guardando() ? 'true' : null"
                    [attr.aria-invalid]="linea.errorCantidad ? 'true' : null"
                    (ionInput)="onCantidadInput(linea.idLote, $event)"
                    data-testid="input-cantidad"
                  ></ion-input>
                </ion-item>
                @if (linea.errorCantidad; as errCant) {
                  <ion-note color="danger" class="ion-padding-start" data-testid="error-cantidad">
                    {{ errCant }}
                  </ion-note>
                }

                <app-campo-pesos
                  label="Precio unitario"
                  [valor]="linea.precioUnitario"
                  (valorChange)="actualizarPrecio(linea.idLote, $event)"
                  [disabled]="guardando()"
                  [error]="linea.errorPrecio"
                  errorTestId="error-precio-unitario"
                  placeholder="Ej: 15000"
                  data-testid="input-precio-unitario"
                />

                @if (linea.subtotalVenta !== null && linea.margen !== null) {
                  <div class="linea-totales ion-padding-top">
                    <span
                      >Subtotal: <strong>{{ formatearPesos(linea.subtotalVenta) }}</strong></span
                    >
                    <span
                      >Margen: <strong>{{ formatearPesos(linea.margen) }}</strong></span
                    >
                  </div>
                }

                @if (linea.bajoCosto) {
                  <ion-note color="warning" class="aviso-bajo-costo" data-testid="aviso-bajo-costo">
                    Precio por debajo del costo: pierdes {{ formatearPesos(linea.perdidaLinea) }}
                  </ion-note>
                }
              </ion-card-content>
            </ion-card>
          }
        }

        <!-- Fecha -->
        <ion-item
          button
          detail="true"
          [disabled]="guardando() || cargando()"
          [attr.aria-disabled]="guardando() || cargando() ? 'true' : null"
          (click)="abrirSelectorFecha()"
          data-testid="btn-fecha-venta"
        >
          <ion-icon name="calendar-outline" slot="start"></ion-icon>
          <ion-label>
            <p>Fecha</p>
            <h2>{{ fechaSeleccionada() }}</h2>
          </ion-label>
        </ion-item>
        @if (errorFecha(); as errFecha) {
          <ion-note color="danger" class="ion-padding-start" data-testid="error-fecha">
            {{ errFecha }}
          </ion-note>
        }

        <!-- Cierre -->
        <ion-card class="tarjeta-cierre" data-testid="resumen-totales">
          <ion-card-content>
            <div class="totales-grid">
              <div>
                Total: <strong>{{ formatearPesos(totalVenta()) }}</strong>
              </div>
              <div>
                Costo: <strong>{{ formatearPesos(costoTotal()) }}</strong>
              </div>
              <div>
                Margen: <strong>{{ formatearPesos(margenTotal()) }}</strong>
              </div>
            </div>

            <ion-segment
              [value]="modalidad()"
              [disabled]="guardando() || cargando()"
              [attr.aria-disabled]="guardando() || cargando() ? 'true' : null"
              (ionChange)="onModalidadChange($event)"
              class="ion-margin-top"
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

            @if (modalidad() === 'CONTADO' || modalidad() === 'ABONO_INICIAL') {
              <ion-segment
                [value]="medio()"
                [disabled]="guardando() || cargando()"
                [attr.aria-disabled]="guardando() || cargando() ? 'true' : null"
                (ionChange)="onMedioChange($event)"
                class="ion-margin-top"
                data-testid="segment-medio"
              >
                <ion-segment-button value="EFECTIVO" data-testid="segment-efectivo">
                  <ion-label>Efectivo</ion-label>
                </ion-segment-button>
                <ion-segment-button value="TRANSFERENCIA" data-testid="segment-transferencia">
                  <ion-label>Transferencia</ion-label>
                </ion-segment-button>
              </ion-segment>
            }

            @if (modalidad() === 'ABONO_INICIAL') {
              <div class="ion-margin-top">
                <app-campo-pesos
                  label="Abono inicial"
                  [(valor)]="montoAbonoInicial"
                  [disabled]="guardando()"
                  [error]="errorAbonoInicial()"
                  errorTestId="error-abono-inicial"
                  placeholder="Ej: 50000"
                  data-testid="input-abono-inicial"
                />
              </div>
            }
          </ion-card-content>
        </ion-card>
      }
    </ion-content>

    <ion-footer class="ion-padding">
      <ion-button
        expand="block"
        [disabled]="!puedeConfirmar()"
        [attr.aria-disabled]="!puedeConfirmar() ? 'true' : null"
        (click)="abrirResumen()"
        data-testid="btn-confirmar-venta"
      >
        Confirmar venta
      </ion-button>
    </ion-footer>

    <!-- Modal selector de cliente -->
    <ion-modal
      [isOpen]="selectorClienteAbierto()"
      (didDismiss)="cerrarSelectorCliente()"
      data-testid="modal-selector-cliente"
    >
      <ng-template>
        <app-selector-cliente-contenido
          [busqueda]="busquedaCliente()"
          [clientes]="clientesSelector()"
          [buscando]="buscandoClientes()"
          [errorBusqueda]="errorBusquedaClientes()"
          (cerrar)="cerrarSelectorCliente()"
          (buscar)="onBuscarClienteTexto($event)"
          (limpiarBusqueda)="onBuscarClienteClear()"
          (nuevoCliente)="crearNuevoCliente()"
          (reintentar)="reintentarBusquedaClientes()"
          (seleccionar)="seleccionarCliente($event)"
        />
      </ng-template>
    </ion-modal>

    <!-- Modal fecha -->
    <ion-modal [isOpen]="selectorFechaAbierto()" (didDismiss)="cerrarSelectorFecha()" data-testid="modal-fecha-venta">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Fecha de la venta</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="cerrarSelectorFecha()">Listo</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-datetime
            presentation="date-time"
            [value]="fechaIsoSeleccionada()"
            [max]="maxFechaIso()"
            (ionChange)="onDatetimeChange($event)"
            data-testid="datetime-fecha-venta"
          ></ion-datetime>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: `
    .seccion-titulo {
      font-size: 1rem;
      font-weight: 600;
      margin: 1rem 0 0.5rem;
    }
    .mensaje-vacio,
    .estado-error {
      margin-top: 3rem;
      color: var(--ion-color-step-600, #666);
    }
    .tarjeta-linea,
    .tarjeta-cierre {
      margin-inline: 0;
      margin-bottom: 0.75rem;
    }
    .linea-cabecera {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .linea-costo {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--ion-color-step-600, #666);
    }
    .linea-totales,
    .totales-grid {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .aviso-bajo-costo {
      display: block;
      margin-top: 0.5rem;
    }
  `,
  imports: [
    CampoPesosComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButton,
    IonButtons,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonInput,
    IonNote,
    IonProgressBar,
    IonSegment,
    IonSegmentButton,
    IonModal,
    IonDatetime,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
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

  readonly selectorClienteAbierto = signal(false);
  readonly selectorFechaAbierto = signal(false);

  readonly formatearPesos = formatearPesos;
  readonly etiquetaPapel = etiquetaPapel;
  readonly esMostrador = computed(() => this.clienteSeleccionado()?.esMostrador ?? true);
  readonly maxFechaIso = signal(this.clock.ahora().replace(' ', 'T'));
  readonly fechaIsoSeleccionada = computed(() => this.fechaSeleccionada().replace(' ', 'T'));

  readonly lineasEvaluadas = computed<LineaEvaluadaUI[]>(() => {
    return this.lineas().map((linea) => {
      const cantidadTrim = linea.cantidadTexto.trim();
      const parsedCant = cantidadTrim === '' ? NaN : Number(cantidadTrim);
      const cantidadValida = Number.isSafeInteger(parsedCant) && parsedCant > 0;

      let errorCantidad: string | null = null;
      if (!cantidadValida) {
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

  readonly errorFecha = computed<string | null>(() =>
    this.fechaSeleccionada() > this.clock.ahora() ? MENSAJES_ERROR.FECHA_FUTURA : null,
  );

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

  constructor() {
    addIcons({ personOutline, calendarOutline, trashOutline, add, closeOutline });
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

      this.lotes.set([...inventario.CARTA, ...inventario.OFICIO]);
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

  onBuscarClienteInput(event: CustomEvent | Event): void {
    this.onBuscarClienteTexto(leerValorEvento(event));
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
    const modal = await this.modalCtrl.create({
      component: ClienteModalComponent,
      canDismiss: soloCierreExplicito,
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss<Cliente>();
    if (role === ROL_GUARDADO && data) {
      this.seleccionarCliente(data);
    }
  }

  abrirSelectorFecha(): void {
    if (this.guardando() || this.cargando()) {
      return;
    }
    this.maxFechaIso.set(this.clock.ahora().replace(' ', 'T'));
    this.selectorFechaAbierto.set(true);
  }

  cerrarSelectorFecha(): void {
    this.selectorFechaAbierto.set(false);
  }

  onDatetimeChange(event: CustomEvent): void {
    const val = event.detail?.value;
    if (typeof val === 'string') {
      this.onFechaSeleccionada(val);
    }
  }

  onFechaSeleccionada(isoString: string): void {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/.exec(isoString);
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

    this.abriendoResumen.set(true);
    try {
      const modal = await this.modalCtrl.create({
        component: ResumenVentaModalComponent,
        componentProps: {
          cliente,
          lineas: lineasResumen,
          totalVenta: this.totalVenta(),
          pago,
          fecha: this.fechaSeleccionada(),
          alCambiarGuardando: (estado: boolean) => this.guardando.set(estado),
        },
        canDismiss: soloCierreExplicito,
      });

      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === ROL_GUARDADO) {
        this.reiniciarFormulario();
        await this.cargarDatos();
      } else if (role === ROL_ERROR) {
        await this.cargarDatos();
      }
    } catch (error: unknown) {
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
    } finally {
      this.guardando.set(false);
      this.abriendoResumen.set(false);
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

  private reiniciarFormulario(): void {
    const mostrador = this.clientesSelector().find((c) => c.esMostrador) ?? null;
    this.clienteSeleccionado.set(mostrador);
    this.lineas.set([]);
    this.modalidad.set('CONTADO');
    this.medio.set('EFECTIVO');
    this.montoAbonoInicial.set(null);
    this.fechaEditadaManualmente = false;
    this.fechaSeleccionada.set(this.clock.ahora());
  }
}
