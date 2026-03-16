using AutoMapper;
using HelpDeskApi.DTOs;
using HelpDeskApi.Models;
using HelpDeskApi.Repositories;

namespace HelpDeskApi.Services;

public class TicketService : ITicketService
{
    private readonly ITicketRepository _repository;
    private readonly IMapper _mapper;

    public TicketService(ITicketRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<TicketResponse>> GetAllTicketsAsync()
    {
        var tickets = await _repository.GetAllAsync();
        return _mapper.Map<IEnumerable<TicketResponse>>(tickets);
    }

    public async Task<IEnumerable<TicketResponse>> GetMyTicketsAsync(string username)
    {
        var tickets = await _repository.GetBySubmitterAsync(username);
        return _mapper.Map<IEnumerable<TicketResponse>>(tickets);
    }

    public async Task<TicketResponse?> GetTicketByIdAsync(Guid id)
    {
        var ticket = await _repository.GetByIdAsync(id);
        return ticket is null ? null : _mapper.Map<TicketResponse>(ticket);
    }

    public async Task<TicketResponse> CreateTicketAsync(CreateTicketRequest request, string username, string email)
    {
        var ticket = _mapper.Map<Ticket>(request);
        ticket.SubmittedBy = username;
        ticket.SubmittedByEmail = email;
        ticket.Status = TicketStatus.Open;

        var created = await _repository.CreateAsync(ticket);
        return _mapper.Map<TicketResponse>(created);
    }

    public async Task<TicketResponse> AssignTicketAsync(Guid id, string assignedTo)
    {
        var ticket = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Ticket {id} not found");

        ticket.AssignedTo = assignedTo;
        if (ticket.Status == TicketStatus.Open)
            ticket.Status = TicketStatus.InProgress;

        var updated = await _repository.UpdateAsync(ticket);
        return _mapper.Map<TicketResponse>(updated);
    }

    public async Task<TicketResponse> UpdateTicketStatusAsync(Guid id, string status)
    {
        var ticket = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Ticket {id} not found");

        if (!Enum.TryParse<TicketStatus>(status, true, out var newStatus))
            throw new ArgumentException($"Invalid status: {status}");

        ticket.Status = newStatus;
        var updated = await _repository.UpdateAsync(ticket);
        return _mapper.Map<TicketResponse>(updated);
    }

    public async Task<TicketStatsResponse> GetStatsAsync()
    {
        var counts = await _repository.GetStatusCountsAsync();
        return new TicketStatsResponse
        {
            Open = counts.GetValueOrDefault(TicketStatus.Open),
            InProgress = counts.GetValueOrDefault(TicketStatus.InProgress),
            Resolved = counts.GetValueOrDefault(TicketStatus.Resolved),
            Closed = counts.GetValueOrDefault(TicketStatus.Closed),
            Total = counts.Values.Sum()
        };
    }
}
