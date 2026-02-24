import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./shared/components/admin-layout/admin-layout').then(m => m.AdminLayout),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/admin/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'users',
        loadComponent: () => import('./modules/admin/gestion-users/gestion-users').then(m => m.GestionUsers),
      },
      {
        path: 'vehicules',
        loadComponent: () => import('./modules/admin/gestion-vehicules/gestion-vehicules').then(m => m.GestionVehicules),
      },
      {
        path: 'zones',
        loadComponent: () => import('./modules/admin/gestion-zones/gestion-zones').then(m => m.GestionZones),
      },
      {
        path: 'equipes',
        loadComponent: () => import('./modules/admin/gestion-equipes/gestion-equipes').then(m => m.GestionEquipes),
      },
      {
        path: 'tournees',
        loadComponent: () => import('./modules/admin/gestion-tournees/gestion-tournees').then(m => m.GestionTournees),
      },
      {
        path: 'statistiques',
        loadComponent: () => import('./modules/admin/statistiques/statistiques').then(m => m.Statistiques),
      },
    ]
  },
  {
    path: 'agent',
    loadComponent: () => import('./shared/components/agent-layout/agent-layout').then(m => m.AgentLayout),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['AGENT'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/agent/agent-dashboard/agent-dashboard').then(m => m.AgentDashboard),
      },
      {
        path: 'tournee',
        loadComponent: () => import('./modules/agent/ma-tournee/ma-tournee').then(m => m.MaTournee),
      },
      {
        path: 'tournee/:id',
        loadComponent: () => import('./modules/agent/ma-tournee/ma-tournee').then(m => m.MaTournee),
      },
      {
        path: 'incidents',
        loadComponent: () => import('./modules/agent/incidents/incidents').then(m => m.Incidents),
      },
    ]
  },
  {
    path: 'citoyen',
    loadComponent: () => import('./shared/components/citoyen-layout/citoyen-layout').then(m => m.CitoyenLayout),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['CITOYEN'] },
    children: [
      { path: '', redirectTo: 'signalements', pathMatch: 'full' },
      {
        path: 'signalements',
        loadComponent: () => import('./modules/citoyen/suivi-requetes/suivi-requetes').then(m => m.SuiviRequetes),
      },
      {
        path: 'nouveau',
        loadComponent: () => import('./modules/citoyen/signalement/signalement').then(m => m.Signalement),
      },
      {
        path: 'planning',
        loadComponent: () => import('./modules/citoyen/planning/planning').then(m => m.Planning),
      },
    ]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent),
  },
  { path: '',   redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
