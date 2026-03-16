import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <mat-toolbar color="primary">
      <mat-icon>support_agent</mat-icon>
      <span style="margin-left: 8px">HelpDesk Pro</span>

      <span class="spacer"></span>

      <a mat-button routerLink="/employee/submit">
        <mat-icon>add_circle</mat-icon>
        Submit Ticket
      </a>

      @if (auth.isAdmin()) {
        <a mat-button routerLink="/admin/dashboard">
          <mat-icon>dashboard</mat-icon>
          Dashboard
        </a>
      }

      <span style="margin-left: 16px; font-size: 14px;">
        {{ auth.username() }}
      </span>

      @if (auth.isAdmin()) {
        <mat-chip-set style="margin-left: 8px">
          <mat-chip color="accent" highlighted>Admin</mat-chip>
        </mat-chip-set>
      }

      <button mat-icon-button (click)="auth.logout()" title="Logout">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <div class="container">
      <router-outlet />
    </div>
  `,
  styles: [`
    mat-toolbar {
      gap: 4px;
    }
  `]
})
export class AppComponent {
  auth = inject(AuthService);
}
