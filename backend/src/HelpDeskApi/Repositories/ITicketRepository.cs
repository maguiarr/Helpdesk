using HelpDeskApi.Models;

namespace HelpDeskApi.Repositories;

public interface ITicketRepository
{
    Task<IEnumerable<Ticket>> GetAllAsync();
    Task<IEnumerable<Ticket>> GetBySubmitterAsync(string submittedBy);
    Task<Ticket?> GetByIdAsync(Guid id);
    Task<Ticket> CreateAsync(Ticket ticket);
    Task<Ticket> UpdateAsync(Ticket ticket);
    Task DeleteAsync(Guid id);
    Task<Dictionary<TicketStatus, int>> GetStatusCountsAsync();
}
