import { Component, inject, Input, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonNote,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';

import type { Cliente } from '../../clientes/domain/cliente';
import {
  formatearPesos,
  pesos,
  restarPesos,
  type FechaHora,
  type MedioPago,
  type Pesos,
  type TipoPapel,
} from '../../shared/domain';
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
    <ion-header class="ion-no-border">
      <ion-toolbar class="resumen-toolbar">
        <ion-title class="resumen-titulo">Resumen de venta</ion-title>
      </ion-toolbar>
      @if (guardando()) {
        <ion-progress-bar type="indeterminate" color="primary" data-testid="indicador-guardando"></ion-progress-bar>
      }
    </ion-header>

    <ion-content class="resumen-contenido">
      <div class="resumen-cuerpo">
        <dl class="resumen-datos">
          <div class="resumen-dato">
            <dt>Cliente</dt>
            <dd data-testid="resumen-cliente">{{ cliente.nombre }}</dd>
          </div>
          <div class="resumen-dato">
            <dt>Fecha</dt>
            <dd data-testid="resumen-fecha">{{ fecha }}</dd>
          </div>
        </dl>

        <div class="resumen-productos" role="list" aria-label="Productos">
          @for (linea of lineas; track linea.idLote) {
            <div class="resumen-linea" role="listitem" data-testid="resumen-linea">
              <span class="resumen-linea-detalle">
                {{ linea.cantidad }} × {{ etiquetaPapel(linea.tipoPapel) }} a
                {{ formatearPesos(linea.precioUnitario) }} =
              </span>
              <span class="resumen-linea-subtotal">{{ formatearPesos(linea.subtotalVenta) }}</span>
            </div>
          }
        </div>

        <div class="resumen-total-fila" data-testid="resumen-total">
          <span class="resumen-total-etiqueta">Total: </span>
          <span class="resumen-total-valor">{{ formatearPesos(totalVenta) }}</span>
        </div>

        <dl class="resumen-datos resumen-pago-bloque">
          <div class="resumen-dato">
            <dt>Pago</dt>
            <dd data-testid="resumen-pago">{{ textoPago() }}</dd>
          </div>
          @if (saldoPendiente() > 0) {
            <div class="resumen-dato">
              <dt>Queda debiendo</dt>
              <dd data-testid="resumen-debiendo">{{ formatearPesos(saldoPendiente()) }}</dd>
            </div>
          }
        </dl>

        <div class="resumen-acciones">
          @if (guardado()) {
            <ion-note color="success" class="ion-text-center" data-testid="mensaje-venta-registrada">
              Venta registrada
            </ion-note>
          }
          <ion-button
            expand="block"
            color="primary"
            [disabled]="guardando() || guardado()"
            [attr.aria-disabled]="guardando() || guardado() ? 'true' : null"
            [attr.aria-busy]="guardando() ? 'true' : null"
            (click)="aceptar()"
            data-testid="btn-aceptar-venta"
          >
            @if (guardando()) {
              <ion-spinner name="crescent" class="spinner-guardando" aria-hidden="true"></ion-spinner>
              Guardando venta…
            } @else {
              Aceptar
            }
          </ion-button>
          <ion-button
            expand="block"
            fill="outline"
            color="secondary"
            [disabled]="guardando() || guardado()"
            [attr.aria-disabled]="guardando() || guardado() ? 'true' : null"
            (click)="volverAEditar()"
            data-testid="btn-volver-editar"
          >
            Volver a editar
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .resumen-toolbar {
      --background: var(--app-tarjeta);
      --border-width: 0;
      padding: 8px 12px 0;
    }

    .resumen-titulo {
      font-size: 18px;
      font-weight: 600;
      padding-inline: 8px;
    }

    .resumen-contenido {
      --background: var(--app-tarjeta);
    }

    .resumen-cuerpo {
      padding: 10px 20px 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .resumen-datos {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .resumen-dato {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      font-size: 14px;
    }

    .resumen-dato dt {
      color: var(--app-texto-secundario);
    }

    .resumen-dato dd {
      margin: 0;
      font-weight: 600;
      text-align: right;
      color: var(--ion-text-color);
    }

    .resumen-productos {
      background: var(--app-tarjeta-elevada);
      border-radius: 14px;
      padding: 4px 14px;
    }

    .resumen-linea {
      min-height: 52px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      border-bottom: 1px solid var(--app-borde);
    }

    .resumen-linea:last-child {
      border-bottom: 0;
    }

    .resumen-linea-detalle {
      color: var(--ion-text-color);
      font-weight: 500;
    }

    .resumen-linea-subtotal {
      font-weight: 600;
      white-space: nowrap;
    }

    .resumen-total-fila {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .resumen-total-etiqueta {
      font-size: 14px;
      color: var(--app-texto-secundario);
    }

    .resumen-total-valor {
      font-size: 30px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .resumen-pago-bloque {
      padding-top: 14px;
      border-top: 1px solid var(--app-borde);
    }

    .resumen-acciones {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .spinner-guardando {
      width: 18px;
      height: 18px;
      margin-inline-end: 8px;
    }
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonProgressBar, IonContent, IonNote, IonButton, IonSpinner],
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

  saldoPendiente(): Pesos {
    switch (this.pago.modalidad) {
      case 'CONTADO':
        return pesos(0);
      case 'FIADO':
        return this.totalVenta;
      case 'ABONO_INICIAL':
        return restarPesos(this.totalVenta, pesos(this.pago.monto));
    }
  }

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
