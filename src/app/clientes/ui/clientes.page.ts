import { Component, inject, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

import { ROL_GUARDADO, soloCierreExplicito } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { BuscarClientes } from '../application/buscar-clientes';
import type { Cliente } from '../domain/cliente';

import { ClienteModalComponent } from './cliente.modal';

@Component({
  selector: 'app-clientes',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Clientes</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Buscar por nombre o celular"
          [value]="busqueda()"
          [debounce]="0"
          (ionInput)="onBuscarInput($event)"
          (ionClear)="onBuscarClear()"
          data-testid="searchbar-clientes"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (cargando()) {
        <ion-progress-bar type="indeterminate" data-testid="indicador-carga"></ion-progress-bar>
      }

      @if (errorCarga(); as error) {
        <div class="estado-error ion-text-center ion-padding" data-testid="estado-error">
          <p data-testid="mensaje-error-carga">{{ error }}</p>
          <ion-button
            (click)="cargarClientes()"
            [disabled]="cargando()"
            [attr.aria-disabled]="cargando()"
            data-testid="btn-reintentar"
          >
            Reintentar
          </ion-button>
        </div>
      } @else if (!cargando() && clientes().length === 0) {
        <div class="mensaje-vacio ion-text-center ion-padding" data-testid="mensaje-vacio">
          @if (busqueda().trim()) {
            <p>No se encontraron clientes</p>
          } @else {
            <p>Todavía no hay clientes</p>
          }
        </div>
      } @else {
        <ion-list data-testid="lista-clientes">
          @for (cliente of clientes(); track cliente.idCliente) {
            <ion-item button (click)="abrirModalEditar(cliente)" data-testid="item-cliente">
              <ion-label>
                <h2>{{ cliente.nombre }}</h2>
                @if (cliente.telefono) {
                  <p>{{ cliente.telefono }}</p>
                }
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="abrirModalNuevo()" aria-label="Nuevo cliente" data-testid="fab-nuevo-cliente">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: `
    .mensaje-vacio,
    .estado-error {
      margin-top: 3rem;
      color: var(--ion-color-step-600, #666);
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSearchbar,
    IonContent,
    IonProgressBar,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonFab,
    IonFabButton,
    IonIcon,
  ],
})
export class ClientesPage {
  private readonly buscarClientes = inject(BuscarClientes);
  private readonly modalCtrl = inject(ModalController);

  private peticionActual = 0;

  readonly busqueda = signal('');
  readonly clientes = signal<Cliente[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);

  constructor() {
    addIcons({ add });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargarClientes();
  }

  onBuscarInput(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent).detail;
    const raw = detail && 'value' in detail ? detail.value : (event.target as HTMLInputElement)?.value;
    this.busqueda.set(typeof raw === 'string' ? raw : '');
    void this.cargarClientes();
  }

  onBuscarClear(): void {
    this.busqueda.set('');
    void this.cargarClientes();
  }

  async cargarClientes(): Promise<void> {
    const idPeticion = ++this.peticionActual;
    this.cargando.set(true);

    try {
      const datos = await this.buscarClientes.buscar(this.busqueda());
      if (idPeticion !== this.peticionActual) {
        return;
      }
      this.clientes.set(datos);
      this.errorCarga.set(null);
    } catch (error: unknown) {
      if (idPeticion !== this.peticionActual) {
        return;
      }
      this.errorCarga.set(mensajeDeError(error));
    } finally {
      if (idPeticion === this.peticionActual) {
        this.cargando.set(false);
      }
    }
  }

  async abrirModalNuevo(): Promise<void> {
    await this.abrirModalCliente();
  }

  async abrirModalEditar(cliente: Cliente): Promise<void> {
    await this.abrirModalCliente(cliente);
  }

  private async abrirModalCliente(cliente?: Cliente): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ClienteModalComponent,
      componentProps: cliente ? { cliente } : undefined,
      canDismiss: soloCierreExplicito,
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === ROL_GUARDADO) {
      await this.cargarClientes();
    }
  }
}
