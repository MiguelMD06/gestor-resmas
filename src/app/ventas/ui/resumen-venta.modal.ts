import { Component, inject, Input, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';

import type { Cliente } from '../../clientes/domain/cliente';
import { formatearPesos, type FechaHora, type Pesos, type TipoPapel } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { RegistrarVenta } from '../application/registrar-venta';
import type { PagoVenta } from '../domain/venta';

export interface LineaResumenVenta {
  readonly idLote: number;
  readonly tipoPapel: TipoPapel;
  readonly cantidad: number;
  readonly precioUnitario: Pesos;
  readonly subtotalVenta: Pesos;
}

@Component({
  selector: 'app-resumen-venta-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Resumen de venta</ion-title>
      </ion-toolbar>
      @if (guardando()) {
        <ion-progress-bar type="indeterminate" data-testid="indicador-guardando"></ion-progress-bar>
      }
    </ion-header>

    <ion-content class="ion-padding">
      <p data-testid="resumen-cliente"><strong>Cliente:</strong> {{ cliente.nombre }}</p>

      <ion-list>
        @for (linea of lineas; track linea.idLote) {
          <ion-item data-testid="resumen-linea">
            <ion-label>
              {{ linea.cantidad }} × {{ etiquetaPapel(linea.tipoPapel) }} a {{ formatearPesos(linea.precioUnitario) }} =
              {{ formatearPesos(linea.subtotalVenta) }}
            </ion-label>
          </ion-item>
        }
      </ion-list>

      <p class="resumen-total" data-testid="resumen-total">Total: {{ formatearPesos(totalVenta) }}</p>
      <p data-testid="resumen-pago">{{ textoPago }}</p>
      <p data-testid="resumen-fecha">Fecha: {{ fecha }}</p>

      <div class="resumen-acciones ion-padding-top">
        <ion-button
          expand="block"
          [disabled]="guardando()"
          [attr.aria-disabled]="guardando() ? 'true' : null"
          (click)="aceptar()"
          data-testid="btn-aceptar-venta"
        >
          Aceptar
        </ion-button>
        <ion-button
          expand="block"
          fill="outline"
          [disabled]="guardando()"
          [attr.aria-disabled]="guardando() ? 'true' : null"
          (click)="volverAEditar()"
          data-testid="btn-volver-editar"
        >
          Volver a editar
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: `
    .resumen-total {
      font-size: 1.15rem;
      font-weight: 700;
      margin-top: 1rem;
    }
    .resumen-acciones {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonProgressBar, IonContent, IonList, IonItem, IonLabel, IonButton],
})
export class ResumenVentaModalComponent {
  private readonly registrarVenta = inject(RegistrarVenta);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  @Input({ required: true }) cliente!: Cliente;
  @Input({ required: true }) lineas!: readonly LineaResumenVenta[];
  @Input({ required: true }) totalVenta!: Pesos;
  @Input({ required: true }) textoPago!: string;
  @Input({ required: true }) pago!: PagoVenta;
  @Input({ required: true }) fecha!: FechaHora;

  readonly guardando = signal(false);
  readonly formatearPesos = formatearPesos;

  etiquetaPapel(tipo: TipoPapel): string {
    return tipo === 'CARTA' ? 'Carta' : 'Oficio';
  }

  async volverAEditar(): Promise<void> {
    if (this.guardando()) {
      return;
    }
    await this.modalCtrl.dismiss(null, ROL_CANCELAR);
  }

  async aceptar(): Promise<void> {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);

    try {
      await this.registrarVenta.registrar({
        idCliente: this.cliente.idCliente,
        fecha: this.fecha,
        lineas: this.lineas.map((l) => ({
          idLote: l.idLote,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
        })),
        pago: this.pago,
      });

      const toast = await this.toastCtrl.create({
        message: 'Venta registrada',
        duration: 2500,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();

      await this.modalCtrl.dismiss({ guardado: true }, ROL_GUARDADO);
    } catch (error: unknown) {
      const toast = await this.toastCtrl.create({
        message: mensajeDeError(error),
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();

      await this.modalCtrl.dismiss({ error: true }, ROL_CANCELAR);
    } finally {
      this.guardando.set(false);
    }
  }
}
