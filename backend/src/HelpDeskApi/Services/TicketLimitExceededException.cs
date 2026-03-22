namespace HelpDeskApi.Services;

public class TicketLimitExceededException : Exception
{
    public int Limit { get; }

    public TicketLimitExceededException(int limit)
        : base($"You have reached the maximum of {limit} tickets. Please close or resolve existing tickets before creating new ones.")
    {
        Limit = limit;
    }
}
