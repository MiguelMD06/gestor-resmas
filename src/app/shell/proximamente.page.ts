import { Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-proximamente',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ displayTitulo() }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="app-estado-vacio proximamente-tarjeta">
        <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
        <p class="proximamente-mensaje">Disponible en la Etapa {{ displayEtapa() }}</p>
      </div>
    </ion-content>
  `,
  styles: `
    ion-toolbar {
      --background: var(--ion-background-color, #000000);
      --border-width: 0;
    }

    ion-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .proximamente-tarjeta {
      margin-top: 12px;
    }

    .proximamente-mensaje {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-text-color, #f5f5f5);
    }
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
})
export class ProximamentePage {
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly titulo = input<string>();
  readonly etapa = input<number | string>();

  readonly displayTitulo = computed(() => this.titulo() ?? (this.route?.snapshot.data['titulo'] as string) ?? '');
  readonly displayEtapa = computed(() => this.etapa() ?? (this.route?.snapshot.data['etapa'] as number | string) ?? '');

  constructor() {
    addIcons({ timeOutline });
  }
}
