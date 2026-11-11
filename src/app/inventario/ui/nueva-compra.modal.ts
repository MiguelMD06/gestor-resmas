import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';

import { AporteModalComponent } from '../../finanzas/ui/aporte.modal';
import {
  fechaHora,
  formatearPesos,
  ReglaNegocioError,
  type MedioPago,
  type Pesos,
  type TipoPapel,
} from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { esVacio, soloCierreExplicito } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { RegistrarCompra } from '../application/registrar-compra';

interface VistaPreviaCompra {
  costoTotal: Pesos;
  costoUnitarioResma: Pesos;
  reinversion: Pesos;
  saldoBolsillo: Pesos;
  alcanza: boolean;
}

@Component({
  selector: 'app-nueva-compra-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Nueva compra de cajas</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancelar()" [disabled]="guardando()" data-testid="btn-cancelar">Cancelar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-select
          label="Tipo de papel"
          labelPlacement="stacked"
          [value]="tipoPapel()"
          [disabled]="guardando()"
          (ionChange)="onTipoPapelChange($event)"
          data-testid="select-tipo-papel"
        >
          <ion-select-option value="CARTA">Carta</ion-select-option>
          <ion-select-option value="OFICIO">Oficio</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-input
          label="Fecha"
          labelPlacement="stacked"
          type="date"
          [value]="fecha()"
          [disabled]="guardando()"
          (ionInput)="onFechaInput($event)"
          (ionChange)="onFechaInput($event)"
          data-testid="input-fecha"
        ></ion-input>
      </ion-item>
      @if (errorFecha()) {
        <ion-note color="danger" class="ion-padding-start" data-testid="error-fecha">
          {{ errorFecha() }}
        </ion-note>
      }

      <ion-item>
        <ion-input
          label="Cantidad de cajas"
          labelPlacement="stacked"
          type="number"
          [value]="cajas()"
          [disabled]="guardando()"
          (ionInput)="onCajasInput($event)"
          placeholder="Ej: 2"
          data-testid="input-cajas"
        ></ion-input>
      </ion-item>
      @if (errorCajas()) {
        <ion-note color="danger" class="ion-padding-start" data-testid="error-cajas">
          {{ errorCajas() }}
        </ion-note>
      }

      <ion-item>
        <ion-input
          label="Costo por caja en pesos"
          labelPlacement="stacked"
          type="number"
          [value]="costoPorCaja()"
          [disabled]="guardando()"
          (ionInput)="onCostoInput($event)"
          placeholder="Ej: 120000"
          data-testid="input-costo-caja"
        ></ion-input>
      </ion-item>
      @if (errorCosto()) {
        <ion-note color="danger" class="ion-padding-start" data-testid="error-costo-caja">
          {{ errorCosto() }}
        </ion-note>
      }

      <ion-item>
        <ion-select
          label="Medio de pago"
          labelPlacement="stacked"
          [value]="medio()"
          [disabled]="guardando()"
          (ionChange)="onMedioChange($event)"
          data-testid="select-medio"
        >
          <ion-select-option value="EFECTIVO">Efectivo</ion-select-option>
          <ion-select-option value="TRANSFERENCIA">Transferencia</ion-select-option>
        </ion-select>
      </ion-item>

      @if (errorInesperado()) {
        <div class="ion-padding-vertical">
          <ion-note color="danger" class="ion-padding-start" data-testid="error-inesperado">
            {{ errorInesperado() }}
          </ion-note>
        </div>
      }

      @if (vistaPrevia(); as vp) {
        <ion-card class="ion-margin-vertical">
          <ion-card-content>
            <p>
              Saldo disponible en {{ medio() === 'EFECTIVO' ? 'Efectivo' : 'Transferencia' }}:
              <strong>{{ formatearPesos(vp.saldoBolsillo) }}</strong>
            </p>
            <p>
              Costo total: <strong>{{ formatearPesos(vp.costoTotal) }}</strong>
            </p>
            <p>
              Costo por resma: <strong>{{ formatearPesos(vp.costoUnitarioResma) }}</strong>
            </p>

            @if (!vp.alcanza) {
              <div class="ion-margin-top">
                <ion-note color="danger" data-testid="aviso-saldo-insuficiente">
                  El saldo del bolsillo no alcanza para esta compra.
                </ion-note>
                <ion-button
                  expand="block"
                  color="secondary"
                  class="ion-margin-top"
                  [disabled]="guardando()"
                  (click)="abrirModalAporte()"
                  data-testid="btn-aportar-capital"
                >
                  Aportar capital
                </ion-button>
              </div>
            }
          </ion-card-content>
        </ion-card>

        @if (vp.reinversion > 0) {
          <div class="ion-margin-bottom">
            <ion-note color="warning" data-testid="aviso-reinversion">
              Se reinvierten {{ formatearPesos(vp.reinversion) }} de la ganancia libre
            </ion-note>
          </div>
        }
      }

      <div class="ion-padding-top">
        <ion-button expand="block" [disabled]="!puedeGuardar()" (click)="guardar()" data-testid="btn-guardar-compra">
          Guardar compra
        </ion-button>
      </div>
    </ion-content>
  `,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardContent,
    IonNote,
  ],
})
export class NuevaCompraModalComponent implements OnInit {
  private readonly clock = inject(CLOCK);
  private readonly registrarCompra = inject(RegistrarCompra);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  private peticionActual = 0;

  readonly tipoPapel = signal<TipoPapel>('CARTA');
  readonly fecha = signal<string>(this.clock.ahora().split(' ')[0]);
  readonly cajas = signal<number | null>(null);
  readonly costoPorCaja = signal<number | null>(null);
  readonly medio = signal<MedioPago>('EFECTIVO');

  readonly vistaPrevia = signal<VistaPreviaCompra | null>(null);
  readonly errorCajas = signal<string | null>(null);
  readonly errorCosto = signal<string | null>(null);
  readonly errorInesperado = signal<string | null>(null);

  readonly errorFecha = computed(() => (this.fecha().trim() ? null : 'Elige una fecha'));

  readonly guardando = signal(false);
  readonly calculando = signal(false);

  readonly puedeGuardar = computed(() => {
    if (this.guardando() || this.calculando()) {
      return false;
    }
    const tieneFecha = Boolean(this.fecha().trim());
    const tieneVista = Boolean(this.vistaPrevia()?.alcanza);
    const sinErrores = !this.errorCajas() && !this.errorCosto() && !this.errorInesperado();
    const camposCompletos = !esVacio(this.cajas()) && !esVacio(this.costoPorCaja());
    return tieneFecha && tieneVista && sinErrores && camposCompletos;
  });

  readonly formatearPesos = formatearPesos;

  async ngOnInit(): Promise<void> {
    await this.actualizarPrevisualizacion();
  }

  onTipoPapelChange(event: CustomEvent): void {
    const val = event.detail.value as TipoPapel;
    if (val === 'CARTA' || val === 'OFICIO') {
      this.tipoPapel.set(val);
      void this.actualizarPrevisualizacion();
    }
  }

  onFechaInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    this.fecha.set(typeof raw === 'string' ? raw : '');
  }

  onCajasInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    const parsed = esVacio(raw) ? null : Number(raw);
    this.cajas.set(parsed);
    void this.actualizarPrevisualizacion();
  }

  onCostoInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    const parsed = esVacio(raw) ? null : Number(raw);
    this.costoPorCaja.set(parsed);
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
      const horaActual = this.clock.ahora().split(' ')[1];
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
