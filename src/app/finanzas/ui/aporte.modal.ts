import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
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

import { fechaHora, pesos, type MedioPago } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { RegistrarAporte } from '../application/registrar-aporte';

@Component({
  selector: 'app-aporte-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Aporte de capital</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancelar()">Cancelar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-input
          label="Fecha"
          labelPlacement="stacked"
          type="date"
          [value]="fecha()"
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
        <ion-select
          label="Medio de pago"
          labelPlacement="stacked"
          [value]="medio()"
          (ionChange)="onMedioChange($event)"
          data-testid="select-medio"
        >
          <ion-select-option value="EFECTIVO">Efectivo</ion-select-option>
          <ion-select-option value="TRANSFERENCIA">Transferencia</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-input
          label="Monto en pesos"
          labelPlacement="stacked"
          type="number"
          [value]="monto()"
          (ionInput)="onMontoInput($event)"
          placeholder="Ej: 300000"
          data-testid="input-monto"
        ></ion-input>
      </ion-item>

      <div class="ion-padding-top">
        <ion-button expand="block" [disabled]="!puedeGuardar()" (click)="guardar()" data-testid="btn-guardar-aporte">
          Guardar aporte
        </ion-button>
      </div>
    </ion-content>
  `,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonInput,
    IonNote,
    IonSelect,
    IonSelectOption,
  ],
})
export class AporteModalComponent {
  private readonly clock = inject(CLOCK);
  private readonly registrarAporte = inject(RegistrarAporte);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  readonly fecha = signal<string>(this.clock.ahora().split(' ')[0]);
  readonly medio = signal<MedioPago>('EFECTIVO');
  readonly monto = signal<number | null>(null);

  readonly errorFecha = computed(() => (this.fecha().trim() ? null : 'Elige una fecha'));
  readonly puedeGuardar = computed(() => Boolean(this.fecha().trim()));

  onFechaInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    this.fecha.set(typeof raw === 'string' ? raw : '');
  }

  onMedioChange(event: CustomEvent): void {
    const val = event.detail.value as MedioPago;
    if (val === 'EFECTIVO' || val === 'TRANSFERENCIA') {
      this.medio.set(val);
    }
  }

  onMontoInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    const parsed = raw === null || raw === undefined || String(raw).trim() === '' ? null : Number(raw);
    this.monto.set(parsed);
  }

  async cancelar(): Promise<void> {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar()) {
      return;
    }

    try {
      const valorMonto = Number(this.monto() ?? 0);
      const horaActual = this.clock.ahora().split(' ')[1];
      const parsedFecha = fechaHora(`${this.fecha().trim()} ${horaActual}`);

      await this.registrarAporte.registrar({
        fecha: parsedFecha,
        medio: this.medio(),
        monto: pesos(valorMonto),
      });

      await this.modalCtrl.dismiss({ guardado: true }, 'guardado');
    } catch (error: unknown) {
      const toast = await this.toastCtrl.create({
        message: mensajeDeError(error),
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    }
  }
}
