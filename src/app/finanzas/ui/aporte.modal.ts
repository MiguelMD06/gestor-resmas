import { Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, calendarOutline, chevronForwardOutline } from 'ionicons/icons';

import { fechaHora, pesos, type FechaHora, type MedioPago } from '../../shared/domain';
import { CLOCK } from '../../shared/infrastructure/clock/clock.token';
import { CampoPesosComponent } from '../../shared/ui/campo-pesos.component';
import { HojaFechaComponent } from '../../shared/ui/hoja-fecha.component';
import { MENSAJES_ERROR, mensajeDeError } from '../../shared/ui/mensajes-error';
import { RegistrarAporte } from '../application/registrar-aporte';

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
  selector: 'app-aporte-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Aporte de capital</ion-title>
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
      <div class="formulario-aporte">
        <p class="subtitulo-modal">Dinero que pones en el negocio. Entra como capital, no como ganancia.</p>

        <div class="grupo-campo">
          <app-campo-pesos
            label="Monto en pesos"
            [(valor)]="monto"
            [disabled]="guardando()"
            [error]="errorMonto()"
            errorTestId="error-monto"
            class="app-campo-contorno"
            placeholder="Ej: 300000"
            data-testid="input-monto"
          />
          @if (!errorMonto()) {
            <p class="ayuda-campo">Sin decimales</p>
          }
        </div>

        <div class="grupo-campo">
          <span class="etiqueta-grupo" id="lbl-medio-aporte">Medio de pago</span>
          <ion-segment
            [value]="medio()"
            [disabled]="guardando()"
            [attr.aria-disabled]="guardando() ? 'true' : null"
            aria-labelledby="lbl-medio-aporte"
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

        <div class="grupo-campo">
          <div class="campo-selector" [class.campo-error]="errorFecha() !== null" [class.campo-inactivo]="guardando()">
            <span id="lbl-fecha-aporte" class="campo-selector-etiqueta">Fecha</span>
            <button
              type="button"
              class="campo-selector-boton"
              aria-labelledby="lbl-fecha-aporte"
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

        <div class="pie-modal">
          <ion-button
            color="primary"
            expand="block"
            [disabled]="!puedeGuardar()"
            [attr.aria-disabled]="!puedeGuardar()"
            [attr.aria-busy]="guardando() ? 'true' : null"
            (click)="guardar()"
            data-testid="btn-guardar-aporte"
          >
            {{ guardando() ? 'Guardando aporte…' : 'Guardar aporte' }}
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
      data-testid="modal-fecha-aporte"
    >
      <ng-template>
        <app-hoja-fecha
          titulo="Fecha del aporte"
          [valor]="fechaHoraParaHoja()"
          [maximo]="maxFecha()"
          datetimeTestId="datetime-fecha-aporte"
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

    .formulario-aporte {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 16px;
    }

    .subtitulo-modal {
      margin: 0;
      font-size: 13px;
      line-height: 19px;
      color: var(--app-texto-secundario);
    }

    .grupo-campo {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .etiqueta-grupo,
    .valor-vacio {
      color: var(--app-texto-secundario);
    }

    .etiqueta-grupo {
      font-size: 13px;
    }

    .ayuda-campo {
      margin-top: 2px;
      display: flex;
      align-items: flex-start;
      gap: 6px;

      ion-icon {
        flex-shrink: 0;
        font-size: 14px;
        margin-top: 1px;
      }
    }

    .pie-modal {
      margin-top: 8px;
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
    IonLabel,
    IonModal,
    IonProgressBar,
    IonSegment,
    IonSegmentButton,
  ],
})
export class AporteModalComponent {
  private readonly clock = inject(CLOCK);
  private readonly registrarAporte = inject(RegistrarAporte);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly fecha = signal<string>(this.clock.ahora().split(' ')[0]);
  readonly horaSeleccionada = signal<string | null>(null);
  readonly medio = signal<MedioPago>('EFECTIVO');
  readonly monto = signal<number | null>(null);
  readonly selectorFechaAbierto = signal(false);

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

  readonly errorMonto = computed<string | null>(() => {
    const m = this.monto();
    if (m !== null && m <= 0) {
      return MENSAJES_ERROR.MONTO_INVALIDO;
    }
    return null;
  });

  readonly guardando = signal(false);
  readonly puedeGuardar = computed(() => {
    if (this.guardando()) {
      return false;
    }
    const m = this.monto();
    const tieneMontoValido = m !== null && m > 0;
    return tieneMontoValido && this.errorFecha() === null;
  });

  readonly formatearFechaCorta = formatearFechaCorta;

  constructor() {
    addIcons({ alertCircleOutline, calendarOutline, chevronForwardOutline });
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

  onMedioChange(event: CustomEvent): void {
    const val = event.detail.value as MedioPago;
    if (val === 'EFECTIVO' || val === 'TRANSFERENCIA') {
      this.medio.set(val);
    }
  }

  async cancelar(): Promise<void> {
    if (this.guardando()) {
      return;
    }
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar()) {
      return;
    }

    this.guardando.set(true);
    try {
      const valorMonto = Number(this.monto());
      const horaActual = this.horaSeleccionada() ?? this.clock.ahora().split(' ')[1];
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
    } finally {
      this.guardando.set(false);
    }
  }
}
