import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSpinner } from '@ionic/angular';

import { ErrorArranqueComponent } from './shell/error-arranque.component';
import { EstadoArranque } from './shell/estado-arranque';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, IonSpinner, ErrorArranqueComponent],
})
export class AppComponent {
  private readonly estadoArranque = inject(EstadoArranque);
  readonly estado = this.estadoArranque.estado;
}
