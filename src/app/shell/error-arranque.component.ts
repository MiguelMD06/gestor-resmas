import { Component, inject } from '@angular/core';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';

import { EstadoArranque } from './estado-arranque';

@Component({
  selector: 'app-error-arranque',
  template: `
    <ion-content class="ion-padding">
      <div class="contenedor-error">
        <h2>No se pudo abrir la base de datos</h2>
        <p>Revisa el espacio disponible en el teléfono y vuelve a intentarlo.</p>
        @if (estadoArranque.estado() === 'cargando') {
          <ion-spinner name="crescent"></ion-spinner>
        }
        <ion-button [disabled]="estadoArranque.estado() === 'cargando'" (click)="estadoArranque.reintentar()">
          Reintentar
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: `
    .contenedor-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      gap: 1rem;
    }
  `,
  imports: [IonContent, IonButton, IonSpinner],
})
export class ErrorArranqueComponent {
  readonly estadoArranque = inject(EstadoArranque);
}
