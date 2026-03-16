using HelpDeskApi.DTOs;

namespace HelpDeskApi.Services;

public interface ITicketService
{
    Task<IEnumerable<TicketResponse>> GetAllTicketsAsync();
    Task<IEnumerable<TicketResponse>> GetMyTicketsAsync(string username);
    Task<TicketResponse?> GetTicketByIdAsync(Guid id);
    Task<TicketResponse> CreateTicketAsync(CreateTicketRequest request, string username, string email);
    Task<TicketResponse> AssignTicketAsync(Guid id, string assignedTo);
    Task<TicketResponse> UpdateTicketStatusAsync(Guid id, string status);
    Task<TicketStatsResponse> GetStatsAsync();
}
