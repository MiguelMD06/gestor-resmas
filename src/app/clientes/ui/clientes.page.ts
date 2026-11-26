import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, checkmarkOutline, peopleOutline } from 'ionicons/icons';

import { ConsultarCartera } from '../../cartera/application/consultar-cartera';
import type { DeudaCliente } from '../../cartera/infrastructure/cartera.repository';
import { formatearPesos, pesos, type Pesos } from '../../shared/domain';
import { ROL_GUARDADO, soloCierreExplicito } from '../../shared/ui/formulario';
import { iniciales } from '../../shared/ui/iniciales';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { BuscarClientes } from '../application/buscar-clientes';
import type { Cliente } from '../domain/cliente';

import { ClienteModalComponent } from './cliente.modal';

type FiltroClientes = 'todos' | 'con_deuda';

@Component({
  selector: 'app-clientes',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Clientes</ion-title>
      </ion-toolbar>
      @if (!cargando() && !errorCarga()) {
        <div class="subtitulo-contenedor">
          <p class="subtitulo-clientes" data-testid="cantidad-clientes">
            @if (busqueda().trim()) {
              {{ clientes().length }} {{ clientes().length === 1 ? 'resultado' : 'resultados' }}
            } @else {
              {{ clientes().length }} {{ clientes().length === 1 ? 'cliente' : 'clientes' }}
            }
          </p>
        </div>
      }
    </ion-header>

    <ion-content class="ion-padding">
      <div class="contenido-clientes">
        @if (!cargando() && !errorCarga()) {
          <section class="app-tarjeta resumen-cartera" aria-label="Resumen de cartera">
            <div class="resumen-columna">
              <span class="resumen-etiqueta">Por cobrar</span>
              <span class="resumen-total" [class.tiene-deuda]="totalPorCobrar() > 0" data-testid="total-por-cobrar">
                {{ formatearPesos(totalPorCobrar()) }}
              </span>
            </div>
            <div class="resumen-columna resumen-derecha" data-testid="cantidad-con-deuda">
              <span class="resumen-deudores-numero">{{ cantidadConDeuda() }}</span>
              <span class="resumen-etiqueta">
                {{ cantidadConDeuda() === 1 ? 'cliente con deuda' : 'clientes con deuda' }}
              </span>
            </div>
          </section>
        }

        <div class="buscador-contenedor">
          <span class="campo-selector-etiqueta" aria-hidden="true">Buscar cliente</span>
          <ion-searchbar
            placeholder="Buscar por nombre o celular"
            aria-label="Buscar cliente por nombre o celular"
            [value]="busqueda()"
            [debounce]="0"
            (ionInput)="onBuscarInput($event)"
            (ionClear)="onBuscarClear()"
            data-testid="searchbar-clientes"
          ></ion-searchbar>
        </div>

        <ion-segment
          [value]="filtro()"
          (ionChange)="onFiltroChange($event)"
          [disabled]="cargando()"
          [attr.aria-disabled]="cargando() ? 'true' : null"
          aria-label="Filtrar clientes"
          data-testid="segment-filtro-clientes"
        >
          <ion-segment-button value="todos" data-testid="segment-filtro-todos">
            <ion-label>Todos · {{ clientes().length }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="con_deuda" data-testid="segment-filtro-con-deuda">
            <ion-label>Con deuda · {{ clientesConDeudaCount() }}</ion-label>
          </ion-segment-button>
        </ion-segment>

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
                <ion-skeleton-text
                  [animated]="true"
                  class="esqueleto-deuda"
                  [style.width]="ancho.deuda"
                ></ion-skeleton-text>
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
        } @else if (clientesFiltrados().length === 0) {
          <div class="app-estado-vacio" data-testid="mensaje-vacio">
            @if (busqueda().trim()) {
              <p class="estado-mensaje">No se encontraron clientes</p>
            } @else if (filtro() === 'con_deuda') {
              <p class="estado-mensaje">Ningún cliente tiene deuda</p>
            } @else {
              <ion-icon name="people-outline" aria-hidden="true"></ion-icon>
              <p class="estado-mensaje">Todavía no hay clientes</p>
              <p class="estado-submensaje">Agrega el primero con el botón +.</p>
            }
          </div>
        } @else {
          <div class="app-tarjeta lista-tarjeta">
            <ion-list lines="none" data-testid="lista-clientes">
              @for (cliente of clientesFiltrados(); track cliente.idCliente) {
                <ion-item
                  button
                  [detail]="false"
                  class="fila-cliente"
                  (click)="abrirExpediente(cliente)"
                  data-testid="item-cliente"
                >
                  <div class="avatar-cliente" slot="start" aria-hidden="true" data-testid="avatar-cliente">
                    {{ iniciales(cliente.nombre) }}
                  </div>
                  <ion-label>
                    <h2 class="nombre-cliente">{{ cliente.nombre }}</h2>
                    <p class="celular-cliente">{{ cliente.telefono || 'Sin celular' }}</p>
                  </ion-label>
                  @if (deudaDe(cliente.idCliente); as deuda) {
                    <div class="deuda-cliente" slot="end" [attr.aria-label]="textoAccesibleDeuda(deuda)">
                      <span class="monto-deuda" data-testid="deuda-cliente" aria-hidden="true">
                        {{ formatearPesos(deuda.deuda) }}
                      </span>
                      <span class="facturas-cliente" data-testid="facturas-cliente" aria-hidden="true">
                        {{ deuda.facturas }} {{ deuda.facturas === 1 ? 'factura' : 'facturas' }}
                      </span>
                    </div>
                  } @else {
                    <div class="al-dia-cliente" slot="end" data-testid="al-dia-cliente" aria-label="Al día">
                      <ion-icon name="checkmark-outline" aria-hidden="true"></ion-icon>
                      <span aria-hidden="true">Al día</span>
                    </div>
                  }
                </ion-item>
              }
            </ion-list>
          </div>
        }
      </div>

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
      --background: var(--ion-background-color, #000);
      --border-width: 0;
    }
    ion-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .subtitulo-contenedor {
      background: var(--ion-background-color, #000);
      padding: 0 20px 8px;
    }
    .subtitulo-clientes,
    .resumen-etiqueta,
    .celular-cliente,
    .facturas-cliente {
      margin: 0;
      font-size: 12px;
      color: var(--app-texto-secundario, #a1a1aa);
    }
    .subtitulo-clientes {
      font-size: 13px;
    }
    ion-content {
      --padding-bottom: 88px;
    }
    .contenido-clientes,
    .lista-esqueleto {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .lista-esqueleto {
      gap: 18px;
    }
    .resumen-cartera {
      padding: 18px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .resumen-columna {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .resumen-derecha {
      align-items: flex-end;
    }
    .resumen-total {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #f5f5f5;
    }
    .resumen-total.tiene-deuda,
    .monto-deuda {
      color: #ff6b6b;
    }
    .resumen-deudores-numero {
      font-size: 20px;
      font-weight: 700;
      color: #f5f5f5;
    }
    .buscador-contenedor {
      position: relative;
      border: 1px solid var(--app-borde-campo);
      border-radius: var(--app-radio-campo, 12px);
      min-height: 56px;
      display: flex;
      align-items: center;
    }
    ion-searchbar {
      --background: transparent;
      --box-shadow: none;
      --color: #f5f5f5;
      --placeholder-color: #8a8e96;
      --icon-color: #a1a1aa;
      --clear-button-color: #a1a1aa;
      padding: 0 4px;
    }
    .esqueleto-deuda {
      height: 10px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .estado-mensaje {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #f5f5f5;
    }
    .estado-submensaje {
      margin: -4px 0 0;
      font-size: 13px;
      line-height: 19px;
      color: #a1a1aa;
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
      color: #f5f5f5;
      margin: 0 0 2px;
    }
    .deuda-cliente {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      margin-inline-start: 12px;
    }
    .monto-deuda {
      font-size: 15px;
      font-weight: 700;
    }
    .al-dia-cliente {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #a1a1aa;
      margin-inline-start: 12px;
    }
    .al-dia-cliente ion-icon {
      font-size: 14px;
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
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
  private readonly consultarCartera = inject(ConsultarCartera);
  private readonly router = inject(Router);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  private peticionActual = 0;
  private abriendoModal = false;

  readonly anchosEsqueleto = [
    { nombre: '55%', celular: '35%', deuda: '60px' },
    { nombre: '45%', celular: '30%', deuda: '48px' },
    { nombre: '60%', celular: '32%', deuda: '56px' },
  ];

  readonly busqueda = signal('');
  readonly filtro = signal<FiltroClientes>('todos');
  readonly clientes = signal<Cliente[]>([]);
  readonly totalPorCobrar = signal<Pesos>(pesos(0));
  readonly deudasPorCliente = signal<ReadonlyMap<number, DeudaCliente>>(new Map());
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);

  readonly cantidadConDeuda = computed(() => {
    let total = 0;
    for (const { deuda } of this.deudasPorCliente().values()) {
      if (deuda > 0) {
        total++;
      }
    }
    return total;
  });
  readonly clientesConDeudaCount = computed(
    () => this.clientes().filter((c) => (this.deudasPorCliente().get(c.idCliente)?.deuda ?? 0) > 0).length,
  );
  readonly clientesFiltrados = computed(() => {
    const lista = this.clientes();
    if (this.filtro() === 'todos') {
      return lista;
    }
    const deudas = this.deudasPorCliente();
    return lista.filter((c) => (deudas.get(c.idCliente)?.deuda ?? 0) > 0);
  });

  readonly iniciales = iniciales;
  readonly formatearPesos = formatearPesos;

  constructor() {
    addIcons({ add, alertCircleOutline, checkmarkOutline, peopleOutline });
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

  onFiltroChange(event: CustomEvent): void {
    const value = event.detail?.value;
    if (value === 'todos' || value === 'con_deuda') {
      this.filtro.set(value);
    }
  }

  deudaDe(idCliente: number): DeudaCliente | null {
    const info = this.deudasPorCliente().get(idCliente);
    return info && info.deuda > 0 ? info : null;
  }

  textoAccesibleDeuda(deuda: DeudaCliente): string {
    const sufijo = deuda.facturas === 1 ? 'factura' : 'facturas';
    return `Debe ${formatearPesos(deuda.deuda)} en ${deuda.facturas} ${sufijo}`;
  }

  async cargarClientes(): Promise<void> {
    const idPeticion = ++this.peticionActual;
    this.cargando.set(true);

    try {
      const [datos, cartera] = await Promise.all([
        this.buscarClientes.buscar(this.busqueda()),
        this.consultarCartera.consultar(),
      ]);
      if (idPeticion !== this.peticionActual) {
        return;
      }
      this.clientes.set(datos);
      this.totalPorCobrar.set(cartera.total);
      this.deudasPorCliente.set(cartera.porCliente);
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

  abrirExpediente(cliente: Cliente): void {
    void this.router.navigate(['/clientes', cliente.idCliente]);
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
