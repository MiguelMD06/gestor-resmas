import type { Routes } from '@angular/router';

import { TabsPage } from './shell/tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    loadChildren: () => import('./shell/tabs.routes').then((m) => m.routes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
