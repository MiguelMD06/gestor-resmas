import type { OnInit } from '@angular/core';
import { Component, computed, inject, Input, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonNote,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';

import { ReglaNegocioError } from '../../shared/domain';
import { ROL_CANCELAR, ROL_GUARDADO } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { EditarCliente } from '../application/editar-cliente';
import { RegistrarCliente } from '../application/registrar-cliente';
import { validarNombre, validarTelefono, type Cliente } from '../domain/cliente';

@Component({
  selector: 'app-cliente-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ cliente ? 'Editar cliente' : 'Nuevo cliente' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
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
        <ion-progress-bar type="indeterminate" data-testid="indicador-guardando"></ion-progress-bar>
      }
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-input
          label="Nombre completo"
          labelPlacement="stacked"
          type="text"
          [value]="nombre()"
          [disabled]="guardando()"
          [attr.aria-disabled]="guardando() ? 'true' : null"
          (ionInput)="onNombreInput($event)"
          placeholder="Ej: Ana Pérez"
          data-testid="input-nombre"
        ></ion-input>
      </ion-item>
      @if (errorNombre(); as error) {
        <ion-note color="danger" class="ion-padding-start" data-testid="error-nombre">
          {{ error }}
        </ion-note>
      }

      <ion-item>
        <ion-input
          label="Celular"
          labelPlacement="stacked"
          type="tel"
          inputmode="tel"
          [value]="telefono()"
          [disabled]="guardando()"
          [attr.aria-disabled]="guardando() ? 'true' : null"
          (ionInput)="onTelefonoInput($event)"
          placeholder="Ej: 3001234567 (opcional)"
          data-testid="input-telefono"
        ></ion-input>
      </ion-item>
      @if (errorTelefono(); as error) {
        <ion-note color="danger" class="ion-padding-start" data-testid="error-telefono">
          {{ error }}
        </ion-note>
      }

      <div class="ion-padding-top">
        <ion-button
          expand="block"
          [disabled]="!puedeGuardar()"
          [attr.aria-disabled]="!puedeGuardar()"
          (click)="guardar()"
          data-testid="btn-guardar-cliente"
        >
          Guardar cliente
        </ion-button>
      </div>
    </ion-content>
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonProgressBar,
    IonContent,
    IonItem,
    IonInput,
    IonNote,
  ],
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
    () => !this.guardando() && this.errorNombre() === null && this.errorTelefonoDominio() === null,
  );

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

    try {
      const nombreLimpio = validarNombre(this.nombre());
      const telefonoLimpio = validarTelefono(this.telefono());

      let clienteGuardado: Cliente;
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

      await this.modalCtrl.dismiss(clienteGuardado, ROL_GUARDADO);
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
    } finally {
      this.guardando.set(false);
    }
  }
}
