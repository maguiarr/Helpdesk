export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export enum TicketStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  Resolved = 'Resolved',
  Closed = 'Closed'
}

export interface Ticket {
  ticketId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  submittedBy: string;
  submittedByEmail: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: Priority;
}

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
}
