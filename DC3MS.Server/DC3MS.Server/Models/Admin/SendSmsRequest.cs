namespace DC3MS.Server.Models.Admin
{
    public class SendSmsRequest
    {
        public string PhoneTo { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}
