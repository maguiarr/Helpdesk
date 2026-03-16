using AutoMapper;
using HelpDeskApi.DTOs;
using HelpDeskApi.Models;

namespace HelpDeskApi.Mapping;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Ticket, TicketResponse>()
            .ForMember(d => d.Priority, opt => opt.MapFrom(s => s.Priority.ToString()))
            .ForMember(d => d.Status, opt => opt.MapFrom(s => s.Status.ToString()));

        CreateMap<CreateTicketRequest, Ticket>();
    }
}
