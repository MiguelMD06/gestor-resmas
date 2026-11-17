import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cartOutline, cubeOutline, peopleOutline, walletOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="finanzas">
          <ion-icon name="wallet-outline"></ion-icon>
          <ion-label>Finanzas</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="vender">
          <ion-icon name="cart-outline"></ion-icon>
          <ion-label>Vender</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="inventario">
          <ion-icon name="cube-outline"></ion-icon>
          <ion-label>Inventario</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="clientes">
          <ion-icon name="people-outline"></ion-icon>
          <ion-label>Clientes</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  styles: `
    ion-tab-bar {
      --background: var(--app-barra-pestanas, #0a0a0b);
      --border: 1px solid var(--app-borde, #1f2125);
      border-top: 1px solid var(--app-borde, #1f2125);
      height: 72px;
    }

    ion-tab-button {
      --color: var(--app-texto-secundario, #a1a1aa);
      --color-selected: var(--ion-color-primary, #cbff3d);
      font-size: 11px;
      font-weight: 500;
      gap: 4px;

      ion-icon {
        font-size: 22px;
      }

      ion-label {
        font-size: 11px;
        font-weight: 500;
      }

      &.tab-selected {
        font-weight: 600;

        ion-label {
          font-weight: 600;
        }
      }
    }
  `,
})
export class TabsPage {
  constructor() {
    addIcons({ walletOutline, cartOutline, cubeOutline, peopleOutline });
  }
}
