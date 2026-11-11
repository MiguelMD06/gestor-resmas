import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonFabList,
  IonHeader,
  IonIcon,
  IonLabel,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, cartOutline, walletOutline } from 'ionicons/icons';

import { AporteModalComponent } from '../../finanzas/ui/aporte.modal';
import { formatearPesos, type TipoPapel } from '../../shared/domain';
import { soloCierreExplicito } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { ConsultarInventario } from '../application/consultar-inventario';
import { progreso, type Lote } from '../domain/lote';

import { NuevaCompraModalComponent } from './nueva-compra.modal';

@Component({
  selector: 'app-inventario',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Inventario</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          [value]="tipoSeleccionado()"
          (ionChange)="onSegmentChange($event)"
          data-testid="segment-tipo-papel"
        >
          <ion-segment-button value="CARTA" data-testid="segment-carta">
            <ion-label>Carta</ion-label>
          </ion-segment-button>
          <ion-segment-button value="OFICIO" data-testid="segment-oficio">
            <ion-label>Oficio</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (cargando()) {
        <ion-progress-bar type="indeterminate" data-testid="indicador-carga"></ion-progress-bar>
      }

      @if (errorCarga(); as error) {
        <div class="estado-error ion-text-center ion-padding" data-testid="estado-error">
          <p data-testid="mensaje-error-carga">{{ error }}</p>
          <ion-button (click)="cargarLotes()" [disabled]="cargando()" data-testid="btn-reintentar"
            >Reintentar</ion-button
          >
        </div>
      } @else if (lotesVisibles().length === 0) {
        <div class="mensaje-vacio ion-text-center ion-padding" data-testid="mensaje-vacio">
          <p>No hay lotes activos de papel {{ tipoSeleccionado() === 'CARTA' ? 'Carta' : 'Oficio' }}.</p>
          <p>Registra tu primera compra usando el botón de acciones (+).</p>
        </div>
      } @else {
        @for (lote of lotesVisibles(); track lote.idLote) {
          <ion-card class="tarjeta-lote" data-testid="tarjeta-lote">
            <ion-card-header>
              <ion-card-subtitle>Ingreso: {{ lote.fechaCompra }}</ion-card-subtitle>
              <ion-card-title> {{ lote.resmasDisponibles }} de {{ lote.resmasIniciales }} resmas </ion-card-title>
            </ion-card-header>

            <ion-card-content>
              <p class="costo-resma ion-margin-bottom">
                Costo por resma: <strong>{{ formatearPesos(lote.costoUnitarioResma) }}</strong>
              </p>
              <ion-progress-bar [value]="progreso(lote)" color="primary" data-testid="progreso-lote"></ion-progress-bar>
            </ion-card-content>
          </ion-card>
        }
      }

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button data-testid="fab-principal" aria-label="Acciones de inventario">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button
            (click)="abrirModalNuevaCompra()"
            data-testid="fab-nueva-compra"
            aria-label="Nueva compra"
            title="Nueva compra"
          >
            <ion-icon name="cart-outline"></ion-icon>
          </ion-fab-button>
          <ion-fab-button
            (click)="abrirModalAporte()"
            data-testid="fab-aportar-capital"
            aria-label="Aportar capital"
            title="Aportar capital"
          >
            <ion-icon name="wallet-outline"></ion-icon>
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
    </ion-content>
  `,
  styles: `
    .mensaje-vacio,
    .estado-error {
      margin-top: 3rem;
      color: var(--ion-color-step-600, #666);
    }
    .tarjeta-lote {
      margin-inline: 0;
      margin-bottom: 1rem;
    }
  `,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonProgressBar,
    IonFab,
    IonFabButton,
    IonFabList,
    IonIcon,
  ],
})
export class InventarioPage {
  private readonly consultarInventario = inject(ConsultarInventario);
  private readonly modalCtrl = inject(ModalController);

  private peticionActual = 0;

  readonly tipoSeleccionado = signal<TipoPapel>('CARTA');
  readonly lotes = signal<{ CARTA: Lote[]; OFICIO: Lote[] }>({ CARTA: [], OFICIO: [] });

  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);

  readonly lotesVisibles = computed(() => this.lotes()[this.tipoSeleccionado()] ?? []);

  readonly formatearPesos = formatearPesos;
  readonly progreso = progreso;

  constructor() {
    addIcons({ add, cartOutline, walletOutline });
  }

  onSegmentChange(event: CustomEvent): void {
    const valor = event.detail.value;
    if (valor === 'CARTA' || valor === 'OFICIO') {
      this.tipoSeleccionado.set(valor);
    }
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargarLotes();
  }

  async cargarLotes(): Promise<void> {
    const idPeticion = ++this.peticionActual;
    this.cargando.set(true);
    try {
      const datos = await this.consultarInventario.activos();
      if (idPeticion !== this.peticionActual) {
        return;
      }
      this.lotes.set(datos);
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

  async abrirModalNuevaCompra(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NuevaCompraModalComponent,
      canDismiss: soloCierreExplicito,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.guardado) {
      await this.cargarLotes();
    }
  }

  async abrirModalAporte(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AporteModalComponent,
      canDismiss: soloCierreExplicito,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.guardado) {
      await this.cargarLotes();
    }
  }
}
