import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { CLOCK } from './app/shared/infrastructure/clock/clock.token';
import { SystemClock } from './app/shared/infrastructure/clock/system-clock';
import { DatabaseProvider } from './app/shared/infrastructure/sqlite/database.provider';
import { SQL_DATABASE } from './app/shared/infrastructure/sqlite/sql-database.token';
import { EstadoArranque } from './app/shell/estado-arranque';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    {
      provide: SQL_DATABASE,
      useFactory: () => inject(DatabaseProvider).db,
    },
    {
      provide: CLOCK,
      useClass: SystemClock,
    },
    provideAppInitializer(() => inject(EstadoArranque).iniciar()),
  ],
});
