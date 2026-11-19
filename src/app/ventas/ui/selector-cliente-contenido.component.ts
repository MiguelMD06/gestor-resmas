import { Component, input, output } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, checkmark, searchOutline, storefrontOutline } from 'ionicons/icons';

import type { Cliente } from '../../clientes/domain/cliente';
import { iniciales } from '../../shared/ui/iniciales';

import { leerValorEvento } from './venta-ui.helpers';

/**
 * Customer selector sheet content used inside VenderPage's ion-modal.
 * Uses `ion-page` on host so Ionic's inline modal lays out header and scrollable content properly.
 */
@Component({
  selector: 'app-selector-cliente-contenido',
  host: { class: 'ion-page' },
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="selector-toolbar">
        <ion-title class="selector-titulo">Elegir cliente</ion-title>
        <ion-buttons slot="end">
          <ion-button
            color="secondary"
            class="selector-cerrar"
            (click)="cerrar.emit()"
            data-testid="btn-cerrar-selector-cliente"
          >
            Cerrar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      @if (buscando()) {
        <ion-progress-bar
          type="indeterminate"
          color="primary"
          data-testid="indicador-carga-clientes"
        ></ion-progress-bar>
      }
    </ion-header>

    <ion-content class="selector-contenido">
      <div class="selector-cuerpo">
        <ion-searchbar
          class="selector-buscador"
          placeholder="Buscar por nombre o celular"
          aria-label="Buscar por nombre o celular"
          [value]="busqueda()"
          [debounce]="0"
          (ionInput)="buscar.emit(leerValorEvento($event))"
          (ionClear)="limpiarBusqueda.emit()"
          data-testid="searchbar-clientes-vender"
        ></ion-searchbar>

        <ion-button
          expand="block"
          fill="outline"
          color="secondary"
          (click)="nuevoCliente.emit()"
          data-testid="btn-nuevo-cliente-vender"
        >
          <ion-icon name="add" slot="start"></ion-icon>
          Nuevo cliente
        </ion-button>

        @if (errorBusqueda(); as errorClientes) {
          <div class="app-estado-error" role="alert" data-testid="estado-error-clientes">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <p class="estado-titulo">Ocurrió un error inesperado</p>
            <p class="estado-detalle" data-testid="mensaje-error-clientes">{{ errorClientes }}</p>
            <ion-button
              expand="block"
              color="primary"
              (click)="reintentar.emit()"
              [disabled]="buscando()"
              [attr.aria-disabled]="buscando() ? 'true' : null"
              data-testid="btn-reintentar-clientes"
            >
              Reintentar
            </ion-button>
            <ion-button expand="block" fill="clear" color="secondary" (click)="cerrar.emit()"> Cerrar </ion-button>
          </div>
        } @else if (buscando() && clientes().length === 0) {
          <div
            class="selector-esqueletos"
            aria-busy="true"
            aria-label="Cargando clientes"
            data-testid="esqueleto-clientes"
          >
            @for (item of [1, 2, 3]; track item) {
              <div class="esqueleto-fila">
                <ion-skeleton-text animated class="esqueleto-avatar"></ion-skeleton-text>
                <div class="esqueleto-textos">
                  <ion-skeleton-text animated style="width: 58%; height: 12px"></ion-skeleton-text>
                  <ion-skeleton-text animated style="width: 36%; height: 10px"></ion-skeleton-text>
                </div>
              </div>
            }
          </div>
        } @else if (clientes().length === 0) {
          <div class="app-estado-vacio" data-testid="estado-vacio-clientes">
            <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
            <p class="estado-titulo">
              @if (busqueda().trim()) {
                Ningún cliente coincide con «{{ busqueda().trim() }}»
              } @else {
                No hay clientes disponibles
              }
            </p>
            <p class="estado-detalle">Revisa el nombre o el celular, o créalo como cliente nuevo.</p>
          </div>
        } @else {
          <ion-list lines="none" class="lista-clientes" [attr.aria-busy]="buscando() ? 'true' : null">
            @for (c of clientes(); track c.idCliente) {
              <ion-item
                button
                [detail]="false"
                class="fila-cliente"
                [attr.aria-current]="clienteSeleccionadoId() === c.idCliente ? 'true' : null"
                (click)="seleccionar.emit(c)"
                data-testid="item-cliente-vender"
              >
                <span class="avatar-cliente" slot="start" aria-hidden="true">
                  @if (c.esMostrador) {
                    <ion-icon name="storefront-outline"></ion-icon>
                  } @else {
                    {{ iniciales(c.nombre) }}
                  }
                </span>
                <ion-label class="etiqueta-cliente">
                  <h2 class="cliente-nombre">{{ c.nombre }}</h2>
                  @if (c.esMostrador) {
                    <p class="cliente-subtitulo">Venta rápida · solo contado</p>
                  } @else if (c.telefono) {
                    <p class="cliente-subtitulo">{{ c.telefono }}</p>
                  } @else {
                    <p class="cliente-subtitulo">Sin celular</p>
                  }
                </ion-label>
                @if (clienteSeleccionadoId() === c.idCliente) {
                  <ion-icon name="checkmark" color="primary" slot="end" aria-label="Seleccionado"></ion-icon>
                }
              </ion-item>
            }
          </ion-list>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .selector-toolbar {
      --background: var(--app-tarjeta);
      --border-width: 0;
      padding: 8px 12px 0;
    }

    .selector-titulo {
      font-size: 18px;
      font-weight: 600;
      padding-inline: 8px;
    }

    .selector-cerrar {
      font-size: 15px;
      font-weight: 600;
      text-transform: none;
    }

    .selector-contenido {
      --background: var(--app-tarjeta);
    }

    .selector-cuerpo {
      padding: 8px 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .selector-buscador {
      --background: transparent;
      --color: var(--ion-text-color);
      --placeholder-color: #8a8e96;
      --icon-color: var(--app-texto-secundario);
      --clear-button-color: var(--app-texto-secundario);
      --border-radius: var(--app-radio-campo);
      --box-shadow: none;
      padding: 0;
      border: 1px solid var(--app-borde-campo);
      border-radius: var(--app-radio-campo);
      min-height: 52px;
    }

    .lista-clientes {
      background: transparent;
      padding: 0;
    }

    .etiqueta-cliente {
      margin: 0;
    }

    .cliente-nombre {
      font-size: 15px;
      font-weight: 600;
      color: var(--ion-text-color);
      margin: 0;
    }

    .cliente-subtitulo {
      font-size: 12px;
      color: var(--app-texto-secundario);
      margin: 2px 0 0;
    }

    .selector-esqueletos {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .esqueleto-fila {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 4px;
    }

    .esqueleto-avatar {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      flex-shrink: 0;
    }

    .esqueleto-textos {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .estado-titulo {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .estado-detalle {
      margin: 0;
      font-size: 13px;
      color: var(--app-texto-secundario);
    }

    .app-estado-error ion-button {
      width: 100%;
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonSearchbar,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonProgressBar,
    IonSkeletonText,
  ],
})
export class SelectorClienteContenidoComponent {
  readonly busqueda = input.required<string>();
  readonly clientes = input.required<readonly Cliente[]>();
  readonly buscando = input.required<boolean>();
  readonly errorBusqueda = input.required<string | null>();
  readonly clienteSeleccionadoId = input<number | null>(null);

  readonly cerrar = output<void>();
  readonly buscar = output<string>();
  readonly limpiarBusqueda = output<void>();
  readonly nuevoCliente = output<void>();
  readonly reintentar = output<void>();
  readonly seleccionar = output<Cliente>();

  readonly leerValorEvento = leerValorEvento;
  readonly iniciales = iniciales;

  constructor() {
    addIcons({ add, storefrontOutline, checkmark, searchOutline, alertCircleOutline });
  }
}
