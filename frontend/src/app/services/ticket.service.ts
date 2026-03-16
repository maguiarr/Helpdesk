import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket, CreateTicketRequest, TicketStats } from '../models/ticket.model';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private get baseUrl(): string {
    return `${this.config.apiUrl()}/tickets`;
  }

  getAll(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.baseUrl);
  }

  getMyTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}/my`);
  }

  getById(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTicketRequest): Observable<Ticket> {
    return this.http.post<Ticket>(this.baseUrl, request);
  }

  assign(id: string, assignedTo: string): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.baseUrl}/${id}/assign`, { assignedTo });
  }

  updateStatus(id: string, status: string): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.baseUrl}/${id}/status`, { status });
  }

  getStats(): Observable<TicketStats> {
    return this.http.get<TicketStats>(`${this.baseUrl}/stats`);
  }
}
