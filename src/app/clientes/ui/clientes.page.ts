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
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, chevronForwardOutline, peopleOutline } from 'ionicons/icons';

import { ROL_GUARDADO, soloCierreExplicito } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { BuscarClientes } from '../application/buscar-clientes';
import type { Cliente } from '../domain/cliente';

import { ClienteModalComponent } from './cliente.modal';

export function inicialesCliente(nombre: string): string {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0);
  if (partes.length === 0) {
    return '';
  }
  if (partes.length === 1) {
    return partes[0][0].toUpperCase();
  }
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

@Component({
  selector: 'app-clientes',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Clientes</ion-title>
      </ion-toolbar>
      @if (!cargando() && !errorCarga()) {
        <div class="subtitulo-contenedor">
          <p class="subtitulo-clientes">
            {{ clientes().length }} {{ clientes().length === 1 ? 'cliente' : 'clientes' }}
          </p>
        </div>
      }
    </ion-header>

    <ion-content class="ion-padding">
      <div class="buscador-contenedor">
        <ion-searchbar
          placeholder="Buscar por nombre o celular"
          [value]="busqueda()"
          [disabled]="cargando()"
          [attr.aria-disabled]="cargando() ? 'true' : null"
          [debounce]="0"
          (ionInput)="onBuscarInput($event)"
          (ionClear)="onBuscarClear()"
          data-testid="searchbar-clientes"
        ></ion-searchbar>
      </div>

      @if (cargando()) {
        <div
          class="app-tarjeta lista-esqueleto"
          aria-busy="true"
          aria-label="Cargando clientes"
          data-testid="indicador-carga"
        >
          @for (ancho of anchosEsqueleto; track $index) {
            <div class="fila-esqueleto">
              <ion-skeleton-text [animated]="true" class="esqueleto-avatar"></ion-skeleton-text>
              <div class="esqueleto-textos">
                <ion-skeleton-text [animated]="true" [style.width]="ancho.nombre"></ion-skeleton-text>
                <ion-skeleton-text [animated]="true" [style.width]="ancho.celular"></ion-skeleton-text>
              </div>
            </div>
          }
        </div>
      } @else if (errorCarga(); as error) {
        <div class="app-estado-error" role="alert" data-testid="estado-error">
          <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
          <p class="estado-mensaje" data-testid="mensaje-error-carga">{{ error }}</p>
          <ion-button
            color="primary"
            expand="block"
            class="btn-reintentar"
            (click)="cargarClientes()"
            [disabled]="cargando()"
            [attr.aria-disabled]="cargando()"
            data-testid="btn-reintentar"
          >
            Reintentar
          </ion-button>
        </div>
      } @else if (clientes().length === 0) {
        <div class="app-estado-vacio" data-testid="mensaje-vacio">
          @if (busqueda().trim()) {
            <p class="estado-mensaje">No se encontraron clientes</p>
          } @else {
            <ion-icon name="people-outline" aria-hidden="true"></ion-icon>
            <p class="estado-mensaje">Todavía no hay clientes</p>
          }
        </div>
      } @else {
        <div class="app-tarjeta lista-tarjeta">
          <ion-list lines="none" data-testid="lista-clientes">
            @for (cliente of clientes(); track cliente.idCliente) {
              <ion-item
                button
                [detail]="false"
                class="fila-cliente"
                (click)="abrirModalEditar(cliente)"
                data-testid="item-cliente"
              >
                <div class="avatar-cliente" slot="start" aria-hidden="true" data-testid="avatar-cliente">
                  {{ iniciales(cliente.nombre) }}
                </div>
                <ion-label>
                  <h2 class="nombre-cliente">{{ cliente.nombre }}</h2>
                  <p class="celular-cliente">{{ cliente.telefono || 'Sin celular' }}</p>
                </ion-label>
                <ion-icon name="chevron-forward-outline" slot="end" aria-hidden="true" class="fila-chevron"></ion-icon>
              </ion-item>
            }
          </ion-list>
        </div>
      }

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button
          color="primary"
          (click)="abrirModalNuevo()"
          aria-label="Nuevo cliente"
          data-testid="fab-nuevo-cliente"
        >
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: `
    ion-toolbar {
      --background: var(--ion-background-color, #000000);
      --border-width: 0;
      padding-top: 16px;
    }

    ion-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .subtitulo-contenedor {
      background: var(--ion-background-color, #000000);
      padding: 0 20px 8px;
    }

    .subtitulo-clientes {
      margin: 0;
      font-size: 13px;
      color: var(--app-texto-secundario, #a1a1aa);
    }

    ion-content {
      --padding-bottom: 88px;
    }

    .buscador-contenedor {
      border: 1px solid var(--app-borde-campo, #3a3d44);
      border-radius: var(--app-radio-campo, 12px);
      min-height: 56px;
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    ion-searchbar {
      --background: transparent;
      --box-shadow: none;
      --color: var(--ion-text-color, #f5f5f5);
      --placeholder-color: #8a8e96;
      --icon-color: var(--app-texto-secundario, #a1a1aa);
      --clear-button-color: var(--app-texto-secundario, #a1a1aa);
      padding: 0 4px;
    }

    .lista-esqueleto {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .estado-mensaje {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-text-color, #f5f5f5);
    }

    .btn-reintentar {
      width: 100%;
      margin-top: 6px;
    }

    ion-list {
      background: transparent;
      padding: 0;
      margin: 0;
    }

    .nombre-cliente {
      font-size: 15px;
      font-weight: 600;
      color: var(--ion-text-color, #f5f5f5);
      margin: 0 0 2px;
    }

    .celular-cliente {
      font-size: 12px;
      color: var(--app-texto-secundario, #a1a1aa);
      margin: 0;
    }

    .fila-chevron {
      font-size: 18px;
      color: var(--app-texto-secundario, #a1a1aa);
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSearchbar,
    IonContent,
    IonSkeletonText,
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
  private readonly toastCtrl = inject(ToastController);

  private peticionActual = 0;
  private abriendoModal = false;

  readonly anchosEsqueleto = [
    { nombre: '55%', celular: '35%' },
    { nombre: '45%', celular: '30%' },
    { nombre: '60%', celular: '32%' },
  ];

  readonly busqueda = signal('');
  readonly clientes = signal<Cliente[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);

  constructor() {
    addIcons({ add, alertCircleOutline, chevronForwardOutline, peopleOutline });
  }

  iniciales(nombre: string): string {
    return inicialesCliente(nombre);
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
    if (this.abriendoModal) {
      return;
    }

    this.abriendoModal = true;
    try {
      const modal = await this.modalCtrl.create({
        component: ClienteModalComponent,
        componentProps: cliente ? { cliente } : undefined,
        canDismiss: soloCierreExplicito,
        cssClass: 'modal-sheet',
        breakpoints: [0, 0.65, 0.9],
        initialBreakpoint: 0.65,
      });
      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === ROL_GUARDADO) {
        await this.cargarClientes();
      }
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
        // Avoid unhandled rejection if toast fails
      }
    } finally {
      this.abriendoModal = false;
    }
  }
}
