namespace HelpDeskApi.DTOs;

public class TicketStatsResponse
{
    public int Open { get; set; }
    public int InProgress { get; set; }
    public int Resolved { get; set; }
    public int Closed { get; set; }
    public int Total { get; set; }
}
