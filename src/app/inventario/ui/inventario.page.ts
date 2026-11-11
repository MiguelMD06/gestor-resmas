import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
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
      @if (lotesVisibles().length === 0) {
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
    .mensaje-vacio {
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
export class InventarioPage implements OnInit {
  private readonly consultarInventario = inject(ConsultarInventario);
  private readonly modalCtrl = inject(ModalController);

  readonly tipoSeleccionado = signal<TipoPapel>('CARTA');
  readonly lotes = signal<{ CARTA: Lote[]; OFICIO: Lote[] }>({ CARTA: [], OFICIO: [] });

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

  async ngOnInit(): Promise<void> {
    await this.cargarLotes();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargarLotes();
  }

  async cargarLotes(): Promise<void> {
    const datos = await this.consultarInventario.activos();
    this.lotes.set(datos);
  }

  async abrirModalNuevaCompra(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NuevaCompraModalComponent,
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
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.guardado) {
      await this.cargarLotes();
    }
  }
}
