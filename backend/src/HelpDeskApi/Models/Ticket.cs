namespace HelpDeskApi.Models;

public class Ticket
{
    public Guid TicketId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Priority Priority { get; set; } = Priority.Medium;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public string SubmittedBy { get; set; } = string.Empty;
    public string SubmittedByEmail { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
