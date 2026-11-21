import { Component, computed, inject, Input, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';

import type { Cliente } from '../../clientes/domain/cliente';
import { formatearPesos, pesos, restarPesos, sumarPesos, type Pesos } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { RegistrarAbono, type SolicitudRegistrarAbono } from '../application/registrar-abono';

import { etiquetaMedioPago, formatearFechaHoraLegible } from './abono-ui.helpers';

export interface LineaResumenAbono {
  readonly idVenta: number;
  readonly monto: Pesos;
  readonly capital: Pesos;
  readonly ganancia: Pesos;
  readonly quedaPagada: boolean;
  readonly saldoRestante: Pesos;
}

@Component({
  selector: 'app-resumen-abono-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="resumen-toolbar">
        <ion-title class="resumen-titulo">Resumen del abono</ion-title>
      </ion-toolbar>
      @if (guardando()) {
        <ion-progress-bar type="indeterminate" color="primary" data-testid="indicador-guardando"></ion-progress-bar>
      }
    </ion-header>

    <ion-content class="resumen-contenido">
      <div class="resumen-cuerpo" [attr.aria-busy]="guardando() ? 'true' : null">
        <dl class="resumen-datos">
          <div class="resumen-dato">
            <dt>Cliente</dt>
            <dd data-testid="resumen-cliente">{{ cliente.nombre }}</dd>
          </div>
          <div class="resumen-dato">
            <dt>Fecha</dt>
            <dd data-testid="resumen-fecha">{{ formatearFechaHoraLegible(solicitud.fecha) }}</dd>
          </div>
          <div class="resumen-dato">
            <dt>Medio de pago</dt>
            <dd data-testid="resumen-medio">{{ etiquetaMedioPago(solicitud.medio) }}</dd>
          </div>
        </dl>

        <div class="resumen-total-fila">
          <span class="resumen-total-etiqueta" data-testid="resumen-modo">{{ etiquetaModo() }}</span>
          <span class="resumen-total-valor" data-testid="resumen-monto">{{ formatearPesos(montoTotal) }}</span>
        </div>

        <div class="resumen-facturas" role="list" aria-label="Facturas afectadas">
          @for (linea of lineas; track linea.idVenta) {
            <div class="resumen-linea" role="listitem" data-testid="resumen-linea-factura">
              <span class="resumen-linea-info">
                <span class="resumen-linea-titulo">Factura #{{ linea.idVenta }}</span>
                <span class="resumen-linea-meta">
                  {{ linea.quedaPagada ? 'Queda pagada' : 'Queda debiendo ' + formatearPesos(linea.saldoRestante) }}
                </span>
              </span>
              <span class="resumen-linea-monto">{{ formatearPesos(linea.monto) }}</span>
            </div>
          }
        </div>

        <dl class="resumen-datos resumen-totales-bloque">
          <div class="resumen-dato">
            <dt>Recupera capital</dt>
            <dd data-testid="resumen-capital">{{ formatearPesos(recuperaCapital()) }}</dd>
          </div>
          <div class="resumen-dato">
            <dt>Suma a la ganancia libre</dt>
            <dd class="resumen-ganancia" data-testid="resumen-ganancia">{{ formatearPesos(sumaGanancia()) }}</dd>
          </div>
          <div class="resumen-dato">
            <dt>Deuda después del abono</dt>
            <dd class="resumen-deuda" data-testid="resumen-deuda-despues">{{ formatearPesos(deudaDespues()) }}</dd>
          </div>
        </dl>

        @if (errorGuardar(); as err) {
          <div class="resumen-error" role="alert" data-testid="error-guardar-abono">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <span>{{ err }}</span>
          </div>
        }

        <div class="resumen-acciones">
          <ion-button
            expand="block"
            color="primary"
            [disabled]="guardando() || guardado()"
            [attr.aria-disabled]="guardando() || guardado() ? 'true' : null"
            [attr.aria-busy]="guardando() ? 'true' : null"
            (click)="aceptar()"
            data-testid="btn-aceptar-abono"
          >
            @if (guardando()) {
              <ion-spinner name="crescent" class="spinner-guardando" aria-hidden="true"></ion-spinner>
              Guardando…
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

    .resumen-facturas {
      background: var(--app-tarjeta-elevada);
      border-radius: 14px;
      padding: 2px 14px;
    }

    .resumen-linea {
      min-height: 52px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--app-borde);
    }

    .resumen-linea:last-child {
      border-bottom: 0;
    }

    .resumen-linea-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .resumen-linea-titulo {
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .resumen-linea-meta {
      font-size: 12px;
      color: var(--app-texto-secundario);
    }

    .resumen-linea-monto {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .resumen-totales-bloque {
      padding-top: 14px;
      border-top: 1px solid var(--app-borde);
    }

    .resumen-ganancia {
      color: var(--ion-color-success, #34d399) !important;
    }

    .resumen-deuda {
      color: var(--ion-color-danger, #ff6b6b) !important;
    }

    .resumen-error {
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(255, 107, 107, 0.1);
      color: var(--ion-color-danger, #ff6b6b);
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;

      ion-icon {
        font-size: 16px;
        flex-shrink: 0;
      }
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
  imports: [IonHeader, IonToolbar, IonTitle, IonProgressBar, IonContent, IonIcon, IonButton, IonSpinner],
})
export class ResumenAbonoModalComponent {
  private readonly registrarAbono = inject(RegistrarAbono);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  private readonly _lineas = signal<readonly LineaResumenAbono[]>([]);
  private readonly _montoTotal = signal<Pesos>(pesos(0));
  private readonly _deudaAnterior = signal<Pesos>(pesos(0));

  @Input({ required: true }) cliente!: Cliente;
  @Input({ required: true }) solicitud!: SolicitudRegistrarAbono;
  @Input({ required: true }) set montoTotal(value: Pesos) {
    this._montoTotal.set(value);
  }
  get montoTotal(): Pesos {
    return this._montoTotal();
  }
  @Input({ required: true }) set deudaAnterior(value: Pesos) {
    this._deudaAnterior.set(value);
  }
  get deudaAnterior(): Pesos {
    return this._deudaAnterior();
  }
  @Input({ required: true }) set lineas(value: readonly LineaResumenAbono[]) {
    this._lineas.set(value);
  }
  get lineas(): readonly LineaResumenAbono[] {
    return this._lineas();
  }
  @Input() alCambiarGuardando?: (guardando: boolean) => void;
  @Input() alGuardar?: () => void;

  readonly guardando = signal(false);
  readonly guardado = signal(false);
  readonly errorGuardar = signal<string | null>(null);
  private volviendo = false;

  readonly formatearPesos = formatearPesos;
  readonly formatearFechaHoraLegible = formatearFechaHoraLegible;
  readonly etiquetaMedioPago = etiquetaMedioPago;

  readonly recuperaCapital = computed<Pesos>(() =>
    this._lineas().reduce<Pesos>((acc, l) => sumarPesos(acc, l.capital), pesos(0)),
  );

  readonly sumaGanancia = computed<Pesos>(() =>
    this._lineas().reduce<Pesos>((acc, l) => sumarPesos(acc, l.ganancia), pesos(0)),
  );

  readonly deudaDespues = computed<Pesos>(() => restarPesos(this._deudaAnterior(), this._montoTotal()));

  constructor() {
    addIcons({ alertCircleOutline });
  }

  etiquetaModo(): string {
    switch (this.solicitud.modo) {
      case 'CASCADA_GLOBAL':
        return 'Abono a la deuda';
      case 'FACTURA_INDIVIDUAL':
        return `Abono a la factura #${this.solicitud.idVenta}`;
      case 'LIQUIDACION_TOTAL':
        return 'Pago total';
    }
  }

  async volverAEditar(): Promise<void> {
    if (this.guardando() || this.guardado() || this.volviendo) {
      return;
    }
    this.volviendo = true;
    try {
      await this.modalCtrl.dismiss(null, ROL_CANCELAR);
    } catch {
      // Ignore dismiss errors so buttons remain usable
    } finally {
      this.volviendo = false;
    }
  }

  async aceptar(): Promise<void> {
    if (this.guardando() || this.guardado()) {
      return;
    }

    this.guardando.set(true);
    this.errorGuardar.set(null);
    this.alCambiarGuardando?.(true);

    try {
      await this.registrarAbono.registrar(this.solicitud);
      this.guardado.set(true);
      this.alGuardar?.();
      this.guardando.set(false);
      this.alCambiarGuardando?.(false);

      try {
        const toast = await this.toastCtrl.create({
          message: 'Abono registrado',
          duration: 2500,
          color: 'success',
          position: 'bottom',
        });
        await toast.present();
      } catch {
        // Payment already persisted; never fail if toast fails
      }

      try {
        await this.modalCtrl.dismiss({ guardado: true }, ROL_GUARDADO);
      } catch {
        // Ignore dismiss errors
      }
    } catch (error: unknown) {
      this.errorGuardar.set(mensajeDeError(error));
    } finally {
      if (this.guardando()) {
        this.guardando.set(false);
        this.alCambiarGuardando?.(false);
      }
    }
  }
}
