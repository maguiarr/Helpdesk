using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HelpDeskApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedDemoTickets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Tickets",
                columns: new[] { "TicketId", "AssignedTo", "CreatedAt", "Description", "Priority", "Status", "SubmittedBy", "SubmittedByEmail", "Title" },
                values: new object[,]
                {
                    { new Guid("a1111111-1111-1111-1111-111111111111"), "admin1", new DateTime(2026, 3, 14, 9, 0, 0, 0, DateTimeKind.Utc), "My VPN disconnects roughly every 30 minutes during work hours. I have to manually reconnect each time, which interrupts my workflow. Using the GlobalProtect client on Windows 11.", "High", "InProgress", "employee1", "employee1@helpdesk.local", "VPN connection drops every 30 minutes" },
                    { new Guid("a2222222-2222-2222-2222-222222222222"), null, new DateTime(2026, 3, 14, 12, 0, 0, 0, DateTimeKind.Utc), "I need access to the Marketing team SharePoint site for the Q2 campaign assets. My manager approved it verbally — please grant me editor permissions.", "Medium", "Open", "employee2", "employee2@helpdesk.local", "Need access to SharePoint site" },
                    { new Guid("a3333333-3333-3333-3333-333333333333"), null, new DateTime(2026, 3, 14, 14, 0, 0, 0, DateTimeKind.Utc), "Several keys on my Dell Latitude 5540 stopped working after a coffee spill yesterday. The touchpad still works. I need a replacement keyboard or a loaner laptop.", "High", "Open", "employee3", "employee3@helpdesk.local", "Laptop keyboard not responding" },
                    { new Guid("a4444444-4444-4444-4444-444444444444"), "admin1", new DateTime(2026, 3, 12, 9, 0, 0, 0, DateTimeKind.Utc), "I need Adobe Acrobat Pro installed for editing and signing PDF contracts. We should have spare licenses in the enterprise pool.", "Low", "Resolved", "employee1", "employee1@helpdesk.local", "Install Adobe Acrobat Pro" },
                    { new Guid("a5555555-5555-5555-5555-555555555555"), "admin2", new DateTime(2026, 3, 9, 9, 0, 0, 0, DateTimeKind.Utc), "My email signature displays with broken formatting in Outlook desktop. The logo image is missing and the font reverts to Times New Roman for external recipients.", "Low", "Closed", "employee4", "employee4@helpdesk.local", "Email signature not showing correctly" },
                    { new Guid("a6666666-6666-6666-6666-666666666666"), "admin1", new DateTime(2026, 3, 13, 9, 0, 0, 0, DateTimeKind.Utc), "My external Dell U2723QE monitor flickers every few minutes. Tried swapping the USB-C cable and restarting — problem persists. Happens in both Windows and BIOS.", "Medium", "InProgress", "employee2", "employee2@helpdesk.local", "Monitor flickering intermittently" },
                    { new Guid("a7777777-7777-7777-7777-777777777777"), null, new DateTime(2026, 3, 14, 17, 0, 0, 0, DateTimeKind.Utc), "My current mouse scroll wheel is broken. Requesting a new Logitech MX Master 3S from the equipment catalog.", "Low", "Open", "employee5", "employee5@helpdesk.local", "Request new wireless mouse" },
                    { new Guid("a8888888-8888-8888-8888-888888888888"), null, new DateTime(2026, 3, 14, 19, 0, 0, 0, DateTimeKind.Utc), "The HP LaserJet on the 3rd floor (printer name: HP-3F-LJ) is not showing up in my available printers list. Other printers on the same floor work fine.", "Medium", "Open", "employee3", "employee3@helpdesk.local", "Cannot print to 3rd floor printer" },
                    { new Guid("a9999999-9999-9999-9999-999999999999"), "admin2", new DateTime(2026, 3, 14, 10, 0, 0, 0, DateTimeKind.Utc), "Outlook 365 crashes within 5 seconds of launching. Safe mode works but normal mode instant-crashes. Started after the latest Windows update KB5035853.", "Critical", "InProgress", "employee1", "employee1@helpdesk.local", "Outlook keeps crashing on startup" },
                    { new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), "admin1", new DateTime(2026, 3, 11, 9, 0, 0, 0, DateTimeKind.Utc), "New hire starting Monday in the Engineering team. Need a full workstation setup: laptop, monitors, docking station, standard software suite, VPN access, and badge.", "High", "Resolved", "employee4", "employee4@helpdesk.local", "New employee onboarding — workstation setup" },
                    { new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), "admin2", new DateTime(2026, 3, 10, 9, 0, 0, 0, DateTimeKind.Utc), "I need my password reset for the legacy inventory system (AS400). My account got locked after too many failed attempts. Username is dwilliams.", "Medium", "Closed", "employee5", "employee5@helpdesk.local", "Password reset for legacy system" },
                    { new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"), null, new DateTime(2026, 3, 14, 21, 0, 0, 0, DateTimeKind.Utc), "The projector and wireless display adapter in conference room B-204 are not powering on. We have a client presentation tomorrow at 10 AM — this is urgent.", "Critical", "Open", "employee2", "employee2@helpdesk.local", "Conference room AV equipment not working" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a1111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a2222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a3333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a4444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a5555555-5555-5555-5555-555555555555"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a6666666-6666-6666-6666-666666666666"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a7777777-7777-7777-7777-777777777777"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a8888888-8888-8888-8888-888888888888"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("a9999999-9999-9999-9999-999999999999"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"));

            migrationBuilder.DeleteData(
                table: "Tickets",
                keyColumn: "TicketId",
                keyValue: new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"));
        }
    }
}
