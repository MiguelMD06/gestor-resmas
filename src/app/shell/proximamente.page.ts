import { Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-proximamente',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ displayTitulo() }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>Disponible en la Etapa {{ displayEtapa() }}</p>
    </ion-content>
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class ProximamentePage {
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly titulo = input<string>();
  readonly etapa = input<number | string>();

  readonly displayTitulo = computed(() => this.titulo() ?? (this.route?.snapshot.data['titulo'] as string) ?? '');
  readonly displayEtapa = computed(() => this.etapa() ?? (this.route?.snapshot.data['etapa'] as number | string) ?? '');
}
