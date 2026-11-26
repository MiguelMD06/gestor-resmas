import { Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
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
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, cartOutline, cubeOutline, walletOutline } from 'ionicons/icons';

import { AporteModalComponent } from '../../finanzas/ui/aporte.modal';
import { formatearPesos, pesos, type TipoPapel } from '../../shared/domain';
import { soloCierreExplicito } from '../../shared/ui/formulario';
import { mensajeDeError } from '../../shared/ui/mensajes-error';
import { ConsultarInventario } from '../application/consultar-inventario';
import type { Lote } from '../domain/lote';

import { NuevaCompraModalComponent } from './nueva-compra.modal';

@Component({
  selector: 'app-inventario',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Inventario</ion-title>
      </ion-toolbar>
      <div class="subtitulo-contenedor">
        <p class="subtitulo-pagina">Lotes y compras</p>
      </div>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="inventario-cuerpo">
        <ion-segment
          [value]="tipoSeleccionado()"
          aria-label="Tipo de papel"
          (ionChange)="onSegmentChange($event)"
          data-testid="segment-tipo-papel"
        >
          <ion-segment-button value="CARTA" data-testid="segment-carta">
            <ion-label class="segment-label">
              <span>Carta</span>
              <span class="conteo-badge">{{ totalResmasCarta() }}</span>
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="OFICIO" data-testid="segment-oficio">
            <ion-label class="segment-label">
              <span>Oficio</span>
              <span class="conteo-badge">{{ totalResmasOficio() }}</span>
            </ion-label>
          </ion-segment-button>
        </ion-segment>

        @if (cargando()) {
          <div
            class="app-tarjeta tarjeta-esqueleto"
            aria-busy="true"
            aria-label="Cargando lotes"
            data-testid="indicador-carga"
          >
            <div class="seccion-cabecera">
              <ion-skeleton-text [animated]="true" style="width: 40%; height: 12px"></ion-skeleton-text>
              <ion-skeleton-text [animated]="true" style="width: 22%; height: 12px"></ion-skeleton-text>
            </div>
            <ion-skeleton-text [animated]="true" style="width: 30%; height: 22px"></ion-skeleton-text>
            <ion-skeleton-text [animated]="true" style="width: 100%; height: 8px"></ion-skeleton-text>
          </div>
        }
        @if (errorCarga(); as error) {
          <div class="app-estado-error" role="alert" data-testid="estado-error">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <p class="estado-titulo" data-testid="mensaje-error-carga">{{ error }}</p>
            <ion-button
              color="primary"
              expand="block"
              class="btn-reintentar"
              (click)="cargarLotes()"
              [disabled]="cargando()"
              [attr.aria-disabled]="cargando()"
              data-testid="btn-reintentar"
            >
              Reintentar
            </ion-button>
          </div>
        } @else if (!cargando()) {
          <section
            class="app-tarjeta resumen-papel"
            [attr.aria-label]="'Resumen de papel ' + (tipoSeleccionado() === 'CARTA' ? 'Carta' : 'Oficio')"
          >
            <div class="total-celda">
              <span class="total-etiqueta"
                >Papel {{ tipoSeleccionado() === 'CARTA' ? 'Carta' : 'Oficio' }} disponible</span
              >
              <span class="resumen-numero-linea">
                <span class="resumen-numero">{{ totalResmasVisibles() }}</span>
                <span class="resumen-unidad">resmas</span>
              </span>
            </div>
            <div class="resumen-grid">
              <div class="total-celda">
                <span class="total-etiqueta">Valor al costo</span>
                <span class="seccion-titulo">{{ formatearPesos(valorCostoVisible()) }}</span>
              </div>
              <div class="total-celda">
                <span class="total-etiqueta">Lotes activos</span>
                <span class="seccion-titulo">{{ lotesVisibles().length }}</span>
              </div>
            </div>
          </section>

          @if (lotesVisibles().length === 0) {
            <div class="app-estado-vacio" data-testid="mensaje-vacio">
              <ion-icon name="cube-outline" aria-hidden="true"></ion-icon>
              <p class="estado-titulo">
                No hay lotes activos de papel {{ tipoSeleccionado() === 'CARTA' ? 'Carta' : 'Oficio' }}.
              </p>
              <p class="estado-subtitulo">Registra tu primera compra usando el botón de acciones (+).</p>
            </div>
          } @else {
            <div class="seccion-cabecera encabezado-lotes">
              <h2 class="seccion-titulo">Lotes activos</h2>
              <span class="seccion-subtitulo">Más antiguo primero</span>
            </div>

            @for (lote of lotesVisibles(); track lote.idLote) {
              <ion-card
                class="app-tarjeta tarjeta-lote"
                [attr.aria-label]="'Lote ' + lote.idLote"
                data-testid="tarjeta-lote"
              >
                <ion-card-content class="lote-contenido">
                  <div class="lote-cabecera">
                    <div class="total-celda">
                      <span class="seccion-titulo">Lote #{{ lote.idLote }}</span>
                      <span class="total-etiqueta"
                        >Ingreso: {{ lote.fechaCompra }} · {{ lote.cantidadCajas }}
                        {{ lote.cantidadCajas === 1 ? 'caja' : 'cajas' }}</span
                      >
                    </div>
                    <div class="total-celda lote-col-der">
                      <span class="seccion-titulo">{{ formatearPesos(lote.costoUnitarioResma) }}</span>
                      <span class="total-etiqueta">por resma</span>
                    </div>
                  </div>

                  <div class="lote-resmas">
                    <span class="lote-resmas-num">{{ lote.resmasDisponibles }}</span
                    ><span class="lote-resmas-total"> de {{ lote.resmasIniciales }} resmas</span>
                  </div>

                  <ion-progress-bar
                    [value]="progreso(lote)"
                    color="secondary"
                    class="barra-lote"
                    [attr.aria-label]="'Resmas disponibles del lote ' + lote.idLote"
                    data-testid="progreso-lote"
                  ></ion-progress-bar>

                  <div class="seccion-cabecera">
                    <span class="total-etiqueta">{{ porcentajeDisponible(lote) }} % disponible</span>
                    <span class="total-etiqueta linea-total-dato"
                      >Valor en stock <strong>{{ formatearPesos(valorEnStock(lote)) }}</strong></span
                    >
                  </div>
                </ion-card-content>
              </ion-card>
            }
          }
        }
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="primary" data-testid="fab-principal" aria-label="Acciones de inventario">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button
            color="primary"
            (click)="abrirModalNuevaCompra()"
            data-testid="fab-nueva-compra"
            aria-label="Nueva compra"
            title="Nueva compra"
          >
            <ion-icon name="cart-outline"></ion-icon>
          </ion-fab-button>
          <ion-fab-button
            color="secondary"
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
    ion-toolbar {
      --background: var(--ion-background-color);
      --border-width: 0;
    }

    ion-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .subtitulo-contenedor {
      background: var(--ion-background-color);
      padding: 0 20px 8px;
    }

    .subtitulo-pagina,
    .estado-subtitulo {
      margin: 0;
      font-size: 13px;
      color: var(--app-texto-secundario);
    }

    .inventario-cuerpo,
    .tarjeta-esqueleto,
    .resumen-papel,
    .lote-contenido {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .inventario-cuerpo {
      gap: 18px;
      padding-bottom: 84px;
    }

    .segment-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .conteo-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--app-tarjeta);
      color: var(--app-texto-secundario);
    }

    .estado-titulo {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .btn-reintentar {
      width: 100%;
      margin-top: 6px;
    }

    .resumen-numero-linea,
    .lote-resmas {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .resumen-numero {
      font-size: 40px;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }

    .resumen-unidad {
      font-size: 15px;
      color: var(--app-texto-secundario);
    }

    .resumen-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding-top: 14px;
      border-top: 1px solid var(--app-borde);
    }

    .encabezado-lotes {
      margin-top: 4px;
    }

    .tarjeta-lote {
      margin: 0;
      box-shadow: none;
    }

    .lote-contenido {
      padding: 0;
    }

    .lote-cabecera {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .lote-col-der {
      align-items: flex-end;
    }

    .lote-resmas-num {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--ion-text-color);
    }

    .lote-resmas-total {
      font-size: 14px;
      color: var(--app-texto-secundario);
    }

    .barra-lote {
      height: 8px;
      border-radius: 999px;
      --background: var(--app-borde);
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardContent,
    IonProgressBar,
    IonSkeletonText,
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
  readonly totalResmasCarta = computed(() => this.lotes().CARTA.reduce((acc, lote) => acc + lote.resmasDisponibles, 0));
  readonly totalResmasOficio = computed(() =>
    this.lotes().OFICIO.reduce((acc, lote) => acc + lote.resmasDisponibles, 0),
  );
  readonly totalResmasVisibles = computed(() =>
    this.lotesVisibles().reduce((acc, lote) => acc + lote.resmasDisponibles, 0),
  );
  readonly valorCostoVisible = computed(() =>
    pesos(this.lotesVisibles().reduce((acc, lote) => acc + lote.resmasDisponibles * lote.costoUnitarioResma, 0)),
  );

  readonly formatearPesos = formatearPesos;
  readonly progreso = (lote: Lote): number => this.porcentajeDisponible(lote) / 100;

  constructor() {
    addIcons({ add, alertCircleOutline, cartOutline, cubeOutline, walletOutline });
  }

  porcentajeDisponible(lote: Lote): number {
    return lote.resmasIniciales <= 0 ? 0 : Math.round((lote.resmasDisponibles * 100) / lote.resmasIniciales);
  }

  valorEnStock(lote: Lote): ReturnType<typeof pesos> {
    return pesos(lote.resmasDisponibles * lote.costoUnitarioResma);
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
      cssClass: 'modal-sheet',
      breakpoints: [0, 0.92, 1],
      initialBreakpoint: 0.92,
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
      cssClass: 'modal-sheet',
      breakpoints: [0, 0.72, 0.95],
      initialBreakpoint: 0.72,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.guardado) {
      await this.cargarLotes();
    }
  }
}
