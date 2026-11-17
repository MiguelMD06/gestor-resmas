import type { OnInit } from '@angular/core';
import { Component, computed, inject, Input, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';

import { ReglaNegocioError } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { EditarCliente } from '../application/editar-cliente';
import { RegistrarCliente } from '../application/registrar-cliente';
import { validarNombre, validarTelefono, type Cliente } from '../domain/cliente';

@Component({
  selector: 'app-cliente-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ cliente ? 'Editar cliente' : 'Nuevo cliente' }}</ion-title>
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
      <div class="formulario-cliente">
        <div class="grupo-campo">
          <ion-input
            fill="outline"
            label="Nombre completo"
            labelPlacement="floating"
            type="text"
            [maxlength]="80"
            [value]="nombre()"
            [disabled]="guardando()"
            [attr.aria-disabled]="guardando() ? 'true' : null"
            [attr.aria-invalid]="errorNombre() !== null ? 'true' : null"
            [class.ion-invalid]="errorNombre() !== null"
            [class.ion-touched]="errorNombre() !== null"
            (ionInput)="onNombreInput($event)"
            placeholder="Ej: Ana Pérez"
            data-testid="input-nombre"
          ></ion-input>
          @if (errorNombre(); as error) {
            <p class="ayuda-campo error" data-testid="error-nombre">
              <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
              <span>{{ error }}</span>
            </p>
          } @else {
            <p class="ayuda-campo">Hasta 80 caracteres</p>
          }
        </div>

        <div class="grupo-campo">
          <ion-input
            fill="outline"
            label="Celular (opcional)"
            labelPlacement="floating"
            type="tel"
            inputmode="numeric"
            [value]="telefono()"
            [disabled]="guardando()"
            [attr.aria-disabled]="guardando() ? 'true' : null"
            [attr.aria-invalid]="errorTelefono() !== null ? 'true' : null"
            [class.ion-invalid]="errorTelefono() !== null"
            [class.ion-touched]="errorTelefono() !== null"
            (ionInput)="onTelefonoInput($event)"
            placeholder="Ej: 3001234567"
            data-testid="input-telefono"
          ></ion-input>
          @if (errorTelefono(); as error) {
            <p class="ayuda-campo error" data-testid="error-telefono">
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
            (click)="guardar()"
            data-testid="btn-guardar-cliente"
          >
            Guardar cliente
          </ion-button>
          @if (!puedeGuardar() && !guardando()) {
            <p class="ayuda-campo centrada">Corrige los campos marcados para continuar</p>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    ion-toolbar {
      --background: var(--app-tarjeta, #0f1012);
      --border-width: 0;
      padding-top: 8px;
    }

    ion-title {
      font-size: 18px;
      font-weight: 600;
    }

    .btn-cancelar {
      font-size: 15px;
      font-weight: 600;
      text-transform: none;
      letter-spacing: normal;
    }

    ion-content {
      --background: var(--app-tarjeta, #0f1012);
    }

    .formulario-cliente {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-top: 6px;
    }

    .grupo-campo {
      display: flex;
      flex-direction: column;
    }

    .ayuda-campo {
      margin: 6px 4px 0;
      font-size: 12px;
      line-height: 16px;
      color: var(--app-texto-secundario, #a1a1aa);
      display: flex;
      gap: 6px;
      align-items: flex-start;
    }

    .ayuda-campo.error {
      color: var(--ion-color-danger, #ff6b6b);
    }

    .ayuda-campo.centrada {
      justify-content: center;
    }

    .ayuda-campo ion-icon {
      font-size: 14px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .pie-modal {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 4px;
    }
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonProgressBar, IonContent, IonInput, IonIcon],
})
export class ClienteModalComponent implements OnInit {
  private readonly registrarCliente = inject(RegistrarCliente);
  private readonly editarCliente = inject(EditarCliente);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  @Input() cliente?: Cliente;

  readonly nombre = signal('');
  readonly telefono = signal('');
  readonly guardando = signal(false);
  private readonly guardado = signal(false);
  readonly errorTelefonoServidor = signal<string | null>(null);

  readonly errorNombre = computed<string | null>(() => {
    try {
      validarNombre(this.nombre());
      return null;
    } catch (error: unknown) {
      return mensajeDeError(error);
    }
  });

  readonly errorTelefonoDominio = computed<string | null>(() => {
    try {
      validarTelefono(this.telefono());
      return null;
    } catch (error: unknown) {
      return mensajeDeError(error);
    }
  });

  readonly errorTelefono = computed<string | null>(() => this.errorTelefonoDominio() ?? this.errorTelefonoServidor());

  readonly puedeGuardar = computed(
    () => !this.guardando() && !this.guardado() && this.errorNombre() === null && this.errorTelefonoDominio() === null,
  );

  constructor() {
    addIcons({ alertCircleOutline });
  }

  ngOnInit(): void {
    if (this.cliente) {
      this.nombre.set(this.cliente.nombre);
      this.telefono.set(this.cliente.telefono ?? '');
    }
  }

  onNombreInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    this.nombre.set(typeof raw === 'string' ? raw : '');
  }

  onTelefonoInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    this.telefono.set(typeof raw === 'string' ? raw : '');
    this.errorTelefonoServidor.set(null);
  }

  async cancelar(): Promise<void> {
    if (this.guardando()) {
      return;
    }
    await this.modalCtrl.dismiss(null, ROL_CANCELAR);
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar()) {
      return;
    }

    this.guardando.set(true);
    this.errorTelefonoServidor.set(null);

    let clienteGuardado: Cliente;
    try {
      const nombreLimpio = validarNombre(this.nombre());
      const telefonoLimpio = validarTelefono(this.telefono());

      if (this.cliente) {
        await this.editarCliente.editar({
          idCliente: this.cliente.idCliente,
          nombre: nombreLimpio,
          telefono: telefonoLimpio,
        });
        clienteGuardado = {
          ...this.cliente,
          nombre: nombreLimpio,
          telefono: telefonoLimpio,
        };
      } else {
        const { idCliente } = await this.registrarCliente.registrar({
          nombre: nombreLimpio,
          telefono: telefonoLimpio,
        });
        clienteGuardado = {
          idCliente,
          nombre: nombreLimpio,
          telefono: telefonoLimpio,
          esMostrador: false,
        };
      }
      this.guardado.set(true);
    } catch (error: unknown) {
      if (
        error instanceof ReglaNegocioError &&
        (error.codigo === 'TELEFONO_REPETIDO' || error.codigo === 'TELEFONO_INVALIDO')
      ) {
        this.errorTelefonoServidor.set(mensajeDeError(error));
      } else {
        const toast = await this.toastCtrl.create({
          message: mensajeDeError(error),
          duration: 3000,
          color: 'danger',
          position: 'bottom',
        });
        await toast.present();
      }
      return;
    } finally {
      this.guardando.set(false);
    }

    try {
      await this.modalCtrl.dismiss(clienteGuardado, ROL_GUARDADO);
    } catch {
      // Write succeeded; guardado() stays true so Guardar remains disabled
    }
  }
}
