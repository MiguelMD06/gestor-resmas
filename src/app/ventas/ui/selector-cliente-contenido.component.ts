import { Component, input, output } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import type { Cliente } from '../../clientes/domain/cliente';

import { leerValorEvento } from './venta-ui.helpers';

/**
 * Customer selector modal content used inside VenderPage's ion-modal.
 */
@Component({
  selector: 'app-selector-cliente-contenido',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Elegir cliente</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cerrar.emit()" data-testid="btn-cerrar-selector-cliente"> Cerrar </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Buscar por nombre o celular"
          [value]="busqueda()"
          [debounce]="0"
          (ionInput)="buscar.emit(leerValorEvento($event))"
          (ionClear)="limpiarBusqueda.emit()"
          data-testid="searchbar-clientes-vender"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-button expand="block" fill="outline" (click)="nuevoCliente.emit()" data-testid="btn-nuevo-cliente-vender">
        Nuevo cliente
      </ion-button>

      @if (errorBusqueda(); as errorClientes) {
        <div class="estado-error ion-text-center ion-padding" data-testid="estado-error-clientes">
          <p data-testid="mensaje-error-clientes">{{ errorClientes }}</p>
          <ion-button
            (click)="reintentar.emit()"
            [disabled]="buscando()"
            [attr.aria-disabled]="buscando() ? 'true' : null"
            data-testid="btn-reintentar-clientes"
          >
            Reintentar
          </ion-button>
        </div>
      } @else {
        <ion-list>
          @for (c of clientes(); track c.idCliente) {
            <ion-item button (click)="seleccionar.emit(c)" data-testid="item-cliente-vender">
              <ion-label>
                <h2>{{ c.nombre }}</h2>
                @if (c.telefono) {
                  <p>{{ c.telefono }}</p>
                }
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: `
    .estado-error {
      margin-top: 3rem;
      color: var(--ion-color-step-600, #666);
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
  ],
})
export class SelectorClienteContenidoComponent {
  readonly busqueda = input.required<string>();
  readonly clientes = input.required<readonly Cliente[]>();
  readonly buscando = input.required<boolean>();
  readonly errorBusqueda = input.required<string | null>();

  readonly cerrar = output<void>();
  readonly buscar = output<string>();
  readonly limpiarBusqueda = output<void>();
  readonly nuevoCliente = output<void>();
  readonly reintentar = output<void>();
  readonly seleccionar = output<Cliente>();

  readonly leerValorEvento = leerValorEvento;
}
