using HelpDeskApi.Models;

namespace HelpDeskApi.DTOs;

public class CreateTicketRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Priority Priority { get; set; } = Priority.Medium;
}
