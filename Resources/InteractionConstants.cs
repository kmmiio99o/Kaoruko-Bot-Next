namespace KaorukoBot.Resources;

public static class InteractionConstants
{
    public static class Poll
    {
        public const string VotePrefix = "poll_vote_";
    }

    public static class Ticket
    {
        public const string Create = "ticket_create";
        public const string Close = "ticket_close_";
        public const string Delete = "ticket_delete_";
        public const string CategorySelect = "ticket_category_select";
        public const string ModalPrefix = "ticket_modal_";
        public const string CloseReasonPrefix = "close_reason_";
    }

    public static class CustomCommand
    {
        public const string Approve = "cc_approve_";
        public const string Reject = "cc_reject_";
    }
}
