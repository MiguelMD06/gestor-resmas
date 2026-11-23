import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'finanzas',
    loadComponent: () => import('./proximamente.page').then((m) => m.ProximamentePage),
    data: { titulo: 'Finanzas', etapa: 5 },
  },
  {
    path: 'vender',
    loadComponent: () => import('../ventas/ui/vender.page').then((m) => m.VenderPage),
  },
  {
    path: 'inventario',
    loadComponent: () => import('../inventario/ui/inventario.page').then((m) => m.InventarioPage),
  },
  {
    path: 'clientes',
    loadComponent: () => import('../clientes/ui/clientes.page').then((m) => m.ClientesPage),
  },
  {
    path: 'clientes/:id',
    loadComponent: () => import('../clientes/ui/expediente.page').then((m) => m.ExpedientePage),
  },
  {
    path: '',
    redirectTo: 'inventario',
    pathMatch: 'full',
  },
];
