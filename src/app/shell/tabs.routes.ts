import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'finanzas',
    loadComponent: () => import('./proximamente.page').then((m) => m.ProximamentePage),
    data: { titulo: 'Finanzas', etapa: 5 },
  },
  {
    path: 'vender',
    loadComponent: () => import('./proximamente.page').then((m) => m.ProximamentePage),
    data: { titulo: 'Vender', etapa: 3 },
  },
  {
    path: 'inventario',
    loadComponent: () => import('./proximamente.page').then((m) => m.ProximamentePage),
    data: { titulo: 'Inventario', etapa: 2 },
  },
  {
    path: 'clientes',
    loadComponent: () => import('./proximamente.page').then((m) => m.ProximamentePage),
    data: { titulo: 'Clientes', etapa: 3 },
  },
  {
    path: '',
    redirectTo: 'inventario',
    pathMatch: 'full',
  },
];
