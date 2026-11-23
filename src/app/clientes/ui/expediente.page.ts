import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cashOutline,
  checkmarkOutline,
  chevronBackOutline,
  phonePortraitOutline,
  receiptOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';

import type { ExpedienteCliente } from '../../cartera/application/consultar-expediente';
import { ConsultarExpediente } from '../../cartera/application/consultar-expediente';
import type { FacturaAbierta } from '../../cartera/domain';
import type { FacturaExpediente } from '../../cartera/infrastructure/cartera.repository';
import { etiquetaMedioPago, formatearFechaHoraLegible } from '../../cartera/ui/abono-ui.helpers';
import { AbonoModalComponent, type ModoAbono } from '../../cartera/ui/abono.modal';
import { formatearPesos, ReglaNegocioError } from '../../shared/domain';
import { ROL_GUARDADO, soloCierreExplicito } from '../../shared/ui/formulario';
import { iniciales } from '../../shared/ui/iniciales';
import { mensajeDeError, MENSAJES_ERROR } from '../../shared/ui/mensajes-error';
import { etiquetaPapel } from '../../ventas/ui/venta-ui.helpers';

import { ClienteModalComponent } from './cliente.modal';
import { calcularAplicacionesQuePagaron, etiquetaEstadoFactura, etiquetaTipoAbono } from './expediente-ui.helpers';

type PestanaExpediente = 'facturas' | 'abonos';

interface ErrorExpediente {
  readonly mensaje: string;
  readonly esInexistente: boolean;
}

@Component({
  selector: 'app-expediente',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="exp-toolbar">
        <button
          slot="start"
          type="button"
          class="btn-volver-icono"
          aria-label="Volver"
          (click)="volver()"
          data-testid="btn-volver"
        >
          <ion-icon name="chevron-back-outline" aria-hidden="true"></ion-icon>
        </button>

        @if (expediente() && !errorCarga()) {
          <button
            slot="end"
            type="button"
            class="btn-editar-texto"
            aria-label="Editar cliente"
            [disabled]="cargando()"
            [attr.aria-disabled]="cargando() ? 'true' : null"
            (click)="abrirEditar()"
            data-testid="btn-editar-cliente"
          >
            Editar
          </button>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="exp-contenido">
        @if (errorCarga(); as error) {
          <div class="app-estado-error exp-error" role="alert" data-testid="estado-error">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <p class="estado-mensaje" data-testid="mensaje-error-carga">{{ error.mensaje }}</p>
            <div class="app-error-acciones" [class.una-accion]="error.esInexistente">
              <ion-button
                fill="outline"
                color="secondary"
                expand="block"
                (click)="volver()"
                data-testid="btn-volver-error"
              >
                Volver
              </ion-button>
              @if (!error.esInexistente) {
                <ion-button color="primary" expand="block" (click)="reintentar()" data-testid="btn-reintentar">
                  Reintentar
                </ion-button>
              }
            </div>
          </div>
        } @else if (cargando()) {
          <div class="exp-cargando" aria-busy="true" aria-label="Cargando expediente" data-testid="indicador-carga">
            <div class="exp-cabecera-esqueleto">
              <ion-skeleton-text [animated]="true" class="esqueleto-avatar-lg"></ion-skeleton-text>
              <div class="app-esqueleto-bloque">
                <ion-skeleton-text [animated]="true" style="width: 60%"></ion-skeleton-text>
                <ion-skeleton-text [animated]="true" style="width: 40%"></ion-skeleton-text>
              </div>
            </div>

            <section class="app-tarjeta deuda-tarjeta" aria-label="Deuda del cliente">
              <ion-skeleton-text [animated]="true" style="width: 45%; height: 28px"></ion-skeleton-text>
              <div class="acciones-deuda">
                <ion-button
                  expand="block"
                  color="primary"
                  [disabled]="true"
                  aria-disabled="true"
                  data-testid="btn-registrar-abono"
                >
                  Registrar abono
                </ion-button>
                <ion-button
                  expand="block"
                  fill="outline"
                  color="secondary"
                  [disabled]="true"
                  aria-disabled="true"
                  data-testid="btn-pagar-todo"
                >
                  Pagar todo
                </ion-button>
              </div>
            </section>

            <div class="app-tarjeta app-esqueleto-bloque">
              <ion-skeleton-text [animated]="true" style="width: 50%"></ion-skeleton-text>
              <ion-skeleton-text [animated]="true" style="width: 85%"></ion-skeleton-text>
              <ion-skeleton-text [animated]="true" style="width: 70%"></ion-skeleton-text>
            </div>
          </div>
        } @else if (expediente(); as exp) {
          <header class="app-cabecera-perfil">
            <div class="app-avatar-lg exp-avatar" aria-hidden="true">{{ iniciales(exp.cliente.nombre) }}</div>
            <div class="exp-identidad">
              <h1 class="exp-nombre" data-testid="expediente-nombre">{{ exp.cliente.nombre }}</h1>
              <span class="exp-celular" data-testid="expediente-celular">
                <ion-icon name="phone-portrait-outline" aria-hidden="true"></ion-icon>
                {{ exp.cliente.telefono || 'Sin celular' }}
              </span>
            </div>
          </header>

          <section class="app-tarjeta deuda-tarjeta" aria-label="Deuda del cliente">
            <div class="deuda-encabezado">
              <div class="deuda-principal">
                <span class="meta">Deuda total</span>
                <span
                  class="deuda-total-valor"
                  [class.tiene-deuda]="exp.deuda.total > 0"
                  data-testid="expediente-deuda-total"
                >
                  {{ formatearPesos(exp.deuda.total) }}
                </span>
              </div>
              <span class="meta deuda-facturas-estado" data-testid="expediente-facturas-con-saldo">
                @if (exp.deuda.total === 0) {
                  <ion-icon name="checkmark-outline" aria-hidden="true"></ion-icon>
                  Al día
                } @else {
                  {{ facturasConSaldo() }} {{ facturasConSaldo() === 1 ? 'factura con saldo' : 'facturas con saldo' }}
                }
              </span>
            </div>

            <div class="app-cifras">
              <div class="app-cifra">
                <span class="meta">Capital por recuperar</span>
                <span class="cifra-valor" data-testid="expediente-capital">{{
                  formatearPesos(exp.deuda.capital)
                }}</span>
              </div>
              <div class="app-cifra">
                <span class="meta">Ganancia por cobrar</span>
                <span class="cifra-valor" data-testid="expediente-ganancia">
                  {{ formatearPesos(exp.deuda.ganancia) }}
                </span>
              </div>
            </div>

            <div class="acciones-deuda">
              <ion-button
                expand="block"
                color="primary"
                [disabled]="exp.deuda.total <= 0"
                [attr.aria-disabled]="exp.deuda.total <= 0 ? 'true' : null"
                (click)="abrirAbono('CASCADA_GLOBAL')"
                data-testid="btn-registrar-abono"
              >
                Registrar abono
              </ion-button>
              <ion-button
                expand="block"
                fill="outline"
                color="secondary"
                [disabled]="exp.deuda.total <= 0"
                [attr.aria-disabled]="exp.deuda.total <= 0 ? 'true' : null"
                (click)="abrirAbono('LIQUIDACION_TOTAL')"
                data-testid="btn-pagar-todo"
              >
                @if (exp.deuda.total > 0) {
                  Pagar todo · {{ formatearPesos(exp.deuda.total) }}
                } @else {
                  Pagar todo
                }
              </ion-button>
            </div>
          </section>

          <ion-segment
            [value]="pestana()"
            (ionChange)="onPestanaChange($event)"
            aria-label="Historial del cliente"
            data-testid="segment-expediente"
          >
            <ion-segment-button value="facturas" data-testid="segment-facturas">
              <ion-label>Facturas · {{ exp.facturas.length }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="abonos" data-testid="segment-abonos">
              <ion-label>Abonos · {{ exp.abonos.length }}</ion-label>
            </ion-segment-button>
          </ion-segment>

          @if (pestana() === 'facturas') {
            @if (exp.facturas.length === 0) {
              <div class="app-estado-vacio" data-testid="mensaje-sin-compras">
                <ion-icon name="receipt-outline" aria-hidden="true"></ion-icon>
                <p class="estado-mensaje">Este cliente todavía no tiene compras</p>
              </div>
            } @else {
              <div class="app-lista-historial" role="list" aria-label="Facturas">
                @for (factura of exp.facturas; track factura.idVenta) {
                  <article
                    role="listitem"
                    class="app-tarjeta app-tarjeta-historial"
                    [attr.aria-label]="'Factura ' + factura.idVenta"
                    data-testid="tarjeta-factura"
                  >
                    <div class="tarjeta-cabecera">
                      <div class="tarjeta-titulo-bloque">
                        <span class="tarjeta-titulo">Factura #{{ factura.idVenta }}</span>
                        <span class="meta">{{ formatearFechaHoraLegible(factura.fecha) }}</span>
                      </div>
                      <span
                        class="app-chip"
                        [class.app-chip-pendiente]="factura.estado === 'PENDIENTE'"
                        [class.app-chip-parcial]="factura.estado === 'PARCIAL'"
                        [class.app-chip-pagada]="factura.estado === 'PAGADA'"
                        data-testid="estado-factura"
                      >
                        @if (factura.estado === 'PAGADA') {
                          <ion-icon name="checkmark-outline" aria-hidden="true"></ion-icon>
                        }
                        {{ etiquetaEstadoFactura(factura.estado) }}
                      </span>
                    </div>

                    <div class="lineas-factura">
                      @for (linea of factura.lineas; track $index) {
                        <div class="linea-factura">
                          <span>
                            {{ linea.cantidad }} × {{ etiquetaPapel(linea.tipoPapel) }}
                            <span class="meta">· {{ formatearPesos(linea.precioUnitario) }} c/u</span>
                          </span>
                          <span class="linea-subtotal">{{ formatearPesos(linea.subtotal) }}</span>
                        </div>
                      }
                    </div>

                    @if (factura.estado !== 'PAGADA') {
                      <div class="app-cifras">
                        <div class="app-cifra">
                          <span class="meta">Pagado</span>
                          <span class="cifra-pagado">
                            {{ formatearPesos(factura.pagado) }} de {{ formatearPesos(factura.total) }}
                          </span>
                        </div>
                        <div class="app-cifra app-cifra-derecha">
                          <span class="meta">Saldo</span>
                          <span class="cifra-saldo">{{ formatearPesos(factura.saldo) }}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="app-btn-texto"
                        (click)="abrirAbono('FACTURA_INDIVIDUAL', factura.idVenta)"
                        data-testid="btn-abonar-factura"
                      >
                        Abonar a esta factura
                      </button>
                    }
                  </article>
                }
              </div>
            }
          } @else {
            @if (exp.abonos.length === 0) {
              <div class="app-estado-vacio" data-testid="mensaje-sin-abonos">
                <ion-icon name="cash-outline" aria-hidden="true"></ion-icon>
                <p class="estado-mensaje">Este cliente todavía no tiene abonos</p>
              </div>
            } @else {
              <div class="app-lista-historial" role="list" aria-label="Abonos">
                @for (abono of exp.abonos; track abono.idAbono) {
                  <article
                    role="listitem"
                    class="app-tarjeta app-tarjeta-historial"
                    [attr.aria-label]="'Abono de ' + formatearPesos(abono.monto)"
                    data-testid="tarjeta-abono"
                  >
                    <div class="tarjeta-cabecera">
                      <div class="tarjeta-titulo-bloque">
                        <span class="abono-monto">{{ formatearPesos(abono.monto) }}</span>
                        <span class="meta">
                          {{ formatearFechaHoraLegible(abono.fecha) }} · {{ etiquetaTipoAbono(abono.tipo) }}
                        </span>
                      </div>
                      <span
                        class="app-chip"
                        [class.app-chip-efectivo]="abono.medio === 'EFECTIVO'"
                        [class.app-chip-transferencia]="abono.medio === 'TRANSFERENCIA'"
                      >
                        <ion-icon
                          [name]="abono.medio === 'EFECTIVO' ? 'cash-outline' : 'swap-horizontal-outline'"
                          aria-hidden="true"
                        ></ion-icon>
                        {{ etiquetaMedioPago(abono.medio) }}
                      </span>
                    </div>

                    <div class="app-aplicado-bloque" role="list" aria-label="Aplicado a">
                      @for (app of abono.aplicaciones; track app.idVenta) {
                        <div role="listitem" class="app-aplicado-fila" data-testid="aplicacion-abono">
                          <span>
                            Factura #{{ app.idVenta }}
                            @if (quedoPagada(abono.idAbono, app.idVenta)) {
                              <span class="meta">· quedó pagada</span>
                            }
                          </span>
                          <span class="aplicado-monto">{{ formatearPesos(app.monto) }}</span>
                        </div>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          }
        }
      </div>
    </ion-content>
  `,
  styles: `
    .exp-toolbar {
      --background: #000;
      --border-width: 0;
      padding: 4px 4px 0;
    }
    .btn-volver-icono,
    .btn-editar-texto {
      height: 44px;
      border: 0;
      background: transparent;
      color: #5ec8f2;
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    .btn-volver-icono {
      width: 44px;
      padding: 0;
      font-size: 22px;
      justify-content: center;
    }
    .btn-editar-texto {
      padding: 0 12px;
      font-size: 15px;
      font-weight: 600;
    }
    .exp-contenido,
    .exp-cargando,
    .exp-identidad,
    .deuda-tarjeta,
    .deuda-principal,
    .acciones-deuda,
    .app-tarjeta-historial,
    .tarjeta-titulo-bloque,
    .lineas-factura {
      display: flex;
      flex-direction: column;
    }
    .exp-contenido,
    .exp-cargando {
      gap: 20px;
      padding-bottom: 24px;
    }
    .exp-cabecera-esqueleto {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .esqueleto-avatar-lg {
      width: 56px;
      height: 56px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .exp-identidad,
    .deuda-principal {
      gap: 4px;
      min-width: 0;
    }
    .exp-nombre {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #f5f5f5;
    }
    .exp-celular {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #a1a1aa;
    }
    .meta {
      font-size: 12px;
      color: #a1a1aa;
    }
    .deuda-tarjeta {
      gap: 16px;
    }
    .deuda-encabezado,
    .tarjeta-cabecera,
    .linea-factura {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .deuda-encabezado {
      align-items: flex-end;
    }
    .tarjeta-cabecera {
      align-items: flex-start;
    }
    .linea-factura {
      align-items: baseline;
      font-size: 14px;
      color: #f5f5f5;
    }
    .deuda-total-valor {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #f5f5f5;
    }
    .deuda-total-valor.tiene-deuda,
    .cifra-saldo {
      color: #ff6b6b;
    }
    .deuda-facturas-estado {
      padding-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tarjeta-titulo-bloque {
      gap: 2px;
    }
    .cifra-valor,
    .tarjeta-titulo {
      font-size: 15px;
      font-weight: 600;
      color: #f5f5f5;
    }
    .cifra-pagado,
    .estado-mensaje {
      font-size: 14px;
      font-weight: 600;
      color: #f5f5f5;
      margin: 0;
    }
    .cifra-saldo {
      font-size: 14px;
      font-weight: 700;
    }
    .acciones-deuda {
      gap: 10px;
    }
    .abono-monto {
      font-size: 18px;
      font-weight: 700;
      color: #f5f5f5;
    }
    .lineas-factura {
      gap: 6px;
    }
    .linea-subtotal,
    .aplicado-monto {
      font-weight: 600;
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonButton,
    IonIcon,
    IonContent,
    IonSkeletonText,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
})
export class ExpedientePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly consultarExpediente = inject(ConsultarExpediente);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  private peticionActual = 0;
  private abriendoModal = false;
  private idClienteActual: number | null = null;

  readonly expediente = signal<ExpedienteCliente | null>(null);
  readonly pestana = signal<PestanaExpediente>('facturas');
  readonly cargando = signal(false);
  readonly errorCarga = signal<ErrorExpediente | null>(null);

  readonly facturasConSaldo = computed(() => {
    const exp = this.expediente();
    if (!exp) {
      return 0;
    }
    return exp.facturas.filter((f) => f.saldo > 0).length;
  });

  readonly aplicacionesQuePagaron = computed<ReadonlySet<string>>(() => {
    const exp = this.expediente();
    if (!exp) {
      return new Set();
    }
    return calcularAplicacionesQuePagaron(exp.facturas, exp.abonos);
  });

  readonly iniciales = iniciales;
  readonly formatearPesos = formatearPesos;
  readonly formatearFechaHoraLegible = formatearFechaHoraLegible;
  readonly etiquetaMedioPago = etiquetaMedioPago;
  readonly etiquetaPapel = etiquetaPapel;
  readonly etiquetaEstadoFactura = etiquetaEstadoFactura;
  readonly etiquetaTipoAbono = etiquetaTipoAbono;

  constructor() {
    addIcons({
      chevronBackOutline,
      phonePortraitOutline,
      checkmarkOutline,
      alertCircleOutline,
      cashOutline,
      swapHorizontalOutline,
      receiptOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    const rawId = this.route.snapshot.paramMap.get('id');
    const idCliente = Number(rawId);
    if (!rawId || !Number.isSafeInteger(idCliente) || idCliente <= 0) {
      ++this.peticionActual;
      this.idClienteActual = null;
      this.cargando.set(false);
      this.expediente.set(null);
      this.errorCarga.set({ mensaje: MENSAJES_ERROR.CLIENTE_INEXISTENTE, esInexistente: true });
      return;
    }
    this.idClienteActual = idCliente;
    await this.cargarExpediente(idCliente);
  }

  async cargarExpediente(idCliente: number): Promise<void> {
    const idPeticion = ++this.peticionActual;
    this.cargando.set(true);
    this.errorCarga.set(null);

    try {
      const datos = await this.consultarExpediente.consultar(idCliente);
      if (idPeticion !== this.peticionActual) {
        return;
      }
      this.expediente.set(datos);
      this.errorCarga.set(null);
    } catch (error: unknown) {
      if (idPeticion !== this.peticionActual) {
        return;
      }
      const esInexistente = error instanceof ReglaNegocioError && error.codigo === 'CLIENTE_INEXISTENTE';
      this.errorCarga.set({ mensaje: mensajeDeError(error), esInexistente });
    } finally {
      if (idPeticion === this.peticionActual) {
        this.cargando.set(false);
      }
    }
  }

  async reintentar(): Promise<void> {
    if (this.idClienteActual === null || this.cargando()) {
      return;
    }
    await this.cargarExpediente(this.idClienteActual);
  }

  volver(): void {
    void this.router.navigate(['/clientes']);
  }

  onPestanaChange(event: CustomEvent): void {
    const val = event.detail?.value;
    if (val === 'facturas' || val === 'abonos') {
      this.pestana.set(val);
    }
  }

  quedoPagada(idAbono: number, idVenta: number): boolean {
    return this.aplicacionesQuePagaron().has(`${idAbono}:${idVenta}`);
  }

  async abrirEditar(): Promise<void> {
    const exp = this.expediente();
    if (!exp || this.cargando() || this.abriendoModal) {
      return;
    }

    this.abriendoModal = true;
    try {
      const modal = await this.modalCtrl.create({
        component: ClienteModalComponent,
        componentProps: { cliente: exp.cliente },
        canDismiss: soloCierreExplicito,
        cssClass: 'modal-sheet',
        breakpoints: [0, 0.65, 0.9],
        initialBreakpoint: 0.65,
      });
      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === ROL_GUARDADO) {
        await this.cargarExpediente(exp.cliente.idCliente);
      }
    } catch (error: unknown) {
      await this.mostrarToastError(error);
    } finally {
      this.abriendoModal = false;
    }
  }

  async abrirAbono(modoInicial: ModoAbono, idVentaInicial?: number): Promise<void> {
    const exp = this.expediente();
    if (!exp || exp.deuda.total <= 0 || this.cargando() || this.abriendoModal) {
      return;
    }

    const facturasAbiertas = this.aFacturasAbiertasAntiguasPrimero(exp.facturas);
    const props =
      idVentaInicial !== undefined
        ? { cliente: exp.cliente, facturas: facturasAbiertas, modoInicial, idVentaInicial }
        : { cliente: exp.cliente, facturas: facturasAbiertas, modoInicial };

    this.abriendoModal = true;
    try {
      const modal = await this.modalCtrl.create({
        component: AbonoModalComponent,
        componentProps: props,
        canDismiss: soloCierreExplicito,
        cssClass: 'modal-sheet',
        breakpoints: [0, 1],
        initialBreakpoint: 1,
      });
      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === ROL_GUARDADO) {
        await this.cargarExpediente(exp.cliente.idCliente);
      }
    } catch (error: unknown) {
      await this.mostrarToastError(error);
    } finally {
      this.abriendoModal = false;
    }
  }

  private aFacturasAbiertasAntiguasPrimero(facturas: readonly FacturaExpediente[]): FacturaAbierta[] {
    return facturas
      .filter((f) => f.saldo > 0)
      .map((f) => ({
        idVenta: f.idVenta,
        fecha: f.fecha,
        total: f.total,
        costoBase: f.costoBase,
        pagado: f.pagado,
      }))
      .sort((a, b) => {
        if (a.fecha < b.fecha) return -1;
        if (a.fecha > b.fecha) return 1;
        return a.idVenta - b.idVenta;
      });
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
}
