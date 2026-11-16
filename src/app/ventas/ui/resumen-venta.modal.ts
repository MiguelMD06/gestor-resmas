import { Component, inject, Input, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';

import type { Cliente } from '../../clientes/domain/cliente';
import { formatearPesos, pesos, type FechaHora, type MedioPago, type Pesos, type TipoPapel } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { RegistrarVenta } from '../application/registrar-venta';
import type { PagoVenta } from '../domain/venta';

import { etiquetaPapel } from './venta-ui.helpers';

export const ROL_ERROR = 'error';

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
      <p data-testid="resumen-pago">{{ textoPago() }}</p>
      <p data-testid="resumen-fecha">Fecha: {{ fecha }}</p>

      <div class="resumen-acciones ion-padding-top">
        @if (guardado()) {
          <ion-note color="success" class="ion-text-center" data-testid="mensaje-venta-registrada">
            Venta registrada
          </ion-note>
        }
        <ion-button
          expand="block"
          [disabled]="guardando() || guardado()"
          [attr.aria-disabled]="guardando() || guardado() ? 'true' : null"
          (click)="aceptar()"
          data-testid="btn-aceptar-venta"
        >
          Aceptar
        </ion-button>
        <ion-button
          expand="block"
          fill="outline"
          [disabled]="guardando() || guardado()"
          [attr.aria-disabled]="guardando() || guardado() ? 'true' : null"
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
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonProgressBar,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
  ],
})
export class ResumenVentaModalComponent {
  private readonly registrarVenta = inject(RegistrarVenta);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  @Input({ required: true }) cliente!: Cliente;
  @Input({ required: true }) lineas!: readonly LineaResumenVenta[];
  @Input({ required: true }) totalVenta!: Pesos;
  @Input({ required: true }) pago!: PagoVenta;
  @Input({ required: true }) fecha!: FechaHora;
  @Input() alCambiarGuardando?: (guardando: boolean) => void;
  @Input() alGuardar?: () => void;

  readonly guardando = signal(false);
  readonly guardado = signal(false);
  readonly formatearPesos = formatearPesos;
  readonly etiquetaPapel = etiquetaPapel;

  textoPago(): string {
    const formatearMedio = (medio: MedioPago): string => (medio === 'EFECTIVO' ? 'Efectivo' : 'Transferencia');
    switch (this.pago.modalidad) {
      case 'CONTADO':
        return `Contado · ${formatearMedio(this.pago.medio)}`;
      case 'FIADO':
        return 'Fiado';
      case 'ABONO_INICIAL':
        return `Abono inicial de ${formatearPesos(pesos(this.pago.monto))} · ${formatearMedio(this.pago.medio)}`;
    }
  }

  async volverAEditar(): Promise<void> {
    if (this.guardando() || this.guardado()) {
      return;
    }
    await this.modalCtrl.dismiss(null, ROL_CANCELAR);
  }

  async aceptar(): Promise<void> {
    if (this.guardando() || this.guardado()) {
      return;
    }

    this.guardando.set(true);
    this.alCambiarGuardando?.(true);

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
      this.guardado.set(true);
      this.alGuardar?.();
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
        // Ignore toast errors so the modal still closes cleanly
      }
      try {
        await this.modalCtrl.dismiss({ error: true }, ROL_ERROR);
      } catch {
        // Ignore dismiss errors
      } finally {
        this.guardando.set(false);
        this.alCambiarGuardando?.(false);
      }
      return;
    }

    try {
      try {
        const toast = await this.toastCtrl.create({
          message: 'Venta registrada',
          duration: 2500,
          color: 'success',
          position: 'bottom',
        });
        await toast.present();
      } catch {
        // Sale already persisted; never report as failed if toast fails
      }
      await this.modalCtrl.dismiss({ guardado: true }, ROL_GUARDADO);
    } catch {
      // Ignore dismiss errors
    } finally {
      this.guardando.set(false);
      this.alCambiarGuardando?.(false);
    }
  }
}
