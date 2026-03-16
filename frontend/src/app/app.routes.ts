import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'employee/submit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/submit-ticket/submit-ticket.component').then(m => m.SubmitTicketComponent)
  },
  {
    path: 'admin/dashboard',
    canActivate: [authGuard, roleGuard('helpdesk-admin')],
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  { path: '', redirectTo: 'employee/submit', pathMatch: 'full' },
  { path: '**', redirectTo: 'employee/submit' }
];
