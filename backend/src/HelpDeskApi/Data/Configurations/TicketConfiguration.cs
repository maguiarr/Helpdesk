using HelpDeskApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HelpDeskApi.Data.Configurations;

public class TicketConfiguration : IEntityTypeConfiguration<Ticket>
{
    public void Configure(EntityTypeBuilder<Ticket> builder)
    {
        builder.HasKey(t => t.TicketId);
        builder.Property(t => t.TicketId).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(t => t.Title).IsRequired().HasMaxLength(200);
        builder.Property(t => t.Description).IsRequired().HasMaxLength(4000);
        builder.Property(t => t.SubmittedBy).IsRequired().HasMaxLength(200);
        builder.Property(t => t.SubmittedByEmail).HasMaxLength(200);
        builder.Property(t => t.AssignedTo).HasMaxLength(200);

        builder.Property(t => t.Priority)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(t => t.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(t => t.CreatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAdd();

        builder.Property(t => t.UpdatedAt)
            .HasDefaultValueSql("NOW()")
            .ValueGeneratedOnAddOrUpdate();

        // Seed demo tickets so the dashboard has data on first boot
        var baseDate = new DateTime(2026, 3, 14, 9, 0, 0, DateTimeKind.Utc);

        builder.HasData(
            new Ticket
            {
                TicketId = new Guid("a1111111-1111-1111-1111-111111111111"),
                Title = "VPN connection drops every 30 minutes",
                Description = "My VPN disconnects roughly every 30 minutes during work hours. I have to manually reconnect each time, which interrupts my workflow. Using the GlobalProtect client on Windows 11.",
                Priority = Priority.High,
                Status = TicketStatus.InProgress,
                SubmittedBy = "employee1",
                SubmittedByEmail = "employee1@helpdesk.local",
                AssignedTo = "admin1",
                CreatedAt = baseDate,
                UpdatedAt = baseDate.AddHours(2)
            },
            new Ticket
            {
                TicketId = new Guid("a2222222-2222-2222-2222-222222222222"),
                Title = "Need access to SharePoint site",
                Description = "I need access to the Marketing team SharePoint site for the Q2 campaign assets. My manager approved it verbally — please grant me editor permissions.",
                Priority = Priority.Medium,
                Status = TicketStatus.Open,
                SubmittedBy = "employee2",
                SubmittedByEmail = "employee2@helpdesk.local",
                CreatedAt = baseDate.AddHours(3),
                UpdatedAt = baseDate.AddHours(3)
            },
            new Ticket
            {
                TicketId = new Guid("a3333333-3333-3333-3333-333333333333"),
                Title = "Laptop keyboard not responding",
                Description = "Several keys on my Dell Latitude 5540 stopped working after a coffee spill yesterday. The touchpad still works. I need a replacement keyboard or a loaner laptop.",
                Priority = Priority.High,
                Status = TicketStatus.Open,
                SubmittedBy = "employee3",
                SubmittedByEmail = "employee3@helpdesk.local",
                CreatedAt = baseDate.AddHours(5),
                UpdatedAt = baseDate.AddHours(5)
            },
            new Ticket
            {
                TicketId = new Guid("a4444444-4444-4444-4444-444444444444"),
                Title = "Install Adobe Acrobat Pro",
                Description = "I need Adobe Acrobat Pro installed for editing and signing PDF contracts. We should have spare licenses in the enterprise pool.",
                Priority = Priority.Low,
                Status = TicketStatus.Resolved,
                SubmittedBy = "employee1",
                SubmittedByEmail = "employee1@helpdesk.local",
                AssignedTo = "admin1",
                CreatedAt = baseDate.AddDays(-2),
                UpdatedAt = baseDate.AddDays(-1)
            },
            new Ticket
            {
                TicketId = new Guid("a5555555-5555-5555-5555-555555555555"),
                Title = "Email signature not showing correctly",
                Description = "My email signature displays with broken formatting in Outlook desktop. The logo image is missing and the font reverts to Times New Roman for external recipients.",
                Priority = Priority.Low,
                Status = TicketStatus.Closed,
                SubmittedBy = "employee4",
                SubmittedByEmail = "employee4@helpdesk.local",
                AssignedTo = "admin2",
                CreatedAt = baseDate.AddDays(-5),
                UpdatedAt = baseDate.AddDays(-3)
            },
            new Ticket
            {
                TicketId = new Guid("a6666666-6666-6666-6666-666666666666"),
                Title = "Monitor flickering intermittently",
                Description = "My external Dell U2723QE monitor flickers every few minutes. Tried swapping the USB-C cable and restarting — problem persists. Happens in both Windows and BIOS.",
                Priority = Priority.Medium,
                Status = TicketStatus.InProgress,
                SubmittedBy = "employee2",
                SubmittedByEmail = "employee2@helpdesk.local",
                AssignedTo = "admin1",
                CreatedAt = baseDate.AddDays(-1),
                UpdatedAt = baseDate
            },
            new Ticket
            {
                TicketId = new Guid("a7777777-7777-7777-7777-777777777777"),
                Title = "Request new wireless mouse",
                Description = "My current mouse scroll wheel is broken. Requesting a new Logitech MX Master 3S from the equipment catalog.",
                Priority = Priority.Low,
                Status = TicketStatus.Open,
                SubmittedBy = "employee5",
                SubmittedByEmail = "employee5@helpdesk.local",
                CreatedAt = baseDate.AddHours(8),
                UpdatedAt = baseDate.AddHours(8)
            },
            new Ticket
            {
                TicketId = new Guid("a8888888-8888-8888-8888-888888888888"),
                Title = "Cannot print to 3rd floor printer",
                Description = "The HP LaserJet on the 3rd floor (printer name: HP-3F-LJ) is not showing up in my available printers list. Other printers on the same floor work fine.",
                Priority = Priority.Medium,
                Status = TicketStatus.Open,
                SubmittedBy = "employee3",
                SubmittedByEmail = "employee3@helpdesk.local",
                CreatedAt = baseDate.AddHours(10),
                UpdatedAt = baseDate.AddHours(10)
            },
            new Ticket
            {
                TicketId = new Guid("a9999999-9999-9999-9999-999999999999"),
                Title = "Outlook keeps crashing on startup",
                Description = "Outlook 365 crashes within 5 seconds of launching. Safe mode works but normal mode instant-crashes. Started after the latest Windows update KB5035853.",
                Priority = Priority.Critical,
                Status = TicketStatus.InProgress,
                SubmittedBy = "employee1",
                SubmittedByEmail = "employee1@helpdesk.local",
                AssignedTo = "admin2",
                CreatedAt = baseDate.AddHours(1),
                UpdatedAt = baseDate.AddHours(4)
            },
            new Ticket
            {
                TicketId = new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                Title = "New employee onboarding — workstation setup",
                Description = "New hire starting Monday in the Engineering team. Need a full workstation setup: laptop, monitors, docking station, standard software suite, VPN access, and badge.",
                Priority = Priority.High,
                Status = TicketStatus.Resolved,
                SubmittedBy = "employee4",
                SubmittedByEmail = "employee4@helpdesk.local",
                AssignedTo = "admin1",
                CreatedAt = baseDate.AddDays(-3),
                UpdatedAt = baseDate.AddDays(-1)
            },
            new Ticket
            {
                TicketId = new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                Title = "Password reset for legacy system",
                Description = "I need my password reset for the legacy inventory system (AS400). My account got locked after too many failed attempts. Username is dwilliams.",
                Priority = Priority.Medium,
                Status = TicketStatus.Closed,
                SubmittedBy = "employee5",
                SubmittedByEmail = "employee5@helpdesk.local",
                AssignedTo = "admin2",
                CreatedAt = baseDate.AddDays(-4),
                UpdatedAt = baseDate.AddDays(-3)
            },
            new Ticket
            {
                TicketId = new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                Title = "Conference room AV equipment not working",
                Description = "The projector and wireless display adapter in conference room B-204 are not powering on. We have a client presentation tomorrow at 10 AM — this is urgent.",
                Priority = Priority.Critical,
                Status = TicketStatus.Open,
                SubmittedBy = "employee2",
                SubmittedByEmail = "employee2@helpdesk.local",
                CreatedAt = baseDate.AddHours(12),
                UpdatedAt = baseDate.AddHours(12)
            }
        );
    }
}
