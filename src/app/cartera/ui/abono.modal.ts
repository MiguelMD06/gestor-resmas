import { Component, computed, ElementRef, inject, Input, type OnInit, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline, cashOutline, chevronForwardOutline, swapHorizontalOutline } from 'ionicons/icons';

import type { Cliente } from '../../clientes/domain/cliente';
import {
  fechaHora,
  formatearPesos,
  pesos,
  restarPesos,
  type FechaHora,
  type MedioPago,
  type Pesos,
} from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { CampoPesosComponent } from '../../shared/ui/campo-pesos.component';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { HojaFechaComponent } from '../../shared/ui/hoja-fecha.component';
import { mensajeDeError, MENSAJES_ERROR } from '../../shared/ui/mensajes-error';
import type { SolicitudRegistrarAbono } from '../application/registrar-abono';
import {
  abonarFactura,
  deudaTotal,
  distribuirCascada,
  liquidarTodo,
  saldo,
  validarFechaAbono,
  type AplicacionAbono,
  type FacturaAbierta,
} from '../domain';

import { formatearFechaCorta, formatearFechaDiaMes, formatearFechaHoraLegible } from './abono-ui.helpers';
import { type LineaResumenAbono, ResumenAbonoModalComponent } from './resumen-abono.modal';

export type ModoAbono = SolicitudRegistrarAbono['modo'];

interface PreviewAplicacion {
  readonly idVenta: number;
  readonly fechaCorta: string;
  readonly monto: Pesos;
  readonly capital: Pesos;
  readonly ganancia: Pesos;
  readonly quedaPagada: boolean;
  readonly saldoRestante: Pesos;
}

@Component({
  selector: 'app-abono-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="abono-toolbar" data-testid="abono-cabecera">
        <div class="abono-cabecera-texto">
          <ion-title class="abono-titulo">Registrar abono</ion-title>
          <span class="abono-subtitulo">
            {{ clienteSignal().nombre }} · debe
            <strong class="abono-deuda">{{ formatearPesos(deudaTotalCliente()) }}</strong>
          </span>
        </div>
        <ion-buttons slot="end">
          <ion-button
            color="secondary"
            class="abono-cancelar"
            [disabled]="guardando() || abriendoResumen()"
            [attr.aria-disabled]="guardando() || abriendoResumen() ? 'true' : null"
            (click)="cancelar()"
            data-testid="btn-cancelar-abono"
          >
            Cancelar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="abono-contenido">
      <div class="abono-cuerpo">
        <!-- Modo de abono -->
        <ion-segment
          aria-label="Cómo se aplica el abono"
          [value]="modo()"
          [disabled]="guardando()"
          [attr.aria-disabled]="guardando() ? 'true' : null"
          (ionChange)="onModoChange($event)"
          data-testid="segment-modo"
        >
          <ion-segment-button value="CASCADA_GLOBAL" data-testid="modo-cascada">
            <ion-label>A la deuda</ion-label>
          </ion-segment-button>
          <ion-segment-button value="FACTURA_INDIVIDUAL" data-testid="modo-factura">
            <ion-label>A una factura</ion-label>
          </ion-segment-button>
          <ion-segment-button value="LIQUIDACION_TOTAL" data-testid="modo-pagar-todo">
            <ion-label>Pagar todo</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Selección de factura (solo en "A una factura") -->
        @if (modo() === 'FACTURA_INDIVIDUAL') {
          <fieldset class="grupo-facturas" [disabled]="guardando()">
            <legend class="grupo-etiqueta">Factura</legend>
            @for (f of facturasOrdenadas(); track f.idVenta) {
              <label
                class="opcion-factura"
                [class.opcion-factura-sel]="idVentaSeleccionada() === f.idVenta"
                data-testid="opcion-factura"
              >
                <input
                  type="radio"
                  name="factura"
                  [value]="f.idVenta"
                  [checked]="idVentaSeleccionada() === f.idVenta"
                  [disabled]="guardando()"
                  (change)="seleccionarFactura(f.idVenta)"
                />
                <span class="opcion-factura-info">
                  <span class="opcion-factura-nombre">Factura #{{ f.idVenta }}</span>
                  <span class="opcion-factura-fecha">{{ formatearFechaCorta(f.fecha) }}</span>
                </span>
                <span class="opcion-factura-saldo">
                  Saldo <strong>{{ formatearPesos(saldoFactura(f)) }}</strong>
                </span>
              </label>
            }
          </fieldset>
        }

        <!-- Monto -->
        @if (modo() === 'LIQUIDACION_TOTAL') {
          <div>
            <ion-input
              fill="outline"
              label="Monto a pagar"
              labelPlacement="stacked"
              type="text"
              [value]="formatearPesos(deudaTotalCliente())"
              [readonly]="true"
              aria-readonly="true"
              [disabled]="guardando()"
              [attr.aria-disabled]="guardando() ? 'true' : null"
              class="campo-fijo"
              data-testid="input-monto-pagar-todo"
            ></ion-input>
            <p class="ayuda-campo" data-testid="ayuda-pagar-todo">{{ textoPagarTodo() }}</p>
          </div>
        } @else {
          <div>
            <app-campo-pesos
              label="Monto del abono"
              [(valor)]="monto"
              [disabled]="guardando() || (modo() === 'FACTURA_INDIVIDUAL' && facturaSeleccionada() === null)"
              [error]="errorMonto()"
              errorTestId="error-monto"
              class="app-campo-contorno"
              placeholder="$ 0"
              data-testid="input-monto-abono"
            />
            @if (!errorMonto() && ayudaMonto(); as ayuda) {
              <p class="ayuda-campo" data-testid="ayuda-monto">{{ ayuda }}</p>
            }
          </div>
        }

        <!-- Medio de pago -->
        <div class="campo-grupo">
          <span id="lbl-medio" class="campo-grupo-etiqueta">Medio de pago</span>
          <ion-segment
            aria-labelledby="lbl-medio"
            [value]="medio()"
            [disabled]="guardando()"
            [attr.aria-disabled]="guardando() ? 'true' : null"
            (ionChange)="onMedioChange($event)"
            data-testid="segment-medio"
          >
            <ion-segment-button value="EFECTIVO" data-testid="medio-efectivo">
              <div class="medio-opcion">
                <ion-icon name="cash-outline" class="icono-efectivo" aria-hidden="true"></ion-icon>
                <ion-label>Efectivo</ion-label>
              </div>
            </ion-segment-button>
            <ion-segment-button value="TRANSFERENCIA" data-testid="medio-transferencia">
              <div class="medio-opcion">
                <ion-icon name="swap-horizontal-outline" class="icono-transferencia" aria-hidden="true"></ion-icon>
                <ion-label>Transferencia</ion-label>
              </div>
            </ion-segment-button>
          </ion-segment>
        </div>

        <!-- Fecha del abono -->
        <div>
          <div class="campo-selector" [class.campo-error]="errorFecha() !== null" [class.campo-inactivo]="guardando()">
            <span id="lbl-fecha-abono" class="campo-selector-etiqueta campo-selector-etiqueta-modal"
              >Fecha del abono</span
            >
            <button
              type="button"
              class="campo-selector-boton"
              aria-labelledby="lbl-fecha-abono"
              [disabled]="guardando()"
              [attr.aria-disabled]="guardando() ? 'true' : null"
              [attr.aria-invalid]="errorFecha() ? 'true' : null"
              (click)="abrirSelectorFecha()"
              data-testid="btn-fecha-abono"
            >
              <ion-icon
                name="calendar-outline"
                [color]="errorFecha() ? 'danger' : 'secondary'"
                aria-hidden="true"
              ></ion-icon>
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

        <!-- Vista previa -->
        @if (previewAplicaciones().length > 0) {
          <div class="preview-bloque">
            <span class="campo-grupo-etiqueta" data-testid="preview-titulo">
              {{
                modo() === 'FACTURA_INDIVIDUAL' ? 'Así se aplica' : 'Así se aplica · de la más antigua a la más nueva'
              }}
            </span>
            <div class="preview-lista" role="list" aria-label="Distribución del abono">
              @for (item of previewAplicaciones(); track item.idVenta) {
                <div class="preview-fila" role="listitem" data-testid="preview-aplicacion">
                  <span class="preview-info">
                    <span class="preview-factura">Factura #{{ item.idVenta }}</span>
                    <span class="preview-meta">
                      {{ item.fechaCorta }} ·
                      {{ item.quedaPagada ? 'queda pagada' : 'queda debiendo ' + formatearPesos(item.saldoRestante) }}
                    </span>
                  </span>
                  <span class="preview-monto">{{ formatearPesos(item.monto) }}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </ion-content>

    <ion-footer class="abono-footer ion-no-border">
      <ion-button
        expand="block"
        color="primary"
        [disabled]="!puedeRevisar()"
        [attr.aria-disabled]="!puedeRevisar() ? 'true' : null"
        (click)="abrirResumen()"
        data-testid="btn-revisar-abono"
      >
        {{ textoBotonRevisar() }}
      </ion-button>
    </ion-footer>

    <ion-modal
      [isOpen]="selectorFechaAbierto()"
      [breakpoints]="[0, 0.72, 1]"
      [initialBreakpoint]="0.72"
      class="modal-sheet"
      (didDismiss)="cerrarSelectorFecha()"
      data-testid="modal-fecha-abono"
    >
      <ng-template>
        <app-hoja-fecha
          titulo="Fecha del abono"
          [valor]="fechaSeleccionada()"
          [maximo]="maxFecha()"
          (fechaChange)="onFechaSeleccionada($event)"
          (cerrar)="cerrarSelectorFecha()"
        />
      </ng-template>
    </ion-modal>
  `,
  styles: `
    .abono-toolbar {
      --background: var(--app-tarjeta);
      --border-width: 0;
      padding: 10px 12px 4px;
    }

    .abono-cabecera-texto {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-inline: 8px;
    }

    .abono-titulo {
      font-size: 18px;
      font-weight: 600;
      padding: 0;
    }

    .abono-subtitulo {
      font-size: 12px;
      color: var(--app-texto-secundario);
    }

    .abono-deuda {
      color: var(--ion-color-danger, #ff6b6b);
      font-weight: 600;
    }

    .abono-cancelar {
      font-size: 15px;
      font-weight: 600;
      text-transform: none;
    }

    .abono-contenido {
      --background: var(--app-tarjeta);
    }

    .abono-cuerpo {
      padding: 14px 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .grupo-facturas {
      margin: 0;
      padding: 0;
      border: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .grupo-etiqueta,
    .campo-grupo-etiqueta {
      font-size: 13px;
      color: var(--app-texto-secundario);
      padding: 0;
    }

    .campo-grupo {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .campo-fijo {
      --background: var(--app-tarjeta-elevada, #17181b);
      --border-color: var(--app-tarjeta-elevada, #17181b);
    }

    .medio-opcion {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .icono-efectivo {
      color: #8fcb6b;
      font-size: 18px;
    }

    .icono-transferencia {
      color: #b49cf0;
      font-size: 18px;
    }

    .campo-selector-etiqueta-modal {
      background: var(--app-tarjeta, #0f1012);
    }

    .preview-bloque {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .preview-lista {
      background: var(--app-tarjeta-elevada, #17181b);
      border-radius: 14px;
      padding: 2px 14px;
    }

    .preview-fila {
      min-height: 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--app-borde, #1f2125);
    }

    .preview-fila:last-child {
      border-bottom: 0;
    }

    .preview-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .preview-factura {
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .preview-meta {
      font-size: 12px;
      color: var(--app-texto-secundario);
    }

    .preview-monto {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .abono-footer {
      background: var(--app-tarjeta);
      padding: 8px 20px 24px;
    }
  `,
  imports: [
    CampoPesosComponent,
    HojaFechaComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonInput,
    IonIcon,
    IonNote,
    IonModal,
  ],
})
export class AbonoModalComponent implements OnInit {
  private readonly clock = inject(CLOCK);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  private readonly _cliente = signal<Cliente>({ idCliente: 0, nombre: '', telefono: null, esMostrador: false });
  private readonly _facturas = signal<readonly FacturaAbierta[]>([]);
  readonly clienteSignal = this._cliente.asReadonly();

  @Input({ required: true }) set cliente(value: Cliente) {
    this._cliente.set(value);
  }
  get cliente(): Cliente {
    return this._cliente();
  }

  @Input({ required: true }) set facturas(value: readonly FacturaAbierta[]) {
    this._facturas.set(value);
  }
  get facturas(): readonly FacturaAbierta[] {
    return this._facturas();
  }

  @Input() modoInicial: ModoAbono = 'CASCADA_GLOBAL';
  @Input() idVentaInicial?: number;

  readonly modo = signal<ModoAbono>('CASCADA_GLOBAL');
  readonly monto = signal<number | null>(null);
  readonly idVentaSeleccionada = signal<number | null>(null);
  readonly medio = signal<MedioPago>('EFECTIVO');
  readonly fechaSeleccionada = signal<FechaHora>(this.clock.ahora());
  readonly maxFecha = signal<FechaHora>(this.clock.ahora());
  readonly selectorFechaAbierto = signal(false);
  readonly guardando = signal(false);
  readonly abriendoResumen = signal(false);
  readonly abonoRegistrado = signal(false);

  readonly formatearPesos = formatearPesos;
  readonly formatearFechaCorta = formatearFechaCorta;
  readonly saldoFactura = saldo;

  readonly facturasOrdenadas = computed<readonly FacturaAbierta[]>(() =>
    this._facturas()
      .filter((f) => saldo(f) > 0)
      .sort((a, b) => {
        if (a.fecha < b.fecha) return -1;
        if (a.fecha > b.fecha) return 1;
        return a.idVenta - b.idVenta;
      }),
  );

  readonly deudaTotalCliente = computed<Pesos>(() => deudaTotal(this.facturasOrdenadas()));

  readonly facturaSeleccionada = computed<FacturaAbierta | null>(() => {
    const id = this.idVentaSeleccionada();
    if (id === null) {
      return null;
    }
    return this.facturasOrdenadas().find((f) => f.idVenta === id) ?? null;
  });

  readonly fechaLegible = computed(() => formatearFechaHoraLegible(this.fechaSeleccionada()));

  readonly ayudaMonto = computed<string | null>(() => {
    if (this.modo() === 'CASCADA_GLOBAL') {
      return `Hasta ${formatearPesos(this.deudaTotalCliente())}`;
    }
    if (this.modo() === 'FACTURA_INDIVIDUAL') {
      const fac = this.facturaSeleccionada();
      return fac ? `Hasta ${formatearPesos(saldo(fac))}` : null;
    }
    return null;
  });

  readonly textoPagarTodo = computed<string>(() => {
    const count = this.facturasOrdenadas().length;
    return count === 1 ? 'Salda la factura con saldo' : `Salda las ${count} facturas con saldo`;
  });

  readonly errorMonto = computed<string | null>(() => {
    const m = this.modo();
    if (m === 'LIQUIDACION_TOTAL') {
      return null;
    }
    const val = this.monto();
    if (val === null) {
      return null;
    }
    if (!Number.isSafeInteger(val) || val <= 0) {
      return MENSAJES_ERROR.MONTO_INVALIDO;
    }
    if (m === 'CASCADA_GLOBAL') {
      return val > this.deudaTotalCliente() ? MENSAJES_ERROR.MONTO_SUPERA_DEUDA : null;
    }
    const fac = this.facturaSeleccionada();
    if (fac !== null && val > saldo(fac)) {
      return MENSAJES_ERROR.MONTO_SUPERA_SALDO_FACTURA;
    }
    return null;
  });

  readonly aplicacionesDominio = computed<readonly AplicacionAbono[]>(() => {
    const facturas = this.facturasOrdenadas();
    if (facturas.length === 0) {
      return [];
    }
    const m = this.modo();
    if (m === 'LIQUIDACION_TOTAL') {
      return liquidarTodo(facturas);
    }
    if (this.errorMonto() !== null) {
      return [];
    }
    const val = this.monto();
    if (val === null || val <= 0) {
      return [];
    }
    if (m === 'CASCADA_GLOBAL') {
      return distribuirCascada(facturas, pesos(val));
    }
    const fac = this.facturaSeleccionada();
    if (fac === null) {
      return [];
    }
    return [abonarFactura(fac, pesos(val))];
  });

  readonly previewAplicaciones = computed<readonly PreviewAplicacion[]>(() => {
    const porId = new Map(this.facturasOrdenadas().map((f) => [f.idVenta, f]));
    return this.aplicacionesDominio().map((app) => {
      const fac = porId.get(app.idVenta)!;
      return {
        idVenta: app.idVenta,
        fechaCorta: formatearFechaDiaMes(fac.fecha),
        monto: app.monto,
        capital: app.capital,
        ganancia: app.ganancia,
        quedaPagada: app.quedaPagada,
        saldoRestante: restarPesos(saldo(fac), app.monto),
      };
    });
  });

  readonly errorFecha = computed<string | null>(() => {
    const ahora = this.clock.ahora();
    const porId = new Map(this.facturasOrdenadas().map((f) => [f.idVenta, f]));
    const facturasQueReciben = this.aplicacionesDominio()
      .map((app) => porId.get(app.idVenta))
      .filter((f): f is FacturaAbierta => f !== undefined);
    try {
      validarFechaAbono(this.fechaSeleccionada(), ahora, facturasQueReciben);
      return null;
    } catch (error: unknown) {
      return mensajeDeError(error);
    }
  });

  readonly puedeRevisar = computed<boolean>(() => {
    if (this.guardando() || this.abriendoResumen() || this.abonoRegistrado()) {
      return false;
    }
    if (this.deudaTotalCliente() <= 0) {
      return false;
    }
    const m = this.modo();
    if (m === 'FACTURA_INDIVIDUAL' && this.facturaSeleccionada() === null) {
      return false;
    }
    if (m !== 'LIQUIDACION_TOTAL') {
      const val = this.monto();
      if (val === null || this.errorMonto() !== null) {
        return false;
      }
    }
    if (this.errorFecha() !== null) {
      return false;
    }
    return this.aplicacionesDominio().length > 0;
  });

  readonly textoBotonRevisar = computed<string>(() => {
    const m = this.modo();
    if (m === 'LIQUIDACION_TOTAL') {
      return `Revisar pago · ${formatearPesos(this.deudaTotalCliente())}`;
    }
    if (m === 'FACTURA_INDIVIDUAL' && this.facturaSeleccionada() === null) {
      return 'Revisar abono';
    }
    const val = this.monto();
    if (val !== null && val > 0 && this.errorMonto() === null) {
      return `Revisar abono · ${formatearPesos(pesos(val))}`;
    }
    return 'Revisar abono';
  });

  constructor() {
    addIcons({ calendarOutline, chevronForwardOutline, cashOutline, swapHorizontalOutline });
  }

  ngOnInit(): void {
    this.modo.set(this.modoInicial ?? 'CASCADA_GLOBAL');
    const ordenadas = this.facturasOrdenadas();
    if (this.idVentaInicial !== undefined) {
      if (ordenadas.some((f) => f.idVenta === this.idVentaInicial)) {
        this.idVentaSeleccionada.set(this.idVentaInicial);
      }
    } else if (ordenadas.length === 1) {
      this.idVentaSeleccionada.set(ordenadas[0].idVenta);
    }
    const hostModal = this.elementRef.nativeElement.closest('ion-modal') as
      (HTMLElement & { canDismiss?: (data?: unknown, role?: string) => Promise<boolean> }) | null;
    if (hostModal) {
      hostModal.canDismiss = async (_data?: unknown, role?: string) =>
        role === ROL_GUARDADO || (!this.guardando() && !this.abriendoResumen() && role === ROL_CANCELAR);
    }
  }

  onModoChange(event: CustomEvent): void {
    const val = event.detail?.value as ModoAbono | undefined;
    if (val === 'CASCADA_GLOBAL' || val === 'FACTURA_INDIVIDUAL' || val === 'LIQUIDACION_TOTAL') {
      this.modo.set(val);
      if (val === 'FACTURA_INDIVIDUAL' && this.idVentaSeleccionada() === null) {
        const ordenadas = this.facturasOrdenadas();
        if (ordenadas.length === 1) {
          this.idVentaSeleccionada.set(ordenadas[0].idVenta);
        }
      }
    }
  }

  seleccionarFactura(idVenta: number): void {
    if (this.guardando()) {
      return;
    }
    this.idVentaSeleccionada.set(idVenta);
  }

  onMedioChange(event: CustomEvent): void {
    const val = event.detail?.value as MedioPago | undefined;
    if (val === 'EFECTIVO' || val === 'TRANSFERENCIA') {
      this.medio.set(val);
    }
  }

  abrirSelectorFecha(): void {
    if (this.guardando()) {
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
    this.fechaSeleccionada.set(fechaHora(`${datePart} ${hmPart}:${secPart ?? '00'}`));
  }

  async cancelar(): Promise<void> {
    if (this.guardando() || this.abriendoResumen()) {
      return;
    }
    if (this.abonoRegistrado()) {
      try {
        await this.modalCtrl.dismiss({ guardado: true }, ROL_GUARDADO);
      } catch {
        // Payment already persisted; ignore modal dismiss failure
      }
      return;
    }
    await this.modalCtrl.dismiss(null, ROL_CANCELAR);
  }

  async abrirResumen(): Promise<void> {
    if (!this.puedeRevisar()) {
      return;
    }

    const solicitud = this.construirSolicitud();
    if (!solicitud) {
      return;
    }

    const lineas: LineaResumenAbono[] = this.previewAplicaciones().map((item) => ({
      idVenta: item.idVenta,
      monto: item.monto,
      capital: item.capital,
      ganancia: item.ganancia,
      quedaPagada: item.quedaPagada,
      saldoRestante: item.saldoRestante,
    }));

    const montoTotal = solicitud.modo === 'LIQUIDACION_TOTAL' ? this.deudaTotalCliente() : solicitud.monto;

    let abonoGuardado = false;
    let resumenGuardando = false;

    this.abriendoResumen.set(true);
    try {
      const modal = await this.modalCtrl.create({
        component: ResumenAbonoModalComponent,
        breakpoints: [0, 0.85, 1],
        initialBreakpoint: 0.85,
        cssClass: 'modal-sheet',
        componentProps: {
          cliente: this._cliente(),
          solicitud,
          montoTotal,
          deudaAnterior: this.deudaTotalCliente(),
          lineas,
          alCambiarGuardando: (estado: boolean) => {
            resumenGuardando = estado;
            this.guardando.set(estado);
          },
          alGuardar: () => {
            abonoGuardado = true;
          },
        },
        canDismiss: async (_data: unknown, role?: string) =>
          !resumenGuardando && (role === ROL_GUARDADO || role === ROL_CANCELAR),
      });

      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === ROL_GUARDADO || abonoGuardado) {
        abonoGuardado = true;
        this.abonoRegistrado.set(true);
        try {
          await this.modalCtrl.dismiss({ guardado: true }, ROL_GUARDADO);
        } catch {
          // Payment already persisted; ignore modal dismiss failure
        }
      }
    } catch (error: unknown) {
      if (abonoGuardado) {
        this.abonoRegistrado.set(true);
        return;
      }
      try {
        const toast = await this.toastCtrl.create({
          message: mensajeDeError(error),
          duration: 3000,
          color: 'danger',
          position: 'bottom',
        });
        await toast.present();
      } catch {
        // Ignore toast errors
      }
    } finally {
      this.guardando.set(false);
      this.abriendoResumen.set(false);
    }
  }

  private construirSolicitud(): SolicitudRegistrarAbono | null {
    const idCliente = this._cliente().idCliente;
    const fecha = this.fechaSeleccionada();
    const medio = this.medio();
    const m = this.modo();

    if (m === 'LIQUIDACION_TOTAL') {
      return { modo: 'LIQUIDACION_TOTAL', idCliente, fecha, medio };
    }

    const val = this.monto();
    if (val === null) {
      return null;
    }

    if (m === 'CASCADA_GLOBAL') {
      return { modo: 'CASCADA_GLOBAL', idCliente, fecha, medio, monto: pesos(val) };
    }

    const fac = this.facturaSeleccionada();
    if (fac === null) {
      return null;
    }
    return {
      modo: 'FACTURA_INDIVIDUAL',
      idCliente,
      fecha,
      medio,
      idVenta: fac.idVenta,
      monto: pesos(val),
    };
  }
}
