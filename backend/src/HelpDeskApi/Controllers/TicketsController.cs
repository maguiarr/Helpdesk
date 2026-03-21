using HelpDeskApi.DTOs;
using HelpDeskApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HelpDeskApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpGet]
    [Authorize(Roles = "helpdesk-admin")]
    public async Task<ActionResult<IEnumerable<TicketResponse>>> GetAll()
    {
        var tickets = await _ticketService.GetAllTicketsAsync();
        return Ok(tickets);
    }

    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<TicketResponse>>> GetMyTickets()
    {
        var username = User.Identity?.Name ?? "unknown";
        var tickets = await _ticketService.GetMyTicketsAsync(username);
        return Ok(tickets);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TicketResponse>> GetById(Guid id)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(id);
        if (ticket is null) return NotFound();

        var username = User.Identity?.Name ?? "";
        var isAdmin = User.IsInRole("helpdesk-admin");
        if (!isAdmin && ticket.SubmittedBy != username)
            return Forbid();

        return Ok(ticket);
    }

    [HttpPost]
    public async Task<ActionResult<TicketResponse>> Create([FromBody] CreateTicketRequest request)
    {
        var username = User.Identity?.Name ?? "unknown";
        var email = User.FindFirst("email")?.Value ?? "";
        var ticket = await _ticketService.CreateTicketAsync(request, username, email);
        return CreatedAtAction(nameof(GetById), new { id = ticket.TicketId }, ticket);
    }

    [HttpPut("{id:guid}/assign")]
    [Authorize(Roles = "helpdesk-admin")]
    public async Task<ActionResult<TicketResponse>> Assign(Guid id, [FromBody] AssignRequest request)
    {
        var ticket = await _ticketService.AssignTicketAsync(id, request.AssignedTo);
        return Ok(ticket);
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "helpdesk-admin")]
    public async Task<ActionResult<TicketResponse>> UpdateStatus(Guid id, [FromBody] StatusUpdateRequest request)
    {
        var ticket = await _ticketService.UpdateTicketStatusAsync(id, request.Status);
        return Ok(ticket);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "helpdesk-admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _ticketService.DeleteTicketAsync(id);
        return NoContent();
    }

    [HttpGet("stats")]
    [Authorize(Roles = "helpdesk-admin")]
    public async Task<ActionResult<TicketStatsResponse>> GetStats()
    {
        var stats = await _ticketService.GetStatsAsync();
        return Ok(stats);
    }
}

public record AssignRequest(string AssignedTo);
public record StatusUpdateRequest(string Status);
