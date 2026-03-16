import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket, TicketStats, TicketStatus } from '../../models/ticket.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatChipsModule, MatIconModule, MatSnackBarModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private ticketService = inject(TicketService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  stats: TicketStats = { open: 0, inProgress: 0, resolved: 0, closed: 0, total: 0 };
  dataSource = new MatTableDataSource<Ticket>([]);
  displayedColumns = ['title', 'submittedBy', 'priority', 'status', 'assignedTo', 'createdAt', 'actions'];
  statuses = Object.values(TicketStatus);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData(): void {
    this.ticketService.getStats().subscribe(s => this.stats = s);
    this.ticketService.getAll().subscribe(tickets => {
      this.dataSource.data = tickets;
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  assignToMe(ticket: Ticket): void {
    this.ticketService.assign(ticket.ticketId, this.auth.username()).subscribe({
      next: () => {
        this.snackBar.open('Ticket assigned', 'Close', { duration: 2000 });
        this.loadData();
      },
      error: () => this.snackBar.open('Failed to assign ticket', 'Close', { duration: 3000 })
    });
  }

  updateStatus(ticket: Ticket, status: string): void {
    this.ticketService.updateStatus(ticket.ticketId, status).subscribe({
      next: () => {
        this.snackBar.open('Status updated', 'Close', { duration: 2000 });
        this.loadData();
      },
      error: () => this.snackBar.open('Failed to update status', 'Close', { duration: 3000 })
    });
  }
}
