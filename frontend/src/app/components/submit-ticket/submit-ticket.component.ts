import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { TicketService } from '../../services/ticket.service';
import { Ticket, Priority } from '../../models/ticket.model';

@Component({
  selector: 'app-submit-ticket',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatTableModule, MatChipsModule, MatSnackBarModule, MatIconModule
  ],
  templateUrl: './submit-ticket.component.html',
  styleUrl: './submit-ticket.component.scss'
})
export class SubmitTicketComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(FormGroupDirective) private formDirective!: FormGroupDirective;

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    priority: [Priority.Medium, Validators.required]
  });

  priorities = Object.values(Priority);
  myTickets: Ticket[] = [];
  displayedColumns = ['title', 'priority', 'status', 'createdAt'];

  ngOnInit(): void {
    this.loadMyTickets();
  }

  loadMyTickets(): void {
    this.ticketService.getMyTickets().subscribe({
      next: tickets => this.myTickets = tickets,
      error: () => this.snackBar.open('Failed to load tickets', 'Close', { duration: 3000 })
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    this.ticketService.create(this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Ticket submitted successfully!', 'Close', {
          duration: 3000,
          panelClass: 'success-snackbar'
        });
        this.formDirective.resetForm({ priority: Priority.Medium });
        this.loadMyTickets();
      },
      error: () => this.snackBar.open('Failed to submit ticket', 'Close', {
        duration: 3000,
        panelClass: 'error-snackbar'
      })
    });
  }
}
