import type { OnInit } from '@angular/core';
import { Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
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
import { alertCircleOutline, calendarOutline, chevronForwardOutline, warningOutline } from 'ionicons/icons';

import { AporteModalComponent } from '../../finanzas/ui/aporte.modal';
import {
  fechaHora,
  formatearPesos,
  ReglaNegocioError,
  type FechaHora,
  type MedioPago,
  type Pesos,
  type TipoPapel,
} from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { CampoPesosComponent } from '../../shared/ui/campo-pesos.component';
import { esVacio, soloCierreExplicito } from '../../shared/ui/formulario';
import { HojaFechaComponent } from '../../shared/ui/hoja-fecha.component';
import { MENSAJES_ERROR, mensajeDeError } from '../../shared/ui/mensajes-error';
import { RegistrarCompra } from '../application/registrar-compra';

interface VistaPreviaCompra {
  costoTotal: Pesos;
  costoUnitarioResma: Pesos;
  reinversion: Pesos;
  saldoBolsillo: Pesos;
  alcanza: boolean;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatearFechaCorta(fechaStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaStr.trim());
  if (!match) {
    return fechaStr;
  }
  const anio = match[1];
  const mesIdx = Number(match[2]) - 1;
  const dia = Number(match[3]);
  const mes = MESES_CORTOS[mesIdx] ?? match[2];
  return `${dia} ${mes} ${anio}`;
}

@Component({
  selector: 'app-nueva-compra-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Nueva compra de cajas</ion-title>
        <ion-buttons slot="end">
          <ion-button
            color="secondary"
            fill="clear"
            class="btn-cancelar"
            (click)="cancelar()"
            [disabled]="guardando()"
            [attr.aria-disabled]="guardando()"
            data-testid="btn-cancelar"
          >
            Cancelar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      @if (guardando()) {
        <ion-progress-bar type="indeterminate" color="primary" data-testid="indicador-guardando"></ion-progress-bar>
      }
    </ion-header>

    <ion-content class="ion-padding">
      <div class="formulario-compra">
        <div class="grupo-campo">
          <span class="etiqueta-grupo" id="lbl-tipo-papel">Tipo de papel</span>
          <ion-segment
            [value]="tipoPapel()"
            [disabled]="guardando()"
            [attr.aria-disabled]="guardando() ? 'true' : null"
            aria-labelledby="lbl-tipo-papel"
            (ionChange)="onTipoPapelChange($event)"
            data-testid="select-tipo-papel"
          >
            <ion-segment-button value="CARTA" data-testid="segment-papel-carta">
              <ion-label>Carta</ion-label>
            </ion-segment-button>
            <ion-segment-button value="OFICIO" data-testid="segment-papel-oficio">
              <ion-label>Oficio</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <div class="grupo-campo">
          <div class="campo-selector" [class.campo-error]="errorFecha() !== null" [class.campo-inactivo]="guardando()">
            <span id="lbl-fecha-compra" class="campo-selector-etiqueta">Fecha</span>
            <button
              type="button"
              class="campo-selector-boton"
              aria-labelledby="lbl-fecha-compra"
              [disabled]="guardando()"
              [attr.aria-disabled]="guardando() ? 'true' : null"
              [attr.aria-invalid]="errorFecha() !== null ? 'true' : null"
              (click)="abrirSelectorFecha()"
              data-testid="input-fecha"
            >
              <ion-icon name="calendar-outline" color="secondary" aria-hidden="true"></ion-icon>
              <span class="campo-selector-valor" [class.valor-vacio]="!fecha().trim()">
                {{ fecha().trim() ? formatearFechaCorta(fecha()) : 'Sin fecha' }}
              </span>
              <ion-icon name="chevron-forward-outline" class="campo-selector-flecha" aria-hidden="true"></ion-icon>
            </button>
          </div>
          @if (errorFecha(); as error) {
            <p class="ayuda-campo ayuda-error" data-testid="error-fecha">
              <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
              <span>{{ error }}</span>
            </p>
          }
        </div>

        <div class="fila-campos">
          <div class="grupo-campo">
            <ion-input
              fill="outline"
              label="Cantidad de cajas"
              labelPlacement="floating"
              type="number"
              [value]="cajas()"
              [disabled]="guardando()"
              [attr.aria-disabled]="guardando() ? 'true' : null"
              [attr.aria-invalid]="errorCajas() !== null ? 'true' : null"
              [class.ion-invalid]="errorCajas() !== null"
              [class.ion-touched]="errorCajas() !== null"
              (ionInput)="onCajasInput($event)"
              placeholder="Ej: 2"
              data-testid="input-cajas"
            ></ion-input>
            @if (errorCajas(); as error) {
              <p class="ayuda-campo ayuda-error" data-testid="error-cajas">
                <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
                <span>{{ error }}</span>
              </p>
            } @else {
              <p class="ayuda-campo">Cada caja trae 10 resmas</p>
            }
          </div>

          <div class="grupo-campo">
            <app-campo-pesos
              label="Costo por caja"
              [(valor)]="costoPorCaja"
              (valorChange)="actualizarPrevisualizacion()"
              [disabled]="guardando()"
              [error]="errorCosto()"
              errorTestId="error-costo-caja"
              class="app-campo-contorno"
              placeholder="Ej: 120000"
              data-testid="input-costo-caja"
            />
            @if (!errorCosto()) {
              <p class="ayuda-campo">Divisible entre 10</p>
            }
          </div>
        </div>

        <div class="grupo-campo">
          <span class="etiqueta-grupo" id="lbl-medio-compra">Medio de pago</span>
          <ion-segment
            [value]="medio()"
            [disabled]="guardando()"
            [attr.aria-disabled]="guardando() ? 'true' : null"
            aria-labelledby="lbl-medio-compra"
            (ionChange)="onMedioChange($event)"
            data-testid="select-medio"
          >
            <ion-segment-button value="EFECTIVO" data-testid="segment-medio-efectivo">
              <ion-label>Efectivo</ion-label>
            </ion-segment-button>
            <ion-segment-button value="TRANSFERENCIA" data-testid="segment-medio-transferencia">
              <ion-label>Transferencia</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        @if (errorInesperado()) {
          <p class="ayuda-campo ayuda-error" data-testid="error-inesperado">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <span>{{ errorInesperado() }}</span>
          </p>
        }

        @if (calculando()) {
          <div class="tarjeta-previa-esqueleto" aria-busy="true" aria-label="Calculando vista previa">
            <div class="seccion-cabecera">
              <ion-skeleton-text [animated]="true" style="width: 40%; height: 12px"></ion-skeleton-text>
              <ion-skeleton-text [animated]="true" style="width: 25%; height: 16px"></ion-skeleton-text>
            </div>
            <ion-skeleton-text [animated]="true" style="width: 100%; height: 10px"></ion-skeleton-text>
            <ion-skeleton-text [animated]="true" style="width: 80%; height: 10px"></ion-skeleton-text>
          </div>
        } @else if (vistaPrevia(); as vp) {
          <ion-card class="tarjeta-previa" aria-label="Vista previa de la compra">
            <ion-card-content class="previa-contenido">
              <div class="seccion-cabecera">
                <span class="previa-etiqueta">Entran al inventario</span>
                <span class="previa-resmas">{{ resmasEntran() }} resmas</span>
              </div>

              <div class="previa-filas">
                <div class="seccion-cabecera previa-fila">
                  <span>Costo total: </span>
                  <span>{{ formatearPesos(vp.costoTotal) }}</span>
                </div>
                <div class="seccion-cabecera previa-fila">
                  <span>Costo por resma: </span>
                  <span>{{ formatearPesos(vp.costoUnitarioResma) }}</span>
                </div>
                <div class="seccion-cabecera previa-fila">
                  <span>Saldo disponible en {{ medio() === 'EFECTIVO' ? 'Efectivo' : 'Transferencia' }}: </span>
                  <span [class.saldo-insuficiente]="!vp.alcanza">{{ formatearPesos(vp.saldoBolsillo) }}</span>
                </div>
              </div>

              @if (!vp.alcanza) {
                <p class="ayuda-campo ayuda-error" data-testid="aviso-saldo-insuficiente">
                  <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
                  <span>El saldo del bolsillo no alcanza para esta compra.</span>
                </p>
                <ion-button
                  expand="block"
                  fill="outline"
                  color="secondary"
                  [disabled]="guardando()"
                  [attr.aria-disabled]="guardando()"
                  (click)="abrirModalAporte()"
                  data-testid="btn-aportar-capital"
                >
                  Aportar capital
                </ion-button>
              }

              @if (vp.reinversion > 0) {
                <p class="ayuda-campo aviso" data-testid="aviso-reinversion">
                  <ion-icon name="warning-outline" aria-hidden="true"></ion-icon>
                  <span>Se reinvierten {{ formatearPesos(vp.reinversion) }} de la ganancia libre</span>
                </p>
              }
            </ion-card-content>
          </ion-card>
        }

        <div class="pie-modal">
          <ion-button
            color="primary"
            expand="block"
            [disabled]="!puedeGuardar()"
            [attr.aria-disabled]="!puedeGuardar()"
            [attr.aria-busy]="guardando() ? 'true' : null"
            (click)="guardar()"
            data-testid="btn-guardar-compra"
          >
            {{ textoBotonGuardar() }}
          </ion-button>
        </div>
      </div>
    </ion-content>

    <ion-modal
      [isOpen]="selectorFechaAbierto()"
      [breakpoints]="[0, 0.85, 1]"
      [initialBreakpoint]="0.85"
      class="modal-sheet"
      (didDismiss)="cerrarSelectorFecha()"
      data-testid="modal-fecha-compra"
    >
      <ng-template>
        <app-hoja-fecha
          titulo="Fecha de la compra"
          [valor]="fechaHoraParaHoja()"
          [maximo]="maxFecha()"
          datetimeTestId="datetime-fecha-compra"
          (fechaChange)="onFechaSeleccionada($event)"
          (cerrar)="cerrarSelectorFecha()"
        />
      </ng-template>
    </ion-modal>
  `,
  styles: `
    ion-toolbar {
      --background: var(--app-tarjeta);
      --border-width: 0;
      padding-top: 8px;
    }

    ion-title {
      font-size: 18px;
      font-weight: 600;
    }

    ion-content {
      --background: var(--app-tarjeta);
    }

    .btn-cancelar {
      font-size: 15px;
      font-weight: 600;
      text-transform: none;
      letter-spacing: normal;
    }

    .campo-selector-etiqueta {
      background: var(--app-tarjeta);
    }

    .formulario-compra,
    .grupo-campo,
    .tarjeta-previa-esqueleto,
    .previa-contenido,
    .previa-filas {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .formulario-compra {
      gap: 20px;
      padding-bottom: 16px;
    }

    .grupo-campo {
      gap: 6px;
    }

    .etiqueta-grupo,
    .previa-etiqueta {
      font-size: 13px;
      color: var(--app-texto-secundario);
    }

    .valor-vacio,
    .previa-fila span:first-child {
      color: var(--app-texto-secundario);
    }

    .fila-campos {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    }

    .ayuda-campo {
      margin-top: 2px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }

    .ayuda-campo ion-icon {
      flex-shrink: 0;
      font-size: 14px;
      margin-top: 1px;
    }

    .aviso {
      color: var(--ion-color-warning);
    }

    .saldo-insuficiente {
      color: var(--ion-color-danger) !important;
    }

    .tarjeta-previa-esqueleto,
    .tarjeta-previa {
      background: var(--app-tarjeta-elevada);
      border-radius: 16px;
      margin: 0;
      box-shadow: none;
    }

    .tarjeta-previa-esqueleto,
    .previa-contenido {
      padding: 16px;
    }

    .previa-resmas {
      font-size: 20px;
      font-weight: 700;
      color: var(--ion-text-color);
    }

    .previa-filas {
      padding-top: 12px;
      border-top: 1px solid var(--app-borde);
    }

    .previa-fila {
      font-size: 14px;
      gap: 8px;
    }

    .previa-fila span:last-child {
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .pie-modal {
      margin-top: 4px;
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
    IonIcon,
    IonInput,
    IonLabel,
    IonModal,
    IonProgressBar,
    IonSegment,
    IonSegmentButton,
    IonSkeletonText,
    IonCard,
    IonCardContent,
  ],
})
export class NuevaCompraModalComponent implements OnInit {
  private readonly clock = inject(CLOCK);
  private readonly registrarCompra = inject(RegistrarCompra);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private peticionActual = 0;

  readonly tipoPapel = signal<TipoPapel>('CARTA');
  readonly fecha = signal<string>(this.clock.ahora().split(' ')[0]);
  readonly horaSeleccionada = signal<string | null>(null);
  readonly cajas = signal<number | null>(null);
  readonly costoPorCaja = signal<number | null>(null);
  readonly medio = signal<MedioPago>('EFECTIVO');
  readonly selectorFechaAbierto = signal(false);

  readonly vistaPrevia = signal<VistaPreviaCompra | null>(null);
  readonly errorCajas = signal<string | null>(null);
  readonly errorCosto = signal<string | null>(null);
  readonly errorInesperado = signal<string | null>(null);

  readonly maxFecha = signal<FechaHora>(this.clock.ahora());

  readonly fechaHoraParaHoja = computed<FechaHora>(() => {
    const f = this.fecha().trim();
    if (!f) {
      return this.clock.ahora();
    }
    const hora = this.horaSeleccionada() ?? this.clock.ahora().split(' ')[1];
    return fechaHora(`${f} ${hora}`);
  });

  readonly errorFecha = computed<string | null>(() => {
    const f = this.fecha().trim();
    if (!f) {
      return 'Elige una fecha';
    }
    const ahora = this.clock.ahora();
    const hora = this.horaSeleccionada() ?? ahora.split(' ')[1];
    if (`${f} ${hora}` > ahora) {
      return MENSAJES_ERROR.FECHA_FUTURA;
    }
    return null;
  });

  readonly resmasEntran = computed(() => {
    const c = this.cajas();
    return c !== null && c > 0 ? c * 10 : 0;
  });

  readonly guardando = signal(false);
  readonly calculando = signal(false);

  readonly puedeGuardar = computed(() => {
    if (this.guardando() || this.calculando()) {
      return false;
    }
    const sinErrorFecha = this.errorFecha() === null;
    const tieneVista = Boolean(this.vistaPrevia()?.alcanza);
    const sinErrores = !this.errorCajas() && !this.errorCosto() && !this.errorInesperado();
    const camposCompletos = !esVacio(this.cajas()) && !esVacio(this.costoPorCaja());
    return sinErrorFecha && tieneVista && sinErrores && camposCompletos;
  });

  readonly textoBotonGuardar = computed(() => {
    if (this.guardando()) {
      return 'Guardando compra…';
    }
    const vp = this.vistaPrevia();
    if (vp) {
      return `Guardar compra · ${formatearPesos(vp.costoTotal)}`;
    }
    return 'Guardar compra';
  });

  readonly formatearPesos = formatearPesos;
  readonly formatearFechaCorta = formatearFechaCorta;

  constructor() {
    addIcons({ alertCircleOutline, calendarOutline, chevronForwardOutline, warningOutline });
    const onFocusIn = (event: FocusEvent): void => {
      if (event.target instanceof HTMLElement) {
        event.target.setAttribute('data-ionic-skip-scroll-assist', 'true');
      }
    };
    this.hostRef.nativeElement.addEventListener('focusin', onFocusIn, true);
    this.destroyRef.onDestroy(() => {
      this.hostRef.nativeElement.removeEventListener('focusin', onFocusIn, true);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.actualizarPrevisualizacion();
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

  onFechaSeleccionada(nueva: FechaHora): void {
    const [fechaParte, horaParte] = nueva.split(' ');
    this.fecha.set(fechaParte);
    this.horaSeleccionada.set(horaParte ?? null);
  }

  onTipoPapelChange(event: CustomEvent): void {
    const val = event.detail.value as TipoPapel;
    if (val === 'CARTA' || val === 'OFICIO') {
      this.tipoPapel.set(val);
      void this.actualizarPrevisualizacion();
    }
  }

  onCajasInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    const parsed = esVacio(raw) ? null : Number(raw);
    this.cajas.set(parsed);
    void this.actualizarPrevisualizacion();
  }

  onMedioChange(event: CustomEvent): void {
    const val = event.detail.value as MedioPago;
    if (val === 'EFECTIVO' || val === 'TRANSFERENCIA') {
      this.medio.set(val);
      void this.actualizarPrevisualizacion();
    }
  }

  async cancelar(): Promise<void> {
    if (this.guardando()) {
      return;
    }
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async actualizarPrevisualizacion(): Promise<void> {
    const idPeticion = ++this.peticionActual;

    this.errorCajas.set(null);
    this.errorCosto.set(null);
    this.errorInesperado.set(null);

    const rawCajas = this.cajas();
    const rawCosto = this.costoPorCaja();

    if (esVacio(rawCajas) || esVacio(rawCosto)) {
      this.vistaPrevia.set(null);
      this.calculando.set(false);
      return;
    }

    const numCajas = Number(rawCajas);
    const numCosto = Number(rawCosto);

    this.calculando.set(true);
    try {
      const res = await this.registrarCompra.previsualizar({
        tipoPapel: this.tipoPapel(),
        cajas: numCajas,
        costoPorCaja: numCosto,
        medio: this.medio(),
      });

      if (idPeticion !== this.peticionActual) {
        return;
      }

      this.vistaPrevia.set(res);
    } catch (error: unknown) {
      if (idPeticion !== this.peticionActual) {
        return;
      }

      this.vistaPrevia.set(null);
      if (error instanceof ReglaNegocioError) {
        if (error.codigo === 'CANTIDAD_INVALIDA') {
          this.errorCajas.set(mensajeDeError(error));
        } else if (error.codigo === 'COSTO_CAJA_INVALIDO') {
          this.errorCosto.set(mensajeDeError(error));
        } else {
          this.errorInesperado.set(mensajeDeError(error));
        }
      } else {
        this.errorInesperado.set(mensajeDeError(error));
      }
    } finally {
      if (idPeticion === this.peticionActual) {
        this.calculando.set(false);
      }
    }
  }

  async abrirModalAporte(): Promise<void> {
    if (this.guardando()) {
      return;
    }
    const modal = await this.modalCtrl.create({
      component: AporteModalComponent,
      canDismiss: soloCierreExplicito,
      cssClass: 'modal-sheet',
      breakpoints: [0, 0.72, 0.95],
      initialBreakpoint: 0.72,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.guardado) {
      await this.actualizarPrevisualizacion();
    }
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar()) {
      return;
    }

    this.guardando.set(true);
    try {
      const horaActual = this.horaSeleccionada() ?? this.clock.ahora().split(' ')[1];
      const parsedFecha = fechaHora(`${this.fecha().trim()} ${horaActual}`);
      const res = await this.registrarCompra.registrar({
        tipoPapel: this.tipoPapel(),
        cajas: Number(this.cajas() ?? 0),
        costoPorCaja: Number(this.costoPorCaja() ?? 0),
        fecha: parsedFecha,
        medio: this.medio(),
      });

      await this.modalCtrl.dismiss({ idLote: res.idLote, guardado: true }, 'guardado');
    } catch (error: unknown) {
      const toast = await this.toastCtrl.create({
        message: mensajeDeError(error),
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    } finally {
      this.guardando.set(false);
    }
  }
}
