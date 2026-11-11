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
})
export class TabsPage {
  constructor() {
    addIcons({ walletOutline, cartOutline, cubeOutline, peopleOutline });
  }
}
